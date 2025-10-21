db.users.insert_one({
        "username": username,
        "password_hash": password_hash,   # Note field is 'password_hash'
        "role": "user"   # Set default role if desired
    })