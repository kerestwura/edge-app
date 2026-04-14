from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import statistics
from collections import Counter, defaultdict

from database import db
from auth import get_current_user

router = APIRouter()

PRECONFIGURED_SYMBOLS = {
    "futures": ["ES", "NQ", "MNQ", "MES", "CL", "GC"],
    "forex": ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"],
    "crypto": ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
}


class TradeCreate(BaseModel):
    symbol: str
    market_type: str = "futures"
    direction: str = "long"
    entry_price: float
    exit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    position_size: float = 1
    risk: Optional[float] = None
    fees: float = 0
    timeframe: str = ""
    session: str = ""
    reasoning: str = ""
    setup_type: str = ""
    emotions_before: List[str] = []
    emotions_during: List[str] = []
    emotions_after: List[str] = []
    rules_followed: List[str] = []
    rules_broken: List[str] = []
    mistake_tags: List[str] = []
    tags: List[str] = []
    notes: str = ""
    lesson_learned: str = ""
    confidence_score: Optional[int] = None
    discipline_score: Optional[int] = None
    focus_score: Optional[int] = None
    followed_plan: Optional[bool] = None
    status: str = "closed"
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None


class TradeUpdate(BaseModel):
    symbol: Optional[str] = None
    market_type: Optional[str] = None
    direction: Optional[str] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    position_size: Optional[float] = None
    risk: Optional[float] = None
    fees: Optional[float] = None
    timeframe: Optional[str] = None
    session: Optional[str] = None
    reasoning: Optional[str] = None
    setup_type: Optional[str] = None
    emotions_before: Optional[List[str]] = None
    emotions_during: Optional[List[str]] = None
    emotions_after: Optional[List[str]] = None
    rules_followed: Optional[List[str]] = None
    rules_broken: Optional[List[str]] = None
    mistake_tags: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    lesson_learned: Optional[str] = None
    confidence_score: Optional[int] = None
    discipline_score: Optional[int] = None
    focus_score: Optional[int] = None
    followed_plan: Optional[bool] = None
    status: Optional[str] = None
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None


def calculate_pnl(trade: dict) -> tuple:
    entry = trade.get("entry_price", 0)
    exit_p = trade.get("exit_price")
    size = trade.get("position_size", 1)
    direction = trade.get("direction", "long")
    fees = trade.get("fees", 0)
    risk = trade.get("risk")

    if exit_p is None or exit_p == 0:
        return 0, 0, 0

    multiplier = 1 if direction == "long" else -1
    pnl = (exit_p - entry) * size * multiplier - fees
    pnl_percent = ((exit_p - entry) / entry * 100 * multiplier) if entry > 0 else 0
    pnl_r = round(pnl / risk, 2) if risk and risk > 0 else 0

    return round(pnl, 2), round(pnl_percent, 2), pnl_r


@router.get("/symbols")
async def get_symbols():
    return PRECONFIGURED_SYMBOLS


@router.post("/trades")
async def create_trade(trade: TradeCreate, request: Request):
    user = await get_current_user(request)
    trade_dict = trade.model_dump()
    trade_id = str(uuid.uuid4())
    pnl, pnl_percent, pnl_r = calculate_pnl(trade_dict)
    now = datetime.now(timezone.utc).isoformat()

    trade_doc = {
        "id": trade_id,
        "user_id": user["id"],
        **trade_dict,
        "pnl": pnl,
        "pnl_percent": pnl_percent,
        "pnl_r": pnl_r,
        "created_at": now,
        "updated_at": now,
    }
    await db.trades.insert_one(trade_doc)
    trade_doc.pop("_id", None)
    return trade_doc



