from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    category: str
    price: float
    stock: int
    image: str | None = None
    seller_name: str | None = None
    seller_email: str | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    price: float | None = None
    stock: int | None = None
    image: str | None = None
    seller_name: str | None = None
    seller_email: str | None = None


class ProductRead(ProductBase):
    id: int

    class Config:
        from_attributes = True