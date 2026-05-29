from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend import models
from backend.auth_utils import get_current_user
from typing import Optional
from datetime import date, timedelta

router = APIRouter(prefix="/reports", tags=["reports"])


def period_range(period: str):
    today = date.today()
    if period == "7d":
        return (today - timedelta(days=7)).isoformat(), today.isoformat()
    elif period == "30d":
        return (today - timedelta(days=30)).isoformat(), today.isoformat()
    elif period == "90d":
        return (today - timedelta(days=90)).isoformat(), today.isoformat()
    elif period == "ytd":
        return date(today.year, 1, 1).isoformat(), today.isoformat()
    else:
        return "2000-01-01", today.isoformat()


def filter_loads(db, cid, period, driver_id=None, truck_id=None, broker=None):
    d_from, d_to = period_range(period)
    q = db.query(models.Load).filter(
        models.Load.company_id == cid,
        models.Load.pickup_date.isnot(None),
    )
    try:
        q = q.filter(func.date(models.Load.pickup_date) >= d_from,
                     func.date(models.Load.pickup_date) <= d_to)
    except Exception:
        pass
    if driver_id:
        q = q.filter(models.Load.driver_id == int(driver_id))
    if truck_id:
        q = q.filter(models.Load.truck_id == int(truck_id))
    if broker:
        q = q.filter(models.Load.broker_name.ilike(f"%{broker}%"))
    return q.all()


# ── Total Revenue ──────────────────────────────────────────────────────────

