from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import json

router = APIRouter(prefix="/pti", tags=["pti"])


class PTICreate(BaseModel):
    driver_id: int
    truck_id: int
    date: str
    media_paths: Optional[List[str]] = []
    telegram_message_id: Optional[str] = None
    notes: Optional[str] = None


@router.get("/today")
def get_today_pti(db: Session = Depends(get_db)):
    today = date.today().isoformat()
    drivers = db.query(models.Driver).filter(models.Driver.is_active == True).all()
    result = []
    for driver in drivers:
        pti = db.query(models.PTIRecord).filter(
            models.PTIRecord.driver_id == driver.id,
            models.PTIRecord.date == today
        ).first()
        photo_count = 0
        if pti and pti.media_paths:
            try:
                photo_count = len(json.loads(pti.media_paths))
            except Exception:
                pass
        result.append({
            "driver_id": driver.id,
            "driver_name": driver.name,
            "truck": driver.truck.unit_number if driver.truck else None,
            "submitted": pti is not None,
            "submitted_at": pti.submitted_at.isoformat() if pti else None,
            "photo_count": photo_count,
        })
    return result


@router.post("/")
def create_pti(pti: PTICreate, db: Session = Depends(get_db)):
    existing = db.query(models.PTIRecord).filter(
        models.PTIRecord.driver_id == pti.driver_id,
        models.PTIRecord.date == pti.date
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu şoför bugün zaten PTI gönderdi")

    db_pti = models.PTIRecord(
        driver_id=pti.driver_id,
        truck_id=pti.truck_id,
        date=pti.date,
        media_paths=json.dumps(pti.media_paths),
        telegram_message_id=pti.telegram_message_id,
        notes=pti.notes
    )
    db.add(db_pti)
    db.commit()
    db.refresh(db_pti)
    return db_pti


class PTIValidate(BaseModel):
    is_valid: bool


@router.post("/nudge")
async def nudge_missing_pti(db: Session = Depends(get_db)):
    import os
    from telegram import Bot
    from dotenv import load_dotenv
    load_dotenv()
    BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

    today = date.today().isoformat()
    drivers = db.query(models.Driver).filter(models.Driver.is_active == True).all()
    missing = []
    for driver in drivers:
        pti = db.query(models.PTIRecord).filter(
            models.PTIRecord.driver_id == driver.id,
            models.PTIRecord.date == today
        ).first()
        if not pti:
            missing.append(driver)

    if not missing:
        return {"sent": 0, "total_missing": 0}

    bot = Bot(token=BOT_TOKEN)
    sent = 0
    for driver in missing:
        if driver.telegram_id:
            try:
                await bot.send_message(
                    chat_id=driver.telegram_id,
                    text=(
                        f"[DISPATCH] {driver.name},\n"
                        "PTI window is closing. Submit NOW via /pti command.\n"
                        "Required: 4+ photos."
                    )
                )
                sent += 1
            except Exception:
                pass
    return {"sent": sent, "total_missing": len(missing)}


@router.patch("/{pti_id}/validate")
def validate_pti(pti_id: int, body: PTIValidate, db: Session = Depends(get_db)):
    record = db.query(models.PTIRecord).filter(models.PTIRecord.id == pti_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="PTI bulunamadi")
    record.is_valid = body.is_valid
    db.commit()
    db.refresh(record)
    return record


@router.get("/history")
def get_pti_history(
    driver_id: Optional[int] = None,
    days: int = 7,
    db: Session = Depends(get_db)
):
    query = db.query(models.PTIRecord)
    if driver_id:
        query = query.filter(models.PTIRecord.driver_id == driver_id)
    records = query.order_by(models.PTIRecord.submitted_at.desc()).limit(days * 5).all()
    return records
