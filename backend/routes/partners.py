from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/partners", tags=["partners"])


class PartnerCreate(BaseModel):
    name: str
    partner_type: Optional[str] = "broker"
    address: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    fid_ein: Optional[str] = None
    mc_number: Optional[str] = None
    pay_method: Optional[str] = None
    credit: Optional[str] = None
    avg_dtp: Optional[float] = None
    billing_type: Optional[str] = "factoring"
    quickpay_fee: Optional[float] = None
    status: Optional[str] = "pending"
    pay_terms: Optional[str] = None
    notes: Optional[str] = None


class PartnerUpdate(PartnerCreate):
    name: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
def list_partners(
    partner_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Partner).filter(
        models.Partner.company_id == current_user.company_id,
        models.Partner.is_active == True,
    )
    if partner_type:
        q = q.filter(models.Partner.partner_type == partner_type)
    return q.order_by(models.Partner.name).all()


@router.post("/")
def create_partner(
    data: PartnerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = models.Partner(**data.model_dump(), company_id=current_user.company_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{partner_id}")
def update_partner(
    partner_id: int,
    data: PartnerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = db.query(models.Partner).filter(
        models.Partner.id == partner_id,
        models.Partner.company_id == current_user.company_id,
    ).first()
    if not obj:
        raise HTTPException(404, "Partner not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{partner_id}")
def delete_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = db.query(models.Partner).filter(
        models.Partner.id == partner_id,
        models.Partner.company_id == current_user.company_id,
    ).first()
    if not obj:
        raise HTTPException(404, "Partner not found")
    obj.is_active = False
    db.commit()
    return {"ok": True}
