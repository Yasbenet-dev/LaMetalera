
const StatCard = ({ title, value, icon, color, trend, suffix }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-600',
    green: 'bg-green-500 text-green-600',
    purple: 'bg-purple-500 text-purple-600',
    orange: 'bg-orange-500 text-orange-600',
    red: 'bg-red-500 text-red-600'
  };

  const bgColorClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100',
    red: 'bg-red-100'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover-lift transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
          </div>
          {trend && (
            <p className="text-xs text-gray-500 mt-1 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${bgColorClasses[color]}`}>
          <span className={`text-xl ${colorClasses[color]}`}>
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;