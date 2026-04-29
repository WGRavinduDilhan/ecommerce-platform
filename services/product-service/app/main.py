from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
from . import models, schemas, database

app = FastAPI(title="Product Service")

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

@app.get("/products/{pid}", response_model=schemas.ProductRead)
def get_product(pid: int, db: Session = Depends(database.get_db)):
    p = db.query(models.Product).filter(models.Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Not found")
    return p
