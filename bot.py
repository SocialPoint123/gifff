import os
import sqlite3
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv

# โหลดค่า .env (ถ้ามี)
load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")  # ใส่ TOKEN ใน .env หรือ environment variable
CHANNEL_ID = "@GiftForCasino"            # ตั้งค่าช่อง Telegram ของคุณ
ADMIN_ID = 5805423698                   # ใส่ Telegram user ID ของแอดมิน

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args
    if not args:
        await update.message.reply_text("กรุณาใช้ลิงก์ที่ถูกต้อง")
        return
    
    link_id = args[0]
    user_id = update.effective_user.id

    conn = sqlite3.connect("links.db")
    c = conn.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS links (link_id TEXT PRIMARY KEY, url TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS clicks (link_id TEXT, user_id INTEGER, click_count INTEGER)")
    c.execute("SELECT url FROM links WHERE link_id = ?", (link_id,))
    result = c.fetchone()
    if not result:
        await update.message.reply_text("ลิงก์ไม่ถูกต้อง")
        conn.close()
        return
    
    true_money_url = result[0]

    # ตรวจสอบว่าผู้ใช้คนนี้เคยกดลิงก์นี้แล้วหรือยัง (ถ้าต้องการป้องกันซ้ำ)
    c.execute("SELECT click_count FROM clicks WHERE link_id = ? AND user_id = ?", (link_id, user_id))
    user_clicked = c.fetchone()
    if user_clicked:
        await update.message.reply_text("คุณเคยรับซองนี้ไปแล้ว")
        conn.close()
        return

    # นับจำนวนคลิก
    c.execute("SELECT MAX(click_count) FROM clicks WHERE link_id = ?", (link_id,))
    last_count = c.fetchone()
    count = (last_count[0] if last_count and last_count[0] else 0) + 1
    c.execute("INSERT INTO clicks (link_id, user_id, click_count) VALUES (?, ?, ?)", (link_id, user_id, count))
    conn.commit()

    await update.message.reply_text(f"คุณเป็นคนที่ {count} ที่คลิกลิงก์ {link_id}\n{true_money_url}")
    conn.close()

async def handle_link(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("คุณไม่มีสิทธิ์ส่งลิงก์")
        return
    
    url = update.message.text.strip()
    if not url.startswith("https://gift.truemoney.com"):
        await update.message.reply_text("กรุณาส่งลิงก์ TrueMoney เท่านั้น")
        return

    link_id = f"voucher_{int(update.message.date.timestamp())}"

    conn = sqlite3.connect("links.db")
    c = conn.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS links (link_id TEXT PRIMARY KEY, url TEXT)")
    try:
        c.execute("INSERT INTO links (link_id, url) VALUES (?, ?)", (link_id, url))
        conn.commit()
    except sqlite3.IntegrityError:
        await update.message.reply_text("มีลิงก์นี้อยู่ในระบบแล้ว")
        conn.close()
        return
    conn.close()

    click_link = f"https://t.me/{context.bot.username}?start={link_id}"

    await context.bot.send_message(
        chat_id=CHANNEL_ID,
        text=f"ซองของขวัญ TrueMoney ใหม่!\nคลิกเพื่อรับ: {click_link}"
    )
    await update.message.reply_text(f"ส่งลิงก์ไปแชแนลแล้ว\nลิงก์สำหรับคลิก: {click_link}")

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_link))
    print("Bot started...")
    app.run_polling()

if __name__ == "__main__":
    main()
