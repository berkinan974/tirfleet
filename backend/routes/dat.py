"""
DAT Load Board API integration.
- Credentials set: hits real DAT API (OAuth2 client credentials)
- No credentials: returns mock data so UI is fully functional for dev/demo
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import os, httpx, time

router = APIRouter(prefix="/dat", tags=["dat"])

DAT_CLIENT_ID     = os.getenv("DAT_CLIENT_ID", "")
DAT_CLIENT_SECRET = os.getenv("DAT_CLIENT_SECRET", "")
DAT_TOKEN_URL     = "https://identity.dat.com/access/v1/token"
DAT_API_BASE      = "https://freight.api.dat.com"

# Simple in-memory token cache
_token_cache: dict = {"token": None, "expires_at": 0}


async def _get_token() -> str:
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"] - 60:
        return _token_cache["token"]
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            DAT_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": DAT_CLIENT_ID,
                "client_secret": DAT_CLIENT_SECRET,
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"DAT auth failed: {resp.text}")
        data = resp.json()
        _token_cache["token"] = data["access_token"]
        _token_cache["expires_at"] = now + data.get("expires_in", 3600)
    return _token_cache["token"]


# ---------------------------------------------------------------------------
# Mock data — realistic DAT-style loads
# ---------------------------------------------------------------------------
def _mock_loads(origin: str, destination: str, equipment: str) -> list:
    return [
        {
            "id": "DAT-MOCK-001",
            "origin": {"city": origin.split(",")[0].strip(), "state": (origin.split(",")[1].strip() if "," in origin else "TX")},
            "destination": {"city": destination.split(",")[0].strip(), "state": (destination.split(",")[1].strip() if "," in destination else "IL")},
            "equipment": equipment,
            "rate": 2950.00,
            "rate_per_mile": 3.21,
            "miles": 919,
            "broker": {"name": "Echo Global Logistics", "mc": "MC-145768", "credit": "A"},
            "pickup_date": "2026-05-29",
            "delivery_date": "2026-05-31",
            "weight": 42000,
            "commodity": "General Freight",
            "reference": "EGL-9923441",
            "posted_age_min": 12,
            "mock": True,
        },
        {
            "id": "DAT-MOCK-002",
            "origin": {"city": origin.split(",")[0].strip(), "state": (origin.split(",")[1].strip() if "," in origin else "TX")},
            "destination": {"city": destination.split(",")[0].strip(), "state": (destination.split(",")[1].strip() if "," in destination else "IL")},
            "equipment": equipment,
            "rate": 3100.00,
            "rate_per_mile": 3.37,
            "miles": 919,
            "broker": {"name": "Coyote Logistics", "mc": "MC-385490", "credit": "A+"},
            "pickup_date": "2026-05-29",
            "delivery_date": "2026-05-30",
            "weight": 38500,
            "commodity": "Consumer Goods",
            "reference": "COY-7712309",
            "posted_age_min": 45,
            "mock": True,
        },
        {
            "id": "DAT-MOCK-003",
            "origin": {"city": origin.split(",")[0].strip(), "state": (origin.split(",")[1].strip() if "," in origin else "TX")},
            "destination": {"city": destination.split(",")[0].strip(), "state": (destination.split(",")[1].strip() if "," in destination else "IL")},
            "equipment": equipment,
            "rate": 2750.00,
            "rate_per_mile": 2.99,
            "miles": 919,
            "broker": {"name": "TQL", "mc": "MC-446902", "credit": "A"},
            "pickup_date": "2026-05-30",
            "delivery_date": "2026-06-01",
            "weight": 44000,
            "commodity": "Building Materials",
            "reference": "TQL-5531882",
            "posted_age_min": 8,
            "mock": True,
        },
        {
            "id": "DAT-MOCK-004",
            "origin": {"city": origin.split(",")[0].strip(), "state": (origin.split(",")[1].strip() if "," in origin else "TX")},
            "destination": {"city": destination.split(",")[0].strip(), "state": (destination.split(",")[1].strip() if "," in destination else "IL")},
            "equipment": equipment,
            "rate": 3350.00,
            "rate_per_mile": 3.64,
            "miles": 919,
            "broker": {"name": "CH Robinson", "mc": "MC-145615", "credit": "A+"},
            "pickup_date": "2026-05-28",
            "delivery_date": "2026-05-30",
            "weight": 40000,
            "commodity": "Food Grade",
            "reference": "CHR-2201933",
            "posted_age_min": 3,
            "mock": True,
        },
    ]


def _mock_rates(origin: str, destination: str, equipment: str) -> dict:
    return {
        "lane": f"{origin} → {destination}",
        "equipment": equipment,
        "rate_low":    2.65,
        "rate_avg":    3.21,
        "rate_high":   3.85,
        "fuel_surcharge": 0.68,
        "total_avg":   3.89,
        "trend": "up",          # up / down / flat
        "trend_pct": 4.2,
        "volume_index": 72,     # 0-100, load availability
        "sample_size": 148,
        "mock": True,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/status")
def dat_status():
    configured = bool(DAT_CLIENT_ID and DAT_CLIENT_SECRET)
    return {"configured": configured, "mode": "live" if configured else "mock"}


@router.get("/loads")
async def search_loads(
    origin: str = Query(..., description="e.g. Dallas, TX"),
    destination: str = Query(..., description="e.g. Chicago, IL"),
    equipment: str = Query("Van", description="Van / Reefer / Flatbed"),
    radius_miles: int = Query(50),
):
    if not (DAT_CLIENT_ID and DAT_CLIENT_SECRET):
        return {"loads": _mock_loads(origin, destination, equipment), "mode": "mock"}

    token = await _get_token()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{DAT_API_BASE}/load-search/v2/loads",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "origin": {"city": origin.split(",")[0].strip(),
                           "stateProv": origin.split(",")[1].strip() if "," in origin else ""},
                "destination": {"city": destination.split(",")[0].strip(),
                                "stateProv": destination.split(",")[1].strip() if "," in destination else ""},
                "equipmentType": equipment,
                "originRadius": radius_miles,
            },
            timeout=10,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"DAT API error: {resp.text}")
    data = resp.json()
    return {"loads": data.get("loads", []), "mode": "live"}


@router.get("/rates")
async def get_lane_rates(
    origin: str = Query(...),
    destination: str = Query(...),
    equipment: str = Query("Van"),
):
    if not (DAT_CLIENT_ID and DAT_CLIENT_SECRET):
        return {**_mock_rates(origin, destination, equipment), "mode": "mock"}

    token = await _get_token()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{DAT_API_BASE}/rates/spot",
            headers={"Authorization": f"Bearer {token}"},
            params={"origin": origin, "destination": destination, "equipment": equipment},
            timeout=10,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"DAT Rates error: {resp.text}")
    return {**resp.json(), "mode": "live"}
