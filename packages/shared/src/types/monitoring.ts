export interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics[];
  network: NetworkMetrics;
  device: DeviceInfo;
  timestamp: string;
}

export interface CpuMetrics {
  usage: number | null; // percent
  available: boolean;
  note?: string;
}

export interface MemoryMetrics {
  total: number | null; // bytes
  used: number | null;
  free: number | null;
  available: boolean;
  note?: string;
}

export interface StorageMetrics {
  path: string;
  label: string;
  total: number | null; // bytes
  used: number | null;
  free: number | null;
  available: boolean;
}

export interface NetworkMetrics {
  rxBytes: number | null;
  txBytes: number | null;
  rxRate: number | null; // bytes/sec
  txRate: number | null;
  available: boolean;
}

export interface DeviceInfo {
  hostname: string;
  platform: string;
  arch: string;
  uptime: number; // seconds
  nodeVersion: string;
  droidosVersion: string;
  termuxDetected: boolean;
  androidDetected: boolean;
}

export interface BatteryInfo {
  level: number | null; // percent
  charging: boolean | null;
  available: boolean;
}
