import os
from pymongo import MongoClient

def test_mongo_connection():
    # Load URI from environment variable
    uri = os.getenv("MONGO_URI")
    if not uri:
        print("MONGO_URI environment variable not set.")
        return

    print("Connecting with URI:")
    print(uri)

    try:
        client = MongoClient(uri)
        db = client.get_database()
        print("Connected to database:", db.name)
        # Try listing collections to test auth and access
        collections = db.list_collection_names()
        print("Collections:", collections)
        print("Connection and authentication successful.")
    except Exception as e:
        print("Connection failed:", e)

if __name__ == "__main__":
    test_mongo_connection()
