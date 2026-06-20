# CAUSALSTUDIO

Deux produits indépendants, prêts à utiliser.

---

## 🎥 Creator Engine v1

> Machine à contenu viral : scripts TikTok, idées virales, scoring, découpe vidéo.

**Lancer sans backend (mode templates) :**
```
Ouvre creator-engine/index.html dans un navigateur
```

**Lancer avec Claude AI :**
```bash
cd creator-engine
export ANTHROPIC_API_KEY=sk-ant-...
bash start.sh
# puis ouvre creator-engine/index.html
```

**3 outils en un :**

| Outil | Ce que ça fait |
|---|---|
| 🎬 Script | Hook + corps + CTA prêt à poster |
| 🔥 Idées Virales | 12 angles optimisés par sujet |
| 📊 Viral Score | Score 0–100 avec recommandations |
| ✂️ Video Cutter | FFmpeg commands + auto-découpe YouTube |

**Fichiers :**
```
creator-engine/
├── index.html       interface SaaS complète (ouvrir directement)
├── server.py        backend Python (Claude API + video)
├── requirements.txt dépendances Python
└── start.sh         lancement en une commande
```

---

## 🧱 CausalStudio v1

> Moteur de simulation 2D : texte → objets avec comportements persistants.

**Lancer :**
```
Ouvre index.html dans un navigateur
```

**Commandes :**

| Commande | Effet |
|---|---|
| `un cercle rouge` | crée un objet |
| `le carré suit le cercle` | comportement seek |
| `le cercle fuit le triangle` | comportement flee |
| `le triangle tourne autour du cercle` | orbit |
| `ajoute un obstacle` | bloc statique |
| `efface tout` / `pause` / `accélère` | contrôle monde |

**Fichiers :**
```
parser.js    texte → intention
state.js     mémoire persistante
engine.js    physique temps réel
index.html   canvas + UI + renderer
```
