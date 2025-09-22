from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from datetime import datetime

client = MongoClient("mongodb+srv://acon560:OGjbU0kpdtReM5yV@mycluster.pjs6cag.mongodb.net/contactDB?retryWrites=true&w=majority&appName=Mycluster")
db = client.contactDB

password_plain = "quietStorm"
password_hashed = generate_password_hash(password_plain)

new_user = {
    "username": "testuser",
    "password_hash": password_hashed,
    "role": "user",
    "trial_start": datetime(2025, 9, 21, 12, 0, 0),
    "trial_duration_days": 7
}

result = db.users.insert_one(new_user)
print("New user inserted with _id:", result.inserted_id)