@router.get("/total-revenue")
def total_revenue(
    period:    str = "30d",
    driver_id: Optional[str] = None,
    truck_id:  Optional[str] = None,
    broker:    Optional[str] = None,
    group_by:  str = "none",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    loads = filter_loads(db, current_user.company_id, period, driver_id, truck_id, broker)
    rows = []
    for l in loads:
        rows.append({
            "load_id": l.id,
            "load_number": l.load_number,
            "date": str(l.pickup_date)[:10] if l.pickup_date else None,
            "completed": str(l.completed_at)[:10] if l.completed_at else None,
            "broker": l.broker_name,
            "driver": l.driver.name if l.driver else None,
            "truck": l.truck.unit_number if l.truck else None,
            "route": f"{l.pickup_city or ''} {l.pickup_state or ''} → {l.delivery_city or ''} {l.delivery_state or ''}".strip(),
            "miles": l.miles,
            "rate": l.rate,
            "status": l.status.value if l.status else None,
            "billing_status": l.billing_status,
        })

    if group_by == "driver":
        grouped = {}
        for r in rows:
            k = r["driver"] or "Unassigned"
            if k not in grouped:
                grouped[k] = {"group": k, "load_count": 0, "total_miles": 0, "total_revenue": 0}
            grouped[k]["load_count"] += 1
            grouped[k]["total_miles"] += r["miles"] or 0
            grouped[k]["total_revenue"] += r["rate"] or 0
        return {"grouped": True, "by": "driver", "rows": list(grouped.values()),
                "totals": _totals(rows)}
    elif group_by == "truck":
        grouped = {}
        for r in rows:
            k = r["truck"] or "No Truck"
            if k not in grouped:
                grouped[k] = {"group": k, "load_count": 0, "total_miles": 0, "total_revenue": 0}
            grouped[k]["load_count"] += 1
            grouped[k]["total_miles"] += r["miles"] or 0
            grouped[k]["total_revenue"] += r["rate"] or 0
        return {"grouped": True, "by": "truck", "rows": list(grouped.values()),
                "totals": _totals(rows)}

    return {"grouped": False, "rows": rows, "totals": _totals(rows)}


# ── Rate per Mile ──────────────────────────────────────────────────────────

@router.get("/rate-per-mile")
def rate_per_mile(
    period:    str = "30d",
    driver_id: Optional[str] = None,
    truck_id:  Optional[str] = None,
    group_by:  str = "none",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    loads = filter_loads(db, current_user.company_id, period, driver_id, truck_id)
    rows = []
    for l in loads:
        rpm = round((l.rate or 0) / l.miles, 3) if (l.miles and l.miles > 0) else None
        rows.append({
            "load_number": l.load_number,
            "date": str(l.pickup_date)[:10] if l.pickup_date else None,
            "driver": l.driver.name if l.driver else None,
            "truck": l.truck.unit_number if l.truck else None,
            "broker": l.broker_name,
            "route": f"{l.pickup_state or ''} → {l.delivery_state or ''}",
            "rate": l.rate,
            "miles": l.miles,
            "rpm": rpm,
        })

    if group_by in ("driver", "truck"):
        grouped = {}
        for r in rows:
            k = r[group_by] or f"No {group_by.title()}"
            if k not in grouped:
                grouped[k] = {"group": k, "load_count": 0, "total_miles": 0.0, "total_revenue": 0.0}
            grouped[k]["load_count"] += 1
            grouped[k]["total_miles"] += r["miles"] or 0
            grouped[k]["total_revenue"] += r["rate"] or 0
        for v in grouped.values():
            v["avg_rpm"] = round(v["total_revenue"] / v["total_miles"], 3) if v["total_miles"] else None
        return {"grouped": True, "by": group_by, "rows": list(grouped.values()), "totals": _totals(rows)}

    total_miles = sum(r["miles"] or 0 for r in rows)
    total_rev   = sum(r["rate"] or 0 for r in rows)
    return {"grouped": False, "rows": rows,
            "totals": {**_totals(rows), "avg_rpm": round(total_rev / total_miles, 3) if total_miles else None}}


# ── Revenue by Dispatcher ──────────────────────────────────────────────────

@router.get("/revenue-by-dispatcher")
def revenue_by_dispatcher(
    period: str = "30d",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    loads = filter_loads(db, current_user.company_id, period)
    grouped = {}
    for l in loads:
        k = l.dispatcher_name or "Unassigned"
        if k not in grouped:
            grouped[k] = {"dispatcher": k, "load_count": 0, "total_miles": 0.0, "total_revenue": 0.0}
        grouped[k]["load_count"] += 1
        grouped[k]["total_miles"] += l.miles or 0
        grouped[k]["total_revenue"] += l.rate or 0
    rows = list(grouped.values())
    for r in rows:
        r["avg_rpm"] = round(r["total_revenue"] / r["total_miles"], 3) if r["total_miles"] else None
    return {"rows": rows, "totals": _totals(loads)}


# ── Driver Payment Summary ─────────────────────────────────────────────────

@router.get("/payment-summary")
def payment_summary(
    period: str = "30d",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    d_from, d_to = period_range(period)
    settlements = db.query(models.DriverSettlement).filter(
        models.DriverSettlement.company_id == current_user.company_id,
        models.DriverSettlement.date >= d_from,
        models.DriverSettlement.date <= d_to,
    ).all()
    rows = [{
        "number": f"SET-{str(s.id).zfill(4)}",
        "date": s.date,
        "driver": s.driver.name if s.driver else s.payable_to,
        "payable_to": s.payable_to,
        "settlement_total": s.settlement_total,
        "balance_due": s.balance_due,
        "status": s.status,
    } for s in settlements]
    total_paid = sum(s.settlement_total or 0 for s in settlements)
    return {"rows": rows, "total_paid": round(total_paid, 2), "count": len(rows)}


# ── Expenses ───────────────────────────────────────────────────────────────

@router.get("/expenses")
def expenses_report(
    period:   str = "30d",
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    d_from, d_to = period_range(period)
    q = db.query(models.BillingEntry).filter(
        models.BillingEntry.company_id == current_user.company_id,
        models.BillingEntry.entry_type.in_(["expense", "deduction"]),
        models.BillingEntry.date >= d_from,
        models.BillingEntry.date <= d_to,
    )
    if category:
        q = q.filter(models.BillingEntry.category == category)
    entries = q.order_by(models.BillingEntry.date.desc()).all()

    cat_totals = {}
    rows = []
    for e in entries:
        rows.append({
            "id": e.id,
            "date": e.date,
            "category": e.category,
            "driver": e.driver.name if e.driver else None,
            "truck": e.truck.unit_number if e.truck else None,
            "amount": e.amount,
            "notes": e.notes,
        })
        cat_totals[e.category or "Other"] = cat_totals.get(e.category or "Other", 0) + (e.amount or 0)

    total = sum(e.amount or 0 for e in entries)
    return {"rows": rows, "category_totals": cat_totals, "total": round(total, 2)}


# ── Gross Profit ───────────────────────────────────────────────────────────

@router.get("/gross-profit")
def gross_profit(
    period:    str = "30d",
    driver_id: Optional[str] = None,
    truck_id:  Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    loads = filter_loads(db, current_user.company_id, period, driver_id, truck_id)
    d_from, d_to = period_range(period)

    expenses = db.query(models.BillingEntry).filter(
        models.BillingEntry.company_id == current_user.company_id,
        models.BillingEntry.entry_type.in_(["expense", "deduction"]),
        models.BillingEntry.date >= d_from,
        models.BillingEntry.date <= d_to,
    ).all()
    fuel_txs = db.query(models.FuelTransaction).filter(
        models.FuelTransaction.company_id == current_user.company_id,
        models.FuelTransaction.date >= d_from,
        models.FuelTransaction.date <= d_to,
    ).all()

    revenue       = sum(l.rate or 0 for l in loads)
    total_expense = sum(e.amount or 0 for e in expenses)
    fuel_cost     = sum(t.amount or 0 for t in fuel_txs)
    gross         = revenue - total_expense - fuel_cost
    margin        = round(gross / revenue * 100, 1) if revenue else 0

    return {
        "period": period,
        "revenue": round(revenue, 2),
        "expenses": round(total_expense, 2),
        "fuel_cost": round(fuel_cost, 2),
        "gross_profit": round(gross, 2),
        "margin_pct": margin,
        "load_count": len(loads),
        "total_miles": round(sum(l.miles or 0 for l in loads), 1),
    }


# ── Gross Profit per Load ──────────────────────────────────────────────────

@router.get("/gross-profit-per-load")
def gross_profit_per_load(
    period:    str = "30d",
    driver_id: Optional[str] = None,
    truck_id:  Optional[str] = None,
    broker:    Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    loads = filter_loads(db, current_user.company_id, period, driver_id, truck_id, broker)
    rows = []
    for l in loads:
        # Estimate driver cost from pay rate
        driver_cost = 0.0
        if l.driver:
            drv = l.driver
            pay_type = drv.pay_type or "per_mile"
            rate = drv.pay_rate or 0
            if pay_type == "per_mile":
                driver_cost = rate * (l.miles or 0)
            elif pay_type == "freight_percentage":
                driver_cost = (l.rate or 0) * (rate / 100)
            elif pay_type == "flatpay":
                driver_cost = rate
        revenue = l.rate or 0
        gp = round(revenue - driver_cost, 2)
        rows.append({
            "load_number": l.load_number,
            "date": str(l.pickup_date)[:10] if l.pickup_date else None,
            "broker": l.broker_name,
            "driver": l.driver.name if l.driver else None,
            "truck": l.truck.unit_number if l.truck else None,
            "route": f"{l.pickup_state or ''} → {l.delivery_state or ''}",
            "miles": l.miles,
            "revenue": revenue,
            "driver_cost": round(driver_cost, 2),
            "gross_profit": gp,
            "margin_pct": round(gp / revenue * 100, 1) if revenue else 0,
        })
    total_rev = sum(r["revenue"] for r in rows)
    total_gp  = sum(r["gross_profit"] for r in rows)
    return {"rows": rows, "total_revenue": round(total_rev, 2),
            "total_gross_profit": round(total_gp, 2),
            "avg_margin": round(total_gp / total_rev * 100, 1) if total_rev else 0}


# ── Profit & Loss ──────────────────────────────────────────────────────────

@router.get("/profit-loss")
def profit_loss(
    period:    str = "30d",
    driver_id: Optional[str] = None,
    truck_id:  Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    loads    = filter_loads(db, current_user.company_id, period, driver_id, truck_id)
    d_from, d_to = period_range(period)

    exp_entries = db.query(models.BillingEntry).filter(
        models.BillingEntry.company_id == current_user.company_id,
        models.BillingEntry.entry_type.in_(["expense", "deduction"]),
        models.BillingEntry.date >= d_from,
        models.BillingEntry.date <= d_to,
    ).all()
    inc_entries = db.query(models.BillingEntry).filter(
        models.BillingEntry.company_id == current_user.company_id,
        models.BillingEntry.entry_type.in_(["income", "addition"]),
        models.BillingEntry.date >= d_from,
        models.BillingEntry.date <= d_to,
    ).all()
    fuel_txs = db.query(models.FuelTransaction).filter(
        models.FuelTransaction.company_id == current_user.company_id,
        models.FuelTransaction.date >= d_from,
        models.FuelTransaction.date <= d_to,
    ).all()
    settlements = db.query(models.DriverSettlement).filter(
        models.DriverSettlement.company_id == current_user.company_id,
        models.DriverSettlement.date >= d_from,
        models.DriverSettlement.date <= d_to,
    ).all()

    freight_rev   = sum(l.rate or 0 for l in loads)
    other_inc     = sum(e.amount or 0 for e in inc_entries)
    total_income  = freight_rev + other_inc

    driver_pay    = sum(s.settlement_total or 0 for s in settlements)
    fuel_cost     = sum(t.amount or 0 for t in fuel_txs)
    other_exp     = sum(e.amount or 0 for e in exp_entries)
    total_expense = driver_pay + fuel_cost + other_exp

    net = total_income - total_expense

    return {
        "period": period,
        "income": {
            "freight_revenue": round(freight_rev, 2),
            "other_income": round(other_inc, 2),
            "total": round(total_income, 2),
        },
        "expenses": {
            "driver_pay": round(driver_pay, 2),
            "fuel": round(fuel_cost, 2),
            "other": round(other_exp, 2),
            "total": round(total_expense, 2),
        },
        "net_profit": round(net, 2),
        "margin_pct": round(net / total_income * 100, 1) if total_income else 0,
    }


def _totals(loads):
    if not loads or isinstance(loads[0], dict):
        rows = loads
        return {
            "load_count": len(rows),
            "total_miles": round(sum(r.get("miles") or 0 for r in rows), 1),
            "total_revenue": round(sum(r.get("rate") or 0 for r in rows), 2),
        }
    return {
        "load_count": len(loads),
        "total_miles": round(sum(l.miles or 0 for l in loads), 1),
        "total_revenue": round(sum(l.rate or 0 for l in loads), 2),
    }
