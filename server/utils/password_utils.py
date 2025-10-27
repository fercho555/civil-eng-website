import base64
import hashlib
import hmac
import re
from flask_bcrypt import Bcrypt
from werkzeug.security import check_password_hash

bcrypt = Bcrypt()

def verify_scrypt_hash(stored_hash, password):
    """
    Verify password against a scrypt hash in the format:
    scrypt:N:r:p$salt_base64$hash_base64
    """
    try:
        # Parse scrypt formatted hash string
        match = re.match(r'scrypt:(\d+):(\d+):(\d+)\$(.+)\$(.+)', stored_hash)
        if not match:
            return False

        N = int(match.group(1))
        r = int(match.group(2))
        p = int(match.group(3))
        salt_b64 = match.group(4)
        hash_b64 = match.group(5)

        salt = base64.b64decode(salt_b64)
        hash_bytes = base64.b64decode(hash_b64)

        # Derive key from provided password using parameters
        dk = hashlib.scrypt(
            password.encode('utf-8'),
            salt=salt,
            n=N,
            r=r,
            p=p,
            maxmem=1024*1024*32,  # 32MiB max mem, adjust if needed
            dklen=len(hash_bytes)
        )

        # Constant time compare
        return hmac.compare_digest(dk, hash_bytes)
    except Exception as e:
        print("Error verifying scrypt hash:", e)
        return False


def verify_password(stored_hash, password):
    """
    Wrapper function to detect hash type and verify accordingly.
    Supports scrypt, bcrypt, and werkzeug pbkdf2_sha256.
    """
    if stored_hash.startswith("scrypt:"):
        return verify_scrypt_hash(stored_hash, password)
    elif stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$") or stored_hash.startswith("$2y$"):
        return bcrypt.check_password_hash(stored_hash, password)
    else:
        # fallback to werkzeug's check_password_hash
        return check_password_hash(stored_hash, password)

# Usage example in login route:

# user = db.users.find_one({"username": username})
# if user and verify_password(user["password_hash"], input_password):
#     # Authentication success
# else:
#     # Authentication failure
