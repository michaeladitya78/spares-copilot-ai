import { createClient } from 'redis';

let client = null;

export async function initCache() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('Cache disabled: REDIS_URL not set');
    return null;
  }
  client = createClient({ url });
  client.on('error', (err) => console.error('Redis error:', err));
  await client.connect();
  console.log('✅ Redis cache connected');
  return client;
}

export function getCache() {
  return client;
}

export async function cachedGet(key) {
  if (!client) return null;
  try {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch (e) {
    return null;
  }
}

export async function cachedSet(key, value, ttlSeconds = 60) {
  if (!client) return false;
  try {
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}


