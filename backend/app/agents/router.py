"""
Orbit Brain — Smart Model Router
Menentukan AI model terbaik berdasarkan analisis intent dari prompt user.
Menggunakan scoring multi-dimensi agar lebih akurat daripada keyword matching sederhana.
"""

from dataclasses import dataclass, field
from typing import Optional
import re


@dataclass
class RouterDecision:
    model: str
    reasoning: str
    confidence: float  # 0.0 – 1.0
    signals: list[str] = field(default_factory=list)


# ─────────────────────────────────────────────
# Konfigurasi profil setiap model
# ─────────────────────────────────────────────
MODEL_PROFILES = {
    "gpt": {
        "name": "Llama 3.1 8B (General)",
        "strengths": ["general", "chat", "summarize", "translate", "explain", "conversation"],
        "max_score": 10,
    },
    "claude": {
        "name": "Llama 3.1 8B",
        "strengths": ["creative drafting", "complex logic", "nuanced conversation"],
        "max_score": 10,
    },
    "vision": {
        "name": "Gemini 2.0 Flash Vision (Vision Specialist)",
        "strengths": ["vision", "image", "photo", "screenshot", "analyze image", "multimodal", "gambar", "foto"],
        "max_score": 10,
    },
    "coder": {
        "name": "Qwen 2.5 Coder (Coding Specialist)",
        "strengths": ["coding", "programming", "script", "function", "build", "develop", "implement", "web", "app", "kode", "debug"],
        "max_score": 10,
    },
    "reasoning": {
        "name": "DeepSeek R1 (Reasoning Specialist)",
        "strengths": ["long document", "pdf", "paper", "research", "analyze", "math", "reasoning", "proof", "calculation", "complex problem", "analisis"],
        "max_score": 10,
    },
    "turbo": {
        "name": "Gemini 2.0 Flash (Fast Response)",
        "strengths": ["greeting", "small talk", "fast", "short", "sapa"],
        "max_score": 10,
    }
}


# ─────────────────────────────────────────────
# Sinyal intent berbobot (semakin tinggi bobot = semakin kuat sinyalnya)
# ─────────────────────────────────────────────

# Coding intent
CODING_HIGH = [
    r"\bbuatkan?\s+(aplikasi|website|web|kode|code|program|script|api|class|function|komponen|component)\b",
    r"\b(implementasi|implement)\b",
    r"\b(html|css|javascript|typescript|python|react|nextjs|vue|node|django|flask|fastapi|golang|rust|java|kotlin|swift)\b",
]
CODING_MED = [
    r"\b(kode|coding|code|programming|algoritma|algorithm|fungsi|function|class|method)\b",
    r"\b(backend|frontend|database|api|endpoint|microservice)\b",
    r"\b(bug|error|exception|traceback|crash|fix|debug)\b",
]

# Debugging intent — khusus DeepSeek
DEBUG_HIGH = [
    r"\b(debug|refactor|optimize|review\s+kode|code\s+review|improve\s+performance|bottleneck)\b",
    r"\b(sql|query|database\s+schema|index|migration)\b",
    r"\b(regex|regular\s+expression|parsing|lexer|compiler)\b",
    r"\b(time\s+complexity|space\s+complexity|big\s+o)\b",
]
DEBUG_MED = [
    r"\b(architecture|design\s+pattern|solid|clean\s+code)\b",
    r"\b(kenapa\s+error|why\s+error|why\s+not\s+working|tidak\s+bisa|not\s+working)\b",
]

# Long/complex document or reasoning — khusus Kimi
REASONING_HIGH = [
    r"\b(buatkan\s+dokumen|buatkan\s+artikel|buatkan\s+paper|buatkan\s+jurnal)\b",
    r"\b(analisis\s+mendalam|deep\s+analysis|paper|research|jurnal|journal|tesis|thesis|riset)\b",
    r"\b(hitung|kalkulasi|matematika|persamaan\s+diferensial|integral|derivatif|calculus|statistics|probabilitas)\b",
    r"\b(proof|membuktikan|pembuktian|logika\s+formal|predicate\s+logic)\b",
    r"\b(filsafat\s+mendalam|ethics\s+analysis|komprehensif|comprehensive)\b",
]
REASONING_MED = [
    r"\b(mengapa|kenapa|sebab|alasan|reason|why|how\s+does)\b",
    r"\b(analisa|analisis|evaluate|evaluate|penilaian)\b",
    r"\b(dokumen\s+panjang|long\s+document|banyak\s+halaman)\b",
]

# Vision  (Llama)
VISION_HIGH = [
    r"\b(gambar|image|foto|photo|screenshot|tangkapan\s+layar|visual)\b",
    r"\b(describe\s+this\s+image|what\s+do\s+you\s+see|apa\s+yang\s+ada\s+di\s+gambar)\b",
]

# Greeting & Small Talk — force fast model
GREETING_TRIGGERS = [
    r"^(halo|hai|hi|hey|pagi|siang|sore|malam|apa kabar|p|hoy|bro|sis|oi|hallo)$",
    r"\b(halo|hai|pagi|siang|sore|malam|apa\s+kabar|how\s+are\s+you|siapa\s+kamu|who\s+are\s+you)\b",
    r"\b(terima\s+kasih|thanks|tq|makasih|oke|ok|sip|mantap)\b"
]


def _score_pattern(text: str, patterns: list[str], weight: float) -> tuple[float, list[str]]:
    """Returns (accumulated_score, matched_signals) for all matching patterns."""
    score = 0.0
    signals = []
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            score += weight
            signals.append(match.group(0).strip())
    return score, signals


