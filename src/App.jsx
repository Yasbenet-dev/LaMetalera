// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import Login from "./pages/login";
import DashboardLayout from "./layout/DashboardLayout";
import Dashboard from "./pages/dashboard";
import Users from "./pages/users";
import Asistencia from "./pages/asistencia";
import Horarios from "./pages/horarios";
import Pagos from "./pages/pagos";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Área privada */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard principal solo admin */}
          <Route
            index
            element={
              <AdminRoute>
                <Dashboard />
              </AdminRoute>
            }
          />

          {/* Asistencia: admin y worker */}
          <Route path="asistencia" element={<Asistencia />} />

          {/* Solo admin */}
          <Route
            path="usuarios"
            element={
              <AdminRoute>
                <Users />
              </AdminRoute>
            }
          />
          <Route
            path="horarios"
            element={
              <AdminRoute>
                <Horarios />
              </AdminRoute>
            }
          />
          <Route
            path="pagos"
            element={
              <AdminRoute>
                <Pagos />
              </AdminRoute>
            }
          />
        </Route>

        {/* Cualquier otra ruta */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
