from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/factoring", tags=["factoring"])


class FactoringCreate(BaseModel):
    load_id: int
    invoice_number: Optional[str] = None
    invoice_amount: float
    factoring_fee_pct: Optional[float] = 3.5


class FactoringUpdate(BaseModel):
    invoice_number: Optional[str] = None
    invoice_amount: Optional[float] = None
    factoring_fee_pct: Optional[float] = None
    submitted_to_rts: Optional[bool] = None
    rts_status: Optional[str] = None  # pending, approved, paid
    paid_at: Optional[datetime] = None


@router.get("/")
def list_factoring(db: Session = Depends(get_db)):
    records = db.query(models.FactoringRecord).order_by(
        models.FactoringRecord.created_at.desc()
    ).all()
    result = []
    for r in records:
        load = db.query(models.Load).filter(models.Load.id == r.load_id).first()
        result.append({
            "id": r.id,
            "load_id": r.load_id,
            "load_number": load.load_number or f"L-{load.id}" if load else "—",
            "broker": load.broker_name if load else "—",
            "lane": f"{load.origin} → {load.destination}" if load else "—",
            "rate": load.rate if load else 0,
            "invoice_number": r.invoice_number,
            "invoice_amount": r.invoice_amount,
            "factoring_fee_pct": r.factoring_fee_pct,
            "net_amount": r.invoice_amount * (1 - (r.factoring_fee_pct or 3.5) / 100) if r.invoice_amount else 0,
            "submitted_to_rts": r.submitted_to_rts,
            "rts_status": r.rts_status or "pending",
            "paid_at": r.paid_at.isoformat() if r.paid_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result


@router.get("/summary")
def factoring_summary(db: Session = Depends(get_db)):
    records = db.query(models.FactoringRecord).all()
    total = len(records)
    pending_amt = sum(r.invoice_amount or 0 for r in records if not r.submitted_to_rts)
    submitted_amt = sum(r.invoice_amount or 0 for r in records if r.submitted_to_rts and r.rts_status != "paid")
    paid_amt = sum(r.invoice_amount or 0 for r in records if r.rts_status == "paid")
    fee_total = sum((r.invoice_amount or 0) * (r.factoring_fee_pct or 3.5) / 100 for r in records)
    return {
        "total_invoices": total,
        "pending_amount": pending_amt,
        "submitted_amount": submitted_amt,
        "paid_amount": paid_amt,
        "fee_total": fee_total,
    }


@router.get("/uninvoiced")
def uninvoiced_loads(db: Session = Depends(get_db)):
    delivered = db.query(models.Load).filter(
        models.Load.status == models.LoadStatus.delivered
    ).all()
    result = []
    for load in delivered:
        has_invoice = db.query(models.FactoringRecord).filter(
            models.FactoringRecord.load_id == load.id
        ).first()
        if not has_invoice:
            result.append({
                "id": load.id,
                "load_number": load.load_number or f"L-{load.id}",
                "broker_name": load.broker_name,
                "origin": load.origin,
                "destination": load.destination,
                "rate": load.rate,
            })
    return result


@router.post("/")
def create_factoring(body: FactoringCreate, db: Session = Depends(get_db)):
    load = db.query(models.Load).filter(models.Load.id == body.load_id).first()
    if not load:
        raise HTTPException(status_code=404, detail="Load bulunamadı")
    existing = db.query(models.FactoringRecord).filter(
        models.FactoringRecord.load_id == body.load_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu load için zaten invoice var")
    net = body.invoice_amount * (1 - body.factoring_fee_pct / 100)
    record = models.FactoringRecord(
        load_id=body.load_id,
        invoice_number=body.invoice_number,
        invoice_amount=body.invoice_amount,
        factoring_fee_pct=body.factoring_fee_pct,
        net_amount=net,
        rts_status="pending",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/{record_id}")
def update_factoring(record_id: int, update: FactoringUpdate, db: Session = Depends(get_db)):
    record = db.query(models.FactoringRecord).filter(
        models.FactoringRecord.id == record_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(record, field, value)
    if record.invoice_amount and record.factoring_fee_pct:
        record.net_amount = record.invoice_amount * (1 - record.factoring_fee_pct / 100)
    db.commit()
    db.refresh(record)
    return record
