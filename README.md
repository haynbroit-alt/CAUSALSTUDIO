# CausalStudio v1

Un moteur interactif autonome qui transforme du texte en simulation 2D persistante.

## Lancer

Ouvrir `index.html` dans un navigateur (ou servir localement) :

```bash
npx serve .
# ou
python3 -m http.server 8080
```

## Architecture

```
CAUSALSTUDIO v1
│
├── parser.js      texte → intention (règles)
├── state.js       mémoire objets persistants
├── engine.js      simulation physique
└── index.html     interface + canvas + renderer
```

## Boucle

```
INPUT TEXTE → PARSER → UPDATE STATE → ENGINE STEP → RENDER → AFFICHAGE MÉMOIRE
```

## Commandes

| Commande | Effet |
|---|---|
| `un cercle rouge` | crée un cercle rouge |
| `un carré bleu` | crée un carré bleu |
| `le carré rouge suit le cercle bleu` | comportement seek |
| `le cercle fuit le carré` | comportement flee |
| `le triangle tourne autour du cercle` | comportement orbit |
| `ajoute un obstacle` | ajoute un bloc statique |
| `efface tout` | réinitialise le monde |
| `pause` / `reprends` | contrôle temporel |
| `accélère` / `ralentis` | ajuste la vitesse |

## Comportements

- **wander** — mouvement libre (défaut)
- **seek** — suit un objet cible
- **flee** — fuit un objet cible
- **orbit** — tourne autour d'un objet cible

## Identité objet

Chaque objet possède : `id unique` + `shape` + `color` + `behavior` + `targetId`

La mémoire est persistante — pas de reset sauf commande explicite.
