from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
import enum


class UserRole(str, enum.Enum):
    owner      = "owner"
    dispatcher = "dispatcher"


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name          = Column(String, nullable=False)
    role          = Column(Enum(UserRole), default=UserRole.dispatcher)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class TruckStatus(str, enum.Enum):
    active = "active"
    maintenance = "maintenance"
    inactive = "inactive"


class LoadStatus(str, enum.Enum):
    pending = "pending"
    in_transit = "in_transit"
    delivered = "delivered"
    cancelled = "cancelled"


class Truck(Base):
    __tablename__ = "trucks"

    id = Column(Integer, primary_key=True, index=True)
    unit_number = Column(String, unique=True, nullable=False)  # orn: T-001
    plate = Column(String, nullable=False)
    make = Column(String)
    model = Column(String)
    year = Column(Integer)
    vin = Column(String)
    fuel_level = Column(Integer, default=100)  # 0-100 %
    odometer = Column(Integer, default=0)  # miles
    status = Column(Enum(TruckStatus), default=TruckStatus.active)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    driver = relationship("Driver", back_populates="truck", uselist=False)
    pti_records = relationship("PTIRecord", back_populates="truck")
    loads = relationship("Load", back_populates="truck")
    maintenance_logs = relationship("MaintenanceLog", back_populates="truck")


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String)
    telegram_id = Column(String, unique=True)  # Telegram user ID
    license_number = Column(String)
    license_expiry = Column(DateTime)
    truck_id = Column(Integer, ForeignKey("trucks.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    truck = relationship("Truck", back_populates="driver")
    pti_records = relationship("PTIRecord", back_populates="driver")


class PTIRecord(Base):
    __tablename__ = "pti_records"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    truck_id = Column(Integer, ForeignKey("trucks.id"), nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    date = Column(String, nullable=False)  # "2024-05-22" formatında
    media_paths = Column(Text)  # JSON array olarak saklanır
    telegram_message_id = Column(String)
    notes = Column(Text)
    is_valid = Column(Boolean, default=True)

    driver = relationship("Driver", back_populates="pti_records")
    truck = relationship("Truck", back_populates="pti_records")


class Load(Base):
    __tablename__ = "loads"

    id = Column(Integer, primary_key=True, index=True)
    truck_id = Column(Integer, ForeignKey("trucks.id"), nullable=False)
    load_number = Column(String)
    broker_name = Column(String)
    origin = Column(String)
    destination = Column(String)
    pickup_date = Column(DateTime)
    delivery_date = Column(DateTime)
    rate = Column(Float)
    miles = Column(Float)
    status = Column(Enum(LoadStatus), default=LoadStatus.pending)
    dat_reference = Column(String)  # DAT load board referans numarası
    eta = Column(String)  # estimated arrival, free text e.g. "18:30 CT"
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    truck = relationship("Truck", back_populates="loads")
    factoring = relationship("FactoringRecord", back_populates="load", uselist=False)
    documents = relationship("LoadDocument", back_populates="load")


class FactoringRecord(Base):
    __tablename__ = "factoring_records"

    id = Column(Integer, primary_key=True, index=True)
    load_id = Column(Integer, ForeignKey("loads.id"), nullable=False)
    invoice_number = Column(String)
    invoice_amount = Column(Float)
    factoring_fee_pct = Column(Float, default=3.5)  # RTS default
    net_amount = Column(Float)
    submitted_to_rts = Column(Boolean, default=False)
    rts_status = Column(String)  # pending, approved, paid
    paid_at = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    load = relationship("Load", back_populates="factoring")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(Integer, primary_key=True, index=True)
    truck_id = Column(Integer, ForeignKey("trucks.id"), nullable=False)
    date = Column(String, nullable=False)
    type = Column(String, nullable=False)  # oil_change, tire, brake, inspection, other
    description = Column(Text)
    cost = Column(Float)
    mileage = Column(Integer)
    vendor = Column(String)
    status = Column(String, default="open")  # open, in_progress, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    truck = relationship("Truck", back_populates="maintenance_logs")


class LoadDocument(Base):
    __tablename__ = "load_documents"

    id = Column(Integer, primary_key=True, index=True)
    load_id = Column(Integer, ForeignKey("loads.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    doc_type = Column(String, default="other")  # bol, rate_confirmation, other
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    load = relationship("Load", back_populates="documents")
