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
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows
      throw error;
    }
    return data;
  },

  // Registrar nuevo usuario
  async registerUser(userData: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    proyectos?: string[];
  }): Promise<User> {
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

    if (error) throw error;
    return data;
  },

  // Aprobar usuario
  async approveUser(userId: string, approvedBy: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        status: 'aprobado',
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
      })
      .eq('id', userId);

    if (error) throw error;
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
