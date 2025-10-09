import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")
USERS_COLLECTION = os.getenv("USERS_COLLECTION")
if not DB_NAME:
    raise ValueError("DB_NAME environment variable not set!")
print(f"Using Mongo URI: {MONGO_URI}")
print(f"Using DB Name: {DB_NAME}")
print(f"Using Collection: {USERS_COLLECTION}")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[USERS_COLLECTION]

# Print number of documents in collection
count = collection.count_documents({})
print(f"Total documents in collection: {count}")

# Print first document found (if any)
doc = collection.find_one()
print(f"Example document:\n{doc}")
