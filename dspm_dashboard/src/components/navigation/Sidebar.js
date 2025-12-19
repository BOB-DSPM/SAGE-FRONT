// src/components/navigation/Sidebar.js
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const Sidebar = ({ tabs, activeTab, setActiveTab }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ audit: true }); // 기본적으로 audit 열림

  const toggleMenu = (menuKey) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  return (
    <div
      className={`bg-white shadow-md border-r-[2.5px] border-gray-300 ${
        isCollapsed ? 'w-16' : 'w-60'
      } sticky top-0 h-screen overflow-y-auto transition-all duration-300`}
      style={{
        boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.05), 2px 0 8px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex flex-col py-4">
        {/* 토글 버튼 */}
        <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'} mb-2 px-2`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 w-8 rounded-lg border border-gray-200 bg-white 
            hover:bg-gray-100 hover:border-gray-300 transition-colors flex items-center justify-center shadow-sm"
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
            const isOpen = expandedMenus[tab.id];

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
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center' : 'justify-between'
                  } px-4 py-3 text-[17px] font-semibold text-left rounded-md
                  transition-all duration-200 ${
                    isOpen
                      ? 'text-gray-900 bg-gray-50 border-l-[3px] border-gray-400 shadow-inner'
                      : 'text-gray-600 hover:bg-gray-50 border-l-[3px] border-transparent hover:border-gray-300'
                  }`}
                  title={isCollapsed ? tab.name : ''}
                >
                  <div className={`flex items-center ${isCollapsed ? '' : 'space-x-2'}`}>
                    <Icon className={`w-5 h-5 ${isOpen ? 'text-gray-800' : 'text-gray-600'}`} />
                    {!isCollapsed && <span className="leading-tight">{tab.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isOpen ? 'rotate-180 text-gray-700' : 'text-gray-600'
                      }`}
                    />
                  )}
                </button>

                {/* 하위 메뉴 */}
                {!isCollapsed && isOpen && (
                  <div className="bg-gray-50 border-l-[2px] border-gray-200 pl-1">
                    {tab.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isActiveChild = activeTab === child.id;

                      return (
                        <button
                          key={child.id}
                          onClick={() => setActiveTab(child.id)}
                          className={`w-full flex items-center space-x-2 pl-10 pr-4 py-2.5 text-[16px] text-left rounded-md
                          transition-all duration-200 ${
                            isActiveChild
                              ? 'bg-primary-100 text-primary-900 border-r-[6px] border-primary-700 font-semibold shadow-md ring-2 ring-primary-300/70'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {ChildIcon && (
                            <ChildIcon
                              className={`w-4 h-4 ${
                                isActiveChild ? 'text-primary-800' : 'text-gray-600'
                              }`}
                            />
                          )}
                          <span className={`${isActiveChild ? 'tracking-tight' : ''}`}>{child.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // 일반 메뉴
          const isActiveTop = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center ${
                isCollapsed ? 'justify-center' : 'space-x-2'
              } px-4 py-3 text-[17px] font-semibold text-left rounded-md border-l-[3px]
              transition-all duration-200 ${
                isActiveTop
                  ? 'bg-primary-100 text-primary-900 border-primary-700 shadow-md ring-2 ring-primary-300/70'
                  : 'text-gray-700 hover:bg-gray-50 border-transparent hover:border-gray-300'
              }`}
              title={isCollapsed ? tab.name : ''}
            >
              <Icon className={`w-5 h-5 ${isActiveTop ? 'text-primary-800' : ''}`} />
              {!isCollapsed && <span className="leading-tight">{tab.name}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
