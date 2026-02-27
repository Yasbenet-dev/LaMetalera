// src/components/dashboard/UsuarioActivoItem.jsx
const UsuarioActivoItem = ({ usuario }) => {
  const getIniciales = (nombre, apellido) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
      <div className="relative">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-green-600 font-semibold text-sm">
            {getIniciales(usuario.nombre, usuario.apellido)}
          </span>
        </div>
        <div className="absolute -top-1 -right-1">
          <span className="w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
        </div>
      </div>
      
      <div className="ml-3 flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">
          {usuario.nombre} {usuario.apellido}
        </p>
        <p className="text-xs text-gray-500">
          Activo hoy
        </p>
      </div>
      
      <div className="ml-2">
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
          Online
        </span>
      </div>
    </div>
  );
};

export default UsuarioActivoItem;