import json

def test_user_profile_route(client, test_user):
    # Use a valid token from test_user fixture
    token = test_user["token"]
    res = client.get('/api/user/profile', headers={
        "Authorization": f"Bearer {token}"
    })
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}"

def test_profile_protected(client):
    # Test accessing protected route without auth returns 401/403, not 404
    res = client.get('/api/user/profile')
    assert res.status_code in (401, 403)
def test_protected_route(client, test_user):
    login_res = client.post('/api/login', data=json.dumps({
        "username": "testuserInit",
        "password": "testpassword"
    }), content_type='application/json')

    # token = login_res.get_json()["token"]
    token = test_user["token"]
    res = client.get('/api/user/profile', headers={
        "Authorization": f"Bearer {token}"
    })

    assert res.status_code == 200
    user_data = res.get_json()
    assert "username" in user_data
def test_routes(client):
    print("Registered routes:")
    for rule in client.application.url_map.iter_rules():
        print(rule)    
