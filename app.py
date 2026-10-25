import os
import io
import time
import zipfile
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

import threading
import requests
import calculator_service
from calculator_service import compute_all_rates, save_snapshot, load_config, save_config, load_snapshot
from telegram_service import send_telegram_message, send_telegram_photo

def is_within_business_hours_vet() -> bool:
    """Checks if current time in Venezuela (UTC-4) is between 08:00 and 20:00."""
    vet = timezone(timedelta(hours=-4))
    now_vet = datetime.now(vet)
    return 8 <= now_vet.hour < 20

app = FastAPI(title="Calculadora de Tasas & Generador de Flyers P2P", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure static dir exists
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

def keep_alive_worker():
    """Background worker that pings this service every 9 minutes to prevent Render from sleeping."""
    time.sleep(20)
    while True:
        url = os.environ.get("RENDER_EXTERNAL_URL", "https://tasa-de-cambio-0yij.onrender.com")
        if url:
            target = f"{url.rstrip('/')}/health"
            try:
                r = requests.get(target, timeout=10)
                print(f"[KeepAlive] Self ping exitoso a {target} -> HTTP {r.status_code}")
            except Exception as e:
                print(f"[KeepAlive] Aviso al autoping: {e}")
        time.sleep(540)  # Ping every 9 minutes (Render sleeps at 15 minutes)

@app.on_event("startup")
def start_keep_alive():
    t = threading.Thread(target=keep_alive_worker, daemon=True)
    t.start()

@app.get("/")
def get_index():
    with open(os.path.join("static", "index.html"), "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.head("/")
def head_index():
    return HTMLResponse("")

@app.get("/health")
@app.head("/health")
def health_check():
    return {"status": "ok", "time": time.time()}

@app.get("/api/rates")
def get_live_rates():
    """
    Returns real-time rates for all flyers and corridors,
    with merchant order book samples and drift against saved snapshot.
    """
    try:
        data = compute_all_rates()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/snapshot/save")
def record_snapshot(payload: dict = Body(default={})):
    """
    Marks the current moment as the published benchmark snapshot.
    If flyer_id is passed, updates only that flyer's corridors.
    """
    try:
        flyer_id = payload.get("flyer_id") if isinstance(payload, dict) else None
        data = compute_all_rates()
        snapshot = save_snapshot(data.get("_snapshot_payload", {}), flyer_id=flyer_id)
        target = f"del flyer {flyer_id}" if flyer_id else "global de todos los flyers"
        return {
            "success": True,
            "message": f"Snapshot {target} guardado exitosamente.",
            "snapshot": snapshot
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/telegram/test")
def test_telegram(payload: dict = Body(...)):
    token = payload.get("bot_token")
    chat_id = payload.get("chat_id")
    if not token or not chat_id:
        raise HTTPException(status_code=400, detail="Faltan credenciales de Telegram")
    res = send_telegram_message(
        token, 
        chat_id, 
        "🚀 <b>Envíos YA!</b>: ¡Conexión con el bot de Telegram exitosa!\n\nEste bot notificará automáticamente a este grupo cuando el mercado se mueva o cuando publiques nuevas tasas."
    )
    return res

@app.post("/api/telegram/notify-alert")
def notify_telegram_alert(payload: dict = Body(...)):
    force = payload.get("force", False)
    if not force and not is_within_business_hours_vet():
        vet = timezone(timedelta(hours=-4))
        now_str = datetime.now(vet).strftime("%I:%M %p")
        return {
            "success": False,
            "message": f"Alerta omitida: Fuera del horario permitido de Venezuela (8:00 AM a 8:00 PM). Hora actual: {now_str} VET."
        }
    cfg = load_config()
    tg = cfg.get("telegram", {})
    if not tg.get("enabled"):
        return {"success": False, "message": "Telegram desactivado en ajustes"}
    token = tg.get("bot_token")
    chat_id = tg.get("chat_id")
    text = payload.get("text", "🚨 Alerta de volatilidad de mercado en Envíos YA!")
    return send_telegram_message(token, chat_id, text)

@app.post("/api/telegram/send-photo")
def send_telegram_flyer_photo(payload: dict = Body(...)):
    import base64
    cfg = load_config()
    tg = cfg.get("telegram", {})
    if not tg.get("enabled"):
        return {"success": False, "message": "Telegram desactivado en ajustes"}
    token = tg.get("bot_token")
    chat_id = tg.get("chat_id")
    image_base64 = payload.get("image_base64", "")
    caption = payload.get("caption", "📊 Flyer de Tasas - Envíos YA!")
    if image_base64.startswith("data:image"):
        image_base64 = image_base64.split(",")[1]
    try:
        photo_bytes = base64.b64decode(image_base64)
        return send_telegram_photo(token, chat_id, photo_bytes, caption)
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/snapshot")
def get_current_snapshot():
    return load_snapshot()

@app.get("/api/config")
def get_app_config():
    return load_config()

@app.post("/api/config")
def update_app_config(new_config: dict = Body(...)):
    try:
        save_config(new_config)
        return {"success": True, "message": "Configuración actualizada correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Iniciando servidor en http://localhost:{port} ...")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
