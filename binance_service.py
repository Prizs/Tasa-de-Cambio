import time
import logging
import requests
from typing import Dict, List, Optional, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("binance_p2p")

BINANCE_P2P_URL = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"

# Simple in-memory cache to prevent duplicate calls during the same refresh cycle
_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 30  # 30 seconds cache

HEADERS = {
    "Accept": "*/*",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Origin": "https://p2p.binance.com",
    "Cache-Control": "no-cache",
}

def fetch_p2p_order_book(
    fiat: str,
    trade_type: str,  # 'BUY' or 'SELL'
    amount: Optional[float] = None,
    pay_types: Optional[List[str]] = None,
    rows: int = 15
) -> List[Dict[str, Any]]:
    """
    Queries Binance P2P for real-time ads matching the fiat, tradeType and filters.
    Caches results briefly to avoid flooding Binance.
    """
    cache_key = f"{fiat}_{trade_type}_{amount}_{pay_types}_{rows}"
    now = time.time()

    if cache_key in _cache:
        cached = _cache[cache_key]
        if now - cached["time"] < CACHE_TTL:
            return cached["data"]

    payload = {
        "fiat": fiat,
        "page": 1,
        "rows": rows,
        "tradeType": trade_type,
        "asset": "USDT",
        "countries": [],
        "proMerchantAds": False,
        "shieldMerchantAds": False,
        "filterType": "all",
        "periods": [],
        "additionalKycVerifyFilter": 0,
        "publisherType": None,
        "payTypes": pay_types if pay_types else [],
    }
    if amount and amount > 0:
        payload["transAmount"] = str(int(amount))

    try:
        resp = requests.post(BINANCE_P2P_URL, json=payload, headers=HEADERS, timeout=8)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                ads = data.get("data", [])
                _cache[cache_key] = {"time": now, "data": ads}
                return ads
            else:
                logger.warning(f"Binance P2P error for {fiat} {trade_type}: {data.get('message')}")
        else:
            logger.warning(f"Binance P2P HTTP {resp.status_code} for {fiat} {trade_type}")
    except Exception as e:
        logger.error(f"Error fetching Binance P2P for {fiat} {trade_type}: {e}")

    # Fallback to stale cache if available
    if cache_key in _cache:
        return _cache[cache_key]["data"]
    return []


def calculate_effective_rate(
    ads: List[Dict[str, Any]],
    skip_top: int = 3,
    sample_count: int = 7,
    min_finish_rate: float = 0.88,
    sample_mode: str = "average_top"
) -> Dict[str, Any]:
    """
    Filters advertisers based on user criteria:
    - Omit the first 'skip_top' (e.g. first 3 ads)
    - Take the next 'sample_count' (e.g. 4th to 10th merchant)
    - Filter by completion rate
    - Compute average / representative price
    """
    if not ads:
        return {"price": 0.0, "sampled_merchants": [], "error": "No hay anuncios disponibles"}

    valid_ads = []
    for item in ads:
        adv = item.get("adv", {})
        user = item.get("advertiser", {})
        finish_rate = user.get("monthFinishRate", 1.0) or 1.0
        price = float(adv.get("price", 0))

        if price > 0 and finish_rate >= min_finish_rate:
            valid_ads.append({
                "nickName": user.get("nickName"),
                "price": price,
                "finishRate": round(finish_rate * 100, 1),
                "monthOrders": user.get("monthOrderCount", 0),
                "minAmount": adv.get("minSingleTransAmount"),
                "maxAmount": adv.get("dynamicMaxSingleTransAmount")
            })

    if not valid_ads:
        # Relax finish rate filter if none found
        for item in ads:
            adv = item.get("adv", {})
            user = item.get("advertiser", {})
            price = float(adv.get("price", 0))
            if price > 0:
                valid_ads.append({
                    "nickName": user.get("nickName"),
                    "price": price,
                    "finishRate": 0,
                    "monthOrders": 0,
                    "minAmount": adv.get("minSingleTransAmount"),
                    "maxAmount": adv.get("dynamicMaxSingleTransAmount")
                })

    # Skip the top N ads (e.g., skip first 3)
    if len(valid_ads) > skip_top:
        selected_pool = valid_ads[skip_top : skip_top + sample_count]
    else:
        # If fewer than skip_top exist, use what is available
        selected_pool = valid_ads[:sample_count]

    if not selected_pool:
        return {"price": 0.0, "sampled_merchants": [], "error": "Sin anuncios válidos"}

    prices = [m["price"] for m in selected_pool]
    avg_price = sum(prices) / len(prices)

    return {
        "price": avg_price,
        "min_in_pool": min(prices),
        "max_in_pool": max(prices),
        "sampled_merchants": selected_pool,
        "total_analyzed": len(valid_ads),
        "used_count": len(selected_pool)
    }
