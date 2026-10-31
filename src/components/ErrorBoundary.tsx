import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error: error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Error capturado por ErrorBoundary:', error);
    console.error('📋 Error Info:', errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log para debugging
    if (error.message.includes('useRef') || error.message.includes('null')) {
      console.error('⚠️ Error de React detectado. Probablemente es un problema de caché/HMR.');
      console.error('💡 Solución: Ejecuta el script clean-cache.sh o clean-cache.bat');
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCache = () => {
    // Limpiar localStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Recargar
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                Error de Aplicación
              </h1>
              <p className="text-slate-600">
                Se ha producido un error inesperado
              </p>
            </div>

            {/* Error Details */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-800 mb-2">Detalles del Error:</h3>
              <p className="text-sm text-red-700 font-mono break-all">
                {this.state.error?.message || 'Error desconocido'}
              </p>
            </div>

            {/* Solution */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">💡 Solución Recomendada:</h3>
              <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                <li>Haz clic en "Limpiar Caché y Recargar"</li>
                <li>Si el problema persiste, ejecuta en tu terminal:
                  <code className="block bg-blue-100 px-2 py-1 mt-1 rounded text-xs">
                    {navigator.platform.includes('Win') ? 'clean-cache.bat' : './clean-cache.sh'}
                  </code>
                </li>
                <li>Abre la consola del navegador (F12) para más detalles</li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleClearCache}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                🧹 Limpiar Caché y Recargar
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-300 transition-colors"
              >
                🔄 Solo Recargar
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-slate-700 hover:text-slate-900">
                  📊 Información Técnica (para debugging)
                </summary>
                <div className="mt-3 bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-600 overflow-auto max-h-48">
                  <p><strong>Error:</strong> {this.state.error?.name}</p>
                  <p><strong>Message:</strong> {this.state.error?.message}</p>
                  <p><strong>Stack:</strong></p>
                  <pre className="whitespace-pre-wrap break-all">
                    {this.state.error?.stack}
                  </pre>
                </div>
              </details>
            </div>

            {/* Help Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                ¿Necesitas ayuda? Consulta{' '}
                <a 
                  href="/FIX_USE_REF_ERROR.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  la guía de solución de problemas
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
