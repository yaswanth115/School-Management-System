from app.core.config import settings


def test_login_success(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "admin@school.com", "password": "Admin@12345"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@school.com"
    assert data["user"]["role"] == "ADMIN"


def test_login_invalid_password(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "admin@school.com", "password": "WrongPassword123"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_login_nonexistent_email(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "nobody@school.com", "password": "SomePassword123"},
    )
    assert response.status_code == 401


def test_refresh_token(client):
    login_resp = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "admin@school.com", "password": "Admin@12345"},
    )
    refresh_tok = login_resp.json()["refresh_token"]

    refresh_resp = client.post(
        f"{settings.API_V1_STR}/auth/refresh",
        json={"refresh_token": refresh_tok},
    )
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_get_current_user_me(client, admin_headers):
    response = client.get(f"{settings.API_V1_STR}/auth/me", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@school.com"
    assert data["role"] == "ADMIN"


def test_unauthenticated_request_rejected(client):
    response = client.get(f"{settings.API_V1_STR}/auth/me")
    assert response.status_code == 401
