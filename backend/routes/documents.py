from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
import os, aiofiles
from datetime import date

router = APIRouter(prefix="/loads", tags=["documents"])

DOCS_DIR = os.path.abspath("./media/docs")
os.makedirs(DOCS_DIR, exist_ok=True)


@router.get("/{load_id}/documents")
def get_documents(load_id: int, db: Session = Depends(get_db)):
    load = db.query(models.Load).filter(models.Load.id == load_id).first()
    if not load:
        raise HTTPException(status_code=404, detail="Load bulunamadı")
    return db.query(models.LoadDocument).filter(models.LoadDocument.load_id == load_id).all()


@router.post("/{load_id}/documents")
async def upload_document(
    load_id: int,
    file: UploadFile = File(...),
    doc_type: str = Form("other"),
    db: Session = Depends(get_db)
):
    load = db.query(models.Load).filter(models.Load.id == load_id).first()
    if not load:
        raise HTTPException(status_code=404, detail="Load bulunamadı")

    ext = os.path.splitext(file.filename)[1].lower()
    safe_name = f"{date.today().isoformat()}_{load_id}_{doc_type}{ext}"
    file_path = os.path.join(DOCS_DIR, safe_name)

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    doc = models.LoadDocument(
        load_id=load_id,
        filename=file.filename,
        file_path=f"media/docs/{safe_name}",
        doc_type=doc_type,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{load_id}/documents/{doc_id}")
def delete_document(load_id: int, doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.LoadDocument).filter(
        models.LoadDocument.id == doc_id,
        models.LoadDocument.load_id == load_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Döküman bulunamadı")
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()
    return {"ok": True}
