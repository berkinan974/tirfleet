from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/loads", tags=["loads"])


class LoadCreate(BaseModel):
    truck_id: int
    load_number: Optional[str] = None
    broker_name: Optional[str] = None
    origin: str
    destination: str
    pickup_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    rate: Optional[float] = None
    miles: Optional[float] = None
    dat_reference: Optional[str] = None
    eta: Optional[str] = None
    notes: Optional[str] = None


class LoadUpdate(BaseModel):
    broker_name: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    pickup_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    rate: Optional[float] = None
    miles: Optional[float] = None
    status: Optional[models.LoadStatus] = None
    eta: Optional[str] = None
    notes: Optional[str] = None


@router.get("/")
def list_loads(
    status: Optional[models.LoadStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Load).filter(models.Load.company_id == current_user.company_id)
    if status:
        query = query.filter(models.Load.status == status)
    if search:
        q = f"%{search}%"
        query = query.filter(or_(
            models.Load.origin.ilike(q),
            models.Load.destination.ilike(q),
            models.Load.broker_name.ilike(q),
            models.Load.load_number.ilike(q),
        ))
    return query.order_by(models.Load.created_at.desc()).all()


@router.post("/")
def create_load(
    load: LoadCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    truck = db.query(models.Truck).filter(
        models.Truck.id == load.truck_id,
        models.Truck.company_id == current_user.company_id,
    ).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Tır bulunamadı")
    db_load = models.Load(**load.model_dump(), company_id=current_user.company_id)
    if not db_load.load_number:
        count = db.query(models.Load).filter(
            models.Load.company_id == current_user.company_id
        ).count()
        db_load.load_number = f"L-{count + 1:03d}"
    db.add(db_load)
    db.commit()
    db.refresh(db_load)
    return db_load


@router.patch("/{load_id}")
def update_load(
    load_id: int,
    update: LoadUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    load = db.query(models.Load).filter(
        models.Load.id == load_id,
        models.Load.company_id == current_user.company_id,
    ).first()
    if not load:
        raise HTTPException(status_code=404, detail="Load bulunamadı")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(load, field, value)
    db.commit()
    db.refresh(load)
    return load


@router.get("/summary")
def load_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cid = current_user.company_id
    base = db.query(models.Load).filter(models.Load.company_id == cid)
    total = base.count()
    in_transit = base.filter(models.Load.status == models.LoadStatus.in_transit).count()
    delivered_q = db.query(models.Load).filter(
        models.Load.company_id == cid,
        models.Load.status == models.LoadStatus.delivered,
    )
    delivered = delivered_q.count()
    revenue = sum(r.rate or 0 for r in delivered_q.all())
    all_loads = db.query(models.Load).filter(
        models.Load.company_id == cid,
        models.Load.status != models.LoadStatus.cancelled,
    ).count()
    on_time_pct = round((delivered / all_loads * 100) if all_loads else 0)
    miles_sum = sum(
        m.miles or 0 for m in db.query(models.Load).filter(models.Load.company_id == cid).all()
    )
    rpm = round(revenue / miles_sum, 2) if miles_sum else 0
    return {
        "total_loads": total,
        "in_transit": in_transit,
        "delivered": delivered,
        "total_revenue": revenue,
        "on_time_pct": on_time_pct,
        "total_miles": miles_sum,
        "revenue_per_mile": rpm,
    }
