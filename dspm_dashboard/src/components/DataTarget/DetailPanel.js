// src/components/DataTarget/DetailPanel.js
import React, { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// AWS 아이콘 import
import s3Icon from '../../assets/aws-icons/s3.png';
import ebsIcon from '../../assets/aws-icons/ebs.png';
import rdsIcon from '../../assets/aws-icons/rds.png';
import dynamodbIcon from '../../assets/aws-icons/dynamodb.png';
import efsIcon from '../../assets/aws-icons/efs.png';
import fsxIcon from '../../assets/aws-icons/fsx.png';
import elasticacheIcon from '../../assets/aws-icons/elasticache.png';
import glacierIcon from '../../assets/aws-icons/glacier.png';
import backupIcon from '../../assets/aws-icons/backup.png';
import featuregroupIcon from '../../assets/aws-icons/featuregroup.png';
import mskIcon from '../../assets/aws-icons/msk.png';

const ResourceIcon = ({ type }) => {
  const iconMap = {
    's3': s3Icon,
    'ebs': ebsIcon,
    'rds': rdsIcon,
    'rds_snapshot': rdsIcon,
    'dynamodb': dynamodbIcon,
    'efs': efsIcon,
    'fsx': fsxIcon,
    'elasticache': elasticacheIcon,
    'glacier': glacierIcon,
    'backup': backupIcon,
    'feature_group': featuregroupIcon,
    'msk': mskIcon,
  };

  const iconSrc = iconMap[type?.toLowerCase()];
  
  if (iconSrc) {
    return <img src={iconSrc} alt={type} className="w-10 h-10 object-contain" />;
  }
  
  // 기본 아이콘
  return (
    <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  );
};

const DetailPanel = ({ resource, loading, onClose }) => {
  const [panelWidth, setPanelWidth] = useState(window.innerWidth / 2);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 400;
      const maxWidth = window.innerWidth * 0.9;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  if (!resource) return null;
  
  return (
    <>
      <style>{`
        .detail-panel-overlay {
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      <div 
        ref={panelRef}
        className="detail-panel-overlay bg-white shadow-xl border-l border-gray-200 z-50 flex"
        style={{ 
          width: `${panelWidth}px`
        }}
      >
        {/* 리사이즈 핸들 */}
        <div
          onMouseDown={handleMouseDown}
          className={`
            w-1.5 bg-gray-200 hover:bg-blue-500 cursor-col-resize transition-colors relative flex-shrink-0
            ${isResizing ? 'bg-blue-500' : ''}
          `}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <GripVertical className={`w-4 h-4 text-gray-400 ${isResizing ? 'text-blue-600' : ''}`} />
          </div>
        </div>

        {/* 패널 내용 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">리소스 상세정보</h2>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-600">상세 정보를 불러오는 중...</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <ResourceIcon type={resource.type} />
                  <div>
                    <div className="font-medium text-gray-900">{resource.name}</div>
                    <div className="text-sm text-gray-500">{resource.typeLabel}</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(resource.details)
                    .filter(([key]) => isNaN(Number(key)))
                    .map(([key, value]) => (
                      <div key={key}>
                        <div className="text-xs font-medium text-gray-500 uppercase">{key}</div>
                        <div className="mt-1 text-sm break-words">
                          {typeof value === 'object' && value !== null ? (
                            <SyntaxHighlighter 
                              language="json" 
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem'
                              }}
                            >
                              {JSON.stringify(value, null, 2)}
                            </SyntaxHighlighter>
                          ) : (
                            <div className="bg-gray-100 px-3 py-2 rounded text-gray-900 font-medium">
                              {String(value ?? 'N/A')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DetailPanel;