from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    category: str
    price: float
    stock: int


class ProductCreate(ProductBase):
    pass


class ProductRead(ProductBase):
    id: int

    class Config:
        from_attributes = True