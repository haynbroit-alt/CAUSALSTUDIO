#!/usr/bin/env bash
# Creator Engine v1 — lancement en une commande

set -e
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "→ Création de l'environnement Python…"
  python3 -m venv .venv
fi

source .venv/bin/activate
echo "→ Installation des dépendances…"
pip install -q -r requirements.txt

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "⚠  ANTHROPIC_API_KEY non défini — tu peux aussi le saisir dans l'interface."
  echo "   Pour l'activer : export ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
fi

echo "→ Démarrage du serveur sur http://localhost:5050"
echo "→ Ouvre creator-engine/index.html dans ton navigateur"
echo ""
python server.py
