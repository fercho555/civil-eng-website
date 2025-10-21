import base64
import scrypt
from werkzeug.security import check_password_hash, generate_password_hash


def verify_password(plain_password, password_hash):
    if not password_hash or not isinstance(password_hash, str):
        return False
    
    if password_hash.startswith('$2b$'):  # bcrypt check
        return check_password_hash(password_hash, plain_password)
    
    elif password_hash.startswith('scrypt:'):  # scrypt check
        try:
            # scrypt hash format example:
            # scrypt:32768:8:1$<base64-salt>$<base64-key>
            parts = password_hash.split('$')
            if len(parts) == 3:
                params_part = parts[0]  # scrypt:32768:8:1
                salt_b64 = parts[1]
                key_b64 = parts[2]

                # Parse scrypt parameters
                prefix, n_str, r_str, p_str = params_part.split(':')
                N = int(n_str)
                r = int(r_str)
                p = int(p_str)

                salt = base64.b64decode(salt_b64)
                key = base64.b64decode(key_b64)

                # Derive key from provided password using parameters and salt
                derived = scrypt.hash(plain_password.encode('utf-8'), salt, N=N, r=r, p=p, buflen=len(key))

                return derived == key
            else:
                print("Invalid scrypt hash format")
                return False
        except Exception as e:
            print(f"Error verifying scrypt hash: {e}")
            return False
    
    else:
        # Unsupported or unknown hash format
        return False


# Generate a fresh bcrypt hash for testing
bcrypt_password = "tormentUp"
bcrypt_hash = generate_password_hash(bcrypt_password)  # Generates a valid hash dynamically

# Construct a valid scrypt hash for testing
scrypt_password = "testpass123"
salt = b'somesalt12345678'  # should be securely generated in real use
scrypt_hash = (
    "scrypt:32768:8:1$"
    + base64.b64encode(salt).decode()
    + "$"
    + base64.b64encode(
        scrypt.hash(scrypt_password.encode(), salt, N=32768, r=8, p=1)
    ).decode()
)

# Test bcrypt verification
print("Testing bcrypt:")
print(verify_password(bcrypt_password, bcrypt_hash))  # Should print True

# Test scrypt verification
print("Testing scrypt:")
print(verify_password(scrypt_password, scrypt_hash))  # Should print True
