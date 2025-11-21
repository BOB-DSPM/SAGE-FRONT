import React from 'react';

const KPI = ({ title, value, color, icon: Icon }) => {
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold" style={{ color: '#005a24ff' }}>
            {value}
          </p>
        </div>
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: '#e8f5e9' }}
        >
          <Icon className="w-5 h-5" style={{ color: '#005c25ff' }} />
        </div>
      </div>
    </div>
  );
};

export default KPI;
