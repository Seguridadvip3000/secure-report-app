import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { emailService } from "./services/emailService";

// Inicializar EmailJS al cargar la aplicación
emailService.initialize();

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
