import React from 'react';
import KPI from '../components/cards/KPI';
import PieChartComponent from '../components/charts/PieChartComponent';
import { Shield, Database, AlertTriangle, FileText } from 'lucide-react';
import { issuesBySeverity, dataClassification } from '../data';

const Overview = ({ securityScoreData }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KPI title="Security Score" value={securityScoreData.score} color="primary" icon={Shield} />
      <KPI title="Total Assets" value="1854" color="green" icon={Database} />
      <KPI title="Active Alerts" value="248" color="orange" icon={AlertTriangle} />
      <KPI title="Compliance" value="63%" color="purple" icon={FileText} />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Data Issues by Severity</h3>
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            {issuesBySeverity.map((item) => (
              <div key={item.name} className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">248</div>
            <div className="text-sm text-gray-500">Total Issues</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Classification by Data Type</h3>
        <PieChartComponent data={dataClassification} />
      </div>
    </div>
  </div>
);

export default Overview;
