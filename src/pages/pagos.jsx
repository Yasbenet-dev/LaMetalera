// src/pages/pagos.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ErrorBoundary from "../components/ErrorBoundary";

/* ==== Utils ==== */
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

const diffMin = (a, b) => {
  const da = toDateSafe(a),
    db = toDateSafe(b);
  if (!da || !db) return 0;
  const ms = db - da;
  if (ms <= 0 || ms > 86400000) return 0;
  return Math.round(ms / 60000);
};

const fmtCLP = (n) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n) || 0));

const isWithinYMD = (ymd, desde, hasta) => {
  if (!ymd) return false;
  if (desde && ymd < desde) return false;
  if (hasta && ymd > hasta) return false;
  return true;
};

/* ==== Página ==== */
function Pagos() {
  const [usuarios, setUsuarios] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [usuarioFiltro, setUsuarioFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [editUser, setEditUser] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: users, error: userError } = await supabase
        .from("usuarios")
        .select("id, nombre, apellido, email, username, tipo_pago, pago")
        .order("id", { ascending: true });
      if (userError) throw userError;

      const { data: asist, error: asistError } = await supabase
        .from("asistencias")
        .select("user_id, fecha, hora_entrada, hora_salida");
      if (asistError) throw asistError;

      setUsuarios(users || []);
      setAsistencias(asist || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = useMemo(
    () =>
      !usuarioFiltro
        ? usuarios
        : usuarios.filter((u) => String(u.id) === String(usuarioFiltro)),
    [usuarios, usuarioFiltro]
  );

  const calcularHoras = (userId) => {
    const regs = asistencias.filter(
      (a) =>
        String(a.user_id) === String(userId) &&
        (!desde || !a.fecha || isWithinYMD(a.fecha, desde, hasta)) &&
        (!hasta || !a.fecha || isWithinYMD(a.fecha, desde, hasta))
    );

    let totalMin = 0;
    for (const r of regs) totalMin += diffMin(r.hora_entrada, r.hora_salida);
    const hh = Math.floor(totalMin / 60),
      mm = totalMin % 60;
    return { minutos: totalMin, horas: totalMin / 60, etiqueta: `${hh}h ${mm}m` };
  };

  const handleEdit = (user) =>
    setEditUser({ ...user, pago: user.pago ?? 0, tipo_pago: user.tipo_pago ?? "" });
  const handleCancel = () => setEditUser(null);

  // === Guardar usando RPC (evita RLS "permission denied") ===
  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const stored = localStorage.getItem("user");
      const admin = stored ? JSON.parse(stored) : null;
      if (!admin?.id) throw new Error("Sesión no válida");

      const payload = {
        _admin_id: admin.id, // uuid del admin logueado
        _user_id: editUser.id, // uuid del usuario a actualizar
        _pago:
          editUser.pago !== "" && editUser.pago != null
            ? Number(editUser.pago)
            : null,
        _tipo_pago: editUser.tipo_pago || null,
      };

      const { error: rpcErr } = await supabase.rpc("admin_update_user_rate", payload);
      if (rpcErr) throw rpcErr;

      setEditUser(null);
      await cargarDatos();
    } catch (err) {
      console.error(err);
      alert("Error al actualizar: " + (err.message || "desconocido"));
    } finally {
      setSaving(false);
    }
  };

  const limpiarFiltros = () => {
    setUsuarioFiltro("");
    setDesde("");
    setHasta("");
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" }),
      mx = 40,
      my = 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Gestión de Pagos - Resumen", mx, my);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const uSel = usuarios.find((u) => String(u.id) === String(usuarioFiltro));
    doc.text(
      `Período: ${desde || "—"} a ${hasta || "—"} • Usuario: ${
        uSel ? `${uSel.nombre} ${uSel.apellido}` : "Todos"
      }`,
      mx,
      my + 18
    );

    const head = [
      [
        "Empleado",
        "Email",
        "Username",
        "Horas (período)",
        "Valor/Hora",
        "Monto Total",
        "Tipo de Pago",
      ],
    ];
    const body = usuariosFiltrados.map((u) => {
      const { etiqueta, horas } = calcularHoras(u.id);
      const tarifa = Number(u.pago || 0);
      const monto = Math.round(horas * tarifa);
      return [
        `${u.nombre ?? ""} ${u.apellido ?? ""}`.trim(),
        u.email ?? "—",
        u.username ?? "—",
        etiqueta,
        fmtCLP(tarifa),
        fmtCLP(monto),
        u.tipo_pago ?? "—",
      ];
    });
    autoTable(doc, {
      startY: my + 36,
      head,
      body,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [240, 240, 240] },
      margin: { left: mx, right: mx },
    });
    const lastY = doc.lastAutoTable.finalY + 20;
    doc.setFont("helvetica", "bold");
    doc.text("Resumen del período", mx, lastY);
    doc.setFont("helvetica", "normal");
    let totalMin = 0,
      totalMonto = 0;
    usuariosFiltrados.forEach((u) => {
      const { minutos, horas } = calcularHoras(u.id);
      totalMin += minutos;
      totalMonto += Math.round(horas * (Number(u.pago) || 0));
    });
    const thh = Math.floor(totalMin / 60),
      tmm = totalMin % 60;
    doc.text(`Horas totales: ${thh}h ${tmm}m`, mx, lastY + 16);
    doc.text(`Monto total período: ${fmtCLP(totalMonto)}`, mx, lastY + 32);
    const tag = `${desde || "inicio"}_a_${hasta || "hoy"}`;
    doc.save(`pagos_${tag}.pdf`);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-b-2 border-emerald-600 rounded-full" />
        <span className="ml-2 text-gray-600">Cargando…</span>
      </div>
    );

  return (
    <div className="w-full max-w-screen-2xl px-3 md:px-6 mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-white via-emerald-50 to-slate-50 rounded-2xl shadow-md p-4 sm:p-6 mb-6 w-full">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-700 text-center mb-2">
          Gestión de Pagos
        </h1>
        <p className="text-center text-slate-500 mb-2">
          Consulta y administra los pagos del personal
        </p>
        {error && <p className="text-sm text-red-600 text-center">⚠️ {error}</p>}
      </div>

      {/* Filtros */}
      <div className="mb-6">
        <div className="mt-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm w-full">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Usuario</label>
              <select
                value={usuarioFiltro}
                onChange={(e) => setUsuarioFiltro(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Todos</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={limpiarFiltros}
                className="h-[42px] px-4 border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Limpiar
              </button>
              <button
                onClick={exportPDF}
                className="h-[42px] px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Desktop */}
      <div className="hidden md:block">
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <div className="bg-emerald-50 border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">
            Resumen de horas y montos
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead className="bg-slate-50 text-slate-600 text-sm">
                <tr>
                  <th className="px-4 py-3 text-left">Empleado</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-left">Horas (período)</th>
                  <th className="px-4 py-3 text-left">Valor/Hora</th>
                  <th className="px-4 py-3 text-left">Monto Total</th>
                  <th className="px-4 py-3 text-left">Tipo de Pago</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {usuariosFiltrados.map((u, idx) => {
                  const { etiqueta, horas } = calcularHoras(u.id);
                  const tarifa = Number(u.pago || 0);
                  const monto = Math.round(horas * tarifa);
                  return (
                    <tr
                      key={u.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                    >
                      <td className="px-4 py-3">{`${u.nombre ?? ""} ${u.apellido ?? ""}`}</td>
                      <td className="px-4 py-3">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">{u.username ?? "—"}</td>
                      <td className="px-4 py-3">⏱ {etiqueta}</td>
                      <td className="px-4 py-3">{fmtCLP(tarifa)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        {fmtCLP(monto)}
                      </td>
                      <td className="px-4 py-3">
                        {u.tipo_pago ? (
                          <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-xs">
                            {u.tipo_pago}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEdit(u)}
                          className="bg-amber-500 text-white px-3 py-1.5 rounded-xl hover:bg-amber-600 text-xs"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tarjetas Mobile */}
      <div className="md:hidden space-y-3">
        {usuariosFiltrados.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-slate-500">
            No hay usuarios para el filtro seleccionado
          </div>
        )}
        {usuariosFiltrados.map((u) => {
          const { etiqueta, horas } = calcularHoras(u.id);
          const tarifa = Number(u.pago || 0);
          const monto = Math.round(horas * tarifa);
          return (
            <div
              key={u.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {`${u.nombre ?? ""} ${u.apellido ?? ""}`.trim()}
                  </h3>
                  <p className="text-xs text-slate-500">{u.email ?? "—"}</p>
                  <p className="text-xs text-slate-500">User: {u.username ?? "—"}</p>
                </div>
                <span className="text-emerald-700 font-semibold">{fmtCLP(monto)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Horas (período)</p>
                  <p className="font-medium">⏱ {etiqueta}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Valor/Hora</p>
                  <p className="font-medium">{fmtCLP(tarifa)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2 col-span-2">
                  <p className="text-xs text-slate-500">Tipo de pago</p>
                  <p>
                    {u.tipo_pago ? (
                      <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-xs font-medium">
                        {u.tipo_pago}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 text-slate-600 px-2.5 py-1 text-xs">
                        —
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleEdit(u)}
                  className="bg-amber-500 text-white px-3 py-2 rounded-xl hover:bg-amber-600 text-sm shadow-sm"
                >
                  Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[92%] max-w-md border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Editar pago</h2>
            <p className="text-xs text-slate-500 mt-1">
              {`${editUser?.nombre ?? ""} ${editUser?.apellido ?? ""}`.trim()} —{" "}
              {editUser?.email ?? "—"}
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Valor por hora (CLP)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={editUser.pago ?? ""}
                onChange={(e) =>
                  setEditUser((prev) => ({ ...prev, pago: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de pago
              </label>
              <select
                value={editUser.tipo_pago ?? ""}
                onChange={(e) =>
                  setEditUser((prev) => ({ ...prev, tipo_pago: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Selecciona…</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const PagosPage = () => (
  <ErrorBoundary>
    <Pagos />
  </ErrorBoundary>
);

export default PagosPage;
