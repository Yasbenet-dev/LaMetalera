import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import CurrentUserName from "../components/CurrentUserName";
import { Icon } from '@iconify/react';
import ErrorBoundary from "../components/ErrorBoundary";

// Helpers
const asArray = (v) => (Array.isArray(v) ? v : []);
const clean = (arr) => asArray(arr).filter(Boolean);

const toDateMaybe = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
      return new Date(`2000-01-01T${value}`);
    }
    return new Date(value);
  }
  return null;
};

const fmtDate = (v) => {
  const d = toDateMaybe(v);
  return d ? d.toLocaleDateString("es-ES") : "-";
};

const fmtTime = (v) => {
  const d = toDateMaybe(v);
  return d ? d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "--:--";
};

// StatCard moderno
const StatCard = ({ title, value, icon, color, description }) => {
  const colorClasses = {
    users: "bg-gradient-to-br from-emerald-100 via-sky-50 to-white text-emerald-700 border-l-4 border-emerald-400",
    asistencias: "bg-gradient-to-br from-sky-100 via-white to-sky-50 text-sky-700 border-l-4 border-sky-400",
    hoy: "bg-gradient-to-br from-orange-50 via-white to-orange-100 text-orange-700 border-l-4 border-orange-400",
    pendientes: "bg-gradient-to-br from-rose-50 via-white to-rose-100 text-rose-700 border-l-4 border-rose-400",
  };

  const iconBg = {
    users: "bg-emerald-200 text-emerald-600",
    asistencias: "bg-sky-200 text-sky-600",
    hoy: "bg-orange-200 text-orange-600",
    pendientes: "bg-rose-200 text-rose-600",
  };

  return (
    <div className={`rounded-2xl shadow-md p-5 flex flex-col gap-2 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">{title}</span>
        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full shadow ${iconBg[color]}`}>
          {icon}
        </span>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{description}</div>
    </div>
  );
};

// AsistenciaItem
const AsistenciaItem = ({ asistencia }) => {
  const u = asistencia?.usuario;
  const nombreCompleto = u ? `${u?.nombre ?? ""} ${u?.apellido ?? ""}`.trim() : "Usuario no encontrado";
  const fechaBase = asistencia?.fecha || asistencia?.hora_entrada || null;
  const entradaTxt = fmtTime(asistencia?.hora_entrada);
  const salidaTxt = asistencia?.hora_salida ? fmtTime(asistencia.hora_salida) : "aun no marca salida";

  return (
    <div className="flex items-center justify-between p-3 border rounded-xl hover:bg-sky-50 transition">
      <div className="flex-1">
        <p className="font-medium text-sm text-slate-800">{nombreCompleto || "—"}</p>
        <p className="text-[11px] text-slate-400">ID: {asistencia?.user_id ?? "—"}</p>
        <p className="text-xs text-slate-500">{fmtDate(fechaBase)}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono">
          {entradaTxt} → {salidaTxt}
        </p>
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            asistencia?.hora_salida ? "bg-emerald-400" : "bg-rose-400"
          }`}
        />
      </div>
    </div>
  );
};

// UsuarioItem
const UsuarioItem = ({ usuario }) => (
  <div className="flex items-center p-3 border rounded-xl hover:bg-emerald-50 transition">
    <div className="flex-shrink-0 w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
      <span className="text-sky-600 font-semibold">
        {(usuario?.nombre?.charAt(0) ?? "") + (usuario?.apellido?.charAt(0) ?? "") || "?"}
      </span>
    </div>
    <div className="ml-3 flex-1">
      <p className="font-medium text-sm text-slate-800">
        {(usuario?.nombre ?? "—") + " " + (usuario?.apellido ?? "")}
      </p>
      <p className="text-xs text-slate-500">{usuario?.email ?? "—"}</p>
    </div>
    <div className="text-right">
      <p className="text-xs text-slate-400">{fmtDate(usuario?.created_at)}</p>
    </div>
  </div>
);

// QuickAction
const QuickAction = ({ icon, title, description, onClick, color }) => {
  const colorClasses = {
    blue: "hover:bg-sky-50 border-sky-200 text-sky-700",
    green: "hover:bg-emerald-50 border-emerald-200 text-emerald-700",
    orange: "hover:bg-orange-50 border-orange-200 text-orange-700",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-2 rounded-xl transition-all duration-200 ${colorClasses[color]} hover-lift`}
    >
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm opacity-75">{description}</p>
        </div>
      </div>
    </button>
  );
};

