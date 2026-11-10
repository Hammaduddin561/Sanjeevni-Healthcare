from sqlalchemy import Column, Integer, String
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String, nullable=True) # password optional for Google Users
    google_id = Column(String, unique=True, nullable=True, index=True) # Unique Google ID
    specialty = Column(String, nullable=True)
    hospital = Column(String, nullable=True)
