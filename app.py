import os
import io
import time
import zipfile
from fastapi import FastAPI, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

import calculator_service
from calculator_service import compute_all_rates, save_snapshot, load_config, save_config, load_snapshot
from telegram_service import send_telegram_message, send_telegram_photo

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

@app.get("/")
def get_index():
    with open(os.path.join("static", "index.html"), "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

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
