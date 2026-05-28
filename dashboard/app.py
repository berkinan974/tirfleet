import streamlit as st
import httpx
import pandas as pd
import json
import os
from datetime import date, datetime

API_BASE = "http://localhost:8000"

st.set_page_config(
    page_title="TIR Fleet Manager",
    page_icon="🚛",
    layout="wide"
)

st.title("TIR Fleet Management Dashboard")
st.caption(f"Bugun: {date.today().strftime('%d %B %Y')}")


def fetch(endpoint):
    try:
        r = httpx.get(f"{API_BASE}{endpoint}", timeout=5)
        return r.json()
    except Exception:
        return None


# --- Ortak veri ---
all_drivers = fetch("/drivers/") or []
all_trucks = fetch("/trucks/") or []
driver_id_to_name = {d["id"]: d["name"] for d in all_drivers}
truck_id_to_unit = {t["id"]: t["unit_number"] for t in all_trucks}
truck_unit_to_driver = {t["unit_number"]: t.get("driver") for t in all_trucks}

# --- Ana sekme yapisi ---
tab1, tab2, tab3, tab4 = st.tabs(["Genel Durum", "PTI Takip", "Yuk Takip", "Tir & Sofor"])

# ========================
# TAB 1: Genel Durum
# ========================
with tab1:
    pti_today = fetch("/pti/today") or []
    load_summary = fetch("/loads/summary") or {}

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        active_trucks = sum(1 for t in all_trucks if t["status"] == "active")
        st.metric("Aktif Tir", active_trucks, f"/ {len(all_trucks)} toplam")
    with col2:
        pti_done = sum(1 for p in pti_today if p["submitted"])
        st.metric("PTI Bugün", f"{pti_done}/{len(pti_today)}")
    with col3:
        st.metric("Yolda Yük", load_summary.get("in_transit", 0))
    with col4:
        revenue = load_summary.get("total_revenue", 0)
        st.metric("Toplam Gelir", f"${revenue:,.0f}")

    st.divider()
    st.subheader("Filo Durumu")

    if all_trucks:
        for truck in all_trucks:
            with st.container():
                col_a, col_b, col_c, col_d = st.columns([1, 2, 2, 2])
                with col_a:
                    status_icon = "🟢" if truck["status"] == "active" else "🔴"
                    st.write(f"{status_icon} **{truck['unit_number']}**")
                with col_b:
                    st.write(f"Sofor: {truck.get('driver') or 'Atanmamis'}")
                with col_c:
                    load = truck.get("active_load")
                    if load:
                        st.write(f"📦 {load['origin']} → {load['destination']}")
                    else:
                        st.write("Yuk yok")
                with col_d:
                    pti = next((p for p in pti_today if p.get("truck") == truck["unit_number"]), None)
                    if pti and pti["submitted"]:
                        st.write("✅ PTI tamam")
                    else:
                        st.write("⚠️ PTI bekliyor")
    else:
        st.info("Kayitli tir yok. 'Tir & Sofor' sekmesinden ekle.")

# ========================
# TAB 2: PTI Takip
# ========================
with tab2:
    st.subheader("Bugünün PTI Durumu")
    pti_today = fetch("/pti/today") or []

    if pti_today:
        for pti in pti_today:
            col1, col2, col3 = st.columns([2, 1, 2])
            with col1:
                st.write(f"**{pti['driver_name']}**")
            with col2:
                st.write(pti.get("truck") or "-")
            with col3:
                if pti["submitted"]:
                    time_str = pti["submitted_at"][:16] if pti["submitted_at"] else ""
                    st.success(f"Gonderildi {time_str}")
                else:
                    st.error("Gonderilmedi")
    else:
        st.info("Kayitli sofor yok.")

    st.divider()
    st.subheader("PTI Gecmisi (Son 7 Gun)")
    history = fetch("/pti/history?days=7") or []
    if history:
        for record in history:
            driver_name = driver_id_to_name.get(record.get("driver_id"), f"Sofor #{record.get('driver_id')}")
            truck_unit = truck_id_to_unit.get(record.get("truck_id"), "-")
            submitted_at = record.get("submitted_at", "")[:16] if record.get("submitted_at") else ""
            is_valid = record.get("is_valid", True)
            validity_icon = "✅" if is_valid else "❌"

            with st.expander(f"{validity_icon} {record.get('date')} — {driver_name} — {truck_unit} — {submitted_at}"):
                # Gecerli/gecersiz isaretleme
                col_v1, col_v2 = st.columns([3, 1])
                with col_v2:
                    if is_valid:
                        if st.button("Gecersiz Yap", key=f"inv_{record['id']}"):
                            httpx.patch(f"{API_BASE}/pti/{record['id']}/validate", json={"is_valid": False})
                            st.rerun()
                    else:
                        if st.button("Gecerli Yap", key=f"val_{record['id']}"):
                            httpx.patch(f"{API_BASE}/pti/{record['id']}/validate", json={"is_valid": True})
                            st.rerun()

                # Fotograf/video goster
                media_raw = record.get("media_paths")
                if media_raw:
                    try:
                        paths = json.loads(media_raw)
                    except Exception:
                        paths = []
                    if paths:
                        cols = st.columns(min(len(paths), 3))
                        for i, path in enumerate(paths):
                            abs_path = os.path.abspath(path)
                            if os.path.exists(abs_path) and abs_path.lower().endswith((".jpg", ".jpeg", ".png")):
                                with cols[i % 3]:
                                    st.image(abs_path, use_container_width=True)
                            elif os.path.exists(abs_path) and abs_path.lower().endswith(".mp4"):
                                with cols[i % 3]:
                                    st.video(abs_path)
                            else:
                                st.write(f"Dosya: {os.path.basename(path)}")
                    else:
                        st.write("Media yok.")
                else:
                    st.write("Media yok.")

