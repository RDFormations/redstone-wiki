# F07 — Mode « Formation »

Le LMS RedStone tourne en instance dédiée formation :

| Élément | Comportement |
|---------|--------------|
| Accueil admin | Volet **Sessions** (F13) — liste, filtres, distribute |
| Hubs | `/formations/{slug}/stagiaire` · `/formateur` · `/edit/{module}` |
| Édition wiki générique | Déconseillée hors contexte session — éditeur C12/C13 |

Variable optionnelle :

```bash
REDSTONE_SITE_MODE=formation
```

Documente l’intention produit ; le runtime privilégie déjà F13 + hubs formation.
