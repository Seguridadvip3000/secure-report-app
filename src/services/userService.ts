import { supabase } from '../lib/supabase';
import type { User, UserRole, UserStatus } from '../types';

export const userService = {
  // Obtener todos los usuarios
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener usuario por email o teléfono
  async getUserByCredentials(email: string, phone: string): Promise<User | null> {
    console.log('🔍 userService.getUserByCredentials llamado con:', { email, phone });
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${email},phone.eq.${phone}`)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Usuario no encontrado (PGRST116)');
          return null; // No rows
        }
        console.error('❌ Error de Supabase al buscar usuario:', error);
        console.error('📋 Detalles:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Usuario encontrado:', data);
      return data;
    } catch (error) {
      console.error('❌ Excepción en getUserByCredentials:', error);
      throw error;
    }
  },

  // Registrar nuevo usuario
  async registerUser(userData: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    proyectos?: string[];
  }): Promise<User> {
    console.log('📝 userService.registerUser llamado con:', userData);
    
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: userData.role,
          status: 'pendiente',
          proyectos: userData.proyectos || [],
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error de Supabase al registrar usuario:', error);
        console.error('📋 Detalles:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Usuario registrado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Excepción en registerUser:', error);
      throw error;
    }
  },

  // Aprobar usuario
  async approveUser(userId: string, approvedBy: string): Promise<void> {
    console.log('✅ userService.approveUser llamado con:', { userId, approvedBy });
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          status: 'aprobado',
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error de Supabase al aprobar usuario:', error);
        console.error('📋 Detalles:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Usuario aprobado exitosamente');
    } catch (error) {
      console.error('❌ Excepción en approveUser:', error);
      throw error;
    }
  },

  // Rechazar usuario
  async rejectUser(userId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        status: 'rechazado',
        rejection_reason: reason,
      })
      .eq('id', userId);

    if (error) throw error;
  },

  // Eliminar usuario
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  },

  // Obtener usuarios pendientes
  async getPendingUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('status', 'pendiente')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener usuarios aprobados
  async getApprovedUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('status', 'aprobado')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
