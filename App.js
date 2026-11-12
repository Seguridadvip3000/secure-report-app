import React from 'react';
import { StyleSheet, SafeAreaView, StatusBar, Platform, BackHandler, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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
          Alert.alert('¡Guardado!', 'El reporte PDF se guardó correctamente en la carpeta seleccionada de tu teléfono.');
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
      console.error('Error al procesar el PDF en móvil:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <WebView
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        onMessage={manejarMensajeWeb}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        allowFileAccess={true}
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
