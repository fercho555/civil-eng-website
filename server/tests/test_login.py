import json

def test_login_success(client):
    res = client.post('/api/login', data=json.dumps({
        "username": "temptestuser",
        "password": "testpassword"
    }), content_type='application/json')
    assert res.status_code == 200
    data = res.get_json()
    assert "token" in data

def test_login_wrong_password(client):
    res = client.post('/api/login', data=json.dumps({
        "username": "temptestuser",
        "password": "wrongpassword"
    }), content_type='application/json')
    assert res.status_code == 401
    data = res.get_json()
    assert "error" in data
