from fastapi import APIRouter, Request, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import tempfile
import json
import uuid
import logging

from database import db
from auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/ai/transcribe")
async def transcribe_audio(request: Request, file: UploadFile = File(...)):
    await get_current_user(request)

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText

        stt = OpenAISpeechToText(api_key=api_key)

        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language="en",
                prompt="Trading journal entry. The speaker is logging a trade with entry price, exit price, stop loss, position size, symbol, direction long or short, and reasoning."
            )

        os.unlink(tmp_path)
        return {"text": response.text}

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


class ParseTradeRequest(BaseModel):
    text: str


def parse_json_response(text: str):
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]
    return json.loads(text.strip())


@router.post("/ai/parse-trade")
async def parse_trade_from_text(req: ParseTradeRequest, request: Request):
    await get_current_user(request)

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = LlmChat(
            api_key=api_key,
            session_id=f"parse-{uuid.uuid4().hex[:8]}",
            system_message="""You are a trade log parser. Extract structured trade data from voice transcript or text.
Return ONLY valid JSON:
{
    "symbol": "string (ES, NQ, EUR/USD, BTCUSDT etc)",
    "market_type": "futures|forex|crypto|custom",
    "direction": "long|short",
    "entry_price": number or null,
    "exit_price": number or null,
    "stop_loss": number or null,
    "take_profit": number or null,
    "position_size": number or null,
    "fees": 0,
    "reasoning": "trader reasoning/analysis",
    "setup_type": "breakout|pullback|trend_follow|scalp|range|reversal|mean_reversion|news",
    "emotions_before": [],
    "emotions_during": [],
    "emotions_after": [],
    "tags": [],
    "notes": "",
    "status": "open|closed",
    "entry_time": null,
    "exit_time": null
}
Valid emotions: calm, confident, focused, patient, disciplined, fear, fomo, greed, revenge, anxiety, frustration, overconfident, bored, impulsive, anger, grateful, excited, nervous
If a field cannot be determined, use null or empty array. Return ONLY JSON."""
        ).with_model("openai", "gpt-5.2")

        response = await chat.send_message(UserMessage(text=req.text))

        try:
            return parse_json_response(response)
        except json.JSONDecodeError:
            return {"raw_response": response, "error": "Could not parse structured data"}

    except Exception as e:
        logger.error(f"Parse trade error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse trade: {str(e)}")


class DNAExplanationRequest(BaseModel):
    scores: dict
    previous_scores: Optional[dict] = None


@router.post("/ai/dna-explanation")
async def explain_dna(req: DNAExplanationRequest, request: Request):
    user = await get_current_user(request)

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        trades = await db.trades.find(
            {"user_id": user["id"], "status": "closed"},
            {"_id": 0, "reasoning": 1, "emotions_before": 1, "emotions_during": 1,
             "emotions_after": 1, "rules_followed": 1, "rules_broken": 1,
             "pnl": 1, "setup_type": 1, "symbol": 1}
        ).sort("created_at", -1).limit(20).to_list(20)

        chat = LlmChat(
            api_key=api_key,
            session_id=f"dna-{uuid.uuid4().hex[:8]}",
            system_message="""You are a trading psychology coach analyzing a trader's DNA profile.
Return JSON:
{
    "overall_summary": "2-3 sentence overview",
    "strengths": ["2-3 strengths"],
    "improvements": ["2-3 areas to improve"],
    "tip": "one actionable tip for this week"
}
Be encouraging but honest. Use trading language. Keep concise."""
        ).with_model("openai", "gpt-5.2")

        prompt = f"""Trader DNA Scores: {json.dumps(req.scores)}
{"Previous: " + json.dumps(req.previous_scores) if req.previous_scores else "First analysis."}
Recent trades: {json.dumps(trades[:10])}"""

        response = await chat.send_message(UserMessage(text=prompt))

        try:
            return parse_json_response(response)
        except json.JSONDecodeError:
            return {"overall_summary": response, "strengths": [], "improvements": [], "tip": ""}

    except Exception as e:
        logger.error(f"DNA explanation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate explanation: {str(e)}")


@router.post("/ai/weekly-reflection")
async def generate_weekly_reflection(request: Request):
    user = await get_current_user(request)

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        trades = await db.trades.find(
            {"user_id": user["id"], "created_at": {"$gte": week_ago}}, {"_id": 0}
        ).to_list(1000)

        if not trades:
            return {
                "summary": "No trades logged this week. Review your trading plan and prepare for next week.",
                "highlights": [], "patterns": [],
                "emotional_trend": "No data",
                "recommendation": "Start logging trades to build your Trader DNA profile."
            }

        pnls = [t.get("pnl", 0) for t in trades]
        wins = len([p for p in pnls if p > 0])
        all_emotions = []
        for t in trades:
            for phase in ["emotions_before", "emotions_during", "emotions_after"]:
                all_emotions.extend(t.get(phase, []))

        chat = LlmChat(
            api_key=api_key,
            session_id=f"weekly-{uuid.uuid4().hex[:8]}",
            system_message="""You are an elite trading coach providing a weekly review.
Return JSON:
{
    "summary": "3-4 sentence weekly overview",
    "highlights": ["2-3 notable moments"],
    "patterns": ["2-3 behavioral patterns"],
    "emotional_trend": "description of emotional patterns",
    "recommendation": "key focus for next week"
}
Be specific and reference actual data."""
        ).with_model("openai", "gpt-5.2")

        prompt = f"""Weekly Data:
- Trades: {len(trades)}, Wins: {wins}, Losses: {len(trades) - wins}
- P&L: ${sum(pnls):.2f}, Win rate: {wins/len(trades)*100:.1f}%
- Emotions: {', '.join(set(all_emotions)) if all_emotions else 'none tagged'}
- Details: {json.dumps(trades[:15])}"""

        response = await chat.send_message(UserMessage(text=prompt))

        try:
            result = parse_json_response(response)
        except json.JSONDecodeError:
            result = {"summary": response, "highlights": [], "patterns": [], "emotional_trend": "", "recommendation": ""}

        reflection_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "week_start": week_ago,
            "week_end": datetime.now(timezone.utc).isoformat(),
            "trades_count": len(trades),
            "total_pnl": round(sum(pnls), 2),
            "win_rate": round(wins / len(trades) * 100, 1) if trades else 0,
            **result,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.weekly_reflections.insert_one(reflection_doc)
        reflection_doc.pop("_id", None)

        return reflection_doc

    except Exception as e:
        logger.error(f"Weekly reflection error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate reflection: {str(e)}")


@router.get("/ai/reflections")
async def get_reflections(request: Request, limit: int = 10):
    user = await get_current_user(request)
    reflections = await db.weekly_reflections.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return reflections
