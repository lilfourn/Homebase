/**
 * Convex Configuration
 * 
 * This file manages settings for Convex including rate limits, 
 * feature flags, and deployment URLs based on NODE_ENV
 */

interface ConvexConfig {
  isDevelopment: boolean;
  url: string;
  features: {
    realtimeUpdates: boolean;
    offlineSupport: boolean;
    analyticsEnabled: boolean;
    debugMode: boolean;
  };
  limits: {
    maxFilesPerTask: number;
    maxFileSizeMB: number;
    maxTotalSizeMB: number;
    tasksPerMonthFree: number;
    tasksPerMonthPro: number;
    concurrentTasks: number;
  };
  polling: {
    enabled: boolean;
    intervalMs: number;
  };
  backend: {
    apiSecret: string;
    apiUrl: string;
  };
}

/**
 * Get current environment configuration based on NODE_ENV
 */
export function getConvexConfig(): ConvexConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    isDevelopment,
    url: process.env.NEXT_PUBLIC_CONVEX_URL || 'https://admired-platypus-381.convex.cloud',
    features: {
      realtimeUpdates: true,
      offlineSupport: !isDevelopment,
      analyticsEnabled: !isDevelopment,
      debugMode: isDevelopment
    },
    limits: {
      maxFilesPerTask: 10,
      maxFileSizeMB: 50,
      maxTotalSizeMB: 200,
      tasksPerMonthFree: isDevelopment ? 100 : 10,
      tasksPerMonthPro: isDevelopment ? 10000 : -1,
      concurrentTasks: isDevelopment ? 5 : 3
    },
    polling: {
      enabled: !isDevelopment,
      intervalMs: 30000 // 30 seconds
    },
    backend: {
      apiSecret: process.env.BACKEND_API_SECRET || 'dev-backend-secret',
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    }
  };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof ConvexConfig['features']): boolean {
  const config = getConvexConfig();
  return config.features[feature];
}

/**
 * Get rate limits for current environment
 */
export function getRateLimits() {
  const config = getConvexConfig();
  return config.limits;
}

/**
 * Get backend configuration for API communication
 */
export function getBackendConfig() {
  const config = getConvexConfig();
  return config.backend;
}

/**
 * Environment-specific logging
 */
export function convexLog(message: string, data?: any) {
  const config = getConvexConfig();
  if (config.features.debugMode) {
    console.log(`[Convex] ${message}`, data || '');
  }
}

/**
 * Check if we should use polling as fallback
 */
export function shouldUsePollling(): boolean {
  const config = getConvexConfig();
  return config.polling.enabled;
}

export default getConvexConfig;