from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


class MaintenanceCreate(BaseModel):
    truck_id: int
    date: str
    type: str
    description: Optional[str] = None
    cost: Optional[float] = None
    mileage: Optional[int] = None
    vendor: Optional[str] = None


class MaintenanceUpdate(BaseModel):
    date: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    mileage: Optional[int] = None
    vendor: Optional[str] = None
    status: Optional[str] = None


@router.get("/")
def list_maintenance(
    truck_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.MaintenanceLog).filter(
        models.MaintenanceLog.company_id == current_user.company_id
    )
    if truck_id:
        query = query.filter(models.MaintenanceLog.truck_id == truck_id)
    return query.order_by(models.MaintenanceLog.created_at.desc()).all()


@router.post("/")
def create_maintenance(
    entry: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    truck = db.query(models.Truck).filter(
        models.Truck.id == entry.truck_id,
        models.Truck.company_id == current_user.company_id,
    ).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Tır bulunamadı")
    log = models.MaintenanceLog(**entry.model_dump(), company_id=current_user.company_id)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.patch("/{log_id}")
def update_maintenance(
    log_id: int,
    update: MaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    log = db.query(models.MaintenanceLog).filter(
        models.MaintenanceLog.id == log_id,
        models.MaintenanceLog.company_id == current_user.company_id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}")
def delete_maintenance(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    log = db.query(models.MaintenanceLog).filter(
        models.MaintenanceLog.id == log_id,
        models.MaintenanceLog.company_id == current_user.company_id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    db.delete(log)
    db.commit()
    return {"ok": True}
