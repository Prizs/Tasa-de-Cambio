import json
import os
import time
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor
from binance_service import fetch_p2p_order_book, calculate_effective_rate

SNAPSHOT_FILE = "snapshots.json"

def load_config() -> Dict[str, Any]:
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)

def save_config(config: Dict[str, Any]):
    with open("config.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

def load_snapshot() -> Dict[str, Any]:
    if os.path.exists(SNAPSHOT_FILE):
        try:
            with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"timestamp": None, "rates": {}}

def save_snapshot(rates_data: Dict[str, Any], flyer_id: Optional[str] = None) -> Dict[str, Any]:
    existing = load_snapshot()
    existing_rates = existing.get("rates", {})
    now_time = time.time()
    readable = time.strftime("%Y-%m-%d %H:%M:%S")

    if flyer_id:
        # Update only this specific flyer's corridors
        for k, v in rates_data.items():
            if k.startswith(f"{flyer_id}_"):
                v["snapshot_time"] = readable
                existing_rates[k] = v
    else:
        # Update all corridors
        for k, v in rates_data.items():
            v["snapshot_time"] = readable
        existing_rates = rates_data

    snapshot = {
        "timestamp": now_time,
        "readable_time": readable,
        "rates": existing_rates
    }
    with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)
    return snapshot


