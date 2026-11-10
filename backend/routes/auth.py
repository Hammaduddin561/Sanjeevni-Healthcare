from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.user import User
from backend.auth import get_password_hash, verify_password, create_access_token, get_current_user
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: Optional[str] = "worker"
    specialty: Optional[str] = None
    hospital: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_name: str
    user_email: str
    role: str
    user_specialty: Optional[str] = None

@router.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email.lower().strip()).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    role = user.role.lower() if user.role else "worker"
    if role not in ["worker", "doctor", "admin"]:
        role = "worker"

    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email.lower().strip(),
        hashed_password=hashed_password,
        name=user.name,
        role=role,
        specialty=user.specialty,
        hospital=user.hospital
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_name": new_user.name,
        "user_email": new_user.email,
        "role": new_user.role,
        "user_specialty": new_user.specialty
    }

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    clean_email = user.email.lower().strip()
    db_user = db.query(User).filter(User.email == clean_email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": db_user.email, "role": db_user.role})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_name": db_user.name,
        "user_email": db_user.email,
        "role": db_user.role,
        "user_specialty": db_user.specialty
    }

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "specialty": current_user.specialty,
        "hospital": current_user.hospital
    }

