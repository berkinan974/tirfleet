from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/fuel", tags=["fuel"])


# ── Schemas ────────────────────────────────────────────────────────────────

class FuelCardCreate(BaseModel):
    card_number: str
    is_active: Optional[bool] = True
    expiration_date: Optional[str] = None
    truck_id: Optional[int] = None
    driver_id: Optional[int] = None
    assigned_on: Optional[str] = None
    notes: Optional[str] = None


class FuelCardUpdate(BaseModel):
    card_number: Optional[str] = None
    is_active: Optional[bool] = None
    expiration_date: Optional[str] = None
    truck_id: Optional[int] = None
    driver_id: Optional[int] = None
    assigned_on: Optional[str] = None
    notes: Optional[str] = None


class FuelTxCreate(BaseModel):
    driver_id: Optional[int] = None
    fuel_card_id: Optional[int] = None
    truck_id: Optional[int] = None
    trailer_id: Optional[int] = None
    product_code: Optional[str] = None
    include_in_ifta: Optional[bool] = True
    date: str
    amount: Optional[float] = None
    gallons: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    notes: Optional[str] = None


class FuelTxUpdate(BaseModel):
    driver_id: Optional[int] = None
    fuel_card_id: Optional[int] = None
    truck_id: Optional[int] = None
    trailer_id: Optional[int] = None
    product_code: Optional[str] = None
    include_in_ifta: Optional[bool] = None
    date: Optional[str] = None
    amount: Optional[float] = None
    gallons: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    notes: Optional[str] = None


# ── Fuel Cards ─────────────────────────────────────────────────────────────

@router.get("/cards")
def list_cards(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cards = db.query(models.FuelCard).filter(
        models.FuelCard.company_id == current_user.company_id,
    ).order_by(models.FuelCard.created_at.desc()).all()
    return [_card_dict(c) for c in cards]


@router.post("/cards")
def create_card(
    body: FuelCardCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    card = models.FuelCard(**body.model_dump(), company_id=current_user.company_id)
    db.add(card)
    db.commit()
    db.refresh(card)
    return _card_dict(card)


@router.patch("/cards/{card_id}")
def update_card(
    card_id: int,
    body: FuelCardUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    card = db.query(models.FuelCard).filter(
        models.FuelCard.id == card_id,
        models.FuelCard.company_id == current_user.company_id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(card, k, v)
    db.commit()
    db.refresh(card)
    return _card_dict(card)


@router.delete("/cards/{card_id}")
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    card = db.query(models.FuelCard).filter(
        models.FuelCard.id == card_id,
        models.FuelCard.company_id == current_user.company_id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.is_active = False
    db.commit()
    return {"ok": True}


def _card_dict(c: models.FuelCard):
    return {
        "id": c.id,
        "card_number": c.card_number,
        "is_active": c.is_active,
        "expiration_date": str(c.expiration_date)[:10] if c.expiration_date else None,
        "truck_id": c.truck_id,
        "truck_unit": c.truck.unit_number if c.truck else None,
        "driver_id": c.driver_id,
        "driver_name": c.driver.name if c.driver else None,
        "assigned_on": str(c.assigned_on)[:10] if c.assigned_on else None,
        "notes": c.notes,
        "created_at": str(c.created_at)[:10] if c.created_at else None,
    }


# ── Fuel Transactions ──────────────────────────────────────────────────────

@router.get("/transactions")
def list_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    txs = db.query(models.FuelTransaction).filter(
        models.FuelTransaction.company_id == current_user.company_id,
    ).order_by(models.FuelTransaction.date.desc()).all()
    return [_tx_dict(t) for t in txs]


@router.post("/transactions")
def create_transaction(
    body: FuelTxCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = models.FuelTransaction(**body.model_dump(), company_id=current_user.company_id)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return _tx_dict(tx)


@router.patch("/transactions/{tx_id}")
def update_transaction(
    tx_id: int,
    body: FuelTxUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = db.query(models.FuelTransaction).filter(
        models.FuelTransaction.id == tx_id,
        models.FuelTransaction.company_id == current_user.company_id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(tx, k, v)
    db.commit()
    db.refresh(tx)
    return _tx_dict(tx)


@router.delete("/transactions/{tx_id}")
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = db.query(models.FuelTransaction).filter(
        models.FuelTransaction.id == tx_id,
        models.FuelTransaction.company_id == current_user.company_id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return {"ok": True}


@router.get("/summary")
def fuel_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    txs = db.query(models.FuelTransaction).filter(
        models.FuelTransaction.company_id == current_user.company_id,
    ).all()
    total_amount = sum(t.amount or 0 for t in txs)
    total_gallons = sum(t.gallons or 0 for t in txs)
    active_cards = db.query(models.FuelCard).filter(
        models.FuelCard.company_id == current_user.company_id,
        models.FuelCard.is_active == True,
    ).count()
    return {
        "total_amount": round(total_amount, 2),
        "total_gallons": round(total_gallons, 2),
        "transaction_count": len(txs),
        "active_cards": active_cards,
        "avg_ppg": round(total_amount / total_gallons, 3) if total_gallons else None,
    }


def _tx_dict(t: models.FuelTransaction):
    return {
        "id": t.id,
        "date": t.date,
        "driver_id": t.driver_id,
        "driver_name": t.driver.name if t.driver else None,
        "fuel_card_id": t.fuel_card_id,
        "fuel_card_number": t.fuel_card.card_number if t.fuel_card else None,
        "truck_id": t.truck_id,
        "truck_unit": t.truck.unit_number if t.truck else None,
        "trailer_id": t.trailer_id,
        "product_code": t.product_code,
        "include_in_ifta": t.include_in_ifta,
        "amount": t.amount,
        "gallons": t.gallons,
        "city": t.city,
        "state": t.state,
        "zip": t.zip,
        "notes": t.notes,
    }
