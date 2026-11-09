import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Vibration } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext'; // Asegúrate de que extraiga el usuario actual

export default function LiderHome() {
  const { currentUser } = useAuth();
  const [isSending, setIsLoading] = useState(false);
  const [canalAlerta, setCanalAlerta] = useState<any>(null);

  const nombreLider = currentUser?.nombre_completo || 'Líder en Ruta';
  const proyectoAsignado = currentUser?.proyecto_id || 'Ruta Vip No Asignada';

  useEffect(() => {
    // Inicializamos el canal de transmisión inmediata (Broadcast)
    const channel = supabase.channel('alertas-panico-global');
    channel.subscribe();
    setCanalAlerta(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const dispararBotonPanico = async () => {
    setIsLoading(true);
    // Hacemos que el teléfono del Líder vibre con un patrón de SOS como confirmación táctil
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);

    try {
      // 1. Solicitamos la última coordenada guardada de este Líder de forma express
      const { data: locData } = await supabase
        .from('user_locations')
        .select('latitude, longitude, bateria')
        .eq('user_id', currentUser?.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // 2. Transmitimos la alerta por el canal Broadcast instantáneo
      if (canalAlerta) {
        await canalAlerta.send({
          type: 'broadcast',
          event: 'SOS_EMERGENCIA',
          payload: {
            lider_id: currentUser?.id,
            nombre_completo: nombreLider,
            proyecto_id: proyectoAsignado,
            latitude: locData?.latitude || 10.4914, // Coordenada de contingencia Caracas si no hay GPS
            longitude: locData?.longitude || -66.8486,
            bateria: locData?.bateria || 100,
            fecha_alerta: new Date().toISOString()
          }
        });
      }

      // 3. Dejamos un registro histórico de seguridad inalterable en la tabla de reportes como PENDIENTE
      await supabase.from('reports').insert([
        {
          titulo_novedad: `🚨 ¡BOTÓN DE PÁNICO ACTIVADO EN VIVO POR EL LÍDER! Requiere asistencia inmediata en los perímetros de la ruta corporativa.`,
          proyecto: proyectoAsignado,
          status: 'pendiente',
          visibleForClient: true, // El cliente afiliado debe verlo de inmediato
          created_at: new Date().toISOString()
        }
      ]);

      Alert.alert(
        '¡ALERTA ENVIADA!',
        'La señal de pánico ha sido transmitida en tiempo real al Centro de Operaciones, Directiva y al Administrador principal. Mantenga la calma, la asistencia va en camino.'
      );
    } catch (err: any) {
      console.error('Error al emitir pánico:', err.message);
      Alert.alert('Fallo de Red', 'No se pudo transmitir la señal. Intente comunicarse por canal de radio VHF.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.empresa}>SEGURIDAD VIP 3000 C.A.</Text>
        <Text style={styles.usuario}>{nombreLider}</Text>
        <Text style={styles.rol}>Estatus: En Ruta Operativa</Text>
        <Text style={styles.proyecto}>Ruta: {proyectoAsignado}</Text>
      </View>

      <View style={styles.panicoContainer}>
        <Text style={styles.alertaTexto}>BOTÓN DE EMERGENCIA SATELITAL</Text>
        <Text style={styles.subTexto}>Presione el botón en caso de riesgo inminente, agresión o compromisos perimetrales.</Text>
        
        <TouchableOpacity 
          style={[styles.botonPanico, isSending && styles.botonDeshabilitado]} 
          onPress={dispararBotonPanico}
          disabled={isSending}
          activeOpacity={0.7}
        >
          <Text style={styles.panicoTexto}>{isSending ? 'EMITIENDO...' : 'S.O.S'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20, justifyContent: 'center' },
  headerCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, borderLeftWidth: 5, borderLeftColor: '#0070f3', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 40 },
  empresa: { fontSize: 11, fontWeight: 'bold', color: '#0070f3', trackingWidth: 1 },
  usuario: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginTop: 4 },
  rol: { fontSize: 13, color: '#28a745', marginTop: 2, fontWeight: '500' },
  proyecto: { fontSize: 13, color: '#6c757d', marginTop: 2 },
  panicoContainer: { alignItems: 'center', paddingHorizontal: 10 },
  alertaTexto: { fontSize: 16, fontWeight: 'bold', color: '#dc3545', marginBottom: 5, letterSpacing: 0.5 },
  subTexto: { fontSize: 13, color: '#6c757d', textAlign: 'center', marginBottom: 30, paddingHorizontal: 20, lineHeight: 18 },
  botonPanico: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#dc3545', justifyContent: 'center', alignItems: 'center', shadowColor: '#dc3545', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8, borderWidth: 6, borderColor: '#ffffff' },
  botonDeshabilitado: { backgroundColor: '#bd2130', opacity: 0.6 },
  panicoTexto: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', letterSpacing: 1 }
});