@router.get("/trades/equity-curve")
async def get_equity_curve(request: Request, period: str = "all"):
    user = await get_current_user(request)

    query = {"user_id": user["id"], "status": "closed"}

    if period == "7d":
        cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    elif period == "30d":
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    else:
        cutoff = None

    trades = await db.trades.find(
        {"user_id": user["id"], "status": "closed"}, {"_id": 0}
    ).to_list(10000)

    if not trades:
        return []

    # Sort by entry_time or created_at
    def sort_key(t):
        return t.get("entry_time") or t.get("created_at", "")

    trades.sort(key=sort_key)

    # If filtering by period, we still need all trades for cumulative calc
    # but only return data points within the period
    cumulative = 0
    points = []

    for t in trades:
        trade_date = (t.get("entry_time") or t.get("created_at", ""))[:10]
        cumulative += t.get("pnl", 0)

        if cutoff and (t.get("entry_time") or t.get("created_at", "")) < cutoff:
            continue

        points.append({
            "date": trade_date,
            "cumulative_pnl": round(cumulative, 2),
            "pnl": round(t.get("pnl", 0), 2),
            "symbol": t.get("symbol", ""),
            "trade_num": len(points) + 1,
        })

    return points



@router.get("/trades/stats")
async def get_trade_stats(request: Request):
    user = await get_current_user(request)
    trades = await db.trades.find(
        {"user_id": user["id"], "status": "closed"}, {"_id": 0}
    ).to_list(10000)

    empty = {
        "total_trades": 0, "winning_trades": 0, "losing_trades": 0,
        "win_rate": 0, "total_pnl": 0, "avg_pnl": 0, "avg_r": 0,
        "best_trade": 0, "worst_trade": 0, "avg_win": 0, "avg_loss": 0,
        "profit_factor": 0, "best_setup": None, "most_common_mistake": None,
        "emotional_summary": {}, "recent_trades": [],
    }
    if not trades:
        return empty

    pnls = [t.get("pnl", 0) for t in trades]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]
    total_wins = sum(wins) if wins else 0
    total_losses = abs(sum(losses)) if losses else 0

    # Avg R
    r_values = [t.get("pnl_r", 0) for t in trades if t.get("pnl_r")]
    avg_r = round(sum(r_values) / len(r_values), 2) if r_values else 0

    # Best setup by win rate
    setup_stats = defaultdict(lambda: {"wins": 0, "total": 0, "pnl": 0})
    for t in trades:
        st = (t.get("setup_type") or "").strip()
        if st:
            setup_stats[st]["total"] += 1
            setup_stats[st]["pnl"] += t.get("pnl", 0)
            if t.get("pnl", 0) > 0:
                setup_stats[st]["wins"] += 1
    best_setup = None
    if setup_stats:
        best = max(setup_stats.items(), key=lambda x: x[1]["pnl"])
        best_setup = {"name": best[0], "win_rate": round(best[1]["wins"] / best[1]["total"] * 100, 1), "trades": best[1]["total"], "pnl": round(best[1]["pnl"], 2)}

    # Most common mistake
    mistakes = Counter()
    for t in trades:
        for m in t.get("mistake_tags", []):
            mistakes[m] += 1
        for r in t.get("rules_broken", []):
            mistakes[r] += 1
    most_common_mistake = mistakes.most_common(1)[0][0] if mistakes else None

    # Emotional summary
    all_emotions = Counter()
    for t in trades:
        for phase in ["emotions_before", "emotions_during", "emotions_after"]:
            for e in t.get(phase, []):
                all_emotions[e.lower()] += 1
    emotional_summary = dict(all_emotions.most_common(8))

    return {
        "total_trades": len(trades),
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "win_rate": round(len(wins) / len(trades) * 100, 1),
        "total_pnl": round(sum(pnls), 2),
        "avg_pnl": round(sum(pnls) / len(trades), 2),
        "avg_r": avg_r,
        "best_trade": round(max(pnls), 2),
        "worst_trade": round(min(pnls), 2),
        "avg_win": round(total_wins / len(wins), 2) if wins else 0,
        "avg_loss": round(total_losses / len(losses), 2) if losses else 0,
        "profit_factor": round(total_wins / total_losses, 2) if total_losses > 0 else 0,
        "best_setup": best_setup,
        "most_common_mistake": most_common_mistake,
        "emotional_summary": emotional_summary,
        "recent_trades": sorted(trades, key=lambda t: t.get("created_at", ""), reverse=True)[:10],
    }


