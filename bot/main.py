import logging
import os
import json
import httpx
from datetime import date
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
    ConversationHandler,
)
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")
MEDIA_DIR = os.getenv("PTI_MEDIA_DIR", "./media/pti")

WAITING_PTI_MEDIA = 1
WAITING_DRIVER_NOTE = 2

PHOTO_GUIDANCE = (
    "📷 Sirasıyla su fotografları gonder:\n"
    "1 · FRONT — Tirin önü\n"
    "2 · REAR — Tirin arkası\n"
    "3 · L-SIDE — Sol yan\n"
    "4 · R-SIDE — Sag yan\n"
    "5 · TIRE FL — Sol ön lastik\n"
    "6 · TIRE FR — Sag ön lastik\n"
    "7 · TIRE RL — Sol arka lastik\n"
    "8 · TIRE RR — Sag arka lastik\n\n"
    "Bitince /pti_tamam yaz."
)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = str(update.effective_user.id)
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/drivers/")
        drivers = resp.json()

    driver = next((d for d in drivers if d.get("telegram_id") == telegram_id), None)

    if not driver:
        await update.message.reply_text(
            "Sisteme kayitli degilsin. Fleet manager ile iletisime gec."
        )
        return

    context.user_data["driver"] = driver
    keyboard = [[KeyboardButton("PTI Gonder")], [KeyboardButton("Durum")]]
    await update.message.reply_text(
        f"Merhaba {driver['name']}!\nNe yapmak istiyorsun?",
        reply_markup=ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
    )


async def request_pti(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = str(update.effective_user.id)
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/drivers/")
        drivers = resp.json()

    driver = next((d for d in drivers if d.get("telegram_id") == telegram_id), None)
    if not driver:
        await update.message.reply_text("Sisteme kayitli degilsin.")
        return ConversationHandler.END

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/pti/today")
        today_pti = resp.json()

    already = next((p for p in today_pti if p["driver_id"] == driver["id"] and p["submitted"]), None)
    if already:
        await update.message.reply_text(
            f"Bugunun PTI'ini zaten gondermissin ({already['submitted_at'][:16]}). Tesekkurler!"
        )
        return ConversationHandler.END

    context.user_data["driver"] = driver
    context.user_data["pti_media"] = []

    await update.message.reply_text(PHOTO_GUIDANCE)
    return WAITING_PTI_MEDIA


async def receive_pti_media(update: Update, context: ContextTypes.DEFAULT_TYPE):
    os.makedirs(MEDIA_DIR, exist_ok=True)
    driver = context.user_data.get("driver", {})
    today = date.today().isoformat()

    if update.message.photo:
        file = await update.message.photo[-1].get_file()
        filename = f"{today}_{driver.get('id', 'unknown')}_{file.file_id[:8]}.jpg"
        path = os.path.join(MEDIA_DIR, filename)
        await file.download_to_drive(path)
        context.user_data["pti_media"].append(path)
        count = len(context.user_data["pti_media"])
        labels = ['FRONT','REAR','L-SIDE','R-SIDE','TIRE FL','TIRE FR','TIRE RL','TIRE RR']
        label = labels[count - 1] if count <= len(labels) else f"EXTRA-{count}"
        next_label = labels[count] if count < len(labels) else None
        msg = f"✓ {label} alindi ({count}/8)."
        if next_label:
            msg += f" Siradaki: {next_label}"
        else:
            msg += " Tum acilar tamam. /pti_tamam yazabilirsin."
        await update.message.reply_text(msg)

    elif update.message.video:
        file = await update.message.video.get_file()
        filename = f"{today}_{driver.get('id', 'unknown')}_{file.file_id[:8]}.mp4"
        path = os.path.join(MEDIA_DIR, filename)
        await file.download_to_drive(path)
        context.user_data["pti_media"].append(path)
        count = len(context.user_data["pti_media"])
        await update.message.reply_text(f"✓ Video alindi ({count}). /pti_tamam ile bitirebilirsin.")

    return WAITING_PTI_MEDIA


async def finish_pti(update: Update, context: ContextTypes.DEFAULT_TYPE):
    media = context.user_data.get("pti_media", [])

    if not media:
        await update.message.reply_text("Hic media gondermemissin. En az 1 foto gonder.")
        return WAITING_PTI_MEDIA

    driver = context.user_data.get("driver")
    if not driver or not driver.get("truck_id"):
        await update.message.reply_text("Tir atamasi yok. Fleet manager ile iletisime gec.")
        return ConversationHandler.END

    count = len(media)
    photos = sum(1 for p in media if p.endswith('.jpg'))
    videos = count - photos

    await update.message.reply_text(
        f"✓ {count} dosya alindi ({photos} foto, {videos} video).\n\n"
        "Son olarak: Surucu notu var mi?\n"
        "(Lastik basinci, fren sorunu vb. — yoksa /atla yaz)"
    )
    return WAITING_DRIVER_NOTE


async def receive_note(update: Update, context: ContextTypes.DEFAULT_TYPE):
    note = update.message.text.strip()
    return await _save_pti(update, context, note)


async def skip_note(update: Update, context: ContextTypes.DEFAULT_TYPE):
    return await _save_pti(update, context, None)


async def _save_pti(update: Update, context: ContextTypes.DEFAULT_TYPE, note):
    driver = context.user_data.get("driver")
    media = context.user_data.get("pti_media", [])
    today = date.today().isoformat()

    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{API_BASE}/pti/", json={
            "driver_id": driver["id"],
            "truck_id": driver["truck_id"],
            "date": today,
            "media_paths": media,
            "telegram_message_id": str(update.message.message_id),
            "notes": note,
        })

    if resp.status_code == 200:
        await update.message.reply_text(
            f"✅ PTI kaydedildi! {len(media)} dosya.\n"
            + (f"📝 Not: {note}\n" if note else "")
            + "Iyi yolculuklar! 🚛"
        )
    else:
        await update.message.reply_text("PTI kaydedilemedi. Fleet manager ile iletisime gec.")

    context.user_data.clear()
    return ConversationHandler.END


async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = str(update.effective_user.id)
    async with httpx.AsyncClient() as client:
        pti_resp = await client.get(f"{API_BASE}/pti/today")
        today_pti = pti_resp.json()

    driver_pti = next(
        (p for p in today_pti if str(p.get("driver_id")) == telegram_id),
        None
    )

    if driver_pti and driver_pti["submitted"]:
        await update.message.reply_text("✅ Bugunun PTI'ini gondermissin. Tesekkurler!")
    else:
        await update.message.reply_text("⚠️ Bugun PTI gondermedin. PTI Gonder butonuna bas.")


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    await update.message.reply_text("Iptal edildi.")
    return ConversationHandler.END


def main():
    app = Application.builder().token(BOT_TOKEN).build()

    pti_handler = ConversationHandler(
        entry_points=[
            MessageHandler(filters.Regex("^PTI Gonder$"), request_pti),
            CommandHandler("pti", request_pti),
        ],
        states={
            WAITING_PTI_MEDIA: [
                MessageHandler(filters.PHOTO | filters.VIDEO, receive_pti_media),
                CommandHandler("pti_tamam", finish_pti),
            ],
            WAITING_DRIVER_NOTE: [
                CommandHandler("atla", skip_note),
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_note),
            ],
        },
        fallbacks=[CommandHandler("iptal", cancel)],
    )

    app.add_handler(CommandHandler("start", start))
    app.add_handler(pti_handler)
    app.add_handler(MessageHandler(filters.Regex("^Durum$"), status))

    logger.info("Bot basliyor...")
    app.run_polling()


if __name__ == "__main__":
    main()
