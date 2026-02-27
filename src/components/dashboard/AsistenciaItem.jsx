// src/components/dashboard/AsistenciaItem.jsx
import React from "react";

// ---- Helpers: formatear en UTC para que se vea como en la BD ----
const timeUTC = (v) =>
  v
    ? new Date(v).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      })
    : "--:--";

const dateUTC = (v) => {
  if (!v) return "-";
  // Si ya es 'YYYY-MM-DD', muéstralo directo (o formatealo si prefieres)
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
  }
  return new Date(v).toLocaleDateString("es-ES", { timeZone: "UTC" });
};

const AsistenciaItem = ({ asistencia, calcularHoras }) => {
  // Acepta 'usuario' (preferido) o 'usuarios' por compatibilidad
  const usuario = asistencia?.usuario || asistencia?.usuarios || null;

  const nombreCompleto = usuario
    ? `${usuario?.nombre ?? ""} ${usuario?.apellido ?? ""}`.trim()
    : "Usuario no encontrado";

  const entradaTxt = timeUTC(asistencia?.hora_entrada);
  const salidaTxt = asistencia?.hora_salida
    ? timeUTC(asistencia.hora_salida)
    : "aun no marca salida";

  const fechaTxt = dateUTC(asistencia?.fecha || asistencia?.hora_entrada);

  const calcularHorasFallback = (e, s) => {
    if (!e || !s) return null;
    const he = new Date(e);
    const hs = new Date(s);
    const h = (hs - he) / (1000 * 60 * 60);
    return Number.isFinite(h) ? h.toFixed(1) : null;
  };

  const horasTrabajadas =
    asistencia?.hora_entrada && asistencia?.hora_salida
      ? (calcularHoras || calcularHorasFallback)(
          asistencia.hora_entrada,
          asistencia.hora_salida
        )
      : null;

  const estado = !asistencia?.hora_entrada
    ? { text: "No registrado", color: "bg-gray-400" }
    : !asistencia?.hora_salida
    ? { text: "En curso", color: "bg-yellow-400" }
    : { text: "Completado", color: "bg-green-400" };

  const initials =
    (usuario?.nombre?.charAt(0) ?? "") + (usuario?.apellido?.charAt(0) ?? "") || "??";

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">
              {nombreCompleto || "—"}
            </p>
            <p className="text-xs text-gray-500 truncate">{usuario?.email || "Sin email"}</p>
            <p className="text-[11px] text-gray-400">ID: {asistencia?.user_id ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="ml-4 text-right">
        <div className="flex items-center justify-end space-x-3">
          <div className="text-right">
            <p className="text-sm font-mono text-gray-900">
              {entradaTxt} → {salidaTxt}
            </p>
            <p className="text-xs text-gray-500">{fechaTxt}</p>
          </div>
          <div className="flex flex-col items-center">
            <span className={`w-3 h-3 ${estado.color} rounded-full mb-1`} />
            {horasTrabajadas && (
              <span className="text-xs font-semibold text-gray-700">{horasTrabajadas}h</span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">{estado.text}</p>
      </div>
    </div>
  );
};

export default AsistenciaItem;
