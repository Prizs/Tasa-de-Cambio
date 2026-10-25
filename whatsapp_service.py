import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def send_whatsapp_message(
    api_url: str,
    id_instance: str,
    api_token: str,
    chat_id: str,
    message: str
) -> Dict[str, Any]:
    """
    Sends a text message to a WhatsApp group or contact via Green-API.
    chat_id for groups must end with '@g.us', e.g. '120363024823453@g.us'
    """
    if not api_url or not id_instance or not api_token or not chat_id:
        return {"success": False, "error": "Faltan credenciales de Green-API"}

    base_url = api_url.rstrip("/")
    url = f"{base_url}/waInstance{id_instance}/sendMessage/{api_token}"
    payload = {
        "chatId": chat_id,
        "message": message
    }

    try:
        resp = requests.post(url, json=payload, timeout=12)
        if resp.status_code == 200:
            return {"success": True, "data": resp.json()}
        else:
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {e}")
        return {"success": False, "error": str(e)}


def send_whatsapp_file(
    api_url: str,
    id_instance: str,
    api_token: str,
    chat_id: str,
    file_bytes: bytes,
    file_name: str,
    caption: str = ""
) -> Dict[str, Any]:
    """
    Sends a photo or document file to a WhatsApp group via Green-API sendFileByUpload.
    """
    if not api_url or not id_instance or not api_token or not chat_id:
        return {"success": False, "error": "Faltan credenciales de Green-API"}

    base_url = api_url.rstrip("/")
    url = f"{base_url}/waInstance{id_instance}/sendFileByUpload/{api_token}"

    data = {
        "chatId": chat_id,
        "caption": caption
    }
    files = {
        "file": (file_name, file_bytes, "image/png")
    }

    try:
        resp = requests.post(url, data=data, files=files, timeout=25)
        if resp.status_code == 200:
            return {"success": True, "data": resp.json()}
        else:
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        logger.error(f"Error sending WhatsApp file: {e}")
        return {"success": False, "error": str(e)}


def get_whatsapp_chats(api_url: str, id_instance: str, api_token: str) -> Dict[str, Any]:
    """
    Retrieves all chats (including groups) from the Green-API instance.
    """
    base_url = api_url.rstrip("/")
    url = f"{base_url}/waInstance{id_instance}/getChats/{api_token}"
    try:
        resp = requests.get(url, timeout=12)
        if resp.status_code == 200:
            return {"success": True, "chats": resp.json()}
        return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"success": False, "error": str(e)}
