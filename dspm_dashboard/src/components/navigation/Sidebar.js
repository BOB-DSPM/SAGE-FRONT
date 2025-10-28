// src/components/navigation/Sidebar.js
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

const Sidebar = ({ tabs, activeTab, setActiveTab }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ audit: true }); // 기본적으로 audit 열림

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

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
          
          // 부모 메뉴 (아코디언)
          if (tab.children) {
            return (
              <div key={tab.id}>
                <button
                  onClick={() => {
                    if (isCollapsed) {
                      setIsCollapsed(false);
                      setTimeout(() => toggleMenu(tab.id), 100);
                    } else {
                      toggleMenu(tab.id);
                    }
                  }}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 text-sm font-medium text-left ${
                    expandedMenus[tab.id]
                      ? 'text-gray-900 bg-gray-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title={isCollapsed ? tab.name : ''}
                >
                  <div className={`flex items-center ${isCollapsed ? '' : 'space-x-2'}`}>
                    <Icon className="w-5 h-5" />
                    {!isCollapsed && <span>{tab.name}</span>}
                  </div>
                  {!isCollapsed && (
                    expandedMenus[tab.id] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )
                  )}
                </button>

                {/* 하위 메뉴 */}
                {!isCollapsed && expandedMenus[tab.id] && (
                  <div className="bg-gray-50">
                    {tab.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <button
                          key={child.id}
                          onClick={() => setActiveTab(child.id)}
                          className={`w-full flex items-center space-x-2 pl-11 pr-4 py-2.5 text-sm text-left ${
                            activeTab === child.id
                              ? 'bg-primary-100 text-primary-600 border-r-4 border-primary-500 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {ChildIcon && <ChildIcon className="w-4 h-4" />}
                          <span>{child.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // 일반 메뉴
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