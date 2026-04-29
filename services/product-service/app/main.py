import os

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, database

app = FastAPI(title="Product Service")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    models.Base.metadata.create_all(bind=database.engine)

@app.get("/health")
def health(): return {"status": "ok"}

@app.get("/products", response_model=list[schemas.ProductRead])
def list_products(db: Session = Depends(database.get_db)):
    return db.query(models.Product).all()

@app.post("/products", response_model=schemas.ProductRead)
def create_product(product: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    db_p = models.Product(**product.model_dump())
    db.add(db_p)
    db.commit()
    db.refresh(db_p)
    return db_p


@app.put("/products/{pid}", response_model=schemas.ProductRead)
def update_product(pid: int, product: schemas.ProductUpdate, db: Session = Depends(database.get_db)):
    db_p = db.query(models.Product).filter(models.Product.id == pid).first()
    if not db_p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")

    for field, value in product.model_dump(exclude_unset=True).items():
        setattr(db_p, field, value)

    db.commit()
    db.refresh(db_p)
    return db_p

@app.get("/products/{pid}", response_model=schemas.ProductRead)
def get_product(pid: int, db: Session = Depends(database.get_db)):
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Not found")
    return p


@app.delete("/products/{pid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(pid: int, db: Session = Depends(database.get_db)):
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Not found")
    db.delete(p)
    db.commit()
    return None
