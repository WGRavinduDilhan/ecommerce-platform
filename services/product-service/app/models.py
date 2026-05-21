from sqlalchemy import Column, Float, Integer, String

from .database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    image = Column(String, nullable=True)
    seller_name = Column(String, nullable=True)
    seller_email = Column(String, nullable=True, index=True)
