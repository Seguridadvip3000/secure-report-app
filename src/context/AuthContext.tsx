import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { initialUsers } from '../data/initialData';
import { v4 as uuidv4 } from 'uuid';
import { getStorageMode } from '../config/appConfig';
import { userService } from '../services/userService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, phone: string) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  approveUser: (userId: string) => Promise<void>;
  rejectUser: (userId: string, reason: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  pendingUsers: User[];
  approvedUsers: User[];
  loading: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  proyectos?: string[];
}

const SESSION_KEY = 'securereport_session';
const LOCAL_STORAGE_KEY = 'securereport_users';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadSession(): User | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveSession(user: User | null) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

// LocalStorage functions
function loadLocalUsers(): User[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return initialUsers;
}

function saveLocalUsers(users: User[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const storageMode = getStorageMode();
  const [currentUser, setCurrentUser] = useState<User | null>(loadSession);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(storageMode === 'supabase');

  // Load users based on storage mode
  useEffect(() => {
    if (storageMode === 'supabase') {
      loadUsersFromSupabase();
    } else {
      setUsers(loadLocalUsers());
    }
  }, [storageMode]);

  const loadUsersFromSupabase = async () => {
    try {
      const supabaseUsers = await userService.getAllUsers();
      setUsers(supabaseUsers);
    } catch (error) {
      console.error('Error loading users from Supabase:', error);
      // Fallback to local data
      setUsers(initialUsers);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    if (storageMode === 'supabase') {
      await loadUsersFromSupabase();
    }
  };

  // Save local users when they change (only in local mode)
  useEffect(() => {
    if (storageMode === 'local' && users.length > 0) {
      saveLocalUsers(users);
    }
  }, [users, storageMode]);

  useEffect(() => {
    saveSession(currentUser);
  }, [currentUser]);

  const login = async (email: string, phone: string): Promise<{ success: boolean; message: string }> => {
    // Primero buscar en la lista de usuarios cargados
    let user = users.find(
      u => (u.email === email || u.phone === phone)
    );

    // Si no existe en Supabase pero es un usuario de prueba, crearlo automáticamente
    if (!user && storageMode === 'supabase') {
      const testUser = initialUsers.find(
        u => (u.email === email || u.phone === phone)
      );
      
      if (testUser) {
        console.log('ℹ️ Usuario de prueba no existe en Supabase. Creándolo automáticamente...');
        try {
          await userService.registerUser({
            name: testUser.name,
            email: testUser.email,
            phone: testUser.phone,
            role: testUser.role,
            proyectos: testUser.proyectos,
          });
          
          // Aprobarlo automáticamente si es un usuario de prueba
          const newUser = await userService.getUserByCredentials(testUser.email, testUser.phone);
          if (newUser && newUser.status === 'pendiente') {
            await userService.approveUser(newUser.id, 'system');
          }
          
          // Recargar usuarios
          await loadUsersFromSupabase();
          
          // Buscar el usuario recién creado
          user = users.find(
            u => (u.email === email || u.phone === phone)
          );
          
          if (user) {
            console.log('✅ Usuario de prueba creado y aprobado exitosamente');
          }
        } catch (error) {
          console.error('Error creando usuario de prueba:', error);
          return { success: false, message: 'Error al crear usuario. Por favor, inicializa la base de datos desde /setup' };
        }
      }
    }

    if (!user) {
      return { success: false, message: 'Usuario no encontrado. Regístrese primero o inicialice la base de datos desde /setup' };
    }
    if (user.status === 'pendiente') {
      return { success: false, message: 'Su cuenta está pendiente de aprobación por la Directiva.' };
    }
    if (user.status === 'rechazado') {
      return { success: false, message: `Su cuenta fue rechazada. ${user.rejectionReason || ''}` };
    }
    setCurrentUser(user);
    return { success: true, message: 'Inicio de sesión exitoso' };
  };

  const register = async (data: RegisterData) => {
    const exists = users.find(u => u.email === data.email || u.phone === data.phone);
    if (exists) {
      return { success: false, message: 'Ya existe un usuario con ese email o teléfono.' };
    }

    if (storageMode === 'supabase') {
      try {
        await userService.registerUser(data);
        await refreshUsers();
        return { success: true, message: 'Registro exitoso. Espere la aprobación de la Directiva.' };
      } catch (error) {
        console.error('Error registering user:', error);
        return { success: false, message: 'Error al registrar. Intente nuevamente.' };
      }
    } else {
      // Local mode
      const newUser: User = {
        id: uuidv4(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        status: 'pendiente',
        proyectos: data.proyectos,
        createdAt: new Date().toISOString(),
      };
      setUsers(prev => [...prev, newUser]);
      return { success: true, message: 'Registro exitoso. Espere la aprobación de la Directiva.' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const approveUser = async (userId: string) => {
    if (storageMode === 'supabase') {
      try {
        await userService.approveUser(userId, currentUser?.id || '');
        await refreshUsers();
      } catch (error) {
        console.error('Error approving user:', error);
      }
    } else {
      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, status: 'aprobado' as UserStatus, approvedAt: new Date().toISOString(), approvedBy: currentUser?.id }
            : u
        )
      );
    }
  };

  const rejectUser = async (userId: string, reason: string) => {
    if (storageMode === 'supabase') {
      try {
        await userService.rejectUser(userId, reason);
        await refreshUsers();
      } catch (error) {
        console.error('Error rejecting user:', error);
      }
    } else {
      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, status: 'rechazado' as UserStatus, rejectionReason: reason }
            : u
        )
      );
    }
  };

  const deleteUser = async (userId: string) => {
    if (storageMode === 'supabase') {
      try {
        await userService.deleteUser(userId);
        await refreshUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    } else {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const pendingUsers = users.filter(u => u.status === 'pendiente');
  const approvedUsers = users.filter(u => u.status === 'aprobado');

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        login,
        register,
        logout,
        approveUser,
        rejectUser,
        deleteUser,
        pendingUsers,
        approvedUsers,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
