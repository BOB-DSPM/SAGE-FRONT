const runtimeEnv =
  typeof window !== "undefined" && window._env_ ? window._env_ : {};

const buildEnv = {
  REACT_APP_API_HOST: process.env.REACT_APP_API_HOST,
  REACT_APP_OSS_BASE: process.env.REACT_APP_OSS_BASE,
  REACT_APP_LINEAGE_API_BASE: process.env.REACT_APP_LINEAGE_API_BASE,
  REACT_APP_AUDIT_API_BASE: process.env.REACT_APP_AUDIT_API_BASE,
  REACT_APP_AEGIS_API_BASE: process.env.REACT_APP_AEGIS_API_BASE,
  REACT_APP_COLLECTOR_API_BASE: process.env.REACT_APP_COLLECTOR_API_BASE,
  REACT_APP_COMPLIANCE_API_BASE: process.env.REACT_APP_COMPLIANCE_API_BASE,
  REACT_APP_INVENTORY_API_BASE: process.env.REACT_APP_INVENTORY_API_BASE,
  REACT_APP_OSS_WORKDIR: process.env.REACT_APP_OSS_WORKDIR,
};

const isUsable = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

export const getEnv = (key) => {
  if (isUsable(runtimeEnv[key])) {
    return runtimeEnv[key];
  }
  if (isUsable(buildEnv[key])) {
    return buildEnv[key];
  }
  return undefined;
};
