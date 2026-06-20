"""
Creator Engine v1 — Backend Python
Sert de proxy Claude API + traitement vidéo automatique.

Usage:
    pip install -r requirements.txt
    ANTHROPIC_API_KEY=sk-ant-... python server.py
"""

import os
import json
import subprocess
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic

app = Flask(__name__)
CORS(app)

DEFAULT_MODEL = "claude-opus-4-8"
WORK_DIR = Path(tempfile.gettempdir()) / "creator_engine"
WORK_DIR.mkdir(exist_ok=True)


def get_client(api_key: str | None = None):
    key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        return None
    return anthropic.Anthropic(api_key=key)


# ─── HEALTH ──────────────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": DEFAULT_MODEL})


# ─── SCRIPT GENERATOR ────────────────────────────────────────────
@app.route("/api/script", methods=["POST"])
def generate_script():
    data = request.json or {}
    topic = data.get("topic", "").strip()
    fmt = data.get("format", "storytelling")
    hook_type = data.get("hook_type", "curiosity")
    platform = data.get("platform", "tiktok")
    api_key = data.get("api_key", "")

    if not topic:
        return jsonify({"error": "topic requis"}), 400

    client = get_client(api_key)
    if not client:
        return jsonify({"error": "api_key manquante"}), 401

    format_desc = {
        "storytelling": "Storytelling personnel (before/after, révélation)",
        "mrbeast":      "MrBeast (big claim → escalation → payoff rapide)",
        "tutorial":     "Tutorial (3 étapes numérotées, concis)",
        "contrarian":   "Contrarian (démonte une idée reçue)",
        "drama":        "Drama (tension → révélation → call to emotion)",
    }.get(fmt, "Storytelling")

    hook_desc = {
        "curiosity":   "Curiosité (gap d'information, commence par une question ou une affirmation surprenante)",
        "fear":        "Peur/FOMO (erreur à éviter, conséquences négatives)",
        "proof":       "Preuve sociale (résultat concret, chiffres)",
        "contrarian":  "Contrarian (contre-pied d'une idée commune)",
        "story":       "Story (accroche narrative personnelle)",
        "shock":       "Choc (surprise, révélation inattendue)",
    }.get(hook_type, "Curiosité")

    platform_note = {
        "tiktok":  "TikTok (max 60s, ton jeune et direct, emojis acceptés)",
        "shorts":  "YouTube Shorts (max 60s, structure claire)",
        "reels":   "Instagram Reels (max 90s, ton lifestyle)",
    }.get(platform, "TikTok")

    prompt = f"""Tu es un expert en contenu viral TikTok/Short. Génère un script complet en FRANÇAIS pour :

Sujet : {topic}
Format : {format_desc}
Hook : {hook_desc}
Plateforme : {platform_note}

Retourne EXACTEMENT ce JSON (sans markdown, sans explication) :
{{
  "hook": "le hook de 0 à 3 secondes (max 80 caractères, percutant)",
  "body": "le script complet (3-8 phrases, structure {fmt}, naturel à l'oral)",
  "cta": "le call-to-action final (1 phrase, action précise)",
  "niche": "la niche détectée (fitness/finance/business/motivation/tech)"
}}

Règles :
- Hook : curiosité ou peur ou chiffre ou mot choc
- Body : phrases courtes, rythme oral, emojis modérés
- CTA : demande une action précise (commenter un mot-clé, sauvegarder, tagguer)
- Ton authentique, pas corporate"""

    try:
        msg = client.messages.create(
            model=DEFAULT_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        # Clean potential markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
        # Compute score using simple heuristics (replicated from frontend)
        result["score"] = _score(result.get("hook",""), result.get("body",""), result.get("cta",""))
        return jsonify(result)
    except json.JSONDecodeError:
        return jsonify({"error": "Réponse Claude non parseable"}), 500
    except anthropic.AuthenticationError:
        return jsonify({"error": "API key invalide"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── IDEAS GENERATOR ─────────────────────────────────────────────
@app.route("/api/ideas", methods=["POST"])
def generate_ideas():
    data = request.json or {}
    topic = data.get("topic", "").strip()
    style = data.get("style", "mixed")
    api_key = data.get("api_key", "")

    if not topic:
        return jsonify({"error": "topic requis"}), 400

    client = get_client(api_key)
    if not client:
        return jsonify({"error": "api_key manquante"}), 401

    style_desc = {
        "mixed":    "variés (curiosité, chiffres, story, contrarian)",
        "numbers":  "basés sur des chiffres (3 erreurs, 5 méthodes, 7 astuces…)",
        "curiosity":"axés curiosité (secrets, vérités cachées, paradoxes…)",
        "story":    "narratifs (j'ai…, comment j'ai…, ce jour où…)",
    }.get(style, "variés")

    prompt = f"""Tu es expert en viral content pour TikTok/Shorts. Génère 12 titres/hooks viraux en FRANÇAIS pour le sujet : {topic}

Style : {style_desc}

Retourne EXACTEMENT ce JSON :
{{"ideas": ["titre 1", "titre 2", ..., "titre 12"]}}

Règles :
- Chaque titre = 1 ligne, max 80 caractères
- Optimisé pour le clic et la curiosité
- Mélange chiffres / émotions / contre-pied
- Langue naturelle parlée (pas corporate)
- Pas de hashtags, pas de points de suspension à l'excès"""

    try:
        msg = client.messages.create(
            model=DEFAULT_MODEL,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── VIRAL SCORER ────────────────────────────────────────────────
@app.route("/api/score", methods=["POST"])
def score_script():
    data = request.json or {}
    hook = data.get("hook", "")
    body = data.get("body", "")
    cta = data.get("cta", "")
    api_key = data.get("api_key", "")

    client = get_client(api_key)
    if not client:
        # Fallback to rule-based scoring
        return jsonify(_score(hook, body, cta))

    prompt = f"""Tu es expert en viral content TikTok. Analyse ce script et retourne un score viral détaillé.

HOOK : {hook}
SCRIPT : {body}
CTA : {cta}

Retourne EXACTEMENT ce JSON :
{{
  "total": <0-100>,
  "breakdown": {{
    "hook": <0-30>,
    "emotion": <0-25>,
    "structure": <0-25>,
    "cta": <0-20>
  }},
  "label": "🔥 Viral | ✅ Solide | ⚠️ Moyen | ❌ Faible",
  "suggestions": ["amélioration 1", "amélioration 2"]
}}

Critères d'évaluation :
- hook (0-30): force du hook en 3 secondes, mots-clés d'impact, longueur idéale
- emotion (0-25): déclencheur émotionnel (peur, FOMO, curiosité, désir)
- structure (0-25): clarté, rythme, storytelling, lisibilité à l'oral
- cta (0-20): action précise, incentive, potentiel de commentaires/partages"""

    try:
        msg = client.messages.create(
            model=DEFAULT_MODEL,
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return jsonify(json.loads(raw))
    except Exception:
        return jsonify(_score(hook, body, cta))


# ─── VIDEO CUTTER ────────────────────────────────────────────────
@app.route("/api/video", methods=["POST"])
def auto_cut_video():
    data = request.json or {}
    url = data.get("url", "").strip()
    api_key = data.get("api_key", "")

    if not url:
        return jsonify({"error": "url requise"}), 400

    # Download with yt-dlp
    output_path = str(WORK_DIR / "source.%(ext)s")
    try:
        subprocess.run(
            ["yt-dlp", "-f", "best[height<=1080]", "-o", output_path, "--no-playlist", url],
            check=True, capture_output=True, timeout=300,
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        return jsonify({"error": f"yt-dlp failed: {e}"}), 500
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timeout téléchargement"}), 500

    video_files = list(WORK_DIR.glob("source.*"))
    if not video_files:
        return jsonify({"error": "Fichier vidéo non trouvé après téléchargement"}), 500
    video_path = video_files[0]

    # Get duration
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(video_path)],
            capture_output=True, text=True, check=True
        )
        info = json.loads(result.stdout)
        duration = float(info["format"]["duration"])
    except Exception:
        duration = 600.0

    # Use Claude to find best segments if api_key available
    client = get_client(api_key)
    if client:
        prompt = f"""Une vidéo YouTube de {duration:.0f} secondes. Identifie les 5 meilleurs segments à extraire comme TikTok/Short viral.

Retourne EXACTEMENT ce JSON :
{{
  "segments": [
    {{"start": 0, "end": 45, "title": "Hook principal", "score": 88}},
    ...
  ]
}}

Règles :
- Chaque segment = 15 à 60 secondes
- Commence par le segment le plus fort (hook)
- start et end en secondes entières
- Ne dépasse pas {duration:.0f}s"""
        try:
            msg = client.messages.create(
                model=DEFAULT_MODEL,
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = msg.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            seg_data = json.loads(raw)
        except Exception:
            seg_data = _default_segments(duration)
    else:
        seg_data = _default_segments(duration)

    # Generate ffmpeg commands
    segments = seg_data.get("segments", [])
    commands = []
    for i, seg in enumerate(segments):
        s, e = int(seg["start"]), int(seg["end"])
        t = e - s
        out = str(WORK_DIR / f"short_{i+1}.mp4")
        cmd = (
            f'ffmpeg -i "{video_path}" -ss {s} -t {t} '
            f'-vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:-1:-1:color=black" '
            f'-c:v libx264 -crf 23 -c:a aac -movflags +faststart "{out}"'
        )
        commands.append(cmd)
        seg["output"] = out
        seg["ffmpeg"] = cmd

    return jsonify({
        "segments": segments,
        "commands": commands,
        "source": str(video_path),
        "duration": duration,
    })


# ─── HELPERS ─────────────────────────────────────────────────────
def _score(hook: str, body: str, cta: str) -> dict:
    power_words = ['secret','personne','jamais','arrête','stop','attention','erreur','faux','gratuit','rapide','caché','choc','incroyable','urgent','maintenant','unique','prouvé']
    hook_score = sum(3 for w in power_words if w in hook.lower())
    if any(c.isdigit() for c in hook): hook_score += 5
    if '…' in hook or '...' in hook: hook_score += 5
    if 20 <= len(hook) <= 80: hook_score += 5
    hook_score = min(30, hook_score)

    emo_words = ['peur','choc','secret','fou','impossible','perdu','gagné','transformé','changé','révèle','prouvé']
    emo_score = 4 + sum(2 for w in emo_words if w in (hook+body).lower())
    emo_score = min(25, emo_score)

    str_score = 5
    if any(x in body for x in ['①','②','Étape','1.','2.','•']): str_score += 10
    wc = len(body.split())
    if 30 <= wc <= 120: str_score += 8
    if "j'ai" in body.lower() or "mon " in body.lower(): str_score += 4
    str_score = min(25, str_score)

    cta_score = 0
    if 'commente' in cta.lower(): cta_score += 8
    if any(w in cta.lower() for w in ['suis','abonne','follow']): cta_score += 6
    if 'sauvegarde' in cta.lower(): cta_score += 6
    if any(w in cta.lower() for w in ['partage','tag']): cta_score += 5
    if any(w in cta.lower() for w in ['gratuit','plan','guide']): cta_score += 5
    cta_score = min(20, cta_score)

    total = min(100, hook_score + emo_score + str_score + cta_score)
    label = '🔥 Viral' if total >= 80 else '✅ Solide' if total >= 65 else '⚠️ Moyen' if total >= 45 else '❌ Faible'

    suggestions = []
    if hook_score < 20: suggestions.append('Ajoute un chiffre ou mot-choc dans le hook')
    if emo_score < 15: suggestions.append('Utilise un mot émotionnel fort')
    if str_score < 15: suggestions.append('Structure en 3 étapes numérotées')
    if cta_score < 10: suggestions.append('Demande de commenter avec un mot-clé')

    return {
        "total": total,
        "breakdown": {"hook": hook_score, "emotion": emo_score, "structure": str_score, "cta": cta_score},
        "label": label,
        "suggestions": suggestions,
    }


def _default_segments(duration: float) -> dict:
    step = max(30, duration / 6)
    segs = []
    t = 0.0
    while t + 30 < duration and len(segs) < 5:
        end = min(t + 45, duration)
        segs.append({"start": int(t), "end": int(end), "title": f"Segment {len(segs)+1}", "score": 70})
        t += step
    return {"segments": segs}


if __name__ == "__main__":
    print("Creator Engine v1 — Backend")
    print(f"Work dir : {WORK_DIR}")
    print("Démarrage sur http://localhost:5050")
    app.run(host="0.0.0.0", port=5050, debug=False)
