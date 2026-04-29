# ecommerce-platform

Modern ecommerce platform with two backend services and a React frontend. Product data is managed by a FastAPI service, orders are processed by an Express service, and the frontend provides a polished dashboard for catalog and order management.

## Structure

- `services/product-service/`: FastAPI + SQLAlchemy product API.
- `services/order-service/`: Express + PostgreSQL order API.
- `services/frontend/`: Vite + React dashboard UI.
- `infra/`: Terraform scaffolding for cloud resources.

## Product Service Files

- `app/main.py`: FastAPI entrypoint and product CRUD routes.
- `app/database.py`: SQLAlchemy engine, session factory, and DB dependency.
- `app/models.py`: ORM table definitions.
- `app/schemas.py`: Request and response validation models.

## Run Locally

Install Python dependencies for the product service:

```powershell
cd services/product-service
pip install -r requirements.txt
```

Start the platform with Docker Compose:

```powershell
docker compose up --build
```

Frontend: `http://localhost:5173`
Product API: `http://localhost:8000`
Order API: `http://localhost:3000`