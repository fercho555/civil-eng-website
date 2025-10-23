import json

def test_register_success(client):
    res = client.post('/api/register', data=json.dumps({
        "username": "newuserInit",
        "password": "newpassword"
    }), content_type='application/json')
    assert res.status_code == 201
    data = res.get_json()
    assert "message" in data
    assert data["message"] == "Registration successful"

def test_register_existing_user(client):
    res = client.post('/api/register', data=json.dumps({
        "username": "testuser",
        "password": "testpassword"
    }), content_type='application/json')
    assert res.status_code == 409  # Conflict
    data = res.get_json()
    assert "error" in data
