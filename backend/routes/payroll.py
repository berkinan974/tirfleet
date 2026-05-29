from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import date as dt_date

router = APIRouter(prefix="/payroll", tags=["payroll"])


class SettlementCreate(BaseModel):
    driver_id:        Optional[int]   = None
    payable_to:       Optional[str]   = None
    date:             str
    date_from:        Optional[str]   = None
    date_to:          Optional[str]   = None
    settlement_total: Optional[float] = 0
    balance_due:      Optional[float] = 0
    status:           Optional[str]   = "draft"
    notes:            Optional[str]   = None


class SettlementUpdate(BaseModel):
    driver_id:        Optional[int]   = None
    payable_to:       Optional[str]   = None
    date:             Optional[str]   = None
    date_from:        Optional[str]   = None
    date_to:          Optional[str]   = None
    settlement_total: Optional[float] = None
    balance_due:      Optional[float] = None
    status:           Optional[str]   = None
    notes:            Optional[str]   = None


@router.get("/settlements")
def list_settlements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    settlements = db.query(models.DriverSettlement).filter(
        models.DriverSettlement.company_id == current_user.company_id,
    ).order_by(models.DriverSettlement.date.desc()).all()
    return [_s_dict(s) for s in settlements]


@router.post("/settlements")
def create_settlement(
    body: SettlementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    s = models.DriverSettlement(**body.model_dump(), company_id=current_user.company_id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return _s_dict(s)


@router.patch("/settlements/{sid}")
def update_settlement(
    sid: int,
    body: SettlementUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    s = db.query(models.DriverSettlement).filter(
        models.DriverSettlement.id == sid,
        models.DriverSettlement.company_id == current_user.company_id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Settlement not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return _s_dict(s)


@router.delete("/settlements/{sid}")
def delete_settlement(
    sid: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    s = db.query(models.DriverSettlement).filter(
        models.DriverSettlement.id == sid,
        models.DriverSettlement.company_id == current_user.company_id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Settlement not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.get("/open-balance")
def open_balance(
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
    by:        str = "pickup",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Calculate open (unpaid) balance per driver based on delivered loads."""
    q = db.query(models.Load).filter(
        models.Load.company_id == current_user.company_id,
        models.Load.status == models.LoadStatus.delivered,
        models.Load.driver_id.isnot(None),
    )
    if date_from:
        date_col = models.Load.pickup_date if by == "pickup" else models.Load.delivery_date
        q = q.filter(date_col >= date_from)
    if date_to:
        date_col = models.Load.pickup_date if by == "pickup" else models.Load.delivery_date
        q = q.filter(date_col <= date_to)

    loads = q.all()

    driver_map: dict[int, dict] = {}
    for load in loads:
        drv = load.driver
        if not drv:
            continue
        if drv.id not in driver_map:
            driver_map[drv.id] = {
                "driver_id": drv.id,
                "driver_name": drv.name,
                "payable_to": drv.name,
                "load_count": 0,
                "gross": 0.0,
                "earned": 0.0,
            }
        gross = load.rate or 0
        driver_map[drv.id]["load_count"] += 1
        driver_map[drv.id]["gross"] += gross

        pay_type = drv.pay_type or "per_mile"
        rate = drv.pay_rate or 0
        miles = load.miles or 0
        if pay_type == "per_mile":
            earned = rate * miles
        elif pay_type == "freight_percentage":
            earned = gross * (rate / 100)
        elif pay_type == "flatpay":
            earned = rate
        else:
            earned = rate * (miles or 1)

        driver_map[drv.id]["earned"] += round(earned, 2)

    result = list(driver_map.values())
    for r in result:
        r["balance"] = round(r["earned"], 2)
        r["gross"] = round(r["gross"], 2)
    return result


def _s_dict(s: models.DriverSettlement):
    return {
        "id": s.id,
        "number": f"SET-{str(s.id).zfill(4)}",
        "driver_id": s.driver_id,
        "driver_name": s.driver.name if s.driver else None,
        "payable_to": s.payable_to,
        "date": s.date,
        "date_from": s.date_from,
        "date_to": s.date_to,
        "settlement_total": s.settlement_total,
        "balance_due": s.balance_due,
        "status": s.status,
        "notes": s.notes,
    }
