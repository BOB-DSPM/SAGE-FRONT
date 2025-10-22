import React from 'react';
import { complianceScores } from '../data';

const Policies = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Policy Compliance Status</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {complianceScores.map((policy) => (
          <div key={policy.name} className="border rounded-lg p-4">
            <div className="text-center">
              <h4 className="font-semibold text-lg">{policy.name}</h4>
              <div className="text-2xl font-bold mt-2" style={{ color: policy.color }}>
                {policy.score}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div className="h-2 rounded-full" style={{ width: `${policy.score}%`, backgroundColor: policy.color }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default Policies;