# ========================
# TAB 3: Yük Takip
# ========================
with tab3:
    col_add, col_filter = st.columns([3, 1])
    with col_filter:
        status_filter = st.selectbox(
            "Durum",
            ["Tumü", "pending", "in_transit", "delivered", "cancelled"]
        )

    endpoint = "/loads/"
    if status_filter != "Tumü":
        endpoint += f"?status={status_filter}"
    loads = fetch(endpoint) or []

    if loads:
        for load in loads:
            truck_unit = truck_id_to_unit.get(load.get("truck_id"), "-")
            driver_name = truck_unit_to_driver.get(truck_unit, "-") or "-"
            status_icons = {
                "pending": "🕐",
                "in_transit": "🚛",
                "delivered": "✅",
                "cancelled": "❌"
            }
            icon = status_icons.get(load.get("status"), "")
            label = f"{icon} {load.get('origin', '-')} → {load.get('destination', '-')} | {truck_unit} ({driver_name}) | ${load.get('rate', 0):,.0f}"

            with st.expander(label):
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.write(f"**Broker:** {load.get('broker_name') or '-'}")
                    st.write(f"**Load No:** {load.get('load_number') or '-'}")
                    st.write(f"**DAT Ref:** {load.get('dat_reference') or '-'}")
                with col2:
                    st.write(f"**Rate:** ${load.get('rate', 0):,.0f}")
                    st.write(f"**Mil:** {load.get('miles', 0):,.0f}")
                with col3:
                    st.write(f"**Sofor:** {driver_name}")
                    st.write(f"**Tir:** {truck_unit}")

                # Durum guncelle
                new_status = st.selectbox(
                    "Durumu Guncelle",
                    ["pending", "in_transit", "delivered", "cancelled"],
                    index=["pending", "in_transit", "delivered", "cancelled"].index(load.get("status", "pending")),
                    key=f"status_{load['id']}"
                )
                if st.button("Kaydet", key=f"save_load_{load['id']}"):
                    r = httpx.patch(f"{API_BASE}/loads/{load['id']}", json={"status": new_status})
                    if r.status_code == 200:
                        st.success("Guncellendi!")
                        st.rerun()
    else:
        st.info("Kayitli yuk yok.")

    st.divider()
    st.subheader("Yeni Yük Ekle")
    truck_options = {t["unit_number"]: t["id"] for t in all_trucks}

    with st.form("add_load"):
        col1, col2 = st.columns(2)
        with col1:
            selected_truck = st.selectbox("Tır", list(truck_options.keys()) or ["Tir yok"])
            origin = st.text_input("Kalkış")
            broker = st.text_input("Broker")
            rate = st.number_input("Rate ($)", min_value=0.0, step=50.0)
        with col2:
            destination = st.text_input("Varış")
            miles = st.number_input("Mil", min_value=0.0, step=10.0)
            load_no = st.text_input("Load No (opsiyonel)")
            dat_ref = st.text_input("DAT Referans (opsiyonel)")

        submitted = st.form_submit_button("Yük Ekle")
        if submitted:
            if not origin or not destination:
                st.error("Kalkış ve varış zorunlu.")
            elif not truck_options:
                st.error("Once tir ekle.")
            else:
                payload = {
                    "truck_id": truck_options[selected_truck],
                    "origin": origin,
                    "destination": destination,
                    "broker_name": broker,
                    "rate": rate,
                    "miles": miles,
                    "load_number": load_no or None,
                    "dat_reference": dat_ref or None,
                }
                r = httpx.post(f"{API_BASE}/loads/", json=payload)
                if r.status_code == 200:
                    st.success("Yük eklendi!")
                    st.rerun()
                else:
                    st.error(f"Hata: {r.text}")

