from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend import models
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter(prefix="/trucks", tags=["trucks"])


class TruckCreate(BaseModel):
    unit_number: str
    plate: str
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None


class TruckUpdate(BaseModel):
    plate: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vin: Optional[str] = None
    fuel_level: Optional[int] = None
    odometer: Optional[int] = None
    status: Optional[models.TruckStatus] = None


@router.get("/")
def list_trucks(db: Session = Depends(get_db)):
    trucks = db.query(models.Truck).all()
    result = []
    for truck in trucks:
        today = date.today().isoformat()
        pti_today = db.query(models.PTIRecord).filter(
            models.PTIRecord.truck_id == truck.id,
            models.PTIRecord.date == today
        ).first()
        active_load = db.query(models.Load).filter(
            models.Load.truck_id == truck.id,
            models.Load.status == models.LoadStatus.in_transit
        ).first()
        result.append({
            "id": truck.id,
            "unit_number": truck.unit_number,
            "plate": truck.plate,
            "make": truck.make,
            "model": truck.model,
            "year": truck.year,
            "vin": truck.vin,
            "fuel_level": truck.fuel_level if truck.fuel_level is not None else 100,
            "odometer": truck.odometer or 0,
            "status": truck.status,
            "driver": truck.driver.name if truck.driver else None,
            "pti_today": pti_today is not None,
            "active_load": {
                "origin": active_load.origin,
                "destination": active_load.destination,
                "rate": active_load.rate,
                "eta": active_load.eta,
            } if active_load else None
        })
    return result


@router.post("/")
def create_truck(truck: TruckCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Truck).filter(
        models.Truck.unit_number == truck.unit_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu unit number zaten kayıtlı")
    db_truck = models.Truck(**truck.model_dump())
    db.add(db_truck)
    db.commit()
    db.refresh(db_truck)
    return db_truck


@router.get("/{truck_id}")
def get_truck(truck_id: int, db: Session = Depends(get_db)):
    truck = db.query(models.Truck).filter(models.Truck.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Tır bulunamadı")
    return truck


@router.patch("/{truck_id}")
def update_truck(truck_id: int, update: TruckUpdate, db: Session = Depends(get_db)):
    truck = db.query(models.Truck).filter(models.Truck.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Tır bulunamadı")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(truck, field, value)
    db.commit()
    db.refresh(truck)
    return truck
