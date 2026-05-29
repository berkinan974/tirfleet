from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/accounting", tags=["accounting"])

today = __import__('datetime').date.today().isoformat()

# ── Schemas ────────────────────────────────────────────────────────────────

BILLING_CATEGORIES = [
    "Freight Revenue", "Fuel Surcharge", "Detention", "Layover",
    "TONU", "Accessorial", "Fuel Expense", "Repair", "Insurance",
    "Toll", "Lumper", "Other Income", "Other Expense",
]

class BillingCreate(BaseModel):
    partner_id:             Optional[int]   = None
    driver_id:              Optional[int]   = None
    truck_id:               Optional[int]   = None
    date:                   str
    entry_type:             Optional[str]   = "income"
    category:               Optional[str]   = None
    status:                 Optional[str]   = "pending"
    amount:                 Optional[float] = None
    load_number:            Optional[str]   = None
    driver_settlement:      Optional[bool]  = False
    settlement_description: Optional[str]   = None
    notes:                  Optional[str]   = None


class BillingUpdate(BaseModel):
    partner_id:             Optional[int]   = None
    driver_id:              Optional[int]   = None
    truck_id:               Optional[int]   = None
    date:                   Optional[str]   = None
    entry_type:             Optional[str]   = None
    category:               Optional[str]   = None
    status:                 Optional[str]   = None
    amount:                 Optional[float] = None
    load_number:            Optional[str]   = None
    driver_settlement:      Optional[bool]  = None
    settlement_description: Optional[str]   = None
    notes:                  Optional[str]   = None


class FactoringRptCreate(BaseModel):
    partner_id: Optional[int]   = None
    date:       str
    status:     Optional[str]   = "preparing"
    amount:     Optional[float] = None
    notes:      Optional[str]   = None


class FactoringRptUpdate(BaseModel):
    partner_id: Optional[int]   = None
    date:       Optional[str]   = None
    status:     Optional[str]   = None
    amount:     Optional[float] = None
    notes:      Optional[str]   = None


# ── Billing Entries ────────────────────────────────────────────────────────

@router.get("/billing")
def list_billing(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entries = db.query(models.BillingEntry).filter(
        models.BillingEntry.company_id == current_user.company_id,
    ).order_by(models.BillingEntry.date.desc()).all()
    return [_billing_dict(e) for e in entries]


@router.post("/billing")
def create_billing(
    body: BillingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = models.BillingEntry(**body.model_dump(), company_id=current_user.company_id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _billing_dict(entry)


@router.patch("/billing/{entry_id}")
def update_billing(
    entry_id: int,
    body: BillingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = db.query(models.BillingEntry).filter(
        models.BillingEntry.id == entry_id,
        models.BillingEntry.company_id == current_user.company_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(entry, k, v)
    db.commit()
    db.refresh(entry)
    return _billing_dict(entry)


@router.delete("/billing/{entry_id}")
def delete_billing(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = db.query(models.BillingEntry).filter(
        models.BillingEntry.id == entry_id,
        models.BillingEntry.company_id == current_user.company_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}


def _billing_dict(e: models.BillingEntry):
    return {
        "id": e.id,
        "date": e.date,
        "entry_type": e.entry_type,
        "category": e.category,
        "status": e.status,
        "amount": e.amount,
        "load_number": e.load_number,
        "driver_settlement": e.driver_settlement,
        "settlement_description": e.settlement_description,
        "notes": e.notes,
        "partner_id": e.partner_id,
        "partner_name": e.partner.name if e.partner else None,
        "driver_id": e.driver_id,
        "driver_name": e.driver.name if e.driver else None,
        "truck_id": e.truck_id,
        "truck_unit": e.truck.unit_number if e.truck else None,
    }


# ── Factoring Reports ──────────────────────────────────────────────────────

@router.get("/factoring-reports")
def list_factoring_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    reports = db.query(models.FactoringReport).filter(
        models.FactoringReport.company_id == current_user.company_id,
    ).order_by(models.FactoringReport.date.desc()).all()
    return [_fr_dict(r) for r in reports]


@router.post("/factoring-reports")
def create_factoring_report(
    body: FactoringRptCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    report = models.FactoringReport(**body.model_dump(), company_id=current_user.company_id)
    db.add(report)
    db.commit()
    db.refresh(report)
    return _fr_dict(report)


@router.patch("/factoring-reports/{report_id}")
def update_factoring_report(
    report_id: int,
    body: FactoringRptUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    report = db.query(models.FactoringReport).filter(
        models.FactoringReport.id == report_id,
        models.FactoringReport.company_id == current_user.company_id,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(report, k, v)
    db.commit()
    db.refresh(report)
    return _fr_dict(report)


@router.delete("/factoring-reports/{report_id}")
def delete_factoring_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    report = db.query(models.FactoringReport).filter(
        models.FactoringReport.id == report_id,
        models.FactoringReport.company_id == current_user.company_id,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"ok": True}


@router.get("/summary")
def accounting_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entries = db.query(models.BillingEntry).filter(
        models.BillingEntry.company_id == current_user.company_id,
    ).all()
    income  = sum(e.amount or 0 for e in entries if e.entry_type == "income")
    expense = sum(e.amount or 0 for e in entries if e.entry_type == "expense")
    pending = sum(e.amount or 0 for e in entries if e.status == "pending")
    return {
        "total_income": round(income, 2),
        "total_expense": round(expense, 2),
        "net": round(income - expense, 2),
        "pending_amount": round(pending, 2),
        "entry_count": len(entries),
    }


def _fr_dict(r: models.FactoringReport):
    return {
        "id": r.id,
        "date": r.date,
        "status": r.status,
        "amount": r.amount,
        "notes": r.notes,
        "partner_id": r.partner_id,
        "partner_name": r.partner.name if r.partner else None,
    }
