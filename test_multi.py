import requests

url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
headers = {
    "Accept": "*/*",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36",
}

for fiat, t_type, amount, pay in [
    ("VES", "SELL", "1000", []),
    ("COP", "SELL", "300000", []),
    ("USD", "BUY", "100", ["Zelle"]),
    ("PEN", "SELL", "300", [])
]:
    payload = {
        "fiat": fiat,
        "page": 1,
        "rows": 5,
        "tradeType": t_type,
        "asset": "USDT",
        "countries": [],
        "proMerchantAds": False,
        "shieldMerchantAds": False,
        "filterType": "all",
        "periods": [],
        "additionalKycVerifyFilter": 0,
        "publisherType": None,
        "payTypes": pay,
        "transAmount": amount
    }
    r = requests.post(url, json=payload, headers=headers).json()
    ads = r.get("data", [])
    print(f"\n--- {fiat} {t_type} (amount={amount}, pay={pay}) --- ({len(ads)} ads)")
    for i, a in enumerate(ads[:3]):
        adv = a.get("adv", {})
        print(f"  [{i+1}] {adv.get('price')} {fiat} (Min: {adv.get('minSingleTransAmount')} Max: {adv.get('dynamicMaxSingleTransAmount')})")
