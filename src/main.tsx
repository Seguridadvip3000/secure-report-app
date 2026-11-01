import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { emailService } from "./services/emailService";

// Inicializar EmailJS al cargar la aplicación
emailService.initialize();

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
