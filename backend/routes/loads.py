from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
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
def list_loads(status: Optional[models.LoadStatus] = None, db: Session = Depends(get_db)):
    query = db.query(models.Load)
    if status:
        query = query.filter(models.Load.status == status)
    return query.order_by(models.Load.created_at.desc()).all()


@router.post("/")
def create_load(load: LoadCreate, db: Session = Depends(get_db)):
    truck = db.query(models.Truck).filter(models.Truck.id == load.truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Tır bulunamadı")
    db_load = models.Load(**load.model_dump())
    db.add(db_load)
    db.commit()
    db.refresh(db_load)
    return db_load


@router.patch("/{load_id}")
def update_load(load_id: int, update: LoadUpdate, db: Session = Depends(get_db)):
    load = db.query(models.Load).filter(models.Load.id == load_id).first()
    if not load:
        raise HTTPException(status_code=404, detail="Load bulunamadı")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(load, field, value)
    db.commit()
    db.refresh(load)
    return load


@router.get("/summary")
def load_summary(db: Session = Depends(get_db)):
    total = db.query(models.Load).count()
    in_transit = db.query(models.Load).filter(
        models.Load.status == models.LoadStatus.in_transit
    ).count()
    delivered = db.query(models.Load).filter(
        models.Load.status == models.LoadStatus.delivered
    ).count()
    total_revenue = db.query(models.Load).filter(
        models.Load.status == models.LoadStatus.delivered
    ).with_entities(models.Load.rate).all()
    revenue = sum(r[0] for r in total_revenue if r[0])
    all_loads = db.query(models.Load).filter(
        models.Load.status != models.LoadStatus.cancelled
    ).count()
    on_time = delivered  # treat all delivered as on-time for now; refine when delivery_date tracking is added
    on_time_pct = round((on_time / all_loads * 100) if all_loads else 0)
    total_miles = db.query(models.Load).with_entities(models.Load.miles).all()
    miles_sum = sum(m[0] for m in total_miles if m[0])
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
