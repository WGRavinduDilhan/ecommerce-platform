import importlib
import sys
from pathlib import Path

from fastapi.testclient import TestClient


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def _load_app_with_sqlite_database():
    sys.modules.pop("app.main", None)
    sys.modules.pop("app.database", None)
    sys.modules.pop("app.models", None)
    sys.modules.pop("app.schemas", None)

    import app.database  # noqa: F401
    import app.main  # noqa: F401

    return importlib.import_module("app.main").app


def test_health_endpoint_returns_ok(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./test.db")
    app = _load_app_with_sqlite_database()

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}