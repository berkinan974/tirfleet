from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy import text
from backend.database import engine
from backend import models
from backend.routes import trucks, drivers, pti, loads, factoring, maintenance, documents, rc_parser, dat, auth
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
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
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

media_dir = os.path.abspath("./media")
os.makedirs(media_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_dir), name="media")


@app.get("/")
def root():
    return {"status": "ok", "message": "TIR Fleet Management API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
