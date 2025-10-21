from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()  # loads .env variables

mongo_uri = os.getenv("MONGO_URI")  # make sure you have this in your .env file
if not mongo_uri:
    raise Exception("MONGO_URI not set in environment")

client = MongoClient(mongo_uri)
db = client['contactDB']
users_collection = db['users']
result = users_collection.delete_one({"username": "test_user123"})
print(f"Deleted {result.deleted_count} user(s)")
# Example: print first 5 users
for user in users_collection.find().limit(5):
    print(user)
