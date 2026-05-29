from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/drivers", tags=["drivers"])


class DriverCreate(BaseModel):
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    address: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    telegram_id: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[datetime] = None
    truck_id: Optional[int] = None
    trailer: Optional[str] = None
    fuel_card: Optional[str] = None
    driver_status: Optional[str] = "hired"
    driver_type: Optional[str] = "company"
    application_date: Optional[datetime] = None
    hire_date: Optional[datetime] = None
    termination_date: Optional[datetime] = None
    pay_type: Optional[str] = "per_mile"
    pay_rate: Optional[float] = None
    pay_extra_stop: Optional[float] = None
    pay_empty_mile: Optional[float] = None


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    address: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    telegram_id: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[datetime] = None
    truck_id: Optional[int] = None
    trailer: Optional[str] = None
    fuel_card: Optional[str] = None
    driver_status: Optional[str] = None
    driver_type: Optional[str] = None
    application_date: Optional[datetime] = None
    hire_date: Optional[datetime] = None
    termination_date: Optional[datetime] = None
    pay_type: Optional[str] = None
    pay_rate: Optional[float] = None
    pay_extra_stop: Optional[float] = None
    pay_empty_mile: Optional[float] = None
    is_active: Optional[bool] = None


@router.get("/")
def list_drivers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Driver).filter(
        models.Driver.company_id == current_user.company_id,
        models.Driver.is_active == True,
    ).all()


@router.post("/")
def create_driver(
    driver: DriverCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if driver.telegram_id:
        existing = db.query(models.Driver).filter(
            models.Driver.telegram_id == driver.telegram_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Bu Telegram ID zaten kayıtlı")
    db_driver = models.Driver(**driver.model_dump(), company_id=current_user.company_id)
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver


@router.get("/{driver_id}")
def get_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    driver = db.query(models.Driver).filter(
        models.Driver.id == driver_id,
        models.Driver.company_id == current_user.company_id,
    ).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Şoför bulunamadı")
    return driver


class BroadcastBody(BaseModel):
    message: str


@router.post("/broadcast")
async def broadcast_message(
    body: BroadcastBody,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    import os
    from telegram import Bot
    from dotenv import load_dotenv
    load_dotenv()
    BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

    drivers = db.query(models.Driver).filter(
        models.Driver.company_id == current_user.company_id,
        models.Driver.is_active == True,
    ).all()
    bot = Bot(token=BOT_TOKEN)
    sent = 0
    for driver in drivers:
        if driver.telegram_id:
            try:
                await bot.send_message(chat_id=driver.telegram_id, text=body.message)
                sent += 1
            except Exception:
                pass
    return {"sent": sent, "total": len(drivers)}


@router.patch("/{driver_id}")
def update_driver(
    driver_id: int,
    update: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    driver = db.query(models.Driver).filter(
        models.Driver.id == driver_id,
        models.Driver.company_id == current_user.company_id,
    ).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Şoför bulunamadı")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(driver, field, value)
    db.commit()
    db.refresh(driver)
    return driver
