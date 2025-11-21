import React from 'react';
import KPI from '../components/cards/KPI';
import PieChartComponent from '../components/charts/PieChartComponent';
import { Shield, Database, AlertTriangle, FileText } from 'lucide-react';
import { issuesBySeverity, dataClassification } from '../data';

const Overview = ({ securityScoreData }) => (
  <div className="space-y-6">
    {/* KPI 섹션: 전역 카드 톤 적용 */}
    <div className="card card-pad">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">현재 상태 요약</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI title="Security Score" value={securityScoreData.score} color="primary" icon={Shield} />
        <KPI title="Total Assets" value="1854" color="green" icon={Database} />
        <KPI title="Active Alerts" value="248" color="orange" icon={AlertTriangle} />
        <KPI title="Compliance" value="63%" color="purple" icon={FileText} />
      </div>
    </div>

    {/* 그래프/상세 카드: 전역 카드 톤 적용 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card card-pad">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Data Issues by Severity</h3>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-3">
            {issuesBySeverity.map((item) => (
              <div key={item.name} className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-700">{item.name}</span>
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4">
            <div className="text-3xl font-bold text-gray-900">248</div>
            <div className="text-sm text-gray-600">Total Issues</div>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Classification by Data Type</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <PieChartComponent data={dataClassification} />
        </div>
      </div>
    </div>
  </div>
);

export default Overview;
