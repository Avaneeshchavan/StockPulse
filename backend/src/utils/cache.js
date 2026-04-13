import NodeCache from 'node-cache';

const cacheStore = new NodeCache({ stdTTL: 60, checkperiod: 120 });

export const cacheUtil = {
  get(key) {
    const val = cacheStore.get(key);
    return val === undefined ? null : val;
  },
  set(key, value, ttlSeconds) {
    if (ttlSeconds) {
      cacheStore.set(key, value, ttlSeconds);
    } else {
      cacheStore.set(key, value);
    }
  },
  del(key) {
    cacheStore.del(key);
  }
};
