def legacy_verify(pw, hash_val):
    # Defensive unwrap if hash_val is tuple or list
    if isinstance(hash_val, (tuple, list)):
        hash_val = hash_val[0] if hash_val else ''
    
    if not isinstance(hash_val, str):
        logging.warning(f"Password hash is not string: {hash_val}")
        return False
    
    try:
        if hash_val.startswith('scrypt:'):
            parts = hash_val.split('$')
            if len(parts) == 4:
                _, params, salt_b64, key_b64 = parts
                salt = base64.b64decode(salt_b64)
                key = base64.b64decode(key_b64)
                derived = scrypt.hash(pw, salt, N=32768, r=8, p=1, buflen=len(key))
                return derived == key
            else:
                logging.warning(f"Malformed scrypt hash structure: {hash_val}")
                return False
        elif hash_val.startswith('$2b$'):
            return check_password_hash(hash_val, pw)
        else:
            logging.warning(f"Unsupported hash format: {hash_val}")
            return False
    except Exception as e:
        logging.error(f"Exception in legacy_verify for hash {hash_val}: {e}")
        return False
