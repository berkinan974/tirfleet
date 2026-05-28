from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/drivers", tags=["drivers"])


class DriverCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    telegram_id: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[datetime] = None
    truck_id: Optional[int] = None


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    telegram_id: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[datetime] = None
    truck_id: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/")
def list_drivers(db: Session = Depends(get_db)):
    return db.query(models.Driver).filter(models.Driver.is_active == True).all()


@router.post("/")
def create_driver(driver: DriverCreate, db: Session = Depends(get_db)):
    if driver.telegram_id:
        existing = db.query(models.Driver).filter(
            models.Driver.telegram_id == driver.telegram_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Bu Telegram ID zaten kayıtlı")
    db_driver = models.Driver(**driver.model_dump())
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver


@router.get("/{driver_id}")
def get_driver(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Şoför bulunamadı")
    return driver


class BroadcastBody(BaseModel):
    message: str


@router.post("/broadcast")
async def broadcast_message(body: BroadcastBody, db: Session = Depends(get_db)):
    import os
    from telegram import Bot
    from dotenv import load_dotenv
    load_dotenv()
    BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

    drivers = db.query(models.Driver).filter(models.Driver.is_active == True).all()
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
def update_driver(driver_id: int, update: DriverUpdate, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Şoför bulunamadı")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(driver, field, value)
    db.commit()
    db.refresh(driver)
    return driver
