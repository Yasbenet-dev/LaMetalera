// src/pages/login.jsx
import { useState } from "react";
import { useAuthSession } from "../hooks/useAuthSession";
import { useNavigate } from "react-router-dom";
import ErrorBoundary from "../components/ErrorBoundary";
import { supabase } from "../lib/supabase";
import { loginUser } from "../hooks/useAuth";
import { normalizeRole } from "../utils/roles";

function LoginPage() {
  const { login } = useAuthSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      //Login en Supabase Auth
      const { user, session } = await loginUser(identifier, password);

      //Traer perfil (rol, nombre) desde la tabla perfiles
      const { data: perfil, error: perfilError } = await supabase
        .from("perfiles")
        .select("id, nombre, rol")
        .eq("id", user.id)
        .maybeSingle(); // permite 0 filas sin lanzar error

      if (perfilError && perfilError.code !== "PGRST116") {
        console.error("[login] error cargando perfil:", perfilError);
      }

      // Fallback: si no hay perfil/rol, intentar leer rol desde 'usuarios' (si existe la columna)
      let fallbackRol = null;
      if (!perfil?.rol) {
        try {
          const { data: uById, error: uErr } = await supabase
            .from("usuarios")
            .select("rol")
            .eq("id", user.id)
            .maybeSingle();
          if (!uErr) fallbackRol = uById?.rol ?? null;
        } catch {
          // ignore
        }
        if (!fallbackRol) {
          try {
            const { data: uByEmail, error: uErr2 } = await supabase
              .from("usuarios")
              .select("rol")
              .eq("email", user.email)
              .maybeSingle();
            if (!uErr2) fallbackRol = uByEmail?.rol ?? null;
          } catch {
            // ignore
          }
        }
      }

      //Construir objeto de usuario para la app para el adminroute
      const appUser = {
        id: user.id,
        email: user.email,
        nombre: perfil?.nombre ?? user.email,
        rol: normalizeRole(perfil?.rol ?? fallbackRol) || "sin-rol",
      };

      //Guardar en localStorage
      localStorage.setItem("user", JSON.stringify(appUser));

      //Redirigir al dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("[login] error:", err);
      setError(err.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Panel branding (izquierda) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-200 via-emerald-300 to-emerald-200 text-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-35 bg-[radial-gradient(900px_500px_at_20%_20%,white,transparent)]" />
        <div className="relative z-10 w-full px-12 py-10 flex flex-col">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="La Metalera"
              className="h-12 w-12 rounded-md bg-white/30 p-1 backdrop-blur-[2px] shadow-sm"
            />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                La Metalera
              </h1>
              <p className="text-sm text-slate-700">
                Control de asistencia y horarios
              </p>
            </div>
          </div>
          <div className="flex-1 flex items-center">
            <div className="max-w-lg">
              <h2 className="text-4xl font-bold leading-tight">
                Bienvenido a AsisControl
              </h2>
              <p className="mt-3 text-slate-700">
                Gestiona asistencia, usuarios y turnos con una experiencia
                simple y moderna.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel formulario (derecha) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-6 lg:hidden">
            <img
              src="/logo.jpeg"
              alt="La Metalera"
              className="h-10 w-10 rounded-md bg-white/40 p-1 shadow-sm"
            />
            <span className="text-lg font-semibold text-slate-800">
              La Metalera
            </span>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-lg p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-900">
              Iniciar Sesión
            </h2>
            <p className="mt-1 text-center text-sm text-slate-600">
              Ingresa tus credenciales para continuar
            </p>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email o Usuario
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                  placeholder="ej: correo@empresa.cl"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                  placeholder="********"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 transition-colors shadow-sm"
              >
                Entrar
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-emerald-600 hover:underline"
                onClick={() =>
                  alert("Contacta al administrador para recuperar tu acceso.")
                }
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} La Metalera — AsisControl
          </p>
        </div>
      </div>
    </div>
  );
}
const LoginPageWithBoundary = () => (
  <ErrorBoundary>
    <LoginPage />
  </ErrorBoundary>
);

export default LoginPageWithBoundary;
