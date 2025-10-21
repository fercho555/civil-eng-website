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
def remove_duplicate_usernames():
    pipeline = [
        {
            "$group": {
                "_id": "$username",
                "ids": { "$addToSet": "$_id" },
                "count": { "$sum": 1 }
            }
        },
        {
            "$match": {
                "count": { "$gt": 1 }
            }
        }
    ]

    duplicates = list(users_collection.aggregate(pipeline))
    print(f"Found {len(duplicates)} usernames with duplicates.")

    total_removed = 0
    for dup in duplicates:
        ids = dup['ids']
        # Keep the first id, remove the rest
        ids_to_remove = ids[1:]
        result = users_collection.delete_many({ "_id": { "$in": ids_to_remove } })
        total_removed += result.deleted_count
        print(f"Removed {result.deleted_count} duplicates for username '{dup['_id']}'.")

    print(f"Total duplicate records removed: {total_removed}")

if __name__ == "__main__":
    remove_duplicate_usernames()