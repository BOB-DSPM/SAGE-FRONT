import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const DonutChartWithLegend = ({ data }) => {
  // 총합 계산
  const total = data.reduce((acc, cur) => acc + cur.value, 0);

  return (
    <div className="flex items-center">
      {/* 차트 영역 */}
      <div className="w-1/2 h-48">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              dataKey="value"
            >
        {/* 차트 안 텍스트 */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          <tspan x="50%" dy="-0.2em" className="text-xl font-bold">
            {total}
          </tspan>
          <tspan x="50%" dy="1.2em" className="text-sm text-gray-500">
            Resources
          </tspan>
        </text>

              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        

      </div>
      

      {/* 범례 영역 */}
      <div className="ml-6">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center mb-2">
            <span
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            ></span>
            <span className="mr-2">{entry.name}</span>
            <span className="font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChartWithLegend;
