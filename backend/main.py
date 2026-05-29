from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy import text
from backend.database import engine
from backend import models
from backend.routes import trucks, drivers, pti, loads, factoring, maintenance, documents, rc_parser, dat, auth, partners, vendors, trailers
from backend.auth_utils import get_current_user
import os

models.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Safe column migrations — silently skip if column already exists
    migrations = [
        "ALTER TABLE trucks ADD COLUMN fuel_level INTEGER DEFAULT 100",
        "ALTER TABLE trucks ADD COLUMN vin VARCHAR",
        "ALTER TABLE trucks ADD COLUMN odometer INTEGER DEFAULT 0",
        "ALTER TABLE loads ADD COLUMN eta VARCHAR",
        # Multi-tenant: add company_id to all tables
        "ALTER TABLE users ADD COLUMN company_id INTEGER",
        "ALTER TABLE trucks ADD COLUMN company_id INTEGER",
        "ALTER TABLE drivers ADD COLUMN company_id INTEGER",
        "ALTER TABLE loads ADD COLUMN company_id INTEGER",
        "ALTER TABLE pti_records ADD COLUMN company_id INTEGER",
        "ALTER TABLE factoring_records ADD COLUMN company_id INTEGER",
        "ALTER TABLE maintenance_logs ADD COLUMN company_id INTEGER",
        # EZLoads-style driver fields
        "ALTER TABLE drivers ADD COLUMN first_name VARCHAR",
        "ALTER TABLE drivers ADD COLUMN last_name VARCHAR",
        "ALTER TABLE drivers ADD COLUMN email VARCHAR",
        "ALTER TABLE drivers ADD COLUMN date_of_birth DATETIME",
        "ALTER TABLE drivers ADD COLUMN address VARCHAR",
        "ALTER TABLE drivers ADD COLUMN address2 VARCHAR",
        "ALTER TABLE drivers ADD COLUMN city VARCHAR",
        "ALTER TABLE drivers ADD COLUMN state VARCHAR",
        "ALTER TABLE drivers ADD COLUMN zip VARCHAR",
        "ALTER TABLE drivers ADD COLUMN trailer VARCHAR",
        "ALTER TABLE drivers ADD COLUMN fuel_card VARCHAR",
        "ALTER TABLE drivers ADD COLUMN driver_status VARCHAR DEFAULT 'hired'",
        "ALTER TABLE drivers ADD COLUMN driver_type VARCHAR DEFAULT 'company'",
        "ALTER TABLE drivers ADD COLUMN application_date DATETIME",
        "ALTER TABLE drivers ADD COLUMN hire_date DATETIME",
        "ALTER TABLE drivers ADD COLUMN termination_date DATETIME",
        "ALTER TABLE drivers ADD COLUMN pay_type VARCHAR DEFAULT 'per_mile'",
        "ALTER TABLE drivers ADD COLUMN pay_rate REAL",
        "ALTER TABLE drivers ADD COLUMN pay_extra_stop REAL",
        "ALTER TABLE drivers ADD COLUMN pay_empty_mile REAL",
        # EZLoads-style load fields
        "ALTER TABLE loads ADD COLUMN driver_id INTEGER",
        "ALTER TABLE loads ADD COLUMN po_number VARCHAR",
        "ALTER TABLE loads ADD COLUMN billing_status VARCHAR DEFAULT 'pending'",
        "ALTER TABLE loads ADD COLUMN pickup_city VARCHAR",
        "ALTER TABLE loads ADD COLUMN pickup_state VARCHAR",
        "ALTER TABLE loads ADD COLUMN pickup_zip VARCHAR",
        "ALTER TABLE loads ADD COLUMN delivery_city VARCHAR",
        "ALTER TABLE loads ADD COLUMN delivery_state VARCHAR",
        "ALTER TABLE loads ADD COLUMN delivery_zip VARCHAR",
        "ALTER TABLE loads ADD COLUMN trailer VARCHAR",
        "ALTER TABLE loads ADD COLUMN dispatcher_name VARCHAR",
        "ALTER TABLE loads ADD COLUMN completed_at DATETIME",
        # EZLoads-style truck fields
        "ALTER TABLE trucks ADD COLUMN plate_state VARCHAR",
        "ALTER TABLE trucks ADD COLUMN eld_provider VARCHAR",
        "ALTER TABLE trucks ADD COLUMN eld_id VARCHAR",
        "ALTER TABLE trucks ADD COLUMN ownership VARCHAR DEFAULT 'owned'",
        "ALTER TABLE trucks ADD COLUMN purchase_date DATETIME",
        "ALTER TABLE trucks ADD COLUMN purchase_price REAL",
        "ALTER TABLE trucks ADD COLUMN history TEXT",
        "ALTER TABLE trucks ADD COLUMN notes TEXT",
        # Partners, Vendors, Trailers (new tables — created via create_all, migrations not needed)
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass

        # Seed default company if none exist, then assign all orphan records
        row = conn.execute(text("SELECT id FROM companies LIMIT 1")).fetchone()
        if not row:
            conn.execute(text("INSERT INTO companies (name, is_active) VALUES ('TIR Fleet', 1)"))
            conn.commit()
            row = conn.execute(text("SELECT id FROM companies LIMIT 1")).fetchone()
        cid = row[0]
        for tbl in ["users", "trucks", "drivers", "loads", "pti_records", "factoring_records", "maintenance_logs"]:
            try:
                conn.execute(text(f"UPDATE {tbl} SET company_id = {cid} WHERE company_id IS NULL"))
                conn.commit()
            except Exception:
                pass
    yield


app = FastAPI(title="TIR Fleet Management API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auth_dep = [Depends(get_current_user)]

app.include_router(auth.router)  # public
app.include_router(trucks.router,      dependencies=auth_dep)
app.include_router(drivers.router,     dependencies=auth_dep)
app.include_router(pti.router,         dependencies=auth_dep)
app.include_router(loads.router,       dependencies=auth_dep)
app.include_router(factoring.router,   dependencies=auth_dep)
app.include_router(maintenance.router, dependencies=auth_dep)
app.include_router(documents.router,   dependencies=auth_dep)
app.include_router(rc_parser.router,   dependencies=auth_dep)
app.include_router(dat.router,         dependencies=auth_dep)
app.include_router(partners.router,    dependencies=auth_dep)
app.include_router(vendors.router,     dependencies=auth_dep)
app.include_router(trailers.router,    dependencies=auth_dep)

media_dir = os.path.abspath("./media")
os.makedirs(media_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_dir), name="media")


@app.get("/")
def root():
    return {"status": "ok", "message": "TIR Fleet Management API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
