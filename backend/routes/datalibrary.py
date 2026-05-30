from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/datalibrary", tags=["datalibrary"])


# ── Helpers ────────────────────────────────────────────────────────

def _partner_dict(p):
    addr_parts = [p.address, p.city, p.state, p.zip]
    address = ", ".join(x for x in addr_parts if x)
    return {
        "id": p.id,
        "name": p.name,
        "address": address,
        "phone": p.phone,
        "mc_number": p.mc_number,
        "dot_number": p.dot_number,
        "email": p.email,
        "status": p.status,
        "partner_type": p.partner_type,
    }

def _fc_dict(f):
    addr_parts = [f.address, f.city, f.state, f.zip]
    address = ", ".join(x for x in addr_parts if x)
    return {
        "id": f.id,
        "name": f.name,
        "address": address,
        "phone": f.phone,
        "website": f.website,
        "is_integrated": f.is_integrated,
        "notes": f.notes,
    }

def _loc_dict(l):
    addr_parts = [l.street, l.city, l.state, l.zip]
    address = ", ".join(x for x in addr_parts if x)
    return {
        "id": l.id,
        "code": l.code,
        "company_name": l.company_name,
        "address": address,
        "street": l.street,
        "city": l.city,
        "state": l.state,
        "zip": l.zip,
        "country": l.country,
        "notes": l.notes,
    }


# ── Brokers ────────────────────────────────────────────────────────

@router.get("/brokers")
def list_brokers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    q = db.query(models.Partner).filter(
        models.Partner.company_id == current_user.company_id,
        models.Partner.partner_type == "broker",
    )
    if search:
        q = q.filter(models.Partner.name.ilike(f"%{search}%"))
    partners = q.order_by(models.Partner.name).all()
    return [_partner_dict(p) for p in partners]


# ── Shippers / Receivers ───────────────────────────────────────────

@router.get("/shippers")
def list_shippers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    q = db.query(models.Partner).filter(
        models.Partner.company_id == current_user.company_id,
        models.Partner.partner_type == "shipper_receiver",
    )
    if search:
        q = q.filter(models.Partner.name.ilike(f"%{search}%"))
    partners = q.order_by(models.Partner.name).all()
    return [_partner_dict(p) for p in partners]


# ── Factoring Companies ────────────────────────────────────────────

class FCCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    is_integrated: bool = False
    notes: Optional[str] = None

class FCUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    is_integrated: Optional[bool] = None
    notes: Optional[str] = None

@router.get("/factoring-companies")
def list_factoring_companies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    fcs = db.query(models.FactoringCompany).filter(
        models.FactoringCompany.company_id == current_user.company_id
    ).order_by(models.FactoringCompany.name).all()
    return [_fc_dict(f) for f in fcs]

@router.post("/factoring-companies")
def create_factoring_company(
    body: FCCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    f = models.FactoringCompany(**body.dict(), company_id=current_user.company_id)
    db.add(f); db.commit(); db.refresh(f)
    return _fc_dict(f)

@router.patch("/factoring-companies/{fc_id}")
def update_factoring_company(
    fc_id: int, body: FCUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    f = db.query(models.FactoringCompany).filter(
        models.FactoringCompany.id == fc_id,
        models.FactoringCompany.company_id == current_user.company_id
    ).first()
    if not f: raise HTTPException(404)
    for k, v in body.dict(exclude_none=True).items(): setattr(f, k, v)
    db.commit(); db.refresh(f)
    return _fc_dict(f)

@router.delete("/factoring-companies/{fc_id}")
def delete_factoring_company(
    fc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    f = db.query(models.FactoringCompany).filter(
        models.FactoringCompany.id == fc_id,
        models.FactoringCompany.company_id == current_user.company_id
    ).first()
    if not f: raise HTTPException(404)
    db.delete(f); db.commit()
    return {"ok": True}


# ── Locations ──────────────────────────────────────────────────────

class LocCreate(BaseModel):
    code: str
    company_name: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: str = "US"
    notes: Optional[str] = None

class LocUpdate(BaseModel):
    code: Optional[str] = None
    company_name: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None

@router.get("/locations")
def list_locations(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    q = db.query(models.DataLibraryLocation).filter(
        models.DataLibraryLocation.company_id == current_user.company_id
    )
    if search:
        q = q.filter(
            models.DataLibraryLocation.code.ilike(f"%{search}%") |
            models.DataLibraryLocation.company_name.ilike(f"%{search}%") |
            models.DataLibraryLocation.city.ilike(f"%{search}%")
        )
    locs = q.order_by(models.DataLibraryLocation.code).all()
    return [_loc_dict(l) for l in locs]

@router.post("/locations")
def create_location(
    body: LocCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    l = models.DataLibraryLocation(**body.dict(), company_id=current_user.company_id)
    db.add(l); db.commit(); db.refresh(l)
    return _loc_dict(l)

@router.patch("/locations/{loc_id}")
def update_location(
    loc_id: int, body: LocUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    l = db.query(models.DataLibraryLocation).filter(
        models.DataLibraryLocation.id == loc_id,
        models.DataLibraryLocation.company_id == current_user.company_id
    ).first()
    if not l: raise HTTPException(404)
    for k, v in body.dict(exclude_none=True).items(): setattr(l, k, v)
    db.commit(); db.refresh(l)
    return _loc_dict(l)

@router.delete("/locations/{loc_id}")
def delete_location(
    loc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    l = db.query(models.DataLibraryLocation).filter(
        models.DataLibraryLocation.id == loc_id,
        models.DataLibraryLocation.company_id == current_user.company_id
    ).first()
    if not l: raise HTTPException(404)
    db.delete(l); db.commit()
    return {"ok": True}