def route(
    prompt: str,
    model_hint: str = "auto",
    has_images: bool = False,
    has_docs: bool = False
) -> RouterDecision:
    """
    Menganalisis prompt dan memilih model terbaik.
    
    Args:
        prompt: Teks prompt dari user
        model_hint: Model yang diminta user ('auto' = pakai router ini)
        has_images: True jika ada lampiran gambar
        has_docs: True jika ada lampiran dokumen

    Returns:
        RouterDecision dengan model terpilih, reasoning, dan confidence score.
    """
    # Jika user memilih model secara eksplisit (bukan 'auto'), langsung pakai
    if model_hint != "auto":
        return RouterDecision(
            model=model_hint,
            reasoning=f"User memilih profil AI '{model_hint}' secara eksplisit.",
            confidence=1.0,
            signals=["explicit-user-choice"]
        )

    # ── 1. GREETING & SMALL TALK (Fast Path) ───────────────────────────
    greeting_score, g_sig = _score_pattern(prompt, GREETING_TRIGGERS, 5.0)
    word_count = len(prompt.split())
    print(f"DEBUG: Router - Prompt: '{prompt[:30]}...' WordCount: {word_count} GScore: {greeting_score}")
    
    # Sangat pendek atau sapaan = Langsung Turbo (Instant Response)
    # Kata kunci pembuatan kode/aplikasi
    is_code_request = re.search(r"\b(kode|program|script|aplikasi|app|website|situs|koding|coding|buatkan\s+kode|tuliskan\s+kode)\b", prompt, re.IGNORECASE)
    is_creation_request = re.search(r"\b(buatkan|bikin|generate|tuliskan|create|build|rencanakan|strategi|bagaimana|jelaskan|analisis)\b", prompt, re.IGNORECASE)
    
    # Ambang batas diperketat: Jika kata > 2 atau ada request creation, hindari Turbo
    if (greeting_score > 4.5 or (word_count <= 2 and not has_images and not has_docs)) and not is_creation_request and not is_code_request:
        return RouterDecision(
            model="turbo",
            reasoning="Sapaan/percakapan sangat singkat terdeteksi. Menggunakan jalur Turbo.",
            confidence=1.0,
            signals=["fast-greeting-path"]
        )

    scores: dict[str, float] = {m: 0.0 for m in MODEL_PROFILES}
    all_signals: dict[str, list[str]] = {m: [] for m in MODEL_PROFILES}

    # ── 2. VISION & FILES ──────────────────────────────────────────────
    if has_images:
        scores["vision"] += 9.0
        all_signals["vision"].append("has-image-attachment")
        s, sig = _score_pattern(prompt, VISION_HIGH, 3.0)
        scores["vision"] += s
        all_signals["vision"].extend(sig)

    if has_docs:
        scores["reasoning"] += 6.0
        all_signals["reasoning"].append("has-document-attachment")

    # ── 3. INTENT SCORING ───────────────────────────────────────────────
    # Coding & Development (Qwen 2.5 Coder)
    code_s1, code_sig1 = _score_pattern(prompt, CODING_HIGH, 5.0)
    code_s2, code_sig2 = _score_pattern(prompt, CODING_MED, 2.0)
    scores["coder"] += code_s1 + code_s2
    all_signals["coder"].extend(code_sig1 + code_sig2)

    # Debugging & Architecture (Llama 405B / GPT Profil)
    debug_s1, debug_sig1 = _score_pattern(prompt, DEBUG_HIGH, 6.0)
    debug_s2, debug_sig2 = _score_pattern(prompt, DEBUG_MED, 3.0)
    scores["gpt"] += debug_s1 + debug_s2
    all_signals["gpt"].extend(debug_sig1 + debug_sig2)
    # Llama 405B menangani logika berat yang sebelumnya ada di DeepSeek

    # Reasoning, Math & Analysis (DeepSeek R1)
    reason_s1, reason_sig1 = _score_pattern(prompt, REASONING_HIGH, 5.0)
    reason_s2, reason_sig2 = _score_pattern(prompt, REASONING_MED, 2.0)
    scores["reasoning"] += reason_s1 + reason_s2
    all_signals["reasoning"].extend(reason_sig1 + reason_sig2)

    # ── 4. WINNER SELECTION ───────────────────────────────────────────
    best_model = max(scores, key=lambda m: scores[m])
    best_score = scores[best_model]

    # Baseline: Jika score model spesialis rendah, gunakan GPT
    if best_score < 3.0 and not has_images and not has_docs:
        return RouterDecision(
            model="gpt",
            reasoning="Pesan umum terdeteksi. Menggunakan model standar.",
            confidence=0.9,
            signals=["fallback-general"]
        )

    # Margin check: Jika terlalu ragu, pilih GPT
    sorted_scores = sorted(scores.values(), reverse=True)
    margin = sorted_scores[0] - sorted_scores[1] if len(sorted_scores) > 1 else sorted_scores[0]
    if margin < 1.0 and best_model != "gpt" and not has_images and not has_docs:
         best_model = "gpt"

    return RouterDecision(
        model=best_model,
        reasoning=f"Model '{MODEL_PROFILES[best_model]['name']}' dipilih berdasarkan intensitas '{all_signals[best_model][0] if all_signals[best_model] else 'context'}'",
        confidence=0.85,
        signals=all_signals[best_model][:4]
    )