def compute_all_rates() -> Dict[str, Any]:
    """
    Computes all live rates across all configured flyers and corridors,
    and calculates drift against the last saved snapshot.
    """
    config = load_config()
    settings = config.get("settings", {})
    flyers = config.get("flyers", [])
    snapshot = load_snapshot()
    saved_rates = snapshot.get("rates", {})

    results = []
    flat_rates_for_snapshot = {}

    skip_top = settings.get("merchant_skip_top", 3)
    sample_count = settings.get("merchant_sample_count", 7)
    min_finish = settings.get("min_finish_rate", 0.88)
    sample_mode = settings.get("merchant_sample_mode", "average_top")

    # Parallel pre-fetch all necessary order books to make execution ultra-fast (~1s)
    queries_to_fetch = set()
    for flyer in flyers:
        orig = flyer["origin"]
        if not (orig.get("fixed_rate") is not None or orig["fiat"] == "USD"):
            queries_to_fetch.add((
                orig["fiat"],
                orig["tradeType"],
                orig.get("minAmount"),
                tuple(orig.get("payTypes") or [])
            ))
        for corr in flyer.get("corridors", []):
            dest_f = corr["destination_fiat"]
            if not (corr.get("fixed_rate") is not None or dest_f == "USD"):
                queries_to_fetch.add((
                    dest_f,
                    corr["tradeType"],
                    corr.get("minAmount"),
                    tuple(corr.get("payTypes") or [])
                ))

    if queries_to_fetch:
        with ThreadPoolExecutor(max_workers=8) as executor:
            list(executor.map(
                lambda q: fetch_p2p_order_book(q[0], q[1], q[2], list(q[3])),
                queries_to_fetch
            ))

    for flyer in flyers:
        flyer_id = flyer["id"]
        origin = flyer["origin"]

        # 1. Fetch and calculate rate for Origin currency -> USDT
        if origin.get("fixed_rate") is not None or origin["fiat"] == "USD":
            origin_price = float(origin.get("fixed_rate", 1.00))
            origin_calc = {
                "price": origin_price,
                "sampled_merchants": [
                    {
                        "nickName": "Tasa Fija 1:1 (Paridad USD)",
                        "price": origin_price,
                        "finishRate": 100.0,
                        "monthOrders": 9999,
                        "minAmount": 1,
                        "maxAmount": 999999
                    }
                ]
            }
        else:
            origin_ads = fetch_p2p_order_book(
                fiat=origin["fiat"],
                trade_type=origin["tradeType"],  # usually 'BUY'
                amount=origin.get("minAmount"),
                pay_types=origin.get("payTypes")
            )
            origin_calc = calculate_effective_rate(
                ads=origin_ads,
                skip_top=skip_top,
                sample_count=sample_count,
                min_finish_rate=min_finish,
                sample_mode=sample_mode
            )
            origin_price = origin_calc["price"]

        computed_corridors = []

        for corridor in flyer.get("corridors", []):
            dest_fiat = corridor["destination_fiat"]
            if corridor.get("fixed_rate") is not None or dest_fiat == "USD":
                dest_price = float(corridor.get("fixed_rate", 1.00))
                dest_calc = {
                    "price": dest_price,
                    "sampled_merchants": [
                        {
                            "nickName": "Tasa Fija 1:1 (Paridad USD)",
                            "price": dest_price,
                            "finishRate": 100.0,
                            "monthOrders": 9999,
                            "minAmount": 1,
                            "maxAmount": 999999
                        }
                    ]
                }
            else:
                dest_ads = fetch_p2p_order_book(
                    fiat=dest_fiat,
                    trade_type=corridor["tradeType"],  # usually 'SELL'
                    amount=corridor.get("minAmount"),
                    pay_types=corridor.get("payTypes")
                )
                dest_calc = calculate_effective_rate(
                    ads=dest_ads,
                    skip_top=skip_top,
                    sample_count=sample_count,
                    min_finish_rate=min_finish,
                    sample_mode=sample_mode
                )
                dest_price = dest_calc["price"]

            calc_mode = corridor.get("calc_mode", "standard")
            margin_std = corridor.get("margin", settings.get("default_margin_standard", 7.0))
            margin_pref = corridor.get("margin_pref", settings.get("default_margin_preferential", 6.3))
            round_decimals = corridor.get("roundDecimals", 2)

            if calc_mode == "origin_plus_percent":
                # Special rule: Origin Buy price + Margin % (e.g. COP + 10% or CLP + 10%)
                # Displays how many pesos equal 1 USD
                acquisition_rate = origin_price
                rate_standard = origin_price * (1 + (margin_std / 100.0))
                rate_preferential = origin_price * (1 + (margin_pref / 100.0))
            else:
                # Standard acquisition: Dest / Origin, deducting margin %
                acquisition_rate = 0.0
                if origin_price > 0 and dest_price > 0:
                    acquisition_rate = dest_price / origin_price
                rate_standard = acquisition_rate * (1 - (margin_std / 100.0))
                rate_preferential = acquisition_rate * (1 - (margin_pref / 100.0))

            corridor_key = f"{flyer_id}_{origin['fiat']}_{dest_fiat}"

            # Store for snapshot comparison
            flat_rates_for_snapshot[corridor_key] = {
                "acquisition_rate": acquisition_rate,
                "rate_standard": rate_standard,
                "rate_preferential": rate_preferential,
                "origin_price": origin_price,
                "dest_price": dest_price
            }

            # Check drift against snapshot
            drift_data = None
            if corridor_key in saved_rates:
                snap_entry = saved_rates[corridor_key]
                old_acq = snap_entry.get("acquisition_rate", 0)
                old_std = snap_entry.get("rate_standard", 0)
                if old_acq > 0:
                    drift_acq_pct = ((acquisition_rate - old_acq) / old_acq) * 100
                    # Margin impact:
                    # If market acquisition rate drops while we published a higher customer rate,
                    # our profit margin shrinks (risk!).
                    # If market acquisition rate rises, our profit margin expands.
                    effective_margin_now = ((acquisition_rate - old_std) / acquisition_rate) * 100 if acquisition_rate > 0 else 0
                    drift_data = {
                        "old_rate_standard": old_std,
                        "drift_acq_pct": round(drift_acq_pct, 2),
                        "effective_margin_now": round(effective_margin_now, 2),
                        "nominal_margin": margin_std,
                        "margin_diff": round(effective_margin_now - margin_std, 2),
                        "status": "safe" if effective_margin_now >= (margin_std - 0.5) else ("warning" if effective_margin_now >= (margin_std - 1.5) else "danger")
                    }

            computed_corridors.append({
                "corridor_key": corridor_key,
                "name": corridor["name"],
                "destination_fiat": dest_fiat,
                "flag": corridor["flag"],
                "dest_usdt_price": dest_price,
                "acquisition_rate": acquisition_rate,
                "rate_standard": round(rate_standard, round_decimals),
                "rate_standard_raw": rate_standard,
                "rate_preferential": round(rate_preferential, round_decimals),
                "rate_preferential_raw": rate_preferential,
                "margin_std": margin_std,
                "margin_pref": margin_pref,
                "round_decimals": round_decimals,
                "drift": drift_data,
                "dest_merchants_sample": dest_calc.get("sampled_merchants", [])[:4]
            })

        results.append({
            "flyer_id": flyer_id,
            "title": flyer["title"],
            "badge_header": flyer.get("badge_header"),
            "subtitle": flyer.get("subtitle"),
            "min_amount_text": flyer.get("min_amount_text"),
            "promo_text": flyer.get("promo_text"),
            "sub_promo": flyer.get("sub_promo"),
            "whatsapp": flyer.get("whatsapp"),
            "brand_name": flyer.get("brand_name"),
            "origin": {
                "fiat": origin["fiat"],
                "flag": origin["flag"],
                "tradeType": origin["tradeType"],
                "minAmount": origin.get("minAmount"),
                "payTypes": origin.get("payTypes"),
                "origin_usdt_price": origin_price,
                "sampled_merchants": origin_calc.get("sampled_merchants", [])[:4]
            },
            "corridors": computed_corridors
        })

    return {
        "timestamp": time.time(),
        "readable_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "snapshot_info": {
            "has_snapshot": bool(snapshot.get("timestamp")),
            "snapshot_time": snapshot.get("readable_time"),
            "snapshot_age_seconds": round(time.time() - snapshot.get("timestamp", time.time())) if snapshot.get("timestamp") else 0
        },
        "flyers": results,
        "_snapshot_payload": flat_rates_for_snapshot
    }
