from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/safety", tags=["safety"])

CLAIM_TYPES   = ["Accident", "Cargo", "Liability", "Workers Comp", "Other"]
CLAIM_STATUSES = ["Open", "In Progress", "Closed"]


def _claim_dict(c):
    return {
        "id": c.id,
        "number": f"CLM-{str(c.id).zfill(4)}",
        "date": c.date,
        "driver_id": c.driver_id,
        "driver_name": c.driver.name if c.driver else None,
        "truck_id": c.truck_id,
        "truck_unit": c.truck.unit_number if c.truck else None,
        "trailer_id": c.trailer_id,
        "trailer_unit": c.trailer.unit_number if c.trailer else None,
        "claim_type": c.claim_type,
        "status": c.status,
        "amount": c.amount,
        "short_description": c.short_description,
        "full_description": c.full_description,
    }


class ClaimCreate(BaseModel):
    date: str
    driver_id: Optional[int] = None
    truck_id: Optional[int] = None
    trailer_id: Optional[int] = None
    claim_type: str = "Accident"
    status: str = "Open"
    amount: float = 0
    short_description: Optional[str] = None
    full_description: Optional[str] = None


class ClaimUpdate(BaseModel):
    date: Optional[str] = None
    driver_id: Optional[int] = None
    truck_id: Optional[int] = None
    trailer_id: Optional[int] = None
    claim_type: Optional[str] = None
    status: Optional[str] = None
    amount: Optional[float] = None
    short_description: Optional[str] = None
    full_description: Optional[str] = None


@router.get("/claims")
def list_claims(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    claims = db.query(models.SafetyClaim).filter(
        models.SafetyClaim.company_id == current_user.company_id
    ).order_by(models.SafetyClaim.id.desc()).all()
    total_open   = sum(c.amount or 0 for c in claims if c.status == "Open")
    total_closed = sum(c.amount or 0 for c in claims if c.status == "Closed")
    return {
        "rows": [_claim_dict(c) for c in claims],
        "count": len(claims),
        "total_open": round(total_open, 2),
        "total_closed": round(total_closed, 2),
    }


@router.post("/claims")
def create_claim(body: ClaimCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    c = models.SafetyClaim(**body.dict(), company_id=current_user.company_id)
    db.add(c); db.commit(); db.refresh(c)
    return _claim_dict(c)


@router.patch("/claims/{claim_id}")
def update_claim(claim_id: int, body: ClaimUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    c = db.query(models.SafetyClaim).filter(
        models.SafetyClaim.id == claim_id,
        models.SafetyClaim.company_id == current_user.company_id
    ).first()
    if not c: raise HTTPException(404)
    for k, v in body.dict(exclude_none=True).items():
        setattr(c, k, v)
    db.commit(); db.refresh(c)
    return _claim_dict(c)


@router.delete("/claims/{claim_id}")
def delete_claim(claim_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    c = db.query(models.SafetyClaim).filter(
        models.SafetyClaim.id == claim_id,
        models.SafetyClaim.company_id == current_user.company_id
    ).first()
    if not c: raise HTTPException(404)
    db.delete(c); db.commit()
    return {"ok": True}


@router.get("/claim-types")
def get_claim_types():
    return {"types": CLAIM_TYPES, "statuses": CLAIM_STATUSES}
