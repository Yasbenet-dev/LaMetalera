import { useState, useEffect } from "react"
import { Clock, Users, Calendar, Plus, Edit, Trash2, Save } from "lucide-react"
import Calendario from "../components/calendario"
import { supabase } from "../lib/supabase" // ...existing code...

const mockSchedules = [
  {
    id: "1",
    name: "Turno Mañana",
    startTime: "08:00",
    endTime: "16:00",
    days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
    employees: ["1", "2"],
    type: "morning",
  },
  {
    id: "2",
    name: "Turno Tarde",
    startTime: "16:00",
    endTime: "00:00",
    days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
    employees: ["3"],
    type: "afternoon",
  },
]

export default function Horarios() {
  const [schedules, setSchedules] = useState(mockSchedules)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    startTime: "",
    endTime: "",
    days: [],
    employees: [],
    type: "morning",
  })

  // nuevo: lista de empleados traída desde la base de datos
  const [employees, setEmployees] = useState([])

  const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nombre, apellido, email")
          .order("nombre", { ascending: true })

        if (error) {
          console.warn("No se pudieron cargar empleados:", error.message)
          return
        }
        if (!mounted) return
        // Normalizar ids a string y armar nombre completo para UI
        const mapped = (data ?? []).map((u) => ({
          id: String(u.id),
          name: `${u.nombre ?? ""} ${u.apellido ?? ""}`.trim(),
          email: u.email ?? "",
        }))
        setEmployees(mapped)
      } catch (err) {
        console.error("Error cargando empleados:", err)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const getTypeColor = (type) =>
    type === "morning"
      ? "bg-blue-100 text-blue-800"
      : type === "afternoon"
      ? "bg-orange-100 text-orange-800"
      : type === "night"
      ? "bg-purple-100 text-purple-800"
      : "bg-gray-100 text-gray-800"

  const getTypeIcon = (type) => (type === "morning" ? "🌅" : type === "afternoon" ? "☀️" : type === "night" ? "🌙" : "⏰")

  const handleSave = () => {
    if (editingId) {
      setSchedules(schedules.map((s) => (s.id === editingId ? { ...s, ...formData } : s)))
      setEditingId(null)
    } else {
      setSchedules([...schedules, { id: Date.now().toString(), ...formData }])
      setIsCreating(false)
    }
    setFormData({ name: "", startTime: "", endTime: "", days: [], employees: [], type: "morning" })
  }

  const handleEdit = (s) => {
    setFormData({
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      days: s.days,
      employees: s.employees,
      type: s.type,
    })
    setEditingId(s.id)
    setIsCreating(true)
  }

  const handleDelete = (id) => setSchedules(schedules.filter((s) => s.id !== id))

  const toggleDay = (day) =>
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }))

  const toggleEmployee = (id) =>
    setFormData((prev) => ({
      ...prev,
      employees: prev.employees.includes(id) ? prev.employees.filter((e) => e !== id) : [...prev.employees, id],
    }))

  return (
    <div className="p-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Horarios</h1>
          <p className="text-gray-600 mt-2">Administra los turnos y horarios de trabajo del personal</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          <Plus className="w-4 h-4" /> Crear Horario
        </button>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Horarios</p>
              <p className="text-2xl font-bold">{schedules.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full"><Clock className="w-6 h-6 text-blue-600" /></div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Empleados Asignados</p>
              <p className="text-2xl font-bold">
                {schedules.reduce((acc, s) => acc + s.employees.length, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full"><Users className="w-6 h-6 text-green-600" /></div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Turnos Activos</p>
              <p className="text-2xl font-bold">
                {schedules.filter((s) => s.employees.length > 0).length}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full"><Calendar className="w-6 h-6 text-orange-600" /></div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Horas Semanales</p>
              <p className="text-2xl font-bold">
                {schedules.reduce((acc, s) => {
                  const h = parseInt(s.endTime.split(":")[0]) - parseInt(s.startTime.split(":")[0])
                  return acc + h * s.days.length
                }, 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full"><Clock className="w-6 h-6 text-purple-600" /></div>
          </div>
        </div>
      </div>

      {/* Form crear/editar */}
      {isCreating && (
        <div className="bg-white border rounded-lg mb-8">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold">{editingId ? "Editar Horario" : "Crear Nuevo Horario"}</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Nombre del Horario</label>
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Turno Mañana"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Tipo de Turno</label>
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={formData.type}
                  onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
                >
                  <option value="morning">🌅 Mañana</option>
                  <option value="afternoon">☀️ Tarde</option>
                  <option value="night">🌙 Noche</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Hora de Inicio</label>
                <input
                  type="time"
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={formData.startTime}
                  onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Hora de Fin</label>
                <input
                  type="time"
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={formData.endTime}
                  onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Días de la Semana</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekDays.map((day) => (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1 rounded-md border text-sm ${
                      formData.days.includes(day) ? "bg-slate-900 text-white" : "bg-white"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Empleados Asignados</label>
              <div className="mt-2 space-y-2">
                {employees.length === 0 ? (
                  <div className="text-sm text-gray-500">Cargando empleados...</div>
                ) : (
                  employees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.employees.includes(e.id)}
                        onChange={() => toggleEmployee(e.id)}
                        className="rounded"
                      />
                      {e.name} - {e.email}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                <Save className="w-4 h-4" /> {editingId ? "Actualizar" : "Crear"}
              </button>
              <button
                className="px-4 py-2 border rounded-md"
                onClick={() => {
                  setIsCreating(false)
                  setEditingId(null)
                  setFormData({ name: "", startTime: "", endTime: "", days: [], employees: [], type: "morning" })
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de horarios */}
      <div className="bg-white border rounded-lg">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold">Lista de Horarios</h3>
        </div>
        <div className="p-6 space-y-4">
          {schedules.map((s) => (
            <div key={s.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{getTypeIcon(s.type)}</div>
                  <div>
                    <h4 className="font-semibold text-lg">{s.name}</h4>
                    <p className="text-gray-600">{s.startTime} - {s.endTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(s.type)}`}>
                    {s.type === "morning" ? "Mañana" : s.type === "afternoon" ? "Tarde" : "Noche"}
                  </span>
                  <button className="px-2 py-1 border rounded-md" onClick={() => handleEdit(s)}>
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="px-2 py-1 border rounded-md text-red-600" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div><span className="font-medium">Días: </span>{s.days.join(", ")}</div>
                <div>
                  <span className="font-medium">Empleados: </span>
                  {(s.employees.map((id) => employees.find((e) => e.id === id)?.name).filter(Boolean).join(", ")) || "Sin asignar"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Calendario */}
      <div className="mt-8">
        <Calendario />
      </div>
    </div>
  )
}