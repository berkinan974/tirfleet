from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
import enum


class UserRole(str, enum.Enum):
    owner      = "owner"
    dispatcher = "dispatcher"


class Company(Base):
    __tablename__ = "companies"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users   = relationship("User",             back_populates="company")
    trucks  = relationship("Truck",            back_populates="company")
    drivers = relationship("Driver",           back_populates="company")


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    company_id    = Column(Integer, ForeignKey("companies.id"), nullable=True)
    email         = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name          = Column(String, nullable=False)
    role          = Column(Enum(UserRole), default=UserRole.dispatcher)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="users")


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

    id             = Column(Integer, primary_key=True, index=True)
    company_id     = Column(Integer, ForeignKey("companies.id"), nullable=True)
    unit_number    = Column(String, nullable=False)
    plate          = Column(String, nullable=False)
    plate_state    = Column(String)
    make           = Column(String)
    model          = Column(String)
    year           = Column(Integer)
    vin            = Column(String)
    fuel_level     = Column(Integer, default=100)
    odometer       = Column(Integer, default=0)
    status         = Column(Enum(TruckStatus), default=TruckStatus.active)
    eld_provider   = Column(String)
    eld_id         = Column(String)
    ownership      = Column(String, default="owned")
    purchase_date  = Column(DateTime)
    purchase_price = Column(Float)
    history        = Column(Text)
    notes          = Column(Text)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    company          = relationship("Company", back_populates="trucks")
    driver           = relationship("Driver", back_populates="truck", uselist=False)
    pti_records      = relationship("PTIRecord", back_populates="truck")
    loads            = relationship("Load", back_populates="truck")
    maintenance_logs = relationship("MaintenanceLog", back_populates="truck")


class Trailer(Base):
    __tablename__ = "trailers"

    id             = Column(Integer, primary_key=True, index=True)
    company_id     = Column(Integer, ForeignKey("companies.id"), nullable=True)
    unit_number    = Column(String, nullable=False)
    trailer_type   = Column(String)
    vin            = Column(String)
    year           = Column(Integer)
    make           = Column(String)
    model          = Column(String)
    driver_id      = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    plate          = Column(String)
    plate_state    = Column(String)
    ownership      = Column(String, default="owned")
    purchase_date  = Column(DateTime)
    purchase_price = Column(Float)
    notes          = Column(Text)
    history        = Column(Text)
    status         = Column(String, default="active")
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    driver = relationship("Driver", foreign_keys=[driver_id])


class Driver(Base):
    __tablename__ = "drivers"

    id                = Column(Integer, primary_key=True, index=True)
    company_id        = Column(Integer, ForeignKey("companies.id"), nullable=True)
    name              = Column(String, nullable=False)
    first_name        = Column(String)
    last_name         = Column(String)
    phone             = Column(String)
    email             = Column(String)
    date_of_birth     = Column(DateTime)
    address           = Column(String)
    address2          = Column(String)
    city              = Column(String)
    state             = Column(String)
    zip               = Column(String)
    telegram_id       = Column(String, unique=True)
    license_number    = Column(String)
    license_expiry    = Column(DateTime)
    truck_id          = Column(Integer, ForeignKey("trucks.id"), nullable=True)
    trailer           = Column(String)
    fuel_card         = Column(String)
    driver_status     = Column(String, default="hired")
    driver_type       = Column(String, default="company")
    application_date  = Column(DateTime)
    hire_date         = Column(DateTime)
    termination_date  = Column(DateTime)
    pay_type          = Column(String, default="per_mile")
    pay_rate          = Column(Float)
    pay_extra_stop    = Column(Float)
    pay_empty_mile    = Column(Float)
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    company     = relationship("Company", back_populates="drivers")
    truck       = relationship("Truck", back_populates="driver")
    pti_records = relationship("PTIRecord", back_populates="driver")


class PTIRecord(Base):
    __tablename__ = "pti_records"

    id                 = Column(Integer, primary_key=True, index=True)
    company_id         = Column(Integer, ForeignKey("companies.id"), nullable=True)
    driver_id          = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    truck_id           = Column(Integer, ForeignKey("trucks.id"), nullable=False)
    submitted_at       = Column(DateTime(timezone=True), server_default=func.now())
    date               = Column(String, nullable=False)
    media_paths        = Column(Text)
    telegram_message_id = Column(String)
    notes              = Column(Text)
    is_valid           = Column(Boolean, default=True)

    driver = relationship("Driver", back_populates="pti_records")
    truck  = relationship("Truck", back_populates="pti_records")


class Load(Base):
    __tablename__ = "loads"

    id               = Column(Integer, primary_key=True, index=True)
    company_id       = Column(Integer, ForeignKey("companies.id"), nullable=True)
    truck_id         = Column(Integer, ForeignKey("trucks.id"), nullable=True)
    driver_id        = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    load_number      = Column(String)
    broker_name      = Column(String)
    po_number        = Column(String)
    origin           = Column(String)
    destination      = Column(String)
    pickup_date      = Column(DateTime)
    pickup_city      = Column(String)
    pickup_state     = Column(String)
    pickup_zip       = Column(String)
    delivery_date    = Column(DateTime)
    delivery_city    = Column(String)
    delivery_state   = Column(String)
    delivery_zip     = Column(String)
    rate             = Column(Float)
    miles            = Column(Float)
    status           = Column(Enum(LoadStatus), default=LoadStatus.pending)
    billing_status   = Column(String, default="pending")
    dispatcher_name  = Column(String)
    trailer          = Column(String)
    dat_reference    = Column(String)
    eta              = Column(String)
    notes            = Column(Text)
    completed_at     = Column(DateTime)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    truck      = relationship("Truck", back_populates="loads")
    driver     = relationship("Driver", foreign_keys=[driver_id])
    factoring  = relationship("FactoringRecord", back_populates="load", uselist=False)
    documents  = relationship("LoadDocument", back_populates="load")


