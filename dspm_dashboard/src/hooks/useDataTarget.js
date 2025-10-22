// useDataTarget.js
import { useState, useEffect } from 'react';

export const useDataTarget = (activeTab) => {
  const [inventoryData, setInventoryData] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});      // ← 카운트
  const [raw, setRaw] = useState(null);        // ← 원본 저장

  useEffect(() => {
    if (activeTab !== 'data-target') return;

    const fetchInventory = async () => {
      setLoadingInventory(true);
      setError(null);
      try {
        const res = await fetch('http://211.44.183.248:8000/api/all-resources');
        if (!res.ok) {
          setError(`API ${res.status} ${res.statusText}`);
          setInventoryData([]);
          return;
        }
        const data = await res.json();
        setRaw(data); // 원본

        // 카테고리별 카운트
        const counts = Object.fromEntries(
          Object.entries(data).map(([k, v]) => {
            if (Array.isArray(v)) return [k, v.length];
            if (v && typeof v === 'object') return [k, Object.keys(v).length]; // feature_groups 같은 object
            return [k, 0];
          })
        );
        setStats(counts);

        const formatted = formatResources(data);
        console.log('[DT] formatted len =', formatted.length, formatted.slice(0, 5));
        setInventoryData(formatted);
      } catch (e) {
        console.warn('Backend API not available:', e.message);
        setInventoryData([]);
      } finally {
        setLoadingInventory(false);
      }
    };

    fetchInventory();
  }, [activeTab]);

  return { inventoryData, loadingInventory, error, stats, raw };
};

// 그대로 사용 (아래 2)에서 수정안도 참고)
const formatResources = (data) => {
  const result = [];
  const typeMap = {
    s3_buckets: { type: 's3', label: 'S3 Bucket', nameKey: 'name' },
    ebs_volumes: { type: 'ebs', label: 'EBS Volume', nameKey: 'volume_id' },
    efs_filesystems: { type: 'efs', label: 'EFS', nameKey: 'file_system_id' },
    fsx_filesystems: { type: 'fsx', label: 'FSx', nameKey: 'file_system_id' },
    rds_instances: { type: 'rds', label: 'RDS Instance', nameKey: 'db_instance_identifier' },
    rds_snapshots: { type: 'rds_snapshot', label: 'RDS Snapshot', nameKey: 'db_snapshot_identifier' },
    dynamodb_tables: { type: 'dynamodb', label: 'DynamoDB', nameKey: 'name' },
    redshift_clusters: { type: 'redshift', label: 'Redshift', nameKey: 'cluster_identifier' },
    elasticache_clusters: { type: 'elasticache', label: 'ElastiCache', nameKey: 'cache_cluster_id' },
    glacier_vaults: { type: 'glacier', label: 'Glacier', nameKey: 'vault_name' },
    backup_plans: { type: 'backup', label: 'Backup Plan', nameKey: 'name' },
    glue_databases: { type: 'glue', label: 'Glue Database', nameKey: 'name' },
    kinesis_streams: { type: 'kinesis', label: 'Kinesis Stream', nameKey: 'stream_name' },
    msk_clusters: { type: 'msk', label: 'MSK Cluster', nameKey: 'cluster_name' }
  };

  Object.entries(data || {}).forEach(([category, items]) => {
    if (category === 'feature_groups' && typeof items === 'object' && !Array.isArray(items)) {
      Object.entries(items).forEach(([name, details]) => {
        result.push({
          id: `feature_group-${name}`,
          type: 'feature_group',
          typeLabel: 'Feature Group',
          name,
          details: { name, ...details }
        });
      });
    } else if (Array.isArray(items) && items.length > 0) {
      const config = typeMap[category];
      if (config) {
        items.forEach(item => {
          result.push({
            id: `${config.type}-${item[config.nameKey] || item.name || Math.random().toString(36).slice(2)}`,
            type: config.type,
            typeLabel: config.label,
            name: item[config.nameKey] || item.name || 'Unknown',
            details: item
          });
        });
      }
    }
  });

  return result;
};
