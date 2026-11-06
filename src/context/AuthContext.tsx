import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { getStorageMode } from '../config/appConfig';
import { notificationService } from '../services/notificationService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  approveUser: (userId: string) => Promise<void>;
  rejectUser: (userId: string, reason: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  pendingUsers: User[];
  approvedUsers: User[];
  loading: boolean;
}

interface RegisterData {
  username: string;
  nombre_completo: string;
  email: string;
  password: string;
  role: UserRole;
  proyectos?: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const storageMode = getStorageMode();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    loadUsers();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('users')
          .select('id, username, nombre_completo, email, role, status, proyectos, created_at, approved_at, approved_by, rejection_reason')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error cargando perfil activo:', error);
          setLoading(false);
          return;
        }

        if (profile) {
          setCurrentUser({
            id: profile.id,
            username: profile.username,
            nombre_completo: profile.nombre_completo,
            email: profile.email,
            role: profile.role,
            status: profile.status,
            proyectos: profile.proyectos || [],
            createdAt: profile.created_at,
            approvedAt: profile.approved_at,
            approvedBy: profile.approved_by,
            rejectionReason: profile.rejection_reason,
          });
        }
      }
    } catch (error) {
      console.error('Error en verificación de sesión:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, nombre_completo, email, role, status, proyectos, created_at, approved_at, approved_by, rejection_reason')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedUsers: User[] = (data || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        nombre_completo: u.nombre_completo,
        email: u.email,
        role: u.role,
        status: u.status,
        proyectos: u.proyectos || [],
        createdAt: u.created_at,
        approvedAt: u.approved_at,
        approvedBy: u.approved_by,
        rejectionReason: u.rejection_reason,
      }));

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error cargando base de usuarios:', error);
    }
  };
  const login = async (usernameOrEmail: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('🔐 Intentando login con:', usernameOrEmail);
      const isEmail = usernameOrEmail.includes('@');
      let email = usernameOrEmail;
      
      if (!isEmail) {
        const { data: user, error } = await supabase
          .from('users')
          .select('email')
          .eq('username', usernameOrEmail)
          .single();

        if (error || !user) {
          return { success: false, message: 'Usuario no encontrado' };
        }
        email = user.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Error de autenticación:', error);
        return { success: false, message: 'Credenciales incorrectas' };
      }

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, username, nombre_completo, email, role, status, proyectos, created_at, approved_at, approved_by, rejection_reason')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          return { success: false, message: 'Error cargando perfil de usuario' };
        }

        if (profile.status !== 'aprobado') {
          setCurrentUser(null);
          const projectUrl = import.meta.env.VITE_SUPABASE_URL || '';
          const match = projectUrl.match(/https:\/\/(.*?)\.supabase\.co/);
          if (match && match[1]) {
            localStorage.removeItem(`sb-${match[1]}-auth-token`);
          }
          
          return { 
            success: false, 
            message: profile.status === 'pendiente' 
              ? 'Su cuenta está pendiente de aprobación por el Administrador.' 
              : 'Su cuenta ha sido rechazada por la directiva.' 
          };
        }

        setCurrentUser({
          id: profile.id,
          username: profile.username,
          nombre_completo: profile.nombre_completo,
          email: profile.email,
          role: profile.role,
          status: profile.status,
          proyectos: profile.proyectos || [],
          createdAt: profile.created_at,
          approvedAt: profile.approved_at,
          approvedBy: profile.approved_by,
          rejectionReason: profile.rejection_reason,
        });

        console.log('✅ Login exitoso:', profile.username);
        return { success: true, message: 'Inicio de sesión exitoso' };
      }

      return { success: false, message: 'Error inesperado en los servicios de autenticación.' };
    } catch (error) {
      console.error('❌ Error en login:', error);
      return { success: false, message: 'Error al iniciar sesión' };
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('📝 Registrando usuario:', data.username);

      const { data: existingUsername } = await supabase
        .from('users')
        .select('username')
        .eq('username', data.username)
        .single();

      if (existingUsername) {
        return { success: false, message: 'El nombre de usuario ya está en uso' };
      }

      const { data: existingEmail } = await supabase
        .from('users')
        .select('email')
        .eq('email', data.email)
        .single();

      if (existingEmail) {
        return { success: false, message: 'El correo electrónico ya está registrado' };
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        console.error('❌ Error en Supabase Auth SignUp:', authError);
        return { success: false, message: authError.message };
      }

      if (!authData.user) {
        return { success: false, message: 'Error creando credenciales' };
      }

      let proyectos: string[] = [];
      if (data.role === 'directiva' || data.role === 'operaciones') {
        proyectos = ['*'];
      } else {
        proyectos = data.proyectos || [];
      }

      const initialStatus = data.role === 'directiva' ? 'pendiente' : 'aprobado';

      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          username: data.username,
          nombre_completo: data.nombre_completo,
          email: data.email,
          role: data.role,
          status: initialStatus,
          proyectos: proyectos,
        }]);

      if (profileError) {
        console.error('❌ Error vinculando perfil público:', profileError);
        return { success: false, message: 'Error creando perfil de usuario' };
      }

      await loadUsers();

      try {
        notificationService.notifyNewUserRegistration(data.username, data.nombre_completo, data.role);
      } catch (e) {
        console.error('Error enviando push de registro:', e);
      }
      
      return { 
        success: true, 
        message: initialStatus === 'pendiente'
          ? 'Registro exitoso. Su cuenta está pendiente de aprobación.'
          : 'Registro exitoso. Ya puede iniciar sesión en la plataforma.'
      };
    } catch (error) {
      console.error('❌ Error crítico en función de registro:', error);
      return { success: false, message: 'Error al registrar usuario' };
    }
  };
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      console.log('✅ Sesión destruida exitosamente');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          status: 'aprobado',
          approved_at: new Date().toISOString(),
          approved_by: currentUser?.id,
        })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
    } catch (error) {
      console.error('Error aprobando usuario:', error);
    }
  };

  const rejectUser = async (userId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          status: 'rechazado',
          rejection_reason: reason,
        })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
    } catch (error) {
      console.error('Error rechazando usuario:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;
      await loadUsers();
    } catch (error) {
      console.error('Error Helium deleting registro completo:', error);
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
