import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { notificationService } from "./services/notificationService";

// Solicitar permisos de notificación al cargar la aplicación
notificationService.requestPermission().then(permission => {
  if (permission === 'granted') {
    console.log('✅ Notificaciones push habilitadas');
  } else {
    console.warn('⚠️ Notificaciones push no habilitadas');
  }
});

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ Service Worker registrado:', registration.scope);
      })
      .catch(error => {
        console.log('❌ Error registrando Service Worker:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
