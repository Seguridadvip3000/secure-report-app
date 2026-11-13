import React from 'react';
import { StyleSheet, SafeAreaView, StatusBar, Platform, BackHandler, Alert, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export default function App() {
  const webViewRef = React.useRef(null);

  const protocolo = 'https://';
  const proyecto = 'secure-report-app';
  const dominio = '.vercel.app';
  const APP_URL = protocolo + proyecto + dominio;

  React.useEffect(() => {
    const onBackPress = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }
  }, []);

  // SOLICITAR PERMISO NATIVO DE GPS EN ANDROID PARA REGISTRO Y MONITOREO
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

  // ABRIR CÁMARA NATIVA DE ANDROID Y ENVIAR FOTO A LA WEB
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
        const asset = resultado.assets[0];
        if (asset.base64) {
          const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
          webViewRef.current?.postMessage(JSON.stringify({ type: 'NATIVE_PHOTOS', photos: [dataUrl] }));
        }
      }
    } catch (error) {
      Alert.alert('Error de Cámara', 'No se pudo abrir la cámara del dispositivo.');
    }
  };

  // ABRIR GALERÍA NATIVA DE ANDROID Y ENVIAR FOTOS A LA WEB
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
  const guardarEnDispositivo = async (filename, base64Data) => {
    try {
      if (Platform.OS === 'android') {
        const permisos = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permisos.granted) {
          const uriArchivo = await FileSystem.StorageAccessFramework.createFileAsync(
            permisos.directoryUri,
            filename,
            'application/pdf'
          );
          await FileSystem.writeAsStringAsync(uriArchivo, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          Alert.alert('¡Guardado!', 'El reporte PDF se guardó correctamente en tu teléfono.');
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

  const compartirArchivo = async (filename, base64Data) => {
    try {
      const rutaArchivo = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(rutaArchivo, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(rutaArchivo, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir Reporte PDF',
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir el menú de compartir.');
    }
  };

  const manejarMensajeWeb = async (event) => {
    try {
      const datos = JSON.parse(event.nativeEvent.data);

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
        Alert.alert(
          'Reporte PDF Listo',
          '¿Qué deseas hacer con el documento oficial?',
          [
            { text: 'Guardar en el Teléfono', onPress: () => guardarEnDispositivo(datos.filename, datos.base64) },
            { text: 'Compartir (WhatsApp/Correo)', onPress: () => compartirArchivo(datos.filename, datos.base64) },
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
      <WebView
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        onMessage={manejarMensajeWeb}
        onShouldStartLoadWithRequest={manejarNavegacion}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        startInLoadingState={true}
      />
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
  },
});
