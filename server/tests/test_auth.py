def test_login_success(app_client):
    response = app_client.post('/api/login', json={
        'username': 'temptestuser',
        'password': 'testpassword'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'token' in data
    assert data['user']['username'] == 'temptestuser'


def test_login_fail(app_client):
    response = app_client.post('/api/login', json={
        'username': 'wronguser',
        'password': 'wrongpassword'
    })
    assert response.status_code == 401
    data = response.get_json()
    assert 'error' in data


def test_protected_route_requires_token(app_client):
    response = app_client.get('/api/protected')
    assert response.status_code == 401  # No token, unauthorized


def test_protected_route_with_token(test_user, app_client):
    token = test_user['token']
    response = app_client.get('/api/protected', headers={
        'Authorization': f'Bearer {token}'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['logged_in_as'] == test_user['username']
