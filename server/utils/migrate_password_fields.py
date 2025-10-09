import os
from dotenv import load_dotenv, find_dotenv
from pymongo import MongoClient

# Load environment variables from .env in current directory (or specify path)
load_dotenv(override=True)
load_dotenv(find_dotenv(usecwd=True), override=True)  
# MongoDB connection string from .env variable MONGO_URI, fallback if missing (not for production)
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')

# Update these as per your application setup
DB_NAME = os.getenv('DB_NAME', 'ContactDB')
USERS_COLLECTION = os.getenv('USERS_COLLECTION', 'users')
print("MONGO_URI:", os.getenv('MONGO_URI'))
print("DB_NAME:", os.getenv('DB_NAME'))
print("USERS_COLLECTION:", os.getenv('USERS_COLLECTION'))
def migrate_password_fields():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    users_col = db[USERS_COLLECTION]

    # Find users with password but missing password_hash field
    query = {"password": {"$exists": True}, "password_hash": {"$exists": False}}
    users_to_update = list(users_col.find(query))
   
    print(f"Found {len(users_to_update)} users to migrate passwords.")

    for user in users_to_update:
        user_id = user["_id"]
        username = user.get("username", "<no username>")
        password_value = user["password"]

        # Copy password into password_hash and remove password field
        update_result = users_col.update_one(
            {"_id": user_id},
            {"$set": {"password_hash": password_value},
             "$unset": {"password": ""}}
        )
        if update_result.modified_count == 1:
            print(f"User '{username}' ({user_id}) password field migrated to password_hash.")
        else:
            print(f"Failed to update user '{username}' ({user_id}).")

    client.close()

if __name__ == "__main__":
    migrate_password_fields()
