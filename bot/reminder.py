"""
Gunluk PTI hatirlatici - Her sabah PTI gondermeyenlere mesaj atar.
Cron job ya da scheduler ile calistir: her gun 08:00 ABD saati
"""
import asyncio
import httpx
import os
from telegram import Bot
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")


async def send_reminders():
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/pti/today")
        today_pti = resp.json()

    bot = Bot(token=BOT_TOKEN)
    missing = [p for p in today_pti if not p["submitted"] and p.get("driver_id")]

    if not missing:
        print("Tum soforler PTI gondermis.")
        return

    async with httpx.AsyncClient() as client:
        drivers_resp = await client.get(f"{API_BASE}/drivers/")
        drivers = drivers_resp.json()

    for entry in missing:
        driver = next((d for d in drivers if d["id"] == entry["driver_id"]), None)
        if driver and driver.get("telegram_id"):
            try:
                await bot.send_message(
                    chat_id=driver["telegram_id"],
                    text=(
                        f"Merhaba {driver['name']},\n"
                        "Bugunun PTI'ini henuz gondermemissin.\n"
                        "Lutfen /pti komutu ile gonder."
                    )
                )
                print(f"Hatirlatici gonderildi: {driver['name']}")
            except Exception as e:
                print(f"Hata ({driver['name']}): {e}")


if __name__ == "__main__":
    asyncio.run(send_reminders())