// BarChartColumn SUAVE Y UN SOLO COLOR
const BarChartColumn = ({ dia, count, max }) => {
  const height = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center flex-1">
      <div className="text-xs text-emerald-700 mb-2">{dia}</div>
      <div className="w-full flex items-end justify-center h-32">
        <div
          style={{
            width: "80%",
            height: `${height}%`,
            minHeight: "18px",
            background: "#50ec9cff", 
            transition: "all 0.3s",
            borderRadius: "9999px",
            boxShadow: "0 2px 8px 0 rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        />
      </div>
      <div className="text-xs font-semibold mt-2 text-emerald-700">{count}</div>
    </div>
  );
};
// Dashboard principal
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    totalAsistencias: 0,
    asistenciasHoy: 0,
    asistenciasPendientes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentAsistencias, setRecentAsistencias] = useState([]);
  const [recentUsuarios, setRecentUsuarios] = useState([]);
  const [asistenciasPorDia, setAsistenciasPorDia] = useState([]);

  // Modal
  const [openAddModal, setOpenAddModal] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalUsuarios, setModalUsuarios] = useState([]);
  const [modalNewDay, setModalNewDay] = useState({
    user_id: "",
    fecha: "",
    hora_entrada: "",
    hora_salida: "",
    observaciones: "",
  });

  useEffect(() => {
    let mounted = true;
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, apellido, email")
        .order("nombre", { ascending: true });
      if (!mounted) return;
      if (error) {
        setModalUsuarios([]);
      } else {
        setModalUsuarios(data ?? []);
      }
    };
    loadUsers();
    return () => (mounted = false);
  }, []);

  const combineDateAndTimeToISO = (fecha, time) => {
    if (!fecha || !time) return null;
    const local = new Date(`${fecha}T${time}:00`);
    if (Number.isNaN(local.getTime())) return null;
    return local.toISOString();
  };

  const saveModalAsistencia = async (ev) => {
    ev?.preventDefault();
    if (!modalNewDay.user_id) return alert("Selecciona un usuario.");
    if (!modalNewDay.fecha) return alert("Selecciona una fecha.");
    if (!modalNewDay.hora_entrada) return alert("Indica la hora de ingreso.");
    setModalSaving(true);
    try {
      const payload = {
        user_id: modalNewDay.user_id,
        fecha: modalNewDay.fecha || null,
        hora_entrada: modalNewDay.hora_entrada
          ? combineDateAndTimeToISO(modalNewDay.fecha, modalNewDay.hora_entrada)
          : null,
        hora_salida: modalNewDay.hora_salida
          ? combineDateAndTimeToISO(modalNewDay.fecha, modalNewDay.hora_salida)
          : null,
        observaciones: modalNewDay.observaciones || null,
      };
      const { error } = await supabase.from("asistencias").insert([payload]);
      if (error) throw error;
      setOpenAddModal(false);
      window.dispatchEvent(new CustomEvent("asistencia-saved"));
    } catch (err) {
      alert(err.message || "No se pudo guardar el día.");
    } finally {
      setModalSaving(false);
      setModalNewDay({ user_id: "", fecha: "", hora_entrada: "", hora_salida: "", observaciones: "" });
    }
  };

  const procesarAsistenciasPorDia = (asistencias) => {
    const conteo = {};
    asArray(asistencias).forEach((a) => {
      if (a?.fecha) conteo[a.fecha] = (conteo[a.fecha] || 0) + 1;
    });
    return Object.entries(conteo)
      .map(([fecha, count]) => ({
        fecha: new Date(fecha).toLocaleDateString("es-ES", { weekday: "short" }),
        count,
        fechaCompleta: fecha,
      }))
      .sort((a, b) => new Date(a.fechaCompleta) - new Date(b.fechaCompleta))
      .slice(-7);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split("T")[0];
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

      const { count: totalUsuarios = 0 } = await supabase
        .from("usuarios")
        .select("id", { count: "exact", head: true });

      const { count: totalAsistencias = 0 } = await supabase
        .from("asistencias")
        .select("id", { count: "exact", head: true });

      const { count: asistenciasHoy = 0 } = await supabase
        .from("asistencias")
        .select("id", { count: "exact", head: true })
        .eq("fecha", today);

      const { count: asistenciasPendientes = 0 } = await supabase
        .from("asistencias")
        .select("id", { count: "exact", head: true })
        .eq("fecha", today)
        .is("hora_salida", null);

      const fetchRecentAsistencias = async () => {
        const todayLocal = new Date().toISOString().split("T")[0];
        let { data: rows } = await supabase
          .from("asistencias")
          .select("id, user_id, fecha, hora_entrada, hora_salida")
          .eq("fecha", todayLocal)
          .not("hora_entrada", "is", null)
          .order("hora_entrada", { ascending: false, nullsFirst: false })
          .limit(3);

        if (!rows || rows.length === 0) {
          const { data: lastDateRow } = await supabase
            .from("asistencias")
            .select("fecha")
            .order("fecha", { ascending: false })
            .limit(1);

          const lastDate = lastDateRow?.[0]?.fecha;

          if (lastDate) {
            const { data: rowsLatest } = await supabase
              .from("asistencias")
              .select("id, user_id, fecha, hora_entrada, hora_salida")
              .eq("fecha", lastDate)
              .not("hora_entrada", "is", null)
              .order("hora_entrada", { ascending: false, nullsFirst: false })
              .limit(3);

            rows = rowsLatest ?? [];
          } else {
            rows = [];
          }
        }

        const userIds = [...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))];

        let usuariosMap = {};
        if (userIds.length) {
          const { data: users } = await supabase
            .from("usuarios")
            .select("id, nombre, apellido, email")
            .in("id", userIds);

          usuariosMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
        }

        const enriched = (rows ?? []).map((r) => ({
          ...r,
          usuario: usuariosMap[r.user_id] || null,
        }));

        setRecentAsistencias(enriched);
      };

      await fetchRecentAsistencias();

      const { data: usuariosDataRaw } = await supabase
        .from("usuarios")
        .select("id, nombre, apellido, email, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      const usuariosData = clean(usuariosDataRaw);

      const { data: asistenciasSemanalesRaw } = await supabase
        .from("asistencias")
        .select("fecha")
        .gte("fecha", startOfWeekStr)
        .lte("fecha", today);

      const asistenciasSemanales = clean(asistenciasSemanalesRaw);
      const asistenciasPorDiaData = procesarAsistenciasPorDia(asistenciasSemanales);

      setStats({
        totalUsuarios,
        totalAsistencias,
        asistenciasHoy,
        asistenciasPendientes,
      });
      setRecentUsuarios(usuariosData);
      setAsistenciasPorDia(asistenciasPorDiaData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const onSaved = () => fetchDashboardData();
    window.addEventListener("asistencia-saved", onSaved);
    return () => window.removeEventListener("asistencia-saved", onSaved);
  }, []);

  const getHoraActual = () =>
    new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  const getDiaActual = () =>
    new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
        <span className="ml-3 text-sky-700">Cargando dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center p-6 bg-orange-50 rounded-lg">
          <div className="text-orange-600 text-2xl mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Error de conexión</h3>
          <p className="text-orange-700 mb-4">{error}</p>
          <p className="text-sm text-orange-600">Mostrando datos de ejemplo para demostración</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-white via-sky-50 to-emerald-50 rounded-2xl shadow-md p-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Panel de Control</h1>
            <p className="text-slate-500">
              Bienvenido/a, <CurrentUserName className="font-semibold" />
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-600">{getHoraActual()}</p>
            <p className="text-sm text-slate-500">{getDiaActual()}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Usuarios"
          value={stats.totalUsuarios}
          icon={<Icon icon="tabler:users" className="w-7 h-7" />}
          color="users"
          description="Usuarios registrados en el sistema"
        />
        <StatCard
          title="Total Asistencias"
          value={stats.totalAsistencias}
          icon={<Icon icon="tabler:clipboard-list" className="w-7 h-7" />}
          color="asistencias"
          description="Registros de asistencia totales"
        />
        <StatCard
          title="Asistencias Hoy"
          value={stats.asistenciasHoy}
          icon={<Icon icon="tabler:check" className="w-7 h-7" />}
          color="hoy"
          description="Registros de hoy"
        />
        <StatCard
          title="Pendientes Hoy"
          value={stats.asistenciasPendientes}
          icon={<Icon icon="tabler:alarm" className="w-7 h-7" />}
          color="pendientes"
          description="Sin hora de salida"
        />
      </div>

      {/* Gráfico + Acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6 border border-slate-100">
          <h2 className="text-lg font-semibold text-sky-700 mb-4">Asistencias de la Semana</h2>
          <div className="flex items-end h-48 space-x-2">
            {asArray(asistenciasPorDia).map((dia, index) => (
              <BarChartColumn
                key={index}
                dia={dia.fecha}
                count={dia.count}
                max={Math.max(...asArray(asistenciasPorDia).map((d) => d.count), 1)}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border border-slate-100">
          <h2 className="text-lg font-semibold text-emerald-700 mb-4">Acciones Rápidas</h2>
          <div className="space-y-3">
            <QuickAction
              icon={<Icon icon="tabler:clipboard-list" className="w-7 h-7" />}
              title="Registrar Asistencia"
              description="Registro manual de asistencia"
              onClick={() => setOpenAddModal(true)}
              color="blue"
            />
            <QuickAction
              icon={<Icon icon="tabler:users" className="w-7 h-7" />}
              title="Gestionar Usuarios"
              description="Administrar usuarios del sistema"
              onClick={() => (window.location.href = "/dashboard/usuarios")}
              color="green"
            />
            <QuickAction
              icon={<Icon icon="tabler:alarm" className="w-7 h-7" />}
              title="Configurar Horarios"
              description="Gestionar horarios de trabajo"
              onClick={() => (window.location.href = "/dashboard/horarios")}
              color="orange"
            />
          </div>
        </div>
      </div>

      {/* Listados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow p-6 border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-sky-700">Asistencias Recientes</h2>
            <span className="text-sm text-slate-400">Últimos 3 registros</span>
          </div>
          <div className="space-y-3">
            {asArray(recentAsistencias).length > 0 ? (
              clean(recentAsistencias).map((asistencia) => (
                <AsistenciaItem key={asistencia.id ?? crypto.randomUUID()} asistencia={asistencia} />
              ))
            ) : (
              <p className="text-slate-400 text-center py-4">No hay asistencias registradas</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-emerald-700">Usuarios Recientes</h2>
            <span className="text-sm text-slate-400">Últimos 3 registrados</span>
          </div>
          <div className="space-y-3">
            {asArray(recentUsuarios).length > 0 ? (
              clean(recentUsuarios).map((usuario) => (
                <UsuarioItem key={usuario.id ?? crypto.randomUUID()} usuario={usuario} />
              ))
            ) : (
              <p className="text-slate-400 text-center py-4">No hay usuarios registrados</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal para agregar asistencia */}
      {openAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenAddModal(false)} />
          <div className="relative z-10 w-[92%] max-w-xl rounded-2xl bg-white shadow-xl border border-slate-100">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-lg font-semibold text-sky-700">Agregar día trabajado</h3>
              <button onClick={() => setOpenAddModal(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100">✕</button>
            </div>
            <form onSubmit={saveModalAsistencia} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-sky-700 mb-1">Empleado</label>
                <select
                  value={modalNewDay.user_id}
                  onChange={(e) => setModalNewDay((p) => ({ ...p, user_id: e.target.value }))}
                  className="w-full rounded-md border border-sky-200 px-3 py-2"
                  required
                >
                  <option value="">Selecciona un empleado</option>
                  {modalUsuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido} — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-sky-700 mb-1">Fecha</label>
                <input type="date" value={modalNewDay.fecha} onChange={(e) => setModalNewDay((p) => ({ ...p, fecha: e.target.value }))} className="w-full rounded-md border border-sky-200 px-3 py-2" required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-sky-700 mb-1">Hora de ingreso</label>
                  <input type="time" value={modalNewDay.hora_entrada} onChange={(e) => setModalNewDay((p) => ({ ...p, hora_entrada: e.target.value }))} className="w-full rounded-md border border-sky-200 px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sky-700 mb-1">Hora de salida</label>
                  <input type="time" value={modalNewDay.hora_salida} onChange={(e) => setModalNewDay((p) => ({ ...p, hora_salida: e.target.value }))} className="w-full rounded-md border border-sky-200 px-3 py-2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-sky-700 mb-1">Observaciones (opcional)</label>
                <textarea rows={3} value={modalNewDay.observaciones} onChange={(e) => setModalNewDay((p) => ({ ...p, observaciones: e.target.value }))} className="w-full rounded-md border border-sky-200 px-3 py-2" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpenAddModal(false)} className="rounded-md border px-4 py-2 text-sky-700 hover:bg-sky-50">Cerrar</button>
                <button type="submit" disabled={modalSaving} className="rounded-md bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600 disabled:opacity-60">
                  {modalSaving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardPage = () => (
  <ErrorBoundary>
    <Dashboard />
  </ErrorBoundary>
);

export default DashboardPage;