class Partner(Base):
    __tablename__ = "partners"

    id             = Column(Integer, primary_key=True, index=True)
    company_id     = Column(Integer, ForeignKey("companies.id"), nullable=True)
    name           = Column(String, nullable=False)
    partner_type   = Column(String, default="broker")   # broker | shipper_receiver
    address        = Column(String)
    address2       = Column(String)
    city           = Column(String)
    state          = Column(String)
    zip            = Column(String)
    phone          = Column(String)
    email          = Column(String)
    fid_ein        = Column(String)
    mc_number      = Column(String)
    pay_method     = Column(String)
    credit         = Column(String)
    avg_dtp        = Column(Float)
    billing_type   = Column(String, default="factoring")  # direct | factoring
    quickpay_fee   = Column(Float)
    status         = Column(String, default="pending")    # pending | active | inactive
    pay_terms      = Column(String)
    notes          = Column(Text)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


class Vendor(Base):
    __tablename__ = "vendors"

    id                  = Column(Integer, primary_key=True, index=True)
    company_id          = Column(Integer, ForeignKey("companies.id"), nullable=True)
    name                = Column(String, nullable=False)
    vendor_type         = Column(String)
    address             = Column(String)
    address2            = Column(String)
    city                = Column(String)
    state               = Column(String)
    zip                 = Column(String)
    phone               = Column(String)
    email               = Column(String)
    fid_ein             = Column(String)
    mc_number           = Column(String)
    additional_payee    = Column(Boolean, default=False)
    equipment_owner     = Column(Boolean, default=False)
    payee_rate          = Column(Float)
    settlement_template = Column(String)
    notes               = Column(Text)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())


class FactoringRecord(Base):
    __tablename__ = "factoring_records"

    id                 = Column(Integer, primary_key=True, index=True)
    company_id         = Column(Integer, ForeignKey("companies.id"), nullable=True)
    load_id            = Column(Integer, ForeignKey("loads.id"), nullable=False)
    invoice_number     = Column(String)
    invoice_amount     = Column(Float)
    factoring_fee_pct  = Column(Float, default=3.5)
    net_amount         = Column(Float)
    submitted_to_rts   = Column(Boolean, default=False)
    rts_status         = Column(String)
    paid_at            = Column(DateTime)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())

    load = relationship("Load", back_populates="factoring")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id          = Column(Integer, primary_key=True, index=True)
    company_id  = Column(Integer, ForeignKey("companies.id"), nullable=True)
    truck_id    = Column(Integer, ForeignKey("trucks.id"), nullable=False)
    date        = Column(String, nullable=False)
    type        = Column(String, nullable=False)
    description = Column(Text)
    cost        = Column(Float)
    mileage     = Column(Integer)
    vendor      = Column(String)
    status      = Column(String, default="open")
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    truck = relationship("Truck", back_populates="maintenance_logs")


class LoadDocument(Base):
    __tablename__ = "load_documents"

    id          = Column(Integer, primary_key=True, index=True)
    load_id     = Column(Integer, ForeignKey("loads.id"), nullable=False)
    filename    = Column(String, nullable=False)
    file_path   = Column(String, nullable=False)
    doc_type    = Column(String, default="other")
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    load = relationship("Load", back_populates="documents")


class FuelCard(Base):
    __tablename__ = "fuel_cards"

    id              = Column(Integer, primary_key=True, index=True)
    company_id      = Column(Integer, ForeignKey("companies.id"), nullable=True)
    card_number     = Column(String, nullable=False)
    is_active       = Column(Boolean, default=True)
    expiration_date = Column(DateTime)
    truck_id        = Column(Integer, ForeignKey("trucks.id"), nullable=True)
    driver_id       = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    assigned_on     = Column(DateTime)
    notes           = Column(Text)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    truck  = relationship("Truck")
    driver = relationship("Driver")


class FuelTransaction(Base):
    __tablename__ = "fuel_transactions"

    id              = Column(Integer, primary_key=True, index=True)
    company_id      = Column(Integer, ForeignKey("companies.id"), nullable=True)
    driver_id       = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    fuel_card_id    = Column(Integer, ForeignKey("fuel_cards.id"), nullable=True)
    truck_id        = Column(Integer, ForeignKey("trucks.id"), nullable=True)
    trailer_id      = Column(Integer, ForeignKey("trailers.id"), nullable=True)
    product_code    = Column(String)
    include_in_ifta = Column(Boolean, default=True)
    date            = Column(String, nullable=False)
    amount          = Column(Float)
    gallons         = Column(Float)
    city            = Column(String)
    state           = Column(String)
    zip             = Column(String)
    notes           = Column(Text)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    driver    = relationship("Driver")
    truck     = relationship("Truck")
    fuel_card = relationship("FuelCard")
