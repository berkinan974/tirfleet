from fastapi import APIRouter, UploadFile, File, HTTPException
import pdfplumber
import re
import io

router = APIRouter(prefix="/loads", tags=["rc_parser"])


def _find(patterns: list, text: str, group: int = 1):
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE | re.MULTILINE)
        if m:
            return m.group(group).strip()
    return None


def _clean_money(val: str) -> float | None:
    if not val:
        return None
    try:
        return float(re.sub(r'[^\d.]', '', val))
    except Exception:
        return None


def parse_rc_text(text: str) -> dict:
    result = {}

    # --- Load number ---
    result['load_number'] = _find([
        r'(?:load|order|pro|ref(?:erence)?)\s*(?:no\.?|number|#)[:\s#]*([A-Z0-9\-]{4,20})',
        r'(?:load|order)\s*#\s*([A-Z0-9\-]{4,20})',
        r'#\s*([A-Z0-9\-]{6,20})',
    ], text)

    # --- DAT / confirmation reference ---
    result['dat_reference'] = _find([
        r'(?:confirmation|conf\.?|dat\s*ref|reference\s*#)[:\s]*([A-Z0-9\-]{4,20})',
        r'(?:rate\s*con(?:firmation)?)[:\s#]*([A-Z0-9\-]{4,20})',
    ], text)

    # --- Rate ---
    rate_str = _find([
        r'(?:total\s*(?:rate|pay|charge|amount)|flat\s*rate|carrier\s*(?:pay|rate|amount))[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)',
        r'\$\s*([\d,]+(?:\.\d{2})?)\s*(?:flat|total|all.in)',
        r'(?:rate|pay)[:\s]+\$\s*([\d,]+(?:\.\d{2})?)',
        r'(?:amount)[:\s]+\$\s*([\d,]+(?:\.\d{2})?)',
    ], text)
    result['rate'] = _clean_money(rate_str)

    # --- Miles ---
    miles_str = _find([
        r'(?:loaded\s*)?miles?[:\s]*([\d,]+)',
        r'([\d,]+)\s*(?:loaded\s*)?miles?',
        r'distance[:\s]*([\d,]+)',
    ], text)
    if miles_str:
        result['miles'] = _clean_money(miles_str)

    # --- Origin (pickup) ---
    result['origin'] = _find([
        r'(?:origin|pickup|pick\s*up|pu|shipper|pick-up\s*location|loading)[:\s\n]+([A-Za-z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)',
        r'(?:from|origin\s*city)[:\s]+([A-Za-z\s]+,\s*[A-Z]{2})',
    ], text)

    # --- Destination (delivery) ---
    result['destination'] = _find([
        r'(?:destination|delivery|deliver|del|consignee|drop\s*off|unloading)[:\s\n]+([A-Za-z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)',
        r'(?:to|dest(?:ination)?\s*city)[:\s]+([A-Za-z\s]+,\s*[A-Z]{2})',
    ], text)

    # --- Pickup date ---
    result['pickup_date'] = _find([
        r'(?:pickup|pick\s*up|pu|ship)\s*date[:\s]*([\d/\-]+(?:\s+\d{2}:\d{2})?)',
        r'(?:pickup|pu)[:\s]*([\d]{1,2}[/\-][\d]{1,2}[/\-][\d]{2,4})',
    ], text)

    # --- Delivery date ---
    result['delivery_date'] = _find([
        r'(?:delivery|deliver|del)\s*date[:\s]*([\d/\-]+(?:\s+\d{2}:\d{2})?)',
        r'(?:delivery|del)[:\s]*([\d]{1,2}[/\-][\d]{1,2}[/\-][\d]{2,4})',
    ], text)

    # --- Broker name (first non-empty line that looks like a company) ---
    for line in text.split('\n')[:8]:
        line = line.strip()
        if (len(line) > 4
                and not re.search(r'rate\s*con|confirmation|page\s*\d', line, re.I)
                and re.search(r'[A-Za-z]{3}', line)):
            result['broker_name'] = line
            break

    # Clean up None values and strip strings
    return {k: v.strip() if isinstance(v, str) else v
            for k, v in result.items() if v is not None}


@router.post("/parse-rc")
async def parse_rate_confirmation(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyası kabul edilir")

    content = await file.read()

    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            pages_text = [page.extract_text() or "" for page in pdf.pages]
        full_text = "\n".join(pages_text)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF okunamadı: {e}")

    if not full_text.strip():
        raise HTTPException(status_code=422, detail="PDF'den metin çıkarılamadı (taranmış görüntü olabilir)")

    parsed = parse_rc_text(full_text)

    return {
        "parsed": parsed,
        "confidence": len(parsed),          # kaç alan bulundu (max ~8)
        "raw_preview": full_text[:1500],    # debug için ilk 1500 karakter
    }
