import requests
import json

url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"

headers = {
    "Accept": "*/*",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Origin": "https://p2p.binance.com",
    "Cache-Control": "no-cache",
}

# Test 1: CLP BUY USDT (transAmount 100000)
payload = {
    "fiat": "CLP",
    "page": 1,
    "rows": 10,
    "tradeType": "BUY",
    "asset": "USDT",
    "countries": [],
    "proMerchantAds": False,
    "shieldMerchantAds": False,
    "filterType": "all",
    "periods": [],
    "additionalKycVerifyFilter": 0,
    "publisherType": None,
    "payTypes": [],
    "transAmount": "100000"
}

try:
    resp = requests.post(url, json=payload, headers=headers, timeout=10)
    print("Status:", resp.status_code)
    data = resp.json()
    if data.get("success"):
        ads = data.get("data", [])
        print(f"Total ads returned for CLP BUY (amount 100000): {len(ads)}")
        for i, item in enumerate(ads[:6]):
            adv = item.get("adv", {})
            user = item.get("advertiser", {})
            print(f"[{i+1}] {user.get('nickName')} | Price: {adv.get('price')} CLP | Min-Max: {adv.get('minSingleTransAmount')} - {adv.get('dynamicMaxSingleTransAmount')} | MonthOrders: {user.get('monthOrderCount')} ({user.get('monthFinishRate')*100:.1f}%)")
    else:
        print("Error response:", data)
except Exception as e:
    print("Exception:", e)
