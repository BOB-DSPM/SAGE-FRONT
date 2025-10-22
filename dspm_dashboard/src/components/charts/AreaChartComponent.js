import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AreaChartComponent = ({ data }) => (
  <ResponsiveContainer width="100%" height={200}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
      <YAxis />
      <Tooltip />
      <Area type="monotone" dataKey="opened" stackId="1" stroke="#ef4444" fill="#fecaca" />
      <Area type="monotone" dataKey="resolved" stackId="1" stroke="#22c55e" fill="#bbf7d0" />
    </AreaChart>
  </ResponsiveContainer>
);

export default AreaChartComponent;
