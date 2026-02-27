import { useEffect, useState } from "react";

export default function UserForm({
  onSubmit,
  editingUser = null,
  onCancel,
}) {
  const isEditing = Boolean(editingUser);

  const [form, setForm] = useState({
    username: "",
    email: "",
    nombre: "",
    apellido: "",
    fecha_nacimiento: "",
    password: "",
    tipo_pago: "",
    pago: "",
    rol: "",
  });

  const [changePassword, setChangePassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEditing) {
      setForm({
        username: editingUser.username ?? "",
        email: editingUser.email ?? "",
        nombre: editingUser.nombre ?? "",
        apellido: editingUser.apellido ?? "",
        fecha_nacimiento: editingUser.fecha_nacimiento
          ? String(editingUser.fecha_nacimiento).slice(0, 10)
          : "",
        password: "",
        tipo_pago: editingUser.tipo_pago ?? "",
        pago: editingUser.pago ?? "",
        rol: editingUser.rol ?? "",
      });
      setChangePassword(false);
      setError("");
    } else {
      setForm({
        username: "",
        email: "",
        nombre: "",
        apellido: "",
        fecha_nacimiento: "",
        password: "",
        tipo_pago: "",
        pago: "",
        rol: "",
      });
      setChangePassword(true);
      setError("");
    }
  }, [isEditing, editingUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username || !form.email || !form.nombre || !form.apellido) {
      setError("Completa los campos obligatorios.");
      return;
    }

    if (!isEditing && !form.password) {
      setError("La contraseña es obligatoria al crear usuario.");
      return;
    }

    if (isEditing && changePassword && !form.password) {
      setError("Ingresa la nueva contraseña o desmarca 'Cambiar contraseña'.");
      return;
    }

    const payload = {
      username: form.username,
      email: form.email,
      nombre: form.nombre,
      apellido: form.apellido,
      fecha_nacimiento: form.fecha_nacimiento || null,
      tipo_pago: form.tipo_pago,
      pago: form.pago ? Number(form.pago) : null,
      rol: form.rol,

      ...(isEditing
        ? changePassword && form.password
          ? { password: form.password }
          : {}
        : { password: form.password }),
    };

    try {
      await onSubmit(payload);

      if (!isEditing) {
        setForm({
          username: "",
          email: "",
          nombre: "",
          apellido: "",
          fecha_nacimiento: "",
          password: "",
          tipo_pago: "",
          pago: "",
          rol: "",
        });
      }
    } catch (err) {
      setError(err.message || "No se pudo guardar el usuario");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-2">
        {isEditing ? "Editar usuario" : "Crear usuario"}
      </h2>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="border px-3 py-2 rounded" />
        <input name="apellido" value={form.apellido} onChange={handleChange} placeholder="Apellido" className="border px-3 py-2 rounded" />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="border px-3 py-2 rounded" />
        <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="border px-3 py-2 rounded" />
        <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} className="border px-3 py-2 rounded" />

        {/* ROL (tabla perfiles) */}
        <select name="rol" value={form.rol} onChange={handleChange} className="border px-3 py-2 rounded">
          <option value="">Seleccionar rol</option>
          <option value="admin">Administrador</option>
          <option value="worker">Trabajador</option>
        </select>

        {/* TIPO PAGO */}
        <select name="tipo_pago" value={form.tipo_pago} onChange={handleChange} className="border px-3 py-2 rounded">
          <option value="">Tipo de pago</option>
          <option value="hora">Por hora</option>
          <option value="dia">Por día</option>
          <option value="mes">Mensual</option>
        </select>

        {/* VALOR */}
        <input type="number" name="pago" value={form.pago} onChange={handleChange} placeholder="Valor $" className="border px-3 py-2 rounded" />

        {/* PASSWORD */}
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder={isEditing ? "Nueva contraseña" : "Contraseña"}
          className="border px-3 py-2 rounded md:col-span-2"
        />

        <div className="md:col-span-2 flex gap-3">
          <button className="bg-emerald-600 text-white px-4 py-2 rounded">
            {isEditing ? "Guardar cambios" : "Crear usuario"}
          </button>

          {isEditing && (
            <button type="button" onClick={onCancel} className="bg-slate-300 px-4 py-2 rounded">
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
