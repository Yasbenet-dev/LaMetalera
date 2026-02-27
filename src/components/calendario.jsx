// src/components/Calendario.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

// --- Utilidades fecha ---
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const firstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const lastDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const addMonths = (date, delta) => new Date(date.getFullYear(), date.getMonth() + delta, 1);
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// --- Componente principal ---
export default function Calendario() {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [turnos, setTurnos] = useState([]); // [{id, user_id, fecha, nota}]
  const [users, setUsers] = useState([]);   // [{id, nombre, apellido, email}]
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"
  const [selectedUserId, setSelectedUserId] = useState("");
  const [note, setNote] = useState("");

  // --- Generar celdas del mes actual ---
  const monthMeta = useMemo(() => {
    const first = firstDayOfMonth(viewDate);
    const last = lastDayOfMonth(viewDate);

    const startOffset = first.getDay(); // 0=Dom, ..., 6=Sáb
    const daysInMonth = last.getDate();

    const days = [];
    // días "vacíos" al inicio
    for (let i = 0; i < startOffset; i++) days.push(null);
    // días del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
      days.push(dateObj);
    }
    return { first, last, days };
  }, [viewDate]);

  // --- Cargar usuarios (para selector) ---
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, apellido, email")
        .order("nombre", { ascending: true });

      if (error) throw error;
      setUsers(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch (e) {
      console.error("❌ Error usuarios:", e);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // --- Cargar turnos del mes visible ---
  const fetchTurnos = useCallback(async () => {
    setLoading(true);
    try {
      const min = ymd(monthMeta.first);
      const max = ymd(monthMeta.last);

      const { data, error } = await supabase
        .from("turnos")
        .select("id, user_id, fecha, nota, created_at")
        .gte("fecha", min)
        .lte("fecha", max)
        .order("fecha", { ascending: true });

      if (error) throw error;

      const rows = Array.isArray(data) ? data.filter(Boolean) : [];

      // Join manual: cargar solo los users que aparecen en el mes (optimizable)
      const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      let userMap = {};
      if (ids.length) {
        const { data: udata, error: uerr } = await supabase
          .from("usuarios")
          .select("id, nombre, apellido, email")
          .in("id", ids);
        if (!uerr && Array.isArray(udata)) {
          userMap = Object.fromEntries(udata.map((u) => [u.id, u]));
        }
      }

      const enriched = rows.map((r) => ({
        ...r,
        usuario: userMap[r.user_id] || null,
      }));

      setTurnos(enriched);
    } catch (e) {
      console.error("❌ Error turnos:", e);
      setTurnos([]);
    } finally {
      setLoading(false);
    }
  }, [monthMeta.first, monthMeta.last]);

  // Cargar usuarios al montar
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Cargar turnos cuando cambia el mes visible
  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  // --- Abrir modal para un día ---
  const openForDate = (dateObj) => {
    const d = ymd(dateObj);
    setSelectedDate(d);
    setSelectedUserId("");
    setNote("");
    setModalOpen(true);
  };

  // --- Guardar asignación ---
  const saveTurno = async () => {
    if (!selectedDate || !selectedUserId) return;
    const payload = { user_id: selectedUserId, fecha: selectedDate, nota: note || null };
    const { error } = await supabase.from("turnos").insert(payload);
    if (!error) {
      setModalOpen(false);
      await fetchTurnos();
    } else {
      console.error("❌ Error insert turno:", error);
    }
  };

  // --- Eliminar asignación (por id) ---
  const deleteTurno = async (id) => {
    const { error } = await supabase.from("turnos").delete().eq("id", id);
    if (!error) await fetchTurnos();
  };

  // Mapa por fecha para renderizar rápido
  const turnosByDate = useMemo(() => {
    const m = new Map(); // key: 'YYYY-MM-DD' -> array
    for (const t of turnos) {
      const key = t.fecha;
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(t);
    }
    return m;
  }, [turnos]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      {/* Header calendario */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setViewDate((d) => addMonths(d, -1))}
          className="px-2 py-1 rounded hover:bg-gray-100"
        >
          ←
        </button>
        <div className="font-semibold">
          {viewDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
        </div>
        <button
          onClick={() => setViewDate((d) => addMonths(d, +1))}
          className="px-2 py-1 rounded hover:bg-gray-100"
        >
          →
        </button>
      </div>

      {/* Encabezado días */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-600 mb-2">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Celdas del mes */}
      <div className="grid grid-cols-7 gap-1">
        {monthMeta.days.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="h-24 bg-transparent" />;
          }
          const k = ymd(cell);
          const items = turnosByDate.get(k) || [];
          return (
            <div
              key={k}
              className="h-24 border border-gray-200 rounded p-1 flex flex-col text-xs hover:bg-gray-50"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-700 font-semibold">{cell.getDate()}</span>
                <button
                  onClick={() => openForDate(cell)}
                  className="px-1 py-[1px] text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600"
                  title="Asignar turno"
                >
                  + turno
                </button>
              </div>

              <div className="space-y-1 overflow-auto">
                {items.length === 0 && (
                  <div className="text-gray-400 italic">—</div>
                )}
                {items.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-blue-50 rounded px-1 py-[2px]">
                    <span className="truncate">
                      {t.usuario
                        ? `${t.usuario.nombre} ${t.usuario.apellido}`
                        : `user_id: ${t.user_id.slice(0, 6)}…`}
                    </span>
                    <button
                      onClick={() => deleteTurno(t.id)}
                      className="text-red-600 text-[10px] px-1 hover:underline"
                      title="Eliminar"
                    >
                      borrar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {(loading || usersLoading) && (
        <div className="mt-3 text-sm text-gray-500">Cargando…</div>
      )}

      {/* Modal simple */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-4">
            <h3 className="font-semibold mb-2">
              Asignar turno para <span className="font-mono">{selectedDate}</span>
            </h3>

            <label className="block text-sm mb-1">Usuario</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3"
            >
              <option value="">Selecciona un usuario…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido}
                </option>
              ))}
            </select>

            <label className="block text-sm mb-1">Nota (opcional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Ej: turno mañana"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-2 rounded border hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveTurno}
                disabled={!selectedUserId}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

