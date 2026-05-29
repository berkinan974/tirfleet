from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/trailers", tags=["trailers"])


class TrailerCreate(BaseModel):
    unit_number: str
    trailer_type: Optional[str] = None
    vin: Optional[str] = None
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    driver_id: Optional[int] = None
    plate: Optional[str] = None
    plate_state: Optional[str] = None
    ownership: Optional[str] = 'owned'
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    history: Optional[str] = None
    status: Optional[str] = 'active'


class TrailerUpdate(BaseModel):
    unit_number: Optional[str] = None
    trailer_type: Optional[str] = None
    vin: Optional[str] = None
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    driver_id: Optional[int] = None
    plate: Optional[str] = None
    plate_state: Optional[str] = None
    ownership: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    history: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
def list_trailers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    trailers = db.query(models.Trailer).filter(
        models.Trailer.company_id == current_user.company_id,
        models.Trailer.is_active == True,
    ).all()
    result = []
    for tr in trailers:
        result.append({
            "id": tr.id,
            "unit_number": tr.unit_number,
            "trailer_type": tr.trailer_type,
            "vin": tr.vin,
            "year": tr.year,
            "make": tr.make,
            "model": tr.model,
            "driver_id": tr.driver_id,
            "driver_name": tr.driver.name if tr.driver else None,
            "plate": tr.plate,
            "plate_state": tr.plate_state,
            "ownership": tr.ownership,
            "purchase_date": str(tr.purchase_date)[:10] if tr.purchase_date else None,
            "purchase_price": tr.purchase_price,
            "notes": tr.notes,
            "history": tr.history,
            "status": tr.status,
            "is_active": tr.is_active,
        })
    return result


@router.post("/")
def create_trailer(
    trailer: TrailerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_trailer = models.Trailer(**trailer.model_dump(), company_id=current_user.company_id)
    db.add(db_trailer)
    db.commit()
    db.refresh(db_trailer)
    return db_trailer


@router.patch("/{trailer_id}")
def update_trailer(
    trailer_id: int,
    update: TrailerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    trailer = db.query(models.Trailer).filter(
        models.Trailer.id == trailer_id,
        models.Trailer.company_id == current_user.company_id,
    ).first()
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(trailer, field, value)
    db.commit()
    db.refresh(trailer)
    return trailer


@router.delete("/{trailer_id}")
def delete_trailer(
    trailer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    trailer = db.query(models.Trailer).filter(
        models.Trailer.id == trailer_id,
        models.Trailer.company_id == current_user.company_id,
    ).first()
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    trailer.is_active = False
    db.commit()
    return {"ok": True}
