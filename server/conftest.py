import pytest
from werkzeug.security import generate_password_hash
from app import create_app
from dotenv import load_dotenv
from pathlib import Path
import os
import json

env_path = Path(__file__).parent / '.env'  # If conftest.py is in /server/tests, adjust as needed
load_dotenv(dotenv_path=env_path)
assert os.getenv("MONGO_URI") is not None, "MONGO_URI must be set for tests"

from app import mongo  # Import your PyMongo instance from your app
@pytest.fixture(scope="session")
def app():
    from app import create_app
    app_instance = create_app()
    # Push app context to allow DB access during tests
    ctx = app_instance.app_context()
    ctx.push()
    yield app_instance
    ctx.pop()

@pytest.fixture(scope='session')
def mongo(app):
    # Import mongo after app created to avoid circular import
    from app import mongo
    return mongo
@pytest.fixture(autouse=True)
def cleanup_test_users(mongo):
    # Run before each test automatically
    # Delete test users that might conflict
    usernames_to_cleanup = ["newuserInit", "commonTestUser"]  # Add any test usernames

    for username in usernames_to_cleanup:
        mongo.db.users.delete_one({"username": username})

    yield  # Run the test

    # Optional: cleanup after test if needed
    for username in usernames_to_cleanup:
        mongo.db.users.delete_one({"username": username})
@pytest.fixture
def uri():
    return "mongodb://localhost:27017"
@pytest.fixture(scope='session')
def app():
    app = create_app()
    app.config['TESTING'] = True
    # mongo.init_app(app)
    yield app

@pytest.fixture(scope='session')
def client(app, mongo):
    with app.test_client() as client:
        with app.app_context():
            _ = mongo.db  # Force lazy property initialization
            print("Mongo DB attribute:", mongo.db)
            assert mongo.db is not None, "Mongo DB not initialized!"
        try:    
            test_user = {
                "username": "temptestuser",
                "password_hash": generate_password_hash("testpassword", method='pbkdf2:sha256'),
                "role": "user"
            }
            mongo.db.users.insert_one(test_user)
            yield client
            mongo.db.users.delete_one({"username": "temptestuser"})
        except Exception as e:
                print("Failed DB operation:", e)
                raise
@pytest.fixture(scope="session")
def test_user(client):
    username = "commonTestUser"
    password = "testpassword"

    # Try register user (ignore conflict if exists)
    res = client.post('/api/register', data=json.dumps({
        "username": username,
        "password": password
    }), content_type='application/json')

    # Login user to get token
    login_res = client.post('/api/login', data=json.dumps({
        "username": username,
        "password": password
    }), content_type='application/json')

    token = login_res.get_json().get("token")

    # Return data needed by tests
    return {"username": username, "password": password, "token": token}        