@router.get("/trades/insights")
async def get_insights(request: Request):
    user = await get_current_user(request)
    trades = await db.trades.find(
        {"user_id": user["id"], "status": "closed"}, {"_id": 0}
    ).to_list(10000)

    if not trades:
        return {
            "best_setup": None, "worst_setup": None, "setup_stats": {},
            "most_damaging_emotion": None, "top_emotions_in_losses": {},
            "top_mistake": None, "all_mistakes": {},
            "confidence_vs_outcome": [], "discipline_trend": [],
            "session_performance": {}, "timeframe_performance": {},
            "emotional_summary": {},
        }

    # Setup performance
    setup_pnl = defaultdict(list)
    for t in trades:
        st = (t.get("setup_type") or "").strip()
        if st:
            setup_pnl[st].append(t.get("pnl", 0))

    setup_stats = {}
    for k, v in setup_pnl.items():
        setup_stats[k] = {
            "avg_pnl": round(sum(v) / len(v), 2),
            "count": len(v),
            "win_rate": round(len([p for p in v if p > 0]) / len(v) * 100, 1),
            "total_pnl": round(sum(v), 2),
        }

    best_setup = max(setup_stats.items(), key=lambda x: x[1]["total_pnl"]) if setup_stats else None
    worst_setup = min(setup_stats.items(), key=lambda x: x[1]["total_pnl"]) if setup_stats else None

    # Most damaging emotion
    losing_emotions = Counter()
    for t in trades:
        if (t.get("pnl") or 0) < 0:
            for phase in ["emotions_before", "emotions_during", "emotions_after"]:
                for e in t.get(phase, []):
                    losing_emotions[e.lower()] += 1

    # Top mistake
    all_mistakes = Counter()
    for t in trades:
        for m in t.get("mistake_tags", []):
            all_mistakes[m] += 1
        for r in t.get("rules_broken", []):
            all_mistakes[r] += 1

    # Confidence vs outcome
    confidence_data = []
    for t in sorted(trades, key=lambda x: x.get("created_at", "")):
        if t.get("confidence_score") is not None:
            confidence_data.append({
                "confidence": t["confidence_score"],
                "pnl": t.get("pnl", 0),
                "symbol": t.get("symbol", ""),
            })

    # Discipline trend
    discipline_data = []
    for t in sorted(trades, key=lambda x: x.get("created_at", "")):
        if t.get("discipline_score") is not None:
            discipline_data.append({
                "date": (t.get("entry_time") or t.get("created_at", ""))[:10],
                "score": t["discipline_score"],
                "pnl": t.get("pnl", 0),
            })

    # Session performance
    session_perf = defaultdict(lambda: {"trades": 0, "pnl": 0, "wins": 0})
    for t in trades:
        s = t.get("session") or "Unknown"
        session_perf[s]["trades"] += 1
        session_perf[s]["pnl"] += t.get("pnl", 0)
        if (t.get("pnl") or 0) > 0:
            session_perf[s]["wins"] += 1
    session_performance = {k: {"trades": v["trades"], "pnl": round(v["pnl"], 2), "win_rate": round(v["wins"] / v["trades"] * 100, 1)} for k, v in session_perf.items()}

    # Timeframe performance
    tf_perf = defaultdict(lambda: {"trades": 0, "pnl": 0, "wins": 0})
    for t in trades:
        tf = t.get("timeframe") or "Unknown"
        tf_perf[tf]["trades"] += 1
        tf_perf[tf]["pnl"] += t.get("pnl", 0)
        if (t.get("pnl") or 0) > 0:
            tf_perf[tf]["wins"] += 1
    timeframe_performance = {k: {"trades": v["trades"], "pnl": round(v["pnl"], 2), "win_rate": round(v["wins"] / v["trades"] * 100, 1)} for k, v in tf_perf.items()}

    # Emotional summary
    all_emotions = Counter()
    for t in trades:
        for phase in ["emotions_before", "emotions_during", "emotions_after"]:
            for e in t.get(phase, []):
                all_emotions[e.lower()] += 1

    return {
        "best_setup": {"name": best_setup[0], **best_setup[1]} if best_setup else None,
        "worst_setup": {"name": worst_setup[0], **worst_setup[1]} if worst_setup else None,
        "setup_stats": setup_stats,
        "most_damaging_emotion": losing_emotions.most_common(1)[0][0] if losing_emotions else None,
        "top_emotions_in_losses": dict(losing_emotions.most_common(5)),
        "top_mistake": all_mistakes.most_common(1)[0][0] if all_mistakes else None,
        "all_mistakes": dict(all_mistakes.most_common(10)),
        "confidence_vs_outcome": confidence_data,
        "discipline_trend": discipline_data,
        "session_performance": session_performance,
        "timeframe_performance": timeframe_performance,
        "emotional_summary": dict(all_emotions.most_common(10)),
    }


