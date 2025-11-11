import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const Sidebar = ({ tabs, activeTab, setActiveTab }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ audit: true });

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({ ...prev, [menuKey]: !prev[menuKey] }));
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
            {isCollapsed
              ? <ChevronRight className="w-5 h-5 text-gray-600" />
              : <ChevronLeft className="w-5 h-5 text-gray-600" />
            }
          </button>
        </div>

        {/* 메뉴 아이템 */}
        {tabs.map((tab) => {
          const Icon = tab.icon;

          // 아코디언(부모)
          if (tab.children) {
            const opened = !!expandedMenus[tab.id];
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
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 text-sm font-medium text-left ${opened ? 'text-gray-900 bg-gray-50' : 'sidebar-hover'}`}
                  title={isCollapsed ? tab.name : ''}
                >
                  <div className={`flex items-center ${isCollapsed ? '' : 'space-x-2'}`}>
                    <Icon className="w-5 h-5" />
                    {!isCollapsed && <span>{tab.name}</span>}
                  </div>
                  {!isCollapsed && <ChevronDown className={`w-4 h-4 transition-transform ${opened ? '' : '-rotate-90'}`} />}
                </button>

                {/* 하위 메뉴 */}
                {!isCollapsed && opened && (
                  <div className="bg-gray-50">
                    {tab.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = activeTab === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => setActiveTab(child.id)}
                          className={`w-full flex items-center space-x-2 pl-11 pr-4 py-2.5 text-sm text-left ${active ? 'sidebar-active font-medium' : 'sidebar-hover'}`}
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
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2'} px-4 py-3 text-sm font-medium text-left ${active ? 'sidebar-active' : 'sidebar-hover'}`}
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
