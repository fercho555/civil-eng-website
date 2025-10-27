import os
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path


# Load MONGO_URI from environment or hardcode for test
MONGO_URI = os.getenv("MONGO_URI") or "your_mongo_uri_here"

try:
    client = MongoClient(MONGO_URI)
    db = client.get_database()
    print("Connected to database:", db.name)
    # Try simple command
    collections = db.list_collection_names()
    print("Collections:", collections)
except Exception as e:
    print("Connection failed:", e)
    
# Construct full path to .env in civil-eng-website/server
#dotenv_path = Path(__file__).resolve().parent /  '.env'
# Load environment variables from this path
# load_dotenv(dotenv_path=dotenv_path)

# def test_mongodb_connection(uri):
#     try:
#         client = MongoClient(uri, serverSelectionTimeoutMS=5000)  # 5 second timeout
#         client.admin.command('ping')  # Ping to test connection
#         print("Connected successfully to MongoDB!")
#     except Exception as e:
#         print("Failed to connect to MongoDB:", e)

# if __name__ == "__main__":
#     # Read the connection string from the environment variable
#     mongo_uri = os.getenv("MONGO_URI")
#     if not mongo_uri:
#         print("Error: MONGO_URI not found in environment variables.")
#     else:
#         test_mongodb_connection(mongo_uri)
