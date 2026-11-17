import React from 'react';
import { StyleSheet, SafeAreaView, StatusBar, Platform, BackHandler, Alert, Linking, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const webViewRef = React.useRef(null);
  const [usuarioActivo, setUsuarioActivo] = React.useState(null);
  const [expoPushToken, setExpoPushToken] = React.useState(null);
  const [errorRed, setErrorRed] = React.useState(false);

  const APP_URL = 'secure-report-app.vercel.app/';

  React.useEffect(() => {
    let intervaloToken = null;

    const configurarNotificaciones = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('alertas-vip3000', {
            name: 'Alertas Seguridad VIP 3000',
            importance: Notifications.AndroidImportance.MAX,
            enableVibrate: true,
            lightColor: '#FF0000',
            sound: 'default',
          });
        }

        if (finalStatus !== 'granted') {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: 'NATIVE_PUSH_ERROR',
              error: 'Permiso de notificaciones denegado en Android.',
            })
          );
          return;
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ||
          Constants?.easConfig?.projectId ||
          'fbcc2e61-3ffd-4736-84bb-7ed46021bbe3';

        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          if (tokenData?.data) {
            setExpoPushToken(tokenData.data);
            if (intervaloToken) clearInterval(intervaloToken);
            return;
          }
        } catch (expoErr) {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          if (deviceToken?.data) {
            setExpoPushToken(`FCM:${deviceToken.data}`);
            if (intervaloToken) clearInterval(intervaloToken);
            return;
          }
          throw expoErr;
        }
      } catch (err) {
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: 'NATIVE_PUSH_ERROR',
            error: String(err?.message || err),
          })
        );
      }
    };

    configurarNotificaciones();
    intervaloToken = setInterval(configurarNotificaciones, 15000);

    const onBackPress = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
    }

    return () => {
      if (intervaloToken) clearInterval(intervaloToken);
      if (Platform.OS === 'android') {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      }
    };
  }, []);

  React.useEffect(() => {
    if (usuarioActivo?.id && expoPushToken && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'NATIVE_PUSH_TOKEN',
          token: expoPushToken,
        })
      );
    }
  }, [usuarioActivo, expoPushToken]);
  const solicitarUbicacionNativa = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'NATIVE_GPS_RESULT', granted: false }));
        return;
      }

      const ubicacion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      webViewRef.current?.postMessage(
        JSON.stringify({
          type: 'NATIVE_GPS_RESULT',
          granted: true,
          lat: ubicacion.coords.latitude,
          lng: ubicacion.coords.longitude,
        })
      );
    } catch (error) {
      webViewRef.current?.postMessage(JSON.stringify({ type: 'NATIVE_GPS_RESULT', granted: false }));
    }
  };

  const abrirCamaraNativa = async () => {
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso denegado', 'Debes autorizar el permiso de cámara para tomar fotografías.');
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        const asset = resultado.assets.at(0);
        if (asset?.base64) {
          const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
          webViewRef.current?.postMessage(JSON.stringify({ type: 'NATIVE_PHOTOS', photos: [dataUrl] }));
        }
      }
    } catch (error) {
      Alert.alert('Error de Cámara', 'No se pudo abrir la cámara del dispositivo.');
    }
  };

  const abrirGaleriaNativa = async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso denegado', 'Debes autorizar el acceso a la galería para seleccionar fotos.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        const fotosDataUrl = resultado.assets
          .filter((a) => a.base64)
          .map((a) => `data:image/jpeg;base64,${a.base64}`);

        if (fotosDataUrl.length > 0) {
          webViewRef.current?.postMessage(JSON.stringify({ type: 'NATIVE_PHOTOS', photos: fotosDataUrl }));
        }
      }
    } catch (error) {
      Alert.alert('Error de Galería', 'No se pudo abrir la galería de imágenes.');
    }
  };

  const guardarEnDispositivo = async (filename, base64Data, mimeType = 'application/pdf') => {
    try {
      if (Platform.OS === 'android') {
        const permisos = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permisos.granted) {
          const uriArchivo = await FileSystem.StorageAccessFramework.createFileAsync(
            permisos.directoryUri,
            filename,
            mimeType
          );
          await FileSystem.writeAsStringAsync(uriArchivo, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          Alert.alert('¡Guardado!', 'El documento se guardó correctamente en tu teléfono.');
        }
      } else {
        const ruta = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(ruta, base64Data, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(ruta);
      }
    } catch (error) {
      Alert.alert('Error al guardar', 'No se pudo escribir el archivo en el almacenamiento.');
    }
  };

  const compartirArchivo = async (filename, base64Data, mimeType = 'application/pdf') => {
    try {
      const rutaArchivo = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(rutaArchivo, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(rutaArchivo, {
        mimeType,
        dialogTitle: 'Compartir Documento Oficial',
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir el menú de compartir.');
    }
  };
  const manejarMensajeWeb = async (event) => {
    try {
      const datos = JSON.parse(event.nativeEvent.data);

      if (datos.type === 'SET_USER_SESSION') {
        setUsuarioActivo(datos.user || null);
        if (datos.user?.id && expoPushToken && webViewRef.current) {
          webViewRef.current.postMessage(
            JSON.stringify({
              type: 'NATIVE_PUSH_TOKEN',
              token: expoPushToken,
            })
          );
        }
        return;
      }

      if (datos.type === 'REQUEST_GPS') {
        await solicitarUbicacionNativa();
        return;
      }

      if (datos.type === 'OPEN_CAMERA') {
        await abrirCamaraNativa();
        return;
      }

      if (datos.type === 'OPEN_GALLERY') {
        await abrirGaleriaNativa();
        return;
      }

      if (datos.type === 'OPEN_WHATSAPP' && datos.url) {
        Linking.openURL(datos.url).catch(() => {
          Alert.alert('WhatsApp no detectado', 'No se pudo abrir la aplicación WhatsApp instalada en el dispositivo.');
        });
        return;
      }

      if (datos.type === 'DOWNLOAD_PDF' && datos.base64) {
        const tipoMime = datos.mimeType || 'application/pdf';
        Alert.alert(
          'Documento Listo',
          '¿Qué deseas hacer con el archivo oficial?',
          [
            { text: 'Guardar en el Teléfono', onPress: () => guardarEnDispositivo(datos.filename, datos.base64, tipoMime) },
            { text: 'Compartir (WhatsApp/Correo)', onPress: () => compartirArchivo(datos.filename, datos.base64, tipoMime) },
            { text: 'Cancelar', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Error en puente móvil:', error);
    }
  };

  const manejarNavegacion = (request) => {
    const { url } = request;
    if (url.startsWith('whatsapp://') || url.startsWith('https://google.com')) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      {errorRed ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Sin conexión con el servidor</Text>
          <Text style={styles.errorText}>
            Verifica tu conexión a datos móviles o Wi-Fi e intenta nuevamente.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setErrorRed(false);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryText}>Reintentar Conexión</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: APP_URL }}
          style={styles.webview}
          onMessage={manejarMensajeWeb}
          onShouldStartLoadWithRequest={manejarNavegacion}
          onError={() => setErrorRed(true)}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
          geolocationEnabled={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Conectando con Seguridad VIP 3000...</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#cbd5e1',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
