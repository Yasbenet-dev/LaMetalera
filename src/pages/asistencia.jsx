// src/pages/asistencia.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { Icon } from "@iconify/react";
import {
  formatChileTimeFromUTC,
  combineDateAndTimeToISO,
} from "../utils/chileTimez";
import { useAuthSession } from "../hooks/useAuthSession";
import { isAdminRole, isWorkerRole } from "../utils/roles";
import ErrorBoundary from "../components/ErrorBoundary";

/* ---------------- Utils ---------------- */

// Convierte "YYYY-MM-DD HH:mm:ss.sss+00" o cadenas parecidas a Date
const toDateSafe = (val) => {
  if (!val) return null;
  try {
    const fixed = typeof val === "string" ? val.replace(" ", "T") : val;
    const d = new Date(fixed);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

// Formatea un timestamp/Date a "HH:MM" para inputs type="time"
const formatTimeForInput = (val) => {
  if (!val) return "";
  try {
    const timeStr = formatChileTimeFromUTC(val);
    return timeStr === "--:--" ? "" : timeStr;
  } catch {
    return "";
  }
};

// Calcula horas/minutos entre entrada y salida (formato "7h 30m" o "—")
const calcularHorasTrabajadas = (entrada, salida) => {
  const a = toDateSafe(entrada);
  const b = toDateSafe(salida);
  if (!a || !b) return "—";

  const diffMs = b - a;
  if (diffMs <= 0 || diffMs > 24 * 60 * 60 * 1000) return "—";

  const h = Math.floor(diffMs / 3600000);
  const m = Math.round((diffMs % 3600000) / 60000);
  return `${h}h ${m}m`;
};

/* ====== FIX DATE-ONLY (sin shift por zona horaria) ====== */
const isYMD = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const fromYMDLocal = (ymd) => {
  if (!isYMD(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
/* ======================================================== */

/* --- horas en decimal (para pagar y sumar) --- */
const getHorasDecimal = (entrada, salida) => {
  const a = toDateSafe(entrada);
  const b = toDateSafe(salida);
  if (!a || !b) return null;

  const diffMs = b - a;
  if (diffMs <= 0 || diffMs > 24 * 60 * 60 * 1000) return null;

  return diffMs / 3600000; // en horas
};

/* --- formato CLP --- */
const formatearCLP = (valor) => {
  if (valor == null || isNaN(valor)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(valor);
};

/*---------------- Modal liviano ---------------- */
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-[92%] max-w-xl rounded-2xl bg-white shadow-xl border border-slate-100">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold text-emerald-700">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
            title="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/*---------------- Toast bonito ---------------- */
function Toast({ type = "info", message, onClose }) {
  if (!message) return null;

  const base =
    "fixed z-50 bottom-4 right-4 px-4 py-3 rounded-2xl shadow-lg text-sm flex items-center gap-2";
  const styles =
    type === "success"
      ? "bg-emerald-600 text-white"
      : type === "error"
      ? "bg-rose-600 text-white"
      : "bg-slate-800 text-white";

  return (
    <div className={`${base} ${styles}`}>
      {type === "success" && (
        <Icon icon="tabler:circle-check" className="w-5 h-5" />
      )}
      {type === "error" && (
        <Icon icon="tabler:alert-circle" className="w-5 h-5" />
      )}
      {type === "info" && (
        <Icon icon="tabler:info-circle" className="w-5 h-5" />
      )}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-xs opacity-80 hover:opacity-100"
      >
        Cerrar
      </button>
    </div>
  );
}

function Asistencias() {
  const { user, loadSession, getCurrentUser } = useAuthSession();

  // cargar sesión una sola vez
  useEffect(() => {
    loadSession?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usuarioActual = user || getCurrentUser?.() || null;
  const isAdmin = isAdminRole(usuarioActual?.rol);
  const isWorker = isWorkerRole(usuarioActual?.rol);

  const [asistencias, setAsistencias] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filtros
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");

  // si es worker, fijamos su propio id como filtroUsuario
  useEffect(() => {
    if (isWorker && usuarioActual?.id) {
      setFiltroUsuario(String(usuarioActual.id));
    }
  }, [isWorker, usuarioActual]);

  // modal agregar
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDay, setNewDay] = useState({
    user_id: "",
    fecha: "",
    hora_entrada: "",
    hora_salida: "",
    observaciones: "",
  });
  const [selectedUserRate, setSelectedUserRate] = useState(null);

  // modal editar
  const [openEdit, setOpenEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editData, setEditData] = useState({
    id: null,
    user_id: "",
    fecha: "",
    hora_entrada: "",
    hora_salida: "",
    observaciones: "",
  });


  // confirm eliminar
  const [deleteTarget, setDeleteTarget] = useState(null);

  // toast
  const [toast, setToast] = useState({ type: "", message: "" });

  // ref para PDF
  const tableRef = useRef(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) =>
        prev.message === message ? { ...prev, message: "" } : prev
      );
    }, 2500);
  };

  /* ------------ cargar usuarios ------------ */
  useEffect(() => {
    let ignore = false;
    const loadUsuarios = async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, apellido, email, pago, tipo_pago")
        .order("nombre", { ascending: true });

      if (!ignore) {
        if (error) {
          setUsuarios([]);
        } else {
          setUsuarios(data ?? []);
        }
      }
    };
    loadUsuarios();
    return () => {
      ignore = true;
    };
  }, []);

  /* ------------ cargar asistencias ------------ */
  const fetchAsistencias = async () => {
  if (!usuarioActual) return;

  setLoading(true);
  setError(null);

  try {
    let query = supabase
      .from("asistencias")
      .select("id, fecha, hora_entrada, hora_salida, observaciones, user_id");

    // === Worker: usa siempre authUser.id ===
    if (isWorker && authUser) {
      if (filtroDesde && filtroHasta) {
        query = query.gte("fecha", filtroDesde).lte("fecha", filtroHasta);
      } else if (filtroDesde) {
        query = query.gte("fecha", filtroDesde);
      } else if (filtroHasta) {
        query = query.lte("fecha", filtroHasta);
      }

      query = query.eq("user_id", authUser.id);
    } 
    
    // === Admin ===
    else if (isAdmin) {
      if (filtroDesde && filtroHasta) {
        query = query.gte("fecha", filtroDesde).lte("fecha", filtroHasta);
      } else if (filtroDesde) {
        query = query.gte("fecha", filtroDesde);
      } else if (filtroHasta) {
        query = query.lte("fecha", filtroHasta);
      }

      if (filtroUsuario) {
        query = query.eq("user_id", filtroUsuario);
      }
    }

    query = query
      .order("fecha", { ascending: false })
      .order("hora_entrada", { ascending: false });

    const { data: rows, error } = await query;
    if (error) throw error;

    const list = rows ?? [];

    const userIds = [
      ...new Set(
        list
          .map((r) => (r?.user_id ? String(r.user_id) : null))
          .filter(Boolean)
      ),
    ];

    let usuariosMap = {};
    if (userIds.length) {
      const { data: uRows, error: uErr } = await supabase
        .from("usuarios")
        .select("id, nombre, apellido, email, pago, tipo_pago")
        .in("id", userIds);

      if (!uErr) {
        usuariosMap = Object.fromEntries(
          (uRows ?? []).map((u) => [String(u.id), u])
        );
      }
    }

    const enriched = list.map((r) => ({
      ...r,
      usuarios: usuariosMap[String(r.user_id)] || null,
    }));

    setAsistencias(enriched);
  } catch (err) {
    setError(err.message || "Error al cargar asistencias");
    setAsistencias([]);
  } finally {
    setLoading(false);
  }
};
// === Nuevo: obtener UID real desde Supabase Auth ===
const [authUser, setAuthUser] = useState(null);

useEffect(() => {
  const loadAuthUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setAuthUser(user);
  };
  loadAuthUser();
}, []);

  useEffect(() => {
    fetchAsistencias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroDesde, filtroHasta, filtroUsuario, usuarioActual]);

  const limpiarFiltros = () => {
    setFiltroDesde("");
    setFiltroHasta("");
    if (isWorker && usuarioActual?.id) {
      setFiltroUsuario(String(usuarioActual.id));
    } else {
      setFiltroUsuario("");
    }
  };

  const recargarDatos = () => fetchAsistencias();

  /* ------------ estadísticas ------------ */
  const obtenerEstadisticas = useMemo(() => {
    const total = asistencias.length;
    let completadas = 0;
    let pendientes = 0;
    let noRegistradas = 0;

    for (const a of asistencias) {
      if (!a?.hora_entrada) noRegistradas++;
      else if (!a?.hora_salida) pendientes++;
      else completadas++;
    }
    return { total, completadas, pendientes, noRegistradas };
  }, [asistencias]);

  /* ------------ resumen global ------------ */
  const resumenGlobal = useMemo(() => {
    let totalHoras = 0;
    let totalCLP = 0;

    for (const a of asistencias) {
      const horas = getHorasDecimal(a.hora_entrada, a.hora_salida);
      if (horas == null) continue;

      const valorHora = Number(a.usuarios?.pago ?? 0);
      totalHoras += horas;

      if (valorHora > 0) {
        totalCLP += horas * valorHora;
      }
    }

    return {
      totalHoras,
      totalCLP,
    };
  }, [asistencias]);

  /* ------------ agregar día (solo admin) ------------ */
  const openAddModal = () => {
    if (!usuarioActual || !isAdmin) {
      showToast(
        "error",
        "Solo el administrador puede registrar asistencias."
      );
      return;
    }

    let tarifa = null;
    if (filtroUsuario && usuarios.length) {
      const u = usuarios.find((x) => String(x.id) === String(filtroUsuario));
      tarifa = u ? u.pago : null;
    }
    setSelectedUserRate(tarifa);

    setNewDay((prev) => ({
      ...prev,
      user_id: filtroUsuario || "",
      fecha: filtroDesde || "",
      hora_entrada: "",
      hora_salida: "",
      observaciones: "",
    }));
    setOpenAdd(true);
  };

  const saveNewDay = async (e) => {
    e.preventDefault();

    if (!usuarioActual || !isAdmin) {
      showToast(
        "error",
        "Solo el administrador puede registrar asistencias."
      );
      return;
    }

    if (!newDay.user_id) {
      showToast("error", "Selecciona un empleado antes de guardar.");
      return;
    }
    if (!newDay.fecha) {
      showToast("error", "Selecciona una fecha para la asistencia.");
      return;
    }
    if (!newDay.hora_entrada) {
      showToast("error", "Indica la hora de ingreso.");
      return;
    }

    setSaving(true);
    try {
      const userId = !isNaN(Number(newDay.user_id))
        ? Number(newDay.user_id)
        : newDay.user_id;

      const horaEntradaISO = combineDateAndTimeToISO(
        newDay.fecha,
        newDay.hora_entrada
      );
      const horaSalidaISO = newDay.hora_salida
        ? combineDateAndTimeToISO(newDay.fecha, newDay.hora_salida)
        : null;

      const { error } = await supabase.rpc("admin_create_asistencia", {
        _admin_id: usuarioActual.id,
        _user_id: userId,
        _fecha: newDay.fecha || null,
        _observaciones: newDay.observaciones || null,
        _hora_entrada: horaEntradaISO,
        _hora_salida: horaSalidaISO,
      });

      if (error) throw error;

      setOpenAdd(false);
      showToast("success", "Asistencia registrada correctamente.");
      await fetchAsistencias();
    } catch (err) {
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes("admin")) {
        showToast(
          "error",
          "Solo un administrador puede registrar asistencias."
        );
      } else {
        showToast(
          "error",
          err.message ||
            "No se pudo guardar la asistencia. Intenta nuevamente."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /* ------------ abrir modal editar (solo admin) ------------ */
 const openEditModal = (row) => {
  const inferredFecha =
    row.fecha ||
    (toDateSafe(row.hora_entrada)
      ? fromYMDLocal(
          toDateSafe(row.hora_entrada).toISOString().slice(0, 10)
        )
          ?.toISOString()
          .slice(0, 10)
      : "") ||
    (toDateSafe(row.hora_entrada)
      ? toDateSafe(row.hora_entrada).toISOString().slice(0, 10)
      : "");

  setEditData({
    id: row.id,
    user_id: row.user_id,
    fecha: inferredFecha || row.fecha || "",
    hora_entrada: formatTimeForInput(row.hora_entrada) || "",
    hora_salida: formatTimeForInput(row.hora_salida) || "",
    observaciones: row.observaciones ?? "",
  });

  setOpenEdit(true);
};
  const handleEditClick = (asistencia) => {
    if (!usuarioActual || !isAdmin) {
      showToast(
        "error",
        "Solo el administrador puede editar asistencias."
      );
      return;
    }
    openEditModal(asistencia);
  };

  /* ------------ guardar edición (solo admin) ------------ */
  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editData.id) return;

    if (!usuarioActual || !isAdmin) {
      showToast(
        "error",
        "Solo el administrador puede editar asistencias."
      );
      return;
    }

    setSavingEdit(true);
    try {
      const horaEntradaISO = editData.hora_entrada
        ? combineDateAndTimeToISO(editData.fecha, editData.hora_entrada)
        : null;
      const horaSalidaISO = editData.hora_salida
        ? combineDateAndTimeToISO(editData.fecha, editData.hora_salida)
        : null;

      const { error } = await supabase.rpc("admin_update_asistencia", {
        _admin_id: usuarioActual.id,
        _id: editData.id,
        _observaciones: editData.observaciones || null,
        _hora_entrada: horaEntradaISO,
        _hora_salida: horaSalidaISO,
      });

      if (error) throw error;


      setOpenEdit(false);
      showToast("success", "Asistencia actualizada correctamente.");
      await fetchAsistencias();
    } catch (err) {
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes("admin")) {
        showToast(
          "error",
          "Solo un administrador puede editar asistencias."
        );
      } else {
        showToast(
          "error",
          err.message || "No se pudo actualizar el registro."
        );
      }
    } finally {
      setSavingEdit(false);
    }
  };

  /* ------------ eliminar asistencia (solo admin) ------------ */
  const handleDeleteAsistencia = (asistencia) => {
    if (!usuarioActual || !isAdmin) {
      showToast(
        "error",
        "Solo el administrador puede eliminar asistencias."
      );
      return;
    }
    setDeleteTarget(asistencia);
  };

  const confirmDeleteAsistencia = async () => {
    if (!deleteTarget || !usuarioActual || !isAdmin) {
      setDeleteTarget(null);
      return;
    }

    try {
      const { error } = await supabase.rpc("admin_delete_asistencia", {
        _admin_id: usuarioActual.id,
        _id: deleteTarget.id,
      });

      if (error) throw error;

      showToast("success", "Asistencia eliminada correctamente.");
      setDeleteTarget(null);
      await fetchAsistencias();
    } catch (err) {
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes("admin")) {
        showToast(
          "error",
          "Solo un administrador puede eliminar asistencias."
        );
      } else {
        showToast(
          "error",
          err.message || "No se pudo eliminar la asistencia."
        );
      }
      setDeleteTarget(null);
    }
  };

  /* ------------ Exportar PDF ------------ */
  const handleExportPDF = () => {
    if (!tableRef.current) return;
    const content = tableRef.current.innerHTML;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    const nombreUsuarioFiltro =
      filtroUsuario && usuarios.length
        ? (() => {
            const u = usuarios.find(
              (x) => String(x.id) === String(filtroUsuario)
            );
            return u ? `${u.nombre} ${u.apellido}` : "—";
          })()
        : "Todos";

    win.document.write(`
      <html>
        <head>
          <title>Reporte de Asistencias</title>
          <style>
            body { font-family: sans-serif; padding: 16px; }
            h1 { text-align: center; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; }
            th { background: #f2f2f2; }
            .meta { margin-bottom: 12px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Reporte de Asistencias</h1>
          <div class="meta">
            <p><b>Desde:</b> ${filtroDesde || "—"} | <b>Hasta:</b> ${
      filtroHasta || "—"
    }</p>
            <p><b>Usuario:</b> ${nombreUsuarioFiltro}</p>
            <p><b>Total horas:</b> ${resumenGlobal.totalHoras.toFixed(2)} h</p>
            <p><b>Total a pagar:</b> ${formatearCLP(
              Math.round(resumenGlobal.totalCLP)
            )}</p>
          </div>
          ${content}
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
  };

  /* ------------ Loading ------------ */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        <span className="ml-3 text-emerald-700">Cargando asistencias...</span>
      </div>
    );
  }

  /* ------------ UI ------------ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-white via-emerald-50 to-slate-50 rounded-2xl shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-700 mb-1">
              Gestión de Asistencias
            </h1>
            <p className="text-slate-500">
              {isWorker
                ? "Historial de tus asistencias"
                : "Registro y control de asistencias del personal"}
            </p>
            {error && <p className="text-rose-600 text-sm mt-2">⚠️ {error}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isAdmin && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 shadow"
              >
                <Icon icon="tabler:circle-plus" className="w-5 h-5" />
                Agregar día
              </button>
            )}
            <button
              onClick={recargarDatos}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-white hover:bg-sky-600 shadow"
            >
              <Icon icon="tabler:refresh" className="w-5 h-5" />
              Actualizar
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-white hover:bg-rose-600 shadow"
            >
              <Icon icon="tabler:file-type-pdf" className="w-5 h-5" />
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow p-6 border border-slate-100">
        <h2 className="text-lg font-semibold text-emerald-700 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-1">
              Usuario
            </label>
            <select
              value={filtroUsuario}
              onChange={(e) => {
                if (isWorker) return; // worker no puede cambiar
                setFiltroUsuario(e.target.value);
              }}
              disabled={isWorker}
              className="w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-50"
            >
              {isWorker ? (
                <option value={filtroUsuario}>
                  Tus propias asistencias
                </option>
              ) : (
                <>
                  <option value="">Todos los usuarios</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={limpiarFiltros}
            className="bg-slate-500 text-white py-2 px-4 rounded-xl hover:bg-slate-600"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-100 via-white to-slate-50 rounded-2xl shadow p-4 border border-slate-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-700">
              {obtenerEstadisticas.total}
            </div>
            <div className="text-sm text-slate-500">Total</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-sky-100 via-white to-slate-50 rounded-2xl shadow p-4 border border-slate-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-sky-700">
              {obtenerEstadisticas.completadas}
            </div>
            <div className="text-sm text-slate-500">Completadas</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 via-white to-slate-50 rounded-2xl shadow p-4 border border-slate-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">
              {obtenerEstadisticas.pendientes}
            </div>
            <div className="text-sm text-slate-500">Pendientes</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-50 via-white to-slate-50 rounded-2xl shadow p-4 border border-slate-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-rose-500">
              {obtenerEstadisticas.noRegistradas}
            </div>
            <div className="text-sm text-slate-500">No registradas</div>
          </div>
        </div>
      </div>

      {/* Resumen global */}
      <div className="bg-white rounded-2xl shadow p-4 border border-slate-100 mb-6">
        <h3 className="text-sm font-semibold text-emerald-700 mb-2">
          Resumen del período filtrado
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">Horas trabajadas totales</p>
            <p className="text-xl font-bold text-slate-800">
              {resumenGlobal.totalHoras.toFixed(2)} h
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Monto total a pagar</p>
            <p className="text-xl font-bold text-emerald-600">
              {formatearCLP(Math.round(resumenGlobal.totalCLP))}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow overflow-hidden border border-slate-100">
        <div className="overflow-x-auto" ref={tableRef}>
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Entrada
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Salida
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Horas
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Tipo pago
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Monto calc.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {asistencias.map((asistencia) => {
                const u = asistencia.usuarios;
                const iniciales = u
                  ? `${u?.nombre?.[0] ?? ""}${u?.apellido?.[0] ?? ""}` || "ID"
                  : String(asistencia.user_id ?? "??")
                      .slice(0, 2)
                      .toUpperCase();

                const nombre = u
                  ? `${u?.nombre ?? ""} ${u?.apellido ?? ""}`.trim()
                  : `ID: ${asistencia.user_id ?? "—"}`;
                const email = u?.email ?? "—";

                const entradaTxt = asistencia.hora_entrada
                  ? formatChileTimeFromUTC(asistencia.hora_entrada)
                  : "--:--";

                const salidaTxt = asistencia.hora_salida
                  ? formatChileTimeFromUTC(asistencia.hora_salida)
                  : "--:--";

                const fechaTxt = asistencia.fecha
                  ? (() => {
                      const d = fromYMDLocal(asistencia.fecha);
                      return d
                        ? d.toLocaleDateString("es-ES")
                        : asistencia.fecha;
                    })()
                  : "—";

                const horasDecimales = getHorasDecimal(
                  asistencia.hora_entrada,
                  asistencia.hora_salida
                );

                return (
                  <tr key={asistencia.id} className="hover:bg-emerald-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="bg-emerald-100 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                          <span className="text-emerald-700 text-xs font-bold">
                            {iniciales}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {nombre}
                          </p>
                          <p className="text-xs text-slate-400">{email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{fechaTxt}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono text-slate-700">
                        {entradaTxt}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono text-slate-700">
                        {salidaTxt}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">
                        {calcularHorasTrabajadas(
                          asistencia.hora_entrada,
                          asistencia.hora_salida
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {horasDecimales != null
                          ? `${horasDecimales.toFixed(2)} h`
                          : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">
                        {asistencia.usuarios?.tipo_pago
                          ? asistencia.usuarios.tipo_pago
                          : "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {asistencia.usuarios?.pago
                          ? `${formatearCLP(
                              Number(asistencia.usuarios.pago)
                            )}/h`
                          : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">
                        {(() => {
                          const horas = getHorasDecimal(
                            asistencia.hora_entrada,
                            asistencia.hora_salida
                          );
                          const valorHora = Number(
                            asistencia.usuarios?.pago ?? 0
                          );
                          if (horas == null || !valorHora) return "—";
                          return formatearCLP(Math.round(horas * valorHora));
                        })()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          !asistencia.hora_entrada
                            ? "bg-slate-100 text-slate-800"
                            : !asistencia.hora_salida
                            ? "bg-orange-100 text-orange-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {!asistencia.hora_entrada
                          ? "No registrado"
                          : !asistencia.hora_salida
                          ? "En curso"
                          : "Completado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                          {/* Editar */}
                          <button
                            onClick={() => handleEditClick(asistencia)}
                            className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-white
                                      px-2.5 py-1.5 text-xs sm:px-3 sm:py-1.5 sm:text-sm
                                      hover:bg-amber-600 shadow focus:outline-none focus:ring-2 focus:ring-amber-300"
                            title="Editar asistencia"
                          >
                            <Icon className="w-4 h-4 sm:mr-1" icon="tabler:pencil" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => handleDeleteAsistencia(asistencia)}
                            className="inline-flex items-center justify-center rounded-lg bg-red-500 text-white
                                      px-2.5 py-1.5 text-xs sm:px-3 sm:py-1.5 sm:text-sm
                                      hover:bg-red-600 shadow focus:outline-none focus:ring-2 focus:ring-red-300"
                            title="Eliminar asistencia"
                          >
                            <Icon className="w-4 h-4 sm:mr-1" icon="tabler:trash" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {asistencias.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl text-slate-200 mb-4">📊</div>
            <p className="text-slate-500">No hay asistencias registradas</p>
            {(filtroDesde || filtroHasta || filtroUsuario) && (
              <p className="text-sm text-slate-400 mt-1">
                Intenta con otros filtros o{" "}
                <button
                  onClick={limpiarFiltros}
                  className="text-sky-600 hover:underline"
                >
                  limpia los filtros
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal Agregar */}
      <Modal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Agregar día trabajado"
      >
        <form onSubmit={saveNewDay} className="space-y-4">
          {/* Solo se muestra porque solo un admin puede abrir este modal */}
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-1">
              Empleado
            </label>
            <select
              value={newDay.user_id}
              onChange={(e) => {
                const val = e.target.value;
                setNewDay((p) => ({ ...p, user_id: val }));
                const found = usuarios.find(
                  (u) => String(u.id) === String(val)
                );
                setSelectedUserRate(found ? found.pago : null);
              }}
              className="w-full rounded-md border border-slate-200 px-3 py-2"
              required
            >
              <option value="">Selecciona un empleado</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido} — {u.email}
                </option>
              ))}
            </select>
            {selectedUserRate != null && (
              <p className="text-xs text-slate-400 mt-1">
                Valor/hora actual: {formatearCLP(Number(selectedUserRate))}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={newDay.fecha}
              onChange={(e) =>
                setNewDay((p) => ({ ...p, fecha: e.target.value }))
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-emerald-700 mb-1">
                Hora de ingreso
              </label>
              <input
                type="time"
                value={newDay.hora_entrada}
                onChange={(e) =>
                  setNewDay((p) => ({ ...p, hora_entrada: e.target.value }))
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-700 mb-1">
                Hora de salida
              </label>
              <input
                type="time"
                value={newDay.hora_salida}
                onChange={(e) =>
                  setNewDay((p) => ({ ...p, hora_salida: e.target.value }))
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              rows={3}
              value={newDay.observaciones}
              onChange={(e) =>
                setNewDay((p) => ({
                  ...p,
                  observaciones: e.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2"
              placeholder="Ej: turno extra…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenAdd(false)}
              className="rounded-md border px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        title="Editar asistencia"
      >
        <form onSubmit={saveEdit} className="space-y-4">
          {/* Solo admin puede llegar acá */}
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-1">
              Empleado
            </label>
            <input
              type="text"
              value={(() => {
                const u = usuarios.find(
                  (x) => String(x.id) === String(editData.user_id)
                );
                return u
                  ? `${u.nombre} ${u.apellido} — ${u.email}`
                  : `ID: ${editData.user_id}`;
              })()}
              readOnly
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-emerald-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={editData.fecha || ""}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, fecha: e.target.value }))
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-emerald-700 mb-1">
                Hora de ingreso
              </label>
              <input
                type="time"
                value={editData.hora_entrada || ""}
                onChange={(e) =>
                  setEditData((p) => ({
                    ...p,
                    hora_entrada: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-700 mb-1">
                Hora de salida
              </label>
              <input
                type="time"
                value={editData.hora_salida || ""}
                onChange={(e) =>
                  setEditData((p) => ({
                    ...p,
                    hora_salida: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-1">
              Observaciones
            </label>
            <textarea
              rows={3}
              value={editData.observaciones || ""}
              onChange={(e) =>
                setEditData((p) => ({
                  ...p,
                  observaciones: e.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2"
              placeholder="Opcional"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenEdit(false)}
              className="rounded-md border px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {savingEdit ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirmar eliminación"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            ¿Estás seguro de que deseas eliminar esta asistencia?
            <br />
            Esta acción no se puede deshacer.
          </p>
          {deleteTarget && (
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <p>
                <b>ID:</b> {deleteTarget.id}
              </p>
              <p>
                <b>Fecha:</b> {deleteTarget.fecha}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-md border px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDeleteAsistencia}
              className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
            >
              Eliminar definitivamente
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      <Toast
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, message: "" }))}
      />
    </div>
  );
}

const AsistenciasPage = () => (
  <ErrorBoundary>
    <Asistencias />
  </ErrorBoundary>
);

export default AsistenciasPage;




