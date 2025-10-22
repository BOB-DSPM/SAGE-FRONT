// src/components/DataTarget/ResourceCard.js
import React from 'react';

// 아이콘 import
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
import redshiftIcon from '../../assets/aws-icons/redshift.png';
import mskIcon from '../../assets/aws-icons/msk.png';

const ResourceCard = ({ resource, onClick, isSelected, isDetailViewing }) => {
  const getIcon = (type) => {
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
      'redshift': redshiftIcon,
      'msk': mskIcon,
    };

    const iconSrc = iconMap[type?.toLowerCase()];
    
    if (iconSrc) {
      return <img src={iconSrc} alt={type} className="w-12 h-12 object-contain" />;
    }
    
    // 기본 아이콘 (매칭 안될 경우)
    return (
      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    );
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 's3':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ebs':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'rds':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rds_snapshot':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'efs':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'fsx':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'dynamodb':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'redshift':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'elasticache':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'glacier':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'backup':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'feature_group':
        return 'bg-lime-100 text-lime-800 border-lime-300';
      case 'msk':
        return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        border rounded-lg p-4 cursor-pointer transition-all
        ${isDetailViewing 
          ? 'bg-blue-50 border-blue-500 border-2 shadow-lg ring-2 ring-blue-200' 
          : isSelected
            ? 'bg-green-50 border-green-400'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
        }
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg flex items-center justify-center -ml-1 ${
          isDetailViewing 
            ? 'bg-blue-100' 
            : isSelected 
              ? 'bg-green-100' 
              : 'bg-white'
        }`}>
          {getIcon(resource.type)}
        </div>
      </div>

      <h4 className={`font-semibold mb-2 break-words ${
        isDetailViewing ? 'text-blue-900' : 'text-gray-900'
      }`}>
        {resource.name}
      </h4>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium border ${getTypeColor(resource.type)}`}>
            {resource.type}
          </span>
        </div>

        {resource.region && (
          <p className="text-sm text-gray-600">
            Region: {resource.region}
          </p>
        )}

        {resource.size && (
          <p className="text-sm text-gray-600">
            Size: {resource.size}
          </p>
        )}
      </div>

      {isDetailViewing && (
        <div className="mt-3 pt-3 border-t border-blue-300">
          <p className="text-xs text-blue-700 font-medium">
            상세 정보 보기 중
          </p>
        </div>
      )}
    </div>
  );
};

export default ResourceCard;