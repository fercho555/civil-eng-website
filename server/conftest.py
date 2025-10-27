import pytest
from werkzeug.security import generate_password_hash
from app import app, mongo
from dotenv import load_dotenv
from pathlib import Path
import os
import json

# Load environment variables early
env_path = Path(__file__).parent / '.env'  # Adjust path to your .env
load_dotenv(dotenv_path=env_path)
print("Testing MONGO_URI loaded:", os.getenv("MONGO_URI"))
print("Testing other env var:", os.getenv("EMAIL_USER"))
assert os.getenv("MONGO_URI") is not None, "MONGO_URI must be set for tests"

@pytest.fixture(scope="session")
def app_client():
    app.config['TESTING'] = True
    # Ensure Mongo config is set for testing, e.g.:
    app.config['MONGO_URI'] = os.getenv("MONGO_URI")

    with app.test_client() as client:
        with app.app_context():
            # Force Mongo to initialize
            _ = mongo.db
            print("Mongo DB attribute:", mongo.db)
            assert mongo.db is not None, "Mongo DB not initialized!"
            try:
                # Ensure test user present
                test_user = {
                    "username": "temptestuser",
                    "password_hash": generate_password_hash("testpassword"),
                    "role": "user"
                }
                mongo.db.users.insert_one(test_user)
                yield client
                mongo.db.users.delete_one({"username": "temptestuser"})
            except Exception as e:
                print("Failed DB operation:", e)
                raise

@pytest.fixture(autouse=True)
def cleanup_test_users():
    usernames_to_cleanup = ["newuserInit", "commonTestUser"]  # Add test users
    try:
        for username in usernames_to_cleanup:
            mongo.db.users.delete_one({"username": username})
        yield
    finally:
        for username in usernames_to_cleanup:
            mongo.db.users.delete_one({"username": username})

@pytest.fixture
def test_user(app_client):
    username = "commonTestUser"
    password = "testpassword"

    # Register new test user
    res = app_client.post('/api/register', data=json.dumps({
        "username": username,
        "password": password
    }), content_type='application/json')

    # Login to get JWT token
    login_res = app_client.post('/api/login', data=json.dumps({
        "username": username,
        "password": password
    }), content_type='application/json')

    token = login_res.get_json().get("token")

    return {"username": username, "password": password, "token": token}
