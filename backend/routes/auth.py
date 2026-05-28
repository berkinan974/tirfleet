from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import verify_password, hash_password, create_token, get_current_user, require_owner
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: str
    password: str
    name: str
    company_name: Optional[str] = None  # required for first (owner) registration


class LoginBody(BaseModel):
    email: str
    password: str


class InviteBody(BaseModel):
    email: str
    password: str
    name: str
    role: Optional[str] = "dispatcher"


@router.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")

    # First user ever becomes owner and creates a company
    user_count = db.query(models.User).count()
    if user_count == 0:
        company_name = body.company_name or "My Fleet"
        company = models.Company(name=company_name)
        db.add(company)
        db.flush()  # get company.id before commit
        role = models.UserRole.owner
        company_id = company.id
    else:
        # Self-registration disabled after first user — use /auth/invite
        raise HTTPException(status_code=403, detail="Kayıt kapalı. Şirket adminine başvurun.")

    user = models.User(
        company_id=company_id,
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


@router.post("/invite")
def invite_user(
    body: InviteBody,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_owner),
):
    """Owner-only: create a dispatcher account in the same company."""
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")

    try:
        role = models.UserRole(body.role)
    except ValueError:
        role = models.UserRole.dispatcher

    user = models.User(
        company_id=current_user.company_id,
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize(user)


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_owner),
):
    """Owner-only: list all users in the company."""
    users = db.query(models.User).filter(
        models.User.company_id == current_user.company_id
    ).all()
    return [_serialize(u) for u in users]


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
    company_name = user.company.name if user.company else None
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "company_id": user.company_id,
        "company_name": company_name,
    }
