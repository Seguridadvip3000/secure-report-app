// Configuración de la aplicación
// Cambia entre 'supabase' y 'local' según tu necesidad

export const APP_CONFIG = {
  // 'supabase' para producción con base de datos real
  // 'local' para desarrollo con localStorage
  STORAGE_MODE: (import.meta.env.VITE_STORAGE_MODE || 'local') as 'supabase' | 'local',
};

// Verificar si Supabase está configurado
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  return !!(
    url && 
    key && 
    !url.includes('TU-PROYECTO') && 
    !key.includes('TU_ANON_KEY')
  );
};

// Determinar automáticamente qué modo usar
export const getStorageMode = (): 'supabase' | 'local' => {
  if (APP_CONFIG.STORAGE_MODE === 'supabase' && isSupabaseConfigured()) {
    return 'supabase';
  }
  return 'local';
};
