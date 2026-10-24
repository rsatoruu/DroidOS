import type { DockerHostType } from '../constants.js';

export interface DockerHostProfile {
  id: string;
  name: string;
  type: DockerHostType;
  host: string;
  port?: number;
  tlsEnabled?: boolean;
  sshUser?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  created: number;
  ports: DockerPort[];
  labels: Record<string, string>;
  networkMode?: string;
  hostId: string;
}

export interface DockerPort {
  privatePort: number;
  publicPort?: number;
  type: string;
}

export interface DockerImage {
  id: string;
  repoTags: string[];
  size: number;
  created: number;
  hostId: string;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  hostId: string;
}

export interface DockerAvailability {
  cliAvailable: boolean;
  daemonAvailable: boolean;
  version?: string;
  apiVersion?: string;
  error?: string;
}
