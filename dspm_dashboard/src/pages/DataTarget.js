import React from 'react';
import { useDataTarget } from '../hooks/useDataTarget';
import DataTargetList from '../components/DataTarget/DataTargetList';

const DataTarget = ({ activeTab }) => {
  const { inventoryData, loadingInventory, error } = useDataTarget(activeTab);
  
  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-red-100 text-red-700">
          <p className="font-medium">오류 발생</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
      
      <DataTargetList inventoryData={inventoryData} loading={loadingInventory} />
    </div>
  );
};

export default DataTarget;