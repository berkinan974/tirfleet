from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter(prefix="/tolls", tags=["tolls"])


def _dev_dict(d):
    return {
        "id": d.id,
        "device_name": d.device_name,
        "is_active": d.is_active,
        "truck_id": d.truck_id,
        "truck_unit": d.truck.unit_number if d.truck else None,
        "notes": d.notes,
        "created_at": str(d.created_at)[:10] if d.created_at else None,
    }


def _tx_dict(t):
    return {
        "id": t.id,
        "device_id": t.device_id,
        "device_name": t.device.device_name if t.device else None,
        "driver_id": t.driver_id,
        "driver_name": t.driver.name if t.driver else None,
        "truck_id": t.truck_id,
        "truck_unit": t.truck.unit_number if t.truck else None,
        "payable_to": t.payable_to,
        "posting_date": t.posting_date,
        "amount": t.amount,
        "is_deduction": t.is_deduction,
        "entry_date": t.entry_date,
        "entry_time": t.entry_time,
        "entry_plaza": t.entry_plaza,
        "exit_date": t.exit_date,
        "exit_time": t.exit_time,
        "exit_plaza": t.exit_plaza,
        "notes": t.notes,
    }


def _tpl_dict(t):
    return {
        "id": t.id,
        "template_name": t.template_name,
        "assigned_columns": t.assigned_columns,
        "created_at": str(t.created_at)[:10] if t.created_at else None,
    }


# ── Schemas ────────────────────────────────────────────────────────

class DeviceCreate(BaseModel):
    device_name: str
    is_active: bool = True
    truck_id: Optional[int] = None
    notes: Optional[str] = None

class DeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    is_active: Optional[bool] = None
    truck_id: Optional[int] = None
    notes: Optional[str] = None

class TxCreate(BaseModel):
    device_id: Optional[int] = None
    driver_id: Optional[int] = None
    truck_id: Optional[int] = None
    payable_to: Optional[str] = None
    posting_date: str
    amount: Optional[float] = None
    is_deduction: bool = False
    entry_date: Optional[str] = None
    entry_time: Optional[str] = None
    entry_plaza: Optional[str] = None
    exit_date: Optional[str] = None
    exit_time: Optional[str] = None
    exit_plaza: Optional[str] = None
    notes: Optional[str] = None

class TxUpdate(BaseModel):
    device_id: Optional[int] = None
    driver_id: Optional[int] = None
    truck_id: Optional[int] = None
    payable_to: Optional[str] = None
    posting_date: Optional[str] = None
    amount: Optional[float] = None
    is_deduction: Optional[bool] = None
    entry_date: Optional[str] = None
    entry_time: Optional[str] = None
    entry_plaza: Optional[str] = None
    exit_date: Optional[str] = None
    exit_time: Optional[str] = None
    exit_plaza: Optional[str] = None
    notes: Optional[str] = None

class TemplateCreate(BaseModel):
    template_name: str
    assigned_columns: Optional[str] = None

class TemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    assigned_columns: Optional[str] = None


# ── Toll Devices ───────────────────────────────────────────────────

@router.get("/devices")
def list_devices(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    devs = db.query(models.TollDevice).filter(models.TollDevice.company_id == current_user.company_id).order_by(models.TollDevice.id.desc()).all()
    return [_dev_dict(d) for d in devs]

@router.post("/devices")
def create_device(body: DeviceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    d = models.TollDevice(**body.dict(), company_id=current_user.company_id)
    db.add(d); db.commit(); db.refresh(d)
    return _dev_dict(d)

@router.patch("/devices/{dev_id}")
def update_device(dev_id: int, body: DeviceUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    d = db.query(models.TollDevice).filter(models.TollDevice.id == dev_id, models.TollDevice.company_id == current_user.company_id).first()
    if not d: raise HTTPException(404)
    for k, v in body.dict(exclude_none=True).items(): setattr(d, k, v)
    db.commit(); db.refresh(d)
    return _dev_dict(d)

@router.delete("/devices/{dev_id}")
def delete_device(dev_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    d = db.query(models.TollDevice).filter(models.TollDevice.id == dev_id, models.TollDevice.company_id == current_user.company_id).first()
    if not d: raise HTTPException(404)
    db.delete(d); db.commit()
    return {"ok": True}


# ── Toll Transactions ──────────────────────────────────────────────

@router.get("/transactions")
def list_transactions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    txs = db.query(models.TollTransaction).filter(models.TollTransaction.company_id == current_user.company_id).order_by(models.TollTransaction.posting_date.desc()).all()
    total = sum(t.amount or 0 for t in txs)
    return {"rows": [_tx_dict(t) for t in txs], "total": round(total, 2)}

@router.post("/transactions")
def create_transaction(body: TxCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    t = models.TollTransaction(**body.dict(), company_id=current_user.company_id)
    db.add(t); db.commit(); db.refresh(t)
    return _tx_dict(t)

@router.patch("/transactions/{tx_id}")
def update_transaction(tx_id: int, body: TxUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    t = db.query(models.TollTransaction).filter(models.TollTransaction.id == tx_id, models.TollTransaction.company_id == current_user.company_id).first()
    if not t: raise HTTPException(404)
    for k, v in body.dict(exclude_none=True).items(): setattr(t, k, v)
    db.commit(); db.refresh(t)
    return _tx_dict(t)

@router.delete("/transactions/{tx_id}")
def delete_transaction(tx_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    t = db.query(models.TollTransaction).filter(models.TollTransaction.id == tx_id, models.TollTransaction.company_id == current_user.company_id).first()
    if not t: raise HTTPException(404)
    db.delete(t); db.commit()
    return {"ok": True}


# ── Import Templates ───────────────────────────────────────────────

@router.get("/templates")
def list_templates(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tpls = db.query(models.TollImportTemplate).filter(models.TollImportTemplate.company_id == current_user.company_id).order_by(models.TollImportTemplate.created_at.desc()).all()
    return [_tpl_dict(t) for t in tpls]

@router.post("/templates")
def create_template(body: TemplateCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    t = models.TollImportTemplate(**body.dict(), company_id=current_user.company_id)
    db.add(t); db.commit(); db.refresh(t)
    return _tpl_dict(t)

@router.patch("/templates/{tpl_id}")
def update_template(tpl_id: int, body: TemplateUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    t = db.query(models.TollImportTemplate).filter(models.TollImportTemplate.id == tpl_id, models.TollImportTemplate.company_id == current_user.company_id).first()
    if not t: raise HTTPException(404)
    for k, v in body.dict(exclude_none=True).items(): setattr(t, k, v)
    db.commit(); db.refresh(t)
    return _tpl_dict(t)

@router.delete("/templates/{tpl_id}")
def delete_template(tpl_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    t = db.query(models.TollImportTemplate).filter(models.TollImportTemplate.id == tpl_id, models.TollImportTemplate.company_id == current_user.company_id).first()
    if not t: raise HTTPException(404)
    db.delete(t); db.commit()
    return {"ok": True}
