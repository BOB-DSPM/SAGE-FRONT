// src/components/navigation/Sidebar.js
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Sidebar = ({ tabs, activeTab, setActiveTab }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`bg-white shadow-sm border-r ${isCollapsed ? 'w-16' : 'w-60'} sticky top-0 h-screen overflow-y-auto`}>
      <div className="flex flex-col py-4">
        {/* 토글 버튼 */}
        <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'} mb-2 px-2`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 w-8 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* 메뉴 아이템 */}
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2'} px-4 py-3 text-sm font-medium text-left ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-600 border-r-4 border-primary-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={isCollapsed ? tab.name : ''}
            >
              <Icon className="w-5 h-5" />
              {!isCollapsed && <span>{tab.name}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;