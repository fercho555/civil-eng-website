# free_access.py

from functools import wraps
from flask import request, jsonify, g
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
import os

# Set up your DB connection here (or import from your main app module)
client = MongoClient(os.getenv('MONGO_URI'))
db = client['contactDB']

DEFAULT_TRIAL_DAYS = 7  # configurable default

def is_trial_active(user):
    try:
        trial_start = user.get('trial_start')
        
        if not trial_start:
            return False
        
        if isinstance(trial_start, str):
            trial_start = datetime.fromisoformat(trial_start)
            # Make timezone-aware if naive
            if trial_start.tzinfo is None:
                trial_start = trial_start.replace(tzinfo=timezone.utc)
        duration = user.get('trial_duration_days', DEFAULT_TRIAL_DAYS)
        now = datetime.now(timezone.utc)
        return trial_start + timedelta(days=duration) > now
        
    except Exception as e:
        print('Trial check error:', str(e))
        return False

def require_trial_access(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import g, jsonify
        print("require_trial_access DECORATOR CALLED")    # <--- Add this line
        user = getattr(g, 'user', None)
        if not user:
            print("NO USER, returning 401")              # <--- Add this line
            return jsonify({'error': 'Login required.'}), 401
        # Exempt admin user roles from trial expiration checks
        if user.get('role') == 'admin':
            return f(*args, **kwargs)
        if is_trial_active(user):
            print("TRIAL ACTIVE, access allowed")        # <--- Add this
            return f(*args, **kwargs)
        print("TRIAL EXPIRED, returning 403")            # <--- Add this
        return jsonify({'error': 'Your free trial has expired. Please upgrade.'}), 403
    return decorated_function