# ========================
# TAB 4: Tır & Şoför
# ========================
with tab4:
    col_trucks, col_drivers = st.columns(2)

    with col_trucks:
        st.subheader("Tırlar")
        if all_trucks:
            for t in all_trucks:
                with st.expander(f"{t['unit_number']} — {t['plate']} — {t['status']}"):
                    with st.form(f"edit_truck_{t['id']}"):
                        new_plate = st.text_input("Plaka", value=t.get("plate", ""))
                        new_make = st.text_input("Marka", value=t.get("make") or "")
                        new_model = st.text_input("Model", value=t.get("model") or "")
                        new_year = st.number_input("Yıl", min_value=2000, max_value=2030, value=t.get("year") or 2020)
                        new_status = st.selectbox("Durum", ["active", "maintenance", "inactive"],
                                                  index=["active", "maintenance", "inactive"].index(t["status"]))
                        if st.form_submit_button("Kaydet"):
                            r = httpx.patch(f"{API_BASE}/trucks/{t['id']}", json={
                                "plate": new_plate, "make": new_make or None,
                                "model": new_model or None, "year": new_year, "status": new_status
                            })
                            if r.status_code == 200:
                                st.success("Guncellendi!")
                                st.rerun()
                            else:
                                st.error(f"Hata: {r.text}")
        else:
            st.info("Kayitli tir yok.")

        st.divider()
        st.subheader("Yeni Tır Ekle")
        with st.form("add_truck"):
            unit = st.text_input("Unit No (orn: T-001)")
            plate = st.text_input("Plaka")
            make = st.text_input("Marka (opsiyonel)")
            model = st.text_input("Model (opsiyonel)")
            year = st.number_input("Yıl (opsiyonel)", min_value=2000, max_value=2030, value=2020)
            if st.form_submit_button("Ekle"):
                if not unit or not plate:
                    st.error("Unit no ve plaka zorunlu.")
                else:
                    r = httpx.post(f"{API_BASE}/trucks/", json={
                        "unit_number": unit, "plate": plate,
                        "make": make or None, "model": model or None,
                        "year": year
                    })
                    if r.status_code == 200:
                        st.success("Tır eklendi!")
                        st.rerun()
                    else:
                        st.error(f"Hata: {r.text}")

    with col_drivers:
        st.subheader("Şoförler")
        truck_map = {"Atanmamış": None}
        truck_map.update({t["unit_number"]: t["id"] for t in all_trucks})

        if all_drivers:
            for d in all_drivers:
                assigned = truck_id_to_unit.get(d.get("truck_id"), "Atanmamış")
                with st.expander(f"{d['name']} — {assigned}"):
                    with st.form(f"edit_driver_{d['id']}"):
                        new_name = st.text_input("Ad Soyad", value=d.get("name", ""))
                        new_phone = st.text_input("Telefon", value=d.get("phone") or "")
                        new_tgid = st.text_input("Telegram ID (sayisal)", value=d.get("telegram_id") or "")
                        new_license = st.text_input("Ehliyet No", value=d.get("license_number") or "")
                        current_truck = truck_id_to_unit.get(d.get("truck_id"), "Atanmamış")
                        truck_keys = list(truck_map.keys())
                        idx = truck_keys.index(current_truck) if current_truck in truck_keys else 0
                        new_truck = st.selectbox("Tır", truck_keys, index=idx)
                        if st.form_submit_button("Kaydet"):
                            r = httpx.patch(f"{API_BASE}/drivers/{d['id']}", json={
                                "name": new_name,
                                "phone": new_phone or None,
                                "telegram_id": new_tgid or None,
                                "license_number": new_license or None,
                                "truck_id": truck_map[new_truck],
                            })
                            if r.status_code == 200:
                                st.success("Guncellendi!")
                                st.rerun()
                            else:
                                st.error(f"Hata: {r.text}")
        else:
            st.info("Kayitli sofor yok.")

        st.divider()
        st.subheader("Yeni Şoför Ekle")
        with st.form("add_driver"):
            name = st.text_input("Ad Soyad")
            phone = st.text_input("Telefon")
            telegram_id = st.text_input("Telegram ID (sayisal)")
            license_no = st.text_input("Ehliyet No")
            assigned_truck = st.selectbox("Tır", list(truck_map.keys()))
            if st.form_submit_button("Ekle"):
                if not name:
                    st.error("Ad zorunlu.")
                else:
                    r = httpx.post(f"{API_BASE}/drivers/", json={
                        "name": name,
                        "phone": phone or None,
                        "telegram_id": telegram_id or None,
                        "license_number": license_no or None,
                        "truck_id": truck_map[assigned_truck],
                    })
                    if r.status_code == 200:
                        st.success("Şoför eklendi!")
                        st.rerun()
                    else:
                        st.error(f"Hata: {r.text}")
