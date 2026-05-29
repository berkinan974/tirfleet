from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import re

router = APIRouter(prefix="/loads", tags=["loads"])


class LoadCreate(BaseModel):
    truck_id: Optional[int] = None
    driver_id: Optional[int] = None
    load_number: Optional[str] = None
    broker_name: Optional[str] = None
    po_number: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    pickup_date: Optional[datetime] = None
    pickup_city: Optional[str] = None
    pickup_state: Optional[str] = None
    pickup_zip: Optional[str] = None
    delivery_date: Optional[datetime] = None
    delivery_city: Optional[str] = None
    delivery_state: Optional[str] = None
    delivery_zip: Optional[str] = None
    rate: Optional[float] = None
    miles: Optional[float] = None
    billing_status: Optional[str] = "pending"
    dispatcher_name: Optional[str] = None
    trailer: Optional[str] = None
    dat_reference: Optional[str] = None
    eta: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[models.LoadStatus] = None


class LoadUpdate(BaseModel):
    truck_id: Optional[int] = None
    driver_id: Optional[int] = None
    broker_name: Optional[str] = None
    po_number: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    pickup_date: Optional[datetime] = None
    pickup_city: Optional[str] = None
    pickup_state: Optional[str] = None
    pickup_zip: Optional[str] = None
    delivery_date: Optional[datetime] = None
    delivery_city: Optional[str] = None
    delivery_state: Optional[str] = None
    delivery_zip: Optional[str] = None
    rate: Optional[float] = None
    miles: Optional[float] = None
    status: Optional[models.LoadStatus] = None
    billing_status: Optional[str] = None
    dispatcher_name: Optional[str] = None
    trailer: Optional[str] = None
    eta: Optional[str] = None
    notes: Optional[str] = None
    completed_at: Optional[datetime] = None


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
    data = load.model_dump()

    # Resolve truck_id — if not provided, use first available truck
    if not data.get("truck_id"):
        first_truck = db.query(models.Truck).filter(
            models.Truck.company_id == current_user.company_id
        ).first()
        data["truck_id"] = first_truck.id if first_truck else None

    # Auto-derive origin/destination from city+state if not explicitly provided
    if not data.get("origin") and (data.get("pickup_city") or data.get("pickup_state")):
        parts = [p for p in [data.get("pickup_city"), data.get("pickup_state")] if p]
        data["origin"] = ", ".join(parts)
    if not data.get("destination") and (data.get("delivery_city") or data.get("delivery_state")):
        parts = [p for p in [data.get("delivery_city"), data.get("delivery_state")] if p]
        data["destination"] = ", ".join(parts)

    db_load = models.Load(**data, company_id=current_user.company_id)
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


@router.get("/ifta")
def ifta_summary(
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """State-by-state mileage summary for IFTA quarterly filing."""
    from datetime import date
    year = year or date.today().year
    quarter_months = {1: (1, 3), 2: (4, 6), 3: (7, 9), 4: (10, 12)}

    query = db.query(models.Load).filter(
        models.Load.company_id == current_user.company_id,
        models.Load.miles != None,
    )
    if quarter and quarter in quarter_months:
        sm, em = quarter_months[quarter]
        start = datetime(year, sm, 1)
        end = datetime(year, em, 30, 23, 59, 59)
        query = query.filter(
            or_(
                models.Load.pickup_date == None,
                (models.Load.pickup_date >= start) & (models.Load.pickup_date <= end),
            )
        )

    loads = query.all()

    def extract_state(loc):
        if not loc:
            return None
        m = re.search(r'\b([A-Z]{2})\b', loc.upper())
        return m.group(1) if m else None

    state_miles: dict[str, float] = {}
    for load in loads:
        miles = load.miles or 0
        o = extract_state(load.origin)
        d = extract_state(load.destination)
        if o:
            state_miles[o] = state_miles.get(o, 0) + miles / 2
        if d:
            state_miles[d] = state_miles.get(d, 0) + miles / 2

    total = round(sum(state_miles.values()))
    states = sorted(
        [{"state": s, "miles": round(m)} for s, m in state_miles.items()],
        key=lambda x: x["miles"], reverse=True,
    )
    return {
        "year": year,
        "quarter": quarter,
        "total_miles": total,
        "loads_count": len(loads),
        "states": states,
        "note": "Miles estimated 50/50 between origin and destination states.",
    }


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
