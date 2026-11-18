"""Ranger chaque reel dans les 10 THÈMES choisis par le groupe, à partir du fichier source de Gemma.
Python de base uniquement (rien à installer).

Fichiers nécessaires dans le même dossier :
  themes_libres.csv          sortie de Gemma (sujet, thème principal, autres thèmes de chaque vidéo)
  transcriptions_base.csv    transcriptions (pour repérer l'humour graveleux)
  regrouper_themes.py        la grille qui range les libellés de Gemma en 26 sous-thèmes (+ 63 corrections)
Usage :
  python ranger_10_themes.py
Les reels sans parole (reels musicaux, moins de 15 mots) sont exclus : leur sujet ne peut pas être lu.
Sortie :
  reels_10_themes.csv  une ligne par reel avec parole : thème principal, sous-thème détaillé, et un oui par thème abordé
"""
import csv, re, sys
from collections import Counter
import regrouper_themes as rg
csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

# Les 10 thèmes : chacun regroupe des sous-thèmes de regrouper_themes.py (aucun sous-thème n'est dans deux thèmes)
THEMES = {
    "Vie familiale": ["Humour parental et enfants", "Couple, amour et mariage", "Grossesse et maternité",
                      "Séparation et famille recomposée", "Charge mentale et épuisement", "Éducation des enfants",
                      "Concilier famille et entreprise"],
    "Anecdotes et relation client": ["Anecdotes et relation client", "Co-création et ambassadrices",
                                     "Logistique et expédition"],
    "Humour de situation et absurde": ["Humour de situation et absurde", "Animaux"],
    "Vie d'entrepreneur": ["Hauts et bas de l'entrepreneuriat", "Réussites et records"],
    "Réseaux sociaux et communauté": ["Visibilité, réseaux et image de marque", "Concours et engagement de la communauté",
                                      "Critiques et cyberharcèlement", "Concurrence et plagiat"],
    "Création et coulisses de l'atelier": ["Création et coulisses de l'atelier"],
    "Présentation des produits": ["Présentation des produits"],
    "Prix juste et valeur du travail": ["Prix juste et valeur du travail", "Réglementation et administratif"],
    "Valeurs et société": ["Développement personnel", "Société, amitiés et actualité", "Ambiances et poésie"],
    "Lancements et fêtes": ["Lancements et collections", "Fêtes et saisons"],
}
THEME_DE = {s: t for t, liste in THEMES.items() for s in liste}
GRAVELEUX = re.compile(r"\bcaca|\bpipi|crotte|prout|\bzizi|vulve|\bpéter\b|toilettes")

def lire(chemin):
    with open(chemin, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))

# contrôle : chaque sous-thème de la grille appartient à exactement un des 10 thèmes
manquants = [so for _, so, _ in rg.GRILLE if so not in THEME_DE]
assert not manquants, f"Sous-thèmes sans thème : {manquants}"

textes = {r["fichier"]: r["texte"].lower() for r in lire("transcriptions_base.csv")}
lignes, sans_parole = [], 0
for r in lire("themes_libres.csv"):
    tp = (r["theme_principal"] or "").strip()
    base = {"date": f"{r['fichier'][6:8]}/{r['fichier'][4:6]}/{r['fichier'][:4]}", "fichier": r["fichier"],
            "lien": r["lien"], "sujet_gemma": r.get("sujet", "")}
    if not tp or tp == "sans parole":
        sans_parole += 1                                                # reel musical : sujet illisible, exclu
        continue
    _, sous = rg.classer(tp)
    cle = next((k for k in rg.CORRECTIONS if r["fichier"].startswith(k)), None)
    if cle: sous = rg.CORRECTIONS[cle]                                  # correction documentée
    abordes = {sous} | {rg.classer(x.strip())[1] for x in (r["autres_themes"] or "").split("|") if x.strip()}
    themes_abordes = {THEME_DE[s] for s in abordes}
    lignes.append({**base, "theme_principal": THEME_DE[sous], "sous_theme": sous,
                   **{t: "oui" if t in themes_abordes else "" for t in THEMES},
                   "humour_graveleux": "oui" if GRAVELEUX.search(textes.get(r["fichier"], "")) else "",
                   "corrige_a_la_main": "oui" if cle else ""})

lignes.sort(key=lambda l: l["fichier"])
with open("reels_10_themes.csv", "w", encoding="utf-8-sig", newline="") as f:      # utf-8-sig : accents OK dans Excel
    w = csv.DictWriter(f, fieldnames=list(lignes[0]), delimiter=";"); w.writeheader(); w.writerows(lignes)

principal = Counter(l["theme_principal"] for l in lignes)
print(f"{len(lignes)} reels avec parole rangés -> reels_10_themes.csv ({sans_parole} reels sans parole exclus)\n")
print(f"{'Thème':38s} {'principal':>9s} {'abordé':>7s}")
for t in THEMES:
    aborde = sum(l.get(t) == "oui" for l in lignes)
    print(f"{t:38s} {principal[t]:9d} {aborde:7d}")
print(f"\nHumour graveleux (repéré dans la transcription) : {sum(l['humour_graveleux'] == 'oui' for l in lignes)} reels")
