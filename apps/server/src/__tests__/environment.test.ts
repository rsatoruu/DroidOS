import { describe, it, expect } from '@jest/globals';
import { isTermux, isAndroid, detectEnvironment } from '../services/environment.js';

describe('Environment Detection Service', () => {
  it('should detect isTermux correctly based on environment', () => {
    const originalEnv = process.env.TERMUX_VERSION;
    process.env.TERMUX_VERSION = '0.118';
    expect(isTermux()).toBe(true);

    delete process.env.TERMUX_VERSION;
    // Without termux paths/env, returns boolean without crashing
    const result = isTermux();
    expect(typeof result).toBe('boolean');

    if (originalEnv) process.env.TERMUX_VERSION = originalEnv;
  });

  it('should detect isAndroid as boolean without throwing', () => {
    const result = isAndroid();
    expect(typeof result).toBe('boolean');
  });

  it('should return complete environment info with device and runtimes', async () => {
    const env = await detectEnvironment();
    expect(env).toBeDefined();
    expect(env.device).toBeDefined();
    expect(env.device.platform).toBeDefined();
    expect(env.device.arch).toBeDefined();
    expect(env.device.nodeVersion).toBe(process.version);
    expect(env.runtimes.node.available).toBe(true);
    expect(env.network).toBeDefined();
    expect(Array.isArray(env.network.lanAddresses)).toBe(true);
  });
});
