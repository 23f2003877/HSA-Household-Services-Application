# backend/cache.py
import json
from flask_caching import Cache

cache = Cache()


def init_cache(app):
    cache.init_app(app)


def cache_get(key, default=None):
    try:
        val = cache.get(key)
        if val is None:
            return default
        if isinstance(val, (dict, list)):
            return val
        return json.loads(val)
    except Exception:
        return default


def cache_set(key, value, timeout=60):
    try:
        if isinstance(value, (dict, list)):
            cache.set(key, value, timeout=timeout)
        else:
            cache.set(key, json.dumps(value), timeout=timeout)
    except Exception:
        pass


def invalidate_key(key):
    try:
        cache.delete(key)
    except Exception:
        pass


def invalidate_pattern(pattern):
    """Delete all keys matching a pattern (requires Redis backend)."""
    try:
        redis_client = cache.cache._write_client
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
    except Exception:
        pass
