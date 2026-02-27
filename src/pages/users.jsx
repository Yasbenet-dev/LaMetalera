import { useState } from 'react';
import UserForm from '../components/UserForm';
import UserList from '../components/UserList';
import { useUsers } from '../hooks/useUsers';
import ErrorBoundary from '../components/ErrorBoundary';

//comentario de prueba para que se aplique el cambio en vercel
const Users = () => {
  const { 
    users, 
    editingUser, 
    setEditingUser, 
    loading, 
    error,
    createUser, 
    updateUser, 
    deleteUser,
    refetch 
  } = useUsers();
  
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para el modal
  const [modal, setModal] = useState({
    open: false,
    title: '',
    message: '',
    type: 'success', // 'success' | 'error'
  });

  const handleSubmit = async (userData) => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, userData);
        setModal({
          open: true,
          title: 'Usuario actualizado',
          message: 'Los datos del usuario se guardaron correctamente.',
          type: 'success',
        });
      } else {
        await createUser(userData);
        setModal({
          open: true,
          title: 'Usuario creado',
          message: 'El usuario fue creado exitosamente.',
          type: 'success',
        });
      }
    } catch (err) {
      setModal({
        open: true,
        title: 'Error',
        message: err?.message || 'No se pudo guardar la información.',
        type: 'error',
      });
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      try {
        await deleteUser(id);
      } catch (err) {
        console.error('Error submitting form:', err);
      }
    }
  };

  const filteredUsers = users.filter(user =>
    user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.apellido && user.apellido.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };

  return (
    <div className="space-y-6 px-2 sm:px-4 py-6 w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-white via-emerald-50 to-slate-50 rounded-2xl shadow-md p-4 sm:p-6 mb-2 w-full">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-700 text-center mb-2">
          Gestión de Usuarios
        </h1>
        <p className="text-center text-slate-500 mb-2">
          Administra los usuarios del sistema
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-100 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl w-full max-w-2xl mx-auto">
          <p>Error: {error}</p>
          <button 
            onClick={refetch}
            className="mt-2 bg-rose-600 text-white px-3 py-1 rounded text-sm"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Buscador */}
      <div className="w-full max-w-2xl mx-auto mb-4">
        <input
          type="text"
          placeholder="Buscar usuarios por nombre, apellido o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
        />
      </div>

      {/* Formulario */}
      <div className="w-full max-w-50xl mx-auto bg-white rounded-2xl shadow p-4 sm:p-6 border border-slate-100 mb-4">
        <UserForm 
          onSubmit={handleSubmit}
          editingUser={editingUser}
          onCancel={handleCancelEdit}
          loading={loading}
        />
      </div>

      {/* Lista */}
      <div className="w-full max-w-50xl mx-auto bg-white rounded-2xl shadow p-2 sm:p-6 border border-slate-100">
        <UserList 
          users={filteredUsers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      </div>

      {/* Modal*/}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 mx-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  modal.type === 'success'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-rose-100 text-rose-600'
                }`}
              >
                {modal.type === 'success' ? (
                  <span className="text-xl">✓</span>
                ) : (
                  <span className="text-xl">!</span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-800">
                  {modal.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modal.message}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UsersPage = () => (
  <ErrorBoundary>
    <Users />
  </ErrorBoundary>
);

export default UsersPage;