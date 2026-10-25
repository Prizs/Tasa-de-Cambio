import requests
import io
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("telegram_service")

def send_telegram_message(bot_token: str, chat_id: str, text: str) -> Dict[str, Any]:
    """
    Sends a text message to a Telegram chat or group.
    """
    if not bot_token or not chat_id:
        return {"success": False, "error": "Bot token o Chat ID no configurados"}
    
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    try:
        r = requests.post(url, json=payload, timeout=10)
        data = r.json()
        if data.get("ok"):
            return {"success": True, "data": data}
        else:
            return {"success": False, "error": data.get("description", "Error de Telegram")}
    except Exception as e:
        logger.error(f"Error sending Telegram message: {e}")
        return {"success": False, "error": str(e)}

def send_telegram_photo(bot_token: str, chat_id: str, photo_bytes: bytes, caption: str = "") -> Dict[str, Any]:
    """
    Sends a photo (image bytes) directly to a Telegram group.
    """
    if not bot_token or not chat_id:
        return {"success": False, "error": "Bot token o Chat ID no configurados"}
    
    url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
    files = {"photo": ("flyer.png", photo_bytes, "image/png")}
    data = {
        "chat_id": chat_id,
        "caption": caption,
        "parse_mode": "HTML"
    }
    try:
        r = requests.post(url, data=data, files=files, timeout=25)
        res = r.json()
        if res.get("ok"):
            return {"success": True, "data": res}
        else:
            return {"success": False, "error": res.get("description", "Error enviando foto")}
    except Exception as e:
        logger.error(f"Error sending Telegram photo: {e}")
        return {"success": False, "error": str(e)}
