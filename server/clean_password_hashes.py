import re
from pymongo import MongoClient

# Connect to MongoDB
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()  # Loads variables from .env file into environment

mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise Exception("Missing MONGO_URI environment variable")

client = MongoClient(mongo_uri)
db = client['contactDB']
users_collection = db['users']

# Regex to detect bcrypt hash prefix ($2b$)
bcrypt_pattern = re.compile(r'^\$2[abxy]?\$')

# Regex to detect scrypt hash prefix (scrypt:)
scrypt_pattern = re.compile(r'^scrypt:')

def is_valid_hash(hash_str):
    if not hash_str or not isinstance(hash_str, str):
        return False
    if bcrypt_pattern.match(hash_str) or scrypt_pattern.match(hash_str):
        return True
    return False

def main():
    print("Starting password_hash validation check...")
    users = users_collection.find({})
    invalid_users = []
    
    for user in users:
        phash = user.get('password_hash', None)
        if not is_valid_hash(phash):
            invalid_users.append({
                'username': user.get('username'),
                'password_hash': phash
            })

    if invalid_users:
        print(f"Found {len(invalid_users)} users with invalid password hashes:")
        for u in invalid_users:
            print(f" - Username: {u['username']}, password_hash: {u['password_hash']}")
    else:
        print("All users have valid password hashes.")

if __name__ == "__main__":
    main()