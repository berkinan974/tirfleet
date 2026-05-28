from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import verify_password, hash_password, create_token, get_current_user
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: str
    password: str
    name: str
    role: Optional[str] = "dispatcher"


class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")

    # First user is always owner
    count = db.query(models.User).count()
    role = models.UserRole.owner if count == 0 else models.UserRole(body.role)

    user = models.User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(user.id, user.role.value)
    return {"access_token": token, "token_type": "bearer", "user": _serialize(user)}


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Hesap devre dışı")
    token = create_token(user.id, user.role.value)
    return {"access_token": token, "token_type": "bearer", "user": _serialize(user)}


@router.get("/me")
def me(current_user: models.User = Depends(get_current_user)):
    return _serialize(current_user)


def _serialize(user: models.User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
    }
