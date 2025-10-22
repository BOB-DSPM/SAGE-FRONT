import React from 'react';
import { AlertTriangle } from 'lucide-react';

const Alerts = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Recent Security Alerts</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="font-medium">Publicly readable bucket detected</p>
              <p className="text-sm text-gray-600">S3 bucket allows direct anonymous read access</p>
            </div>
          </div>
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">High</span>
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg border-yellow-200 bg-yellow-50">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="font-medium">Unencrypted database connection</p>
              <p className="text-sm text-gray-600">Database connection without SSL/TLS encryption</p>
            </div>
          </div>
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Medium</span>
        </div>
      </div>
    </div>
  </div>
);

export default Alerts;
