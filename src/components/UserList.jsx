// components/UserList.jsx
const roleBadge = (rol) => {
  const r = (rol || "usuario").toLowerCase();
  const isAdmin = r === "admin" || r === "administrador";
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold ${
        isAdmin ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"
      }`}
    >
      {isAdmin ? "Administrador" : "Usuario"}
    </span>
  );
};

const pagoBadge = (tipo, monto) => {
  if (!tipo && !monto) return "—";

  return (
    <span className="text-sm font-semibold text-emerald-700">
      {tipo ? tipo.toUpperCase() : "—"} •{" "}
      {monto ? `$${Number(monto).toLocaleString("es-CL")}` : "—"}
    </span>
  );
};

const UserList = ({ users, onEdit, onDelete, loading }) => {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <span className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2" />
        <span className="align-middle">Cargando usuarios…</span>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-500 text-center">No hay usuarios registrados</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Lista de Usuarios</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Usuario
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Email
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Username
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Rol
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Tipo / Valor
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => {
              const nombre =
                `${u?.nombre ?? ""} ${u?.apellido ?? ""}`.trim() ||
                `ID: ${u?.id}`;

              return (
                <tr
                  key={u.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  {/* USUARIO */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-bold">
                          {(u?.nombre?.[0] ?? "").toUpperCase()}
                          {(u?.apellido?.[0] ?? "").toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {u?.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* EMAIL */}
                  <td className="px-4 py-2">
                    <p className="text-sm">{u?.email ?? "—"}</p>
                  </td>

                  {/* USERNAME */}
                  <td className="px-4 py-2">
                    <p className="text-sm font-mono">
                      {u?.username ?? "—"}
                    </p>
                  </td>

                  {/* ROL */}
                  <td className="px-4 py-2">
                    {roleBadge(u?.rol)}
                  </td>

                  {/* TIPO + VALOR */}
                  <td className="px-4 py-2">
                    {pagoBadge(u?.tipo_pago, u?.pago)}
                  </td>

                  {/* ACCIONES */}
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(u)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 transition-colors text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(u.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserList;
