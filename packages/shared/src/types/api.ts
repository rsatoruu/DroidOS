// API response types

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;
  timestamp: string;
}