@router.get("/trades")
async def list_trades(
    request: Request,
    status: Optional[str] = None,
    market_type: Optional[str] = None,
    symbol: Optional[str] = None,
    direction: Optional[str] = None,
    setup_type: Optional[str] = None,
    session: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    sort: str = "-created_at"
):
    user = await get_current_user(request)
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    if market_type:
        query["market_type"] = market_type
    if symbol:
        query["symbol"] = {"$regex": symbol, "$options": "i"}
    if direction:
        query["direction"] = direction
    if setup_type:
        query["setup_type"] = setup_type
    if session:
        query["session"] = session
    if date_from:
        query.setdefault("entry_time", {})["$gte"] = date_from
    if date_to:
        query.setdefault("entry_time", {})["$lte"] = date_to

    sort_field = sort.lstrip("-")
    sort_dir = -1 if sort.startswith("-") else 1
    trades = await db.trades.find(query, {"_id": 0}).sort(sort_field, sort_dir).skip(skip).limit(limit).to_list(limit)
    total = await db.trades.count_documents(query)
    return {"trades": trades, "total": total}


@router.get("/trades/{trade_id}")
async def get_trade(trade_id: str, request: Request):
    user = await get_current_user(request)
    trade = await db.trades.find_one({"id": trade_id, "user_id": user["id"]}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.put("/trades/{trade_id}")
async def update_trade(trade_id: str, update: TradeUpdate, request: Request):
    user = await get_current_user(request)
    existing = await db.trades.find_one({"id": trade_id, "user_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Trade not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        return existing

    merged = {**existing, **update_data}
    pnl, pnl_percent, pnl_r = calculate_pnl(merged)
    update_data["pnl"] = pnl
    update_data["pnl_percent"] = pnl_percent
    update_data["pnl_r"] = pnl_r
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.trades.update_one({"id": trade_id}, {"$set": update_data})
    updated = await db.trades.find_one({"id": trade_id}, {"_id": 0})
    return updated


@router.delete("/trades/{trade_id}")
async def delete_trade(trade_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.trades.delete_one({"id": trade_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"message": "Trade deleted"}


# --- Trader DNA ---
async def calculate_trader_dna(user_id: str) -> dict:
    trades = await db.trades.find(
        {"user_id": user_id, "status": "closed"}, {"_id": 0}
    ).to_list(10000)

    default = {
        "discipline": 50, "patience": 50, "execution": 50,
        "emotional_control": 50, "risk_management": 50, "focus_consistency": 50
    }
    if not trades:
        return default

    total = len(trades)

    # DISCIPLINE: rules followed, followed_plan, setup usage, self-reported discipline
    rules_followed_pct = sum(1 for t in trades if len(t.get("rules_followed", [])) > 0) / total
    rules_broken_total = sum(len(t.get("rules_broken", [])) for t in trades)
    has_setup = sum(1 for t in trades if (t.get("setup_type") or "").strip()) / total
    followed_plan_pct = sum(1 for t in trades if t.get("followed_plan") is True) / total
    self_discipline = [t.get("discipline_score", 0) for t in trades if t.get("discipline_score")]
    avg_self_disc = sum(self_discipline) / len(self_discipline) * 10 if self_discipline else 0

    discipline = min(100, max(0, int(
        rules_followed_pct * 25 +
        max(0, 20 - rules_broken_total * 3) +
        has_setup * 20 +
        followed_plan_pct * 20 +
        avg_self_disc * 0.15
    )))

    # PATIENCE: no FOMO/revenge, reasonable frequency
    impatient_tags = {"revenge", "fomo", "impulsive", "bored"}
    impatient_count = 0
    for t in trades:
        for e in t.get("emotions_before", []) + t.get("emotions_during", []):
            if e.lower() in impatient_tags:
                impatient_count += 1

    trade_days = Counter()
    for t in trades:
        day = (t.get("entry_time") or t.get("created_at", ""))[:10]
        if day:
            trade_days[day] += 1
    avg_daily = sum(trade_days.values()) / max(1, len(trade_days)) if trade_days else 0
    freq_score = max(0, 40 - max(0, (avg_daily - 4) * 8))
    patience = min(100, max(0, int(60 - min(40, impatient_count * 6) + freq_score)))

    # EXECUTION: SL usage + win rate + no SL-move mistakes
    has_sl = sum(1 for t in trades if t.get("stop_loss") and t["stop_loss"] > 0) / total
    win_rate = sum(1 for t in trades if (t.get("pnl") or 0) > 0) / total
    sl_move_mistakes = sum(1 for t in trades if "Moved stop loss" in t.get("mistake_tags", []))
    execution = min(100, max(0, int(has_sl * 45 + win_rate * 45 + max(0, 10 - sl_move_mistakes * 5))))

    # EMOTIONAL CONTROL: positive vs negative emotion ratio + confidence consistency
    positive_tags = {"calm", "confident", "focused", "patient", "disciplined", "grateful"}
    negative_tags = {"fear", "fomo", "greed", "revenge", "anxiety", "frustration", "overconfident", "bored", "impulsive", "anger", "panic"}
    pos = neg = 0
    for t in trades:
        for phase in ["emotions_before", "emotions_during", "emotions_after"]:
            for e in t.get(phase, []):
                el = e.lower()
                if el in positive_tags:
                    pos += 1
                elif el in negative_tags:
                    neg += 1
    emotional_control = min(100, max(0, int(pos / (pos + neg) * 100))) if (pos + neg) > 0 else 50

    # RISK MANAGEMENT: position consistency + R:R + risk defined
    sizes = [t.get("position_size", 0) for t in trades if t.get("position_size", 0) > 0]
    if len(sizes) > 1:
        cv = statistics.stdev(sizes) / statistics.mean(sizes) if statistics.mean(sizes) > 0 else 1
        size_consistency = max(0, 35 - cv * 30)
    else:
        size_consistency = 20

    has_risk_defined = sum(1 for t in trades if t.get("risk") and t["risk"] > 0) / total
    rr_trades = good_rr = 0
    for t in trades:
        if t.get("entry_price") and t.get("stop_loss") and t.get("exit_price") and t["stop_loss"] != t["entry_price"]:
            risk = abs(t["entry_price"] - t["stop_loss"])
            reward = abs(t["exit_price"] - t["entry_price"])
            if risk > 0:
                rr_trades += 1
                if reward / risk >= 1.5:
                    good_rr += 1
    rr_score = (good_rr / rr_trades * 35) if rr_trades > 0 else 15
    risk_management = min(100, max(0, int(size_consistency + rr_score + has_risk_defined * 30)))

    # FOCUS/CONSISTENCY: regularity + journaling + self-reported focus
    if trade_days and len(trade_days) > 1:
        day_vals = list(trade_days.values())
        day_cv = statistics.stdev(day_vals) / statistics.mean(day_vals) if statistics.mean(day_vals) > 0 else 1
        regularity = max(0, 40 - day_cv * 25)
    else:
        regularity = 25

    has_journal = sum(1 for t in trades if (t.get("reasoning") or "").strip() or (t.get("notes") or "").strip() or (t.get("lesson_learned") or "").strip()) / total
    self_focus = [t.get("focus_score", 0) for t in trades if t.get("focus_score")]
    avg_self_focus = sum(self_focus) / len(self_focus) * 10 if self_focus else 0
    focus_consistency = min(100, max(0, int(regularity + has_journal * 40 + avg_self_focus * 0.2)))

    return {
        "discipline": discipline,
        "patience": patience,
        "execution": execution,
        "emotional_control": emotional_control,
        "risk_management": risk_management,
        "focus_consistency": focus_consistency,
    }


DNA_EXPLANATIONS = {
    "discipline": {
        "high": "You consistently follow your rules and trading plan. Keep it up.",
        "mid": "You sometimes deviate from your plan. Focus on sticking to your setups.",
        "low": "Frequent rule-breaking detected. Create a simple checklist before each trade.",
    },
    "patience": {
        "high": "You wait for quality setups and avoid impulsive entries.",
        "mid": "Some FOMO or revenge patterns detected. Slow down between trades.",
        "low": "Impatient entries are hurting you. Set a mandatory cooldown after losses.",
    },
    "execution": {
        "high": "Excellent trade execution with consistent stop-loss usage.",
        "mid": "Room to improve. Always set a stop loss before entering.",
        "low": "Poor execution is costing you. Focus on entries with defined risk.",
    },
    "emotional_control": {
        "high": "Strong emotional management. You trade with clarity.",
        "mid": "Mixed emotions affecting decisions. Journal your feelings consistently.",
        "low": "Emotions are driving your trades. Consider reducing size after losses.",
    },
    "risk_management": {
        "high": "Consistent position sizing and good risk/reward ratios.",
        "mid": "Inconsistent risk. Define your risk in dollars before every trade.",
        "low": "Risk management needs work. Never risk more than 1-2% per trade.",
    },
    "focus_consistency": {
        "high": "Regular trading routine with thorough journaling.",
        "mid": "Inconsistent journaling. The review process is where growth happens.",
        "low": "Sporadic trading and minimal reflection. Build a daily review habit.",
    },
}


def get_dna_explanation(attribute: str, score: int) -> str:
    texts = DNA_EXPLANATIONS.get(attribute, {})
    if score >= 70:
        return texts.get("high", "")
    elif score >= 40:
        return texts.get("mid", "")
    return texts.get("low", "")


@router.get("/dna")
async def get_dna(request: Request):
    user = await get_current_user(request)
    scores = await calculate_trader_dna(user["id"])

    explanations = {k: get_dna_explanation(k, v) for k, v in scores.items()}

    now = datetime.now(timezone.utc).isoformat()
    await db.trader_dna.update_one(
        {"user_id": user["id"]},
        {"$set": {**scores, "user_id": user["id"], "updated_at": now}},
        upsert=True
    )
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db.dna_history.update_one(
        {"user_id": user["id"], "date": today},
        {"$set": {**scores, "user_id": user["id"], "date": today}},
        upsert=True
    )

    return {"scores": scores, "explanations": explanations}


@router.get("/dna/history")
async def get_dna_history(request: Request, limit: int = 30):
    user = await get_current_user(request)
    history = await db.dna_history.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("date", -1).limit(limit).to_list(limit)
    return history
