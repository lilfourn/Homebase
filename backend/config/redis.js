const Redis = require('ioredis');

// Base configuration
const baseConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
};

// Configuration for general use
const redisConfig = {
  ...baseConfig,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
};

// Configuration for Bull (without problematic options)
const bullConfig = {
  ...baseConfig,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// Create Redis client
const redis = new Redis(redisConfig);

// Handle connection events
redis.on('connect', () => {
  console.log('[Redis] Connected to Redis server');
});

redis.on('error', (err) => {
  console.error('[Redis] Redis error:', err);
});

redis.on('close', () => {
  console.log('[Redis] Redis connection closed');
});

// Export both redis client and Bull-compatible config
module.exports = redis;
module.exports.bullConfig = bullConfig;