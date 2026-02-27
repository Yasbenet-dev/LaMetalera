// src/components/dashboard/BarChartColumn.jsx
import { useState } from 'react';

const BarChartColumn = ({ dia, count, max }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Calcular altura relativa (mínimo 10% para que sea visible incluso con 0)
  const height = max > 0 ? Math.max((count / max) * 90, 10) : 10;
  
  const getBarColor = () => {
    if (count === 0) return 'bg-gray-200';
    const percentage = (count / max) * 100;
    if (percentage > 75) return 'bg-green-500';
    if (percentage > 50) return 'bg-blue-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="flex flex-col items-center flex-1 relative">
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded mb-1">
          {count} asistencias
        </div>
      )}
      
      {/* Barra del gráfico */}
      <div 
        className="w-full flex items-end"
        style={{ height: '120px' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div 
          className={`w-full rounded-t transition-all duration-300 ${getBarColor()} ${
            isHovered ? 'opacity-90' : 'opacity-70'
          }`}
          style={{ height: `${height}%` }}
        ></div>
      </div>
      
      {/* Etiqueta del día */}
      <div className="text-xs text-gray-600 font-medium mt-2">
        {dia}
      </div>
      
      {/* Contador */}
      <div className="text-xs font-semibold text-gray-700 mt-1">
        {count}
      </div>
    </div>
  );
};

export default BarChartColumn;