import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { initialUsers } from '../data/initialData';
import { v4 as uuidv4 } from 'uuid';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, phone: string) => { success: boolean; message: string };
  register: (data: RegisterData) => { success: boolean; message: string };
  logout: () => void;
  approveUser: (userId: string) => void;
  rejectUser: (userId: string, reason: string) => void;
  deleteUser: (userId: string) => void;
  pendingUsers: User[];
  approvedUsers: User[];
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  proyectos?: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'securereport_users';
const SESSION_KEY = 'securereport_session';

function loadUsers(): User[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return initialUsers;
}

function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(loadUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(loadSession);

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    saveSession(currentUser);
  }, [currentUser]);

  const login = (email: string, phone: string) => {
    const user = users.find(
      u => (u.email === email || u.phone === phone)
    );
    if (!user) {
      return { success: false, message: 'Usuario no encontrado. Regístrese primero.' };
    }
    if (user.status === 'pendiente') {
      return { success: false, message: 'Su cuenta está pendiente de aprobación por el administrador.' };
    }
    if (user.status === 'rechazado') {
      return { success: false, message: `Su cuenta fue rechazada. ${user.rejectionReason || ''}` };
    }
    setCurrentUser(user);
    return { success: true, message: 'Inicio de sesión exitoso' };
  };

  const register = (data: RegisterData) => {
    const exists = users.find(u => u.email === data.email || u.phone === data.phone);
    if (exists) {
      return { success: false, message: 'Ya existe un usuario con ese email o teléfono.' };
    }

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
    return { success: true, message: 'Registro exitoso. Espere la aprobación del administrador.' };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const approveUser = (userId: string) => {
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? { ...u, status: 'aprobado' as UserStatus, approvedAt: new Date().toISOString(), approvedBy: currentUser?.id }
          : u
      )
    );
  };

  const rejectUser = (userId: string, reason: string) => {
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? { ...u, status: 'rechazado' as UserStatus, rejectionReason: reason }
          : u
      )
    );
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
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
