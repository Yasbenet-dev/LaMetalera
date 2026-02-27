// src/components/ErrorBoundary.jsx
import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para mostrar la UI alternativa
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Aquí puedes enviar el error a algún servicio si quieres
    console.error("Error atrapado por ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="max-w-md w-full bg-white shadow-lg rounded-2xl border border-orange-200 p-6 text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <h2 className="text-lg font-semibold text-orange-800 mb-2">
              Ha ocurrido un error en el panel
            </h2>
            <p className="text-sm text-orange-700 mb-3">
              Algo salió mal al mostrar esta vista. Intenta recargar la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 rounded-md bg-orange-500 px-4 py-2 text-white text-sm hover:bg-orange-600"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    // Si no hay error, muestra los hijos normalmente
    return this.props.children;
  }
}

export default ErrorBoundary;
