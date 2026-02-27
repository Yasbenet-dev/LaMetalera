// src/components/AdminRoute.jsx
import { Navigate } from "react-router-dom";
import { isAdminRole } from "../utils/roles";

export default function AdminRoute({ children }) {
  const userStr = localStorage.getItem("user");

  // Si no hay usuario en localStorage -> fuera al login / inicio
  if (!userStr) {
    return <Navigate to="/" replace />;
  }

  let user = null;
  try {
    user = JSON.parse(userStr);
  } catch {
    user = null;
  }
  if (!user) return <Navigate to="/" replace />;

  // Si el usuario NO es admin -> lo mandas a una ruta permitida
  if (!isAdminRole(user.rol)) {
    return <Navigate to="/dashboard/asistencia" replace />;
  }

  // Si es admin, puede ver la ruta protegida
  return children;
}