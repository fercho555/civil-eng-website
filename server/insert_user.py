from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from datetime import datetime, UTC

# MongoDB connection string
MONGO_URI = "mongodb+srv://acon560:OGjbU0kpdtReM5yV@mycluster.pjs6cag.mongodb.net/contactDB?retryWrites=true&w=majority&appName=Mycluster"

def create_user(username, password, role="user", trial_duration_days=7):
    # Connect to MongoDB
    client = MongoClient(MONGO_URI)
    db = client.contactDB  # Use your database
    
    # Hash the plain password
    password_hashed = generate_password_hash(password)
    
    # Prepare the user document
    user_doc = {
        "username": username,
        "password_hash": password_hashed,
        "role": role,
        "trial_start": datetime.now(UTC),
        "trial_duration_days": trial_duration_days
    }
    
    # Insert the user document
    result = db.users.insert_one(user_doc)
    print(f"User '{username}' inserted with _id: {result.inserted_id}")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    # Example: Create a test user
    create_user("testuser", "yourpassword123")
