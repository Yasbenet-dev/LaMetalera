// src/components/Sidebar.jsx
import React, { useEffect, useState, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { isAdminRole } from "../utils/roles";

/**
 * NavContent: recibe isAdmin para decidir qué links mostrar.
 */
const NavContent = React.memo(function NavContent({ onNavigate, isAdmin }) {
  const linkClass = () => ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition
     ${
       isActive
         ? "bg-emerald-600 text-white shadow"
         : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
     }`;

  return (
    <>
      {/* Header con logo + título */}
      <div className="flex items-center gap-3 p-6 pb-2">
        <img
          src="/logo.jpeg"
          alt="La Metalera"
          className="w-10 h-10 rounded-lg object-contain shadow"
        />
        <h2 className="text-2xl font-bold text-emerald-700 tracking-tight">
          La Metalera
        </h2>
      </div>

      <nav className="flex-1 px-4 pt-2 pb-4 space-y-1">
        {/* Si es admin, muestra Inicio */}
        {isAdmin && (
          <NavLink
            to="/dashboard"
            end
            onClick={onNavigate}
            className={linkClass()}
          >
            <Icon icon="fa-solid:home" className="text-xl" />
            <span>Inicio</span>
          </NavLink>
        )}

        {/* Todos (admin + worker) ven Asistencias */}
        <NavLink
          to="/dashboard/asistencia"
          onClick={onNavigate}
          className={linkClass()}
        >
          <Icon icon="ri:service-bell-line" className="text-xl" />
          <span>Asistencias</span>
        </NavLink>

        {/* Solo admin ve el resto de las secciones */}
        {isAdmin && (
          <>
            <NavLink
              to="/dashboard/usuarios"
              onClick={onNavigate}
              className={linkClass()}
            >
              <Icon
                icon="solar:users-group-rounded-linear"
                className="text-xl"
              />
              <span>Usuarios</span>
            </NavLink>

            <NavLink
              to="/dashboard/horarios"
              onClick={onNavigate}
              className={linkClass()}
            >
              <Icon icon="fluent:shifts-32-regular" className="text-xl" />
              <span>Horarios</span>
            </NavLink>

            <NavLink
              to="/dashboard/pagos"
              onClick={onNavigate}
              className={linkClass()}
            >
              <Icon icon="bi:wallet2" className="text-xl" />
              <span>Pagos</span>
            </NavLink>
          </>
        )}
      </nav>
    </>
  );
});

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false); // drawer móvil
  const [user, setUser] = useState(null);

  // Leer usuario (y rol) desde localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [location.pathname]);

  const isAdmin = isAdminRole(user?.rol);

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      // Si usas supabase.auth, puedes llamar aquí también:
      // await supabase.auth.signOut();
      localStorage.removeItem("user");
      navigate("/", { replace: true }); // vuelve al login
    } catch (err) {
      console.error(err);
      alert("No se pudo cerrar sesión");
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  };

  const closeDrawer = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* ===== Desktop: sidebar fijo ===== */}
      <aside className="hidden lg:flex w-64 bg-gradient-to-b from-white via-emerald-50 to-slate-50 border-r border-slate-200 text-slate-800 flex-col shadow-lg rounded-r-3xl">
        <NavContent onNavigate={undefined} isAdmin={isAdmin} />

        <div className="p-4 mt-auto border-t border-slate-200">
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white shadow transition-colors"
          >
            {signingOut ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {/* ===== Móvil: botón flotante para abrir el drawer ===== */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full
                   bg-emerald-600 text-white shadow-lg ring-1 ring-black/10
                   hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        aria-label="Abrir menú"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 mx-auto"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* ===== Móvil: overlay ===== */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden
                    ${
                      open
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* ===== Móvil: drawer lateral ===== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-white via-emerald-50 to-slate-50 
                    border-r border-slate-200 text-slate-800 flex flex-col
                    transform transition-transform duration-200 lg:hidden shadow-2xl rounded-r-3xl
                    ${open ? "translate-x-0" : "-translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
      >
        {/* Header drawer */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <span className="px-1.5 text-sm text-slate-500">Menú</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md
                       hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            aria-label="Cerrar menú"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <NavContent onNavigate={closeDrawer} isAdmin={isAdmin} />

        <div className="p-4 mt-auto border-t border-slate-200">
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white shadow transition-colors"
          >
            {signingOut ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>
    </>
  );
}