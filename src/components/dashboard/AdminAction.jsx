// src/components/dashboard/AdminAction.jsx
const AdminAction = ({ icon, title, description, onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left p-4 border-2 border-gray-200 rounded-lg transition-all duration-200 
                 hover:border-blue-300 hover:shadow-md hover:transform hover:scale-105
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
    >
      <div className="flex items-start space-x-3">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">{title}</h3>
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        </div>
        <span className="text-gray-400 text-lg">→</span>
      </div>
      
      {/* Efecto de hover */}
      <div className="absolute inset-0 rounded-lg bg-blue-500 opacity-0 transition-opacity duration-200 hover:opacity-5"></div>
    </button>
  );
};

export default AdminAction;