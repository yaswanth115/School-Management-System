import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.main import app
from app.models.role import RoleEnum
from app.models.user import User

# Use the existing database engine for integration tests
engine = create_engine(settings.DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_headers(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "admin@school.com", "password": "Admin@12345"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def teacher_headers(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "teacher@school.com", "password": "Teacher@12345"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def student_headers(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "student@school.com", "password": "Student@12345"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def accountant_headers(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "accountant@school.com", "password": "Accountant@12345"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def parent_headers(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "parent@school.com", "password": "Parent@12345"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def principal_headers(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "principal@school.com", "password": "Principal@12345"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
