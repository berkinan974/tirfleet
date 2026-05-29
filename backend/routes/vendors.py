from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/vendors", tags=["vendors"])


class VendorCreate(BaseModel):
    name: str
    vendor_type: Optional[str] = None
    address: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    fid_ein: Optional[str] = None
    mc_number: Optional[str] = None
    additional_payee: Optional[bool] = False
    equipment_owner: Optional[bool] = False
    payee_rate: Optional[float] = None
    settlement_template: Optional[str] = None
    notes: Optional[str] = None


class VendorUpdate(VendorCreate):
    name: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
def list_vendors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Vendor).filter(
        models.Vendor.company_id == current_user.company_id,
        models.Vendor.is_active == True,
    ).order_by(models.Vendor.name).all()


@router.post("/")
def create_vendor(
    data: VendorCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = models.Vendor(**data.model_dump(), company_id=current_user.company_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{vendor_id}")
def update_vendor(
    vendor_id: int,
    data: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = db.query(models.Vendor).filter(
        models.Vendor.id == vendor_id,
        models.Vendor.company_id == current_user.company_id,
    ).first()
    if not obj:
        raise HTTPException(404, "Vendor not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = db.query(models.Vendor).filter(
        models.Vendor.id == vendor_id,
        models.Vendor.company_id == current_user.company_id,
    ).first()
    if not obj:
        raise HTTPException(404, "Vendor not found")
    obj.is_active = False
    db.commit()
    return {"ok": True}
