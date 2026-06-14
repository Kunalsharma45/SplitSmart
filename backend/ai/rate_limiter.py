import time
from django.core.cache import cache
from django.conf import settings

def check_rate_limit(user_id):
    """
    Checks if a user is rate-limited for AI requests.
    Stores count and expiration timestamp in Django cache to provide exact TTL estimates.
    
    Returns:
        tuple: (is_blocked, remaining_calls, remaining_minutes)
    """
    limit = getattr(settings, 'AI_MAX_CALLS_PER_HOUR', 20)
    key = f"ai_calls_{user_id}"
    
    data = cache.get(key)
    now = time.time()
    
    if data is None:
        # First call in this window, set expiration to 1 hour from now
        expiry = now + 3600
        cache.set(key, (1, expiry), timeout=3600)
        return False, limit - 1, 60
        
    count, expiry = data
    
    # If cache entry is stale or past expiry
    if now > expiry:
        expiry = now + 3600
        cache.set(key, (1, expiry), timeout=3600)
        return False, limit - 1, 60
        
    remaining_seconds = expiry - now
    remaining_minutes = int(remaining_seconds / 60)
    if remaining_minutes <= 0:
        remaining_minutes = 1
        
    if count >= limit:
        # Blocked
        return True, 0, remaining_minutes
        
    # Increment count and keep the same expiration timestamp
    new_count = count + 1
    cache.set(key, (new_count, expiry), timeout=max(1, int(remaining_seconds)))
    return False, limit - new_count, remaining_minutes
