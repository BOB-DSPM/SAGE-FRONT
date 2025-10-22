import React from 'react';

const KPI = ({ title, value, color, icon: Icon }) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold" style={{ color: '#0B5629' }}>{value}</p>
        </div>
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: '#e8f5e9' }}
        >
          <Icon className="w-6 h-6" style={{ color: '#0B5629' }} />
        </div>
      </div>
    </div>
  );
};

export default KPI;