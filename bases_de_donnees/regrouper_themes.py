"""Regrouper les thèmes écrits librement par Gemma (themes_libres.csv) en SOUS-THÈMES puis en GRANDES FAMILLES.

Pourquoi des règles plutôt qu'un algorithme : Gemma a écrit 319 libellés principaux différents pour 365 vidéos.
La grille ci-dessous a été construite EN LISANT CES LIBELLÉS (elle n'existait pas avant) : chaque sous-thème
rassemble des libellés qui disent la même chose avec d'autres mots. Les règles sont lues dans l'ordre :
la première qui reconnaît le libellé l'emporte (le sujet précis passe avant le ton : « humour sur les prix » -> prix).
Tout est vérifiable : affectations.csv donne, pour chaque libellé, le sous-thème choisi.

Python de base uniquement (aucune bibliothèque à installer).
Usage : python regrouper_themes.py themes_libres.csv
Sorties :
  videos_themes.csv   une ligne par vidéo : sous-thème et famille du thème principal + tous les sous-thèmes abordés
  sous_themes.csv     un sous-thème par ligne : famille, nb de vidéos (thème principal / abordé), libellés regroupés
  affectations.csv    chaque libellé écrit par Gemma -> sous-thème retenu (pour contrôler la grille)
"""
import csv, re, sys
from collections import Counter, defaultdict

# (famille, sous-thème, motif) — ordre = priorité
GRILLE = [
    # --- Famille et vie intime
    ("Famille et vie intime", "Séparation et famille recomposée", r"rupture|divorce|séparation|recompos|pension alimentaire|paternité de cœur|famille de cœur"),
    ("Vie d'entrepreneuse", "Concilier famille et entreprise", r"entrepreneuriat en couple|équilibre vie|vie pro|conjoint|travail à domicile|droit au repos|maman entrepreneuse|maternité et entrepreneuriat|entrepreneuriat et culpabilité|succès entrepreneurial et maternité|famille et entreprise"),
    ("Famille et vie intime", "Grossesse et maternité", r"nourrisson|grossesse|accouchement|post-partum|maternité|bébé|naissance"),
    ("Famille et vie intime", "Couple, amour et mariage", r"couple|amour|amoureu|mariage|saint-valentin|romantique"),
    ("Famille et vie intime", "Charge mentale et épuisement", r"fatigue|tâches ménagères|santé mentale|gestion du temps|charge mentale|épuisement|surcharge|stress|isolement personnel"),
    ("Famille et vie intime", "Éducation des enfants", r"éducation|politesse"),
    ("Famille et vie intime", "Humour parental et enfants", r"familia|fratrie|scolaire|argent de poche|hyperactivité|fête des pères|parent|enfant|ado|maman|mère|fille|famille|grand-mère|parenting"),
    ("Humour et quotidien", "Animaux", r"animal|animaux|animalier|moustique"),
    # --- Métier d'artisane
    ("Métier d'artisane", "Prix juste et valeur du travail", r"inflation|tarif|coûts|valeur perçue|précarité financière|grandes et petites|grande distribution|prix|coût de revient|rentabilité|valoris|production industrielle|défense de l'entrepreneuriat|savoir-faire|pourboire|accessibilité"),
    ("Métier d'artisane", "Réglementation et administratif", r"normes|paperasse|réglementation|conformité|administrati|tpe"),
    ("Métier d'artisane", "Logistique et expédition", r"livraison|commande|stock|production|planification|logistique|expédition|transport|colis|emballage|postaux|délais"),
    ("Réseaux sociaux et communauté", "Concurrence et plagiat", r"plagiat|concurrence"),
    ("Réseaux sociaux et communauté", "Critiques et cyberharcèlement", r"harcèlement|troll|commentaire|e-réputation|cyberharcèlement|critique|commentaires négatifs|polémique"),
    # --- Clientes
    ("Clientes", "Co-création et ambassadrices", r"collaboration|co-création|collaboratif|ambassad|fidélité|portrait de cliente"),
    ("Clientes", "Anecdotes et relation client", r"client|sav|fraude|triche|paiement|demande artisanale|litige"),
    # --- Métier (suite)
    ("Réseaux sociaux et communauté", "Concours et engagement de la communauté", r"concours|interaction|engagement|communauté|audience|faq"),
    ("Métier d'artisane", "Lancements et collections", r"teasing|édition limitée|nouveau produit|annonce de retour|saisonnalité|lancement|collection|nouveaux produits"),
    ("Métier d'artisane", "Création et coulisses de l'atelier", r"artisanat|atelier|design|esthétique|fragrance|olfacti|bougie|parfum|qualité|composition|développement de produits|rechargeable|transparence|brainstorming|créatrice|identité créatrice|création|conception|coulisses|fabrication|processus|perfection|évolution|amélioration|test de parfums|exigence|inspiration|créativ"),
    ("Métier d'artisane", "Présentation des produits", r"produit|promotion|offre|cadeau|conseils|comparaison|vente en direct|kit|durable|présentation|déballage|personnalisation|partage de produits|décoration|sécurité|éco-responsable|test de produits|promotion de produits|vente de produits|invendus|formation"),
    # --- Réseaux sociaux
    ("Réseaux sociaux et communauté", "Visibilité, réseaux et image de marque", r"storytelling|marque|stratégie|identité|validation sociale|bienveillance sur les réseaux|visibilité|algorithme|croissance|réseaux sociaux|instagram|marketing|publicité|branding|identité visuelle|personal|éthique"),
    # --- Vie d'entrepreneuse
    ("Vie d'entrepreneuse", "Réussites et records", r"success story|réalisation de projets|réussite|succès|record|analyse des ventes|remerciement|fierté"),
    ("Vie d'entrepreneuse", "Hauts et bas de l'entrepreneuriat", r"passion|vente aux|vie d'entrepreneu|vie d'artisan|vie de créatrice|carrière|reconversion|pression commerciale|gestion de projet|imprévus|limites professionnelles|ponctualité|business|analyse|bilan|financement|commerce|motivation et dépassement|soutien aux créateurs|équipe|relations professionnelles|travail|difficult|résilience|échec|persévérance|montagnes russes|réalité|charge de travail|frustration|imposteur|perfectionnisme|complexe|anxiété|entrepreneuri|ambition|gestion d'entreprise|stratégie commerciale|e-commerce|boutique|travail nocturne|bureau|entraide"),
    # --- Valeurs, émotions, société
    ("Saisons, fêtes et ambiances", "Fêtes et saisons", r"anniversaire|fête|printemps|célébration|noël|pâques|nouvelle année|vœux|cocooning|automn|hivern"),
    ("Saisons, fêtes et ambiances", "Ambiances et poésie", r"atmosphère|nature et lumière|symbolisme|poésie|ambiance|onirique|mystère"),
    ("Valeurs et société", "Développement personnel", r"liberté|positivité|empowerment|force intérieure|zone de confort|schémas|moment pour soi|peur|lâcher-prise|épanouissement|bienveillance|perspective|réflexion|valeurs|motivation|communication assertive|confiance|développement personnel|philosophie|bien-être|self-care|gratitude|énergie|affirmation|authenticité|réalisation de soi|audace|personnalit"),
    ("Valeurs et société", "Société, amitiés et actualité", r"affection|complicité|féminisme|égalité|injustice|religieuse|culture|références culturelles|relation|amical|soutien|dilemme|responsabilité|générationnel|beauté|célébrités|sociale|organisation de sorties|trahison|tri relationnel|actualité|critique sociale|discrimination|arnaque|employeur|toxique|amitié|faux amis|genre|psychologie|engagement social|émotion"),
    ("Humour et quotidien", "Humour de situation et absurde", r"dialogue|parodie|ironie|décalé|réaction spontanée|vidéo|scène|vie quotidienne|quotidien|problème technique|vie de van|destin|aménagement|chantier|danse|mode décontractée|repas|café|souvenirs|histoire personnelle|témoignage|art de vivre|autodérision|humour|anecdote|voyage|voisin|maison|nettoyage|rénovation|cuisine|vacances|odeur|maladie|nostalgie|couleurs|sketch|absurde|sarcasme|métaphore"),
]
SANS_PAROLE = ("Sans parole", "Sans parole (reel musical)")

# CORRECTIONS APRÈS RELECTURE DU SUJET DE CHAQUE VIDÉO (revue.txt) : le libellé de Gemma trompait la règle.
# Clé = début du nom de fichier (date_ ou date_identifiant si plusieurs reels le même jour) ; valeur = sous-thème retenu.
CORRECTIONS = {
    "20260917_": "Réussites et records",            # produit risqué devenu un succès
    "20260914_": "Lancements et collections",      # réassort annoncé
    "20260727_": "Hauts et bas de l'entrepreneuriat",  # collection invendue
    "20250722_": "Prix juste et valeur du travail",    # bilan de l'option pourboire
    "20250204_": "Présentation des produits",      # avis client sur un produit rechargeable
    "20260731_DbdFC8msvVB": "Présentation des produits",      # bougie anti-moustiques
    "20250525_": "Présentation des produits",      # bougie anti-moustiques
    "20260304_": "Hauts et bas de l'entrepreneuriat",
    "20260114_": "Couple, amour et mariage",
    "20250121_": "Hauts et bas de l'entrepreneuriat",
    "20250812_": "Visibilité, réseaux et image de marque",  # défi 25 000 abonnés
    "20250404_": "Anecdotes et relation client",   # questions absurdes des clients
    "20260909_DdEvkCts3_C": "Humour parental et enfants",
    "20260324_": "Présentation des produits",      # bougies personnalisées de mariage
    "20250522_": "Présentation des produits",
    "20250209_": "Présentation des produits",      # bougie avec bague de fiançailles
    "20250123_": "Présentation des produits",      # bougies zizi de la Saint-Valentin
    "20260813_": "Société, amitiés et actualité",
    "20260406_": "Co-création et ambassadrices",
    "20260525_": "Co-création et ambassadrices",
    "20250920_": "Lancements et collections",
    "20250412_": "Lancements et collections",
    "20250511_": "Humour de situation et absurde",
    "20250411_": "Concilier famille et entreprise",  # le compagnon fait les étiquettes
    "20260611_": "Humour de situation et absurde",
    "20260220_": "Visibilité, réseaux et image de marque",
    "20250504_": "Visibilité, réseaux et image de marque",  # nouvelle ligne éditoriale
    "20260814_": "Ambiances et poésie",
    "20251123_": "Logistique et expédition",       # fermeture du site pour les commandes de Noël
    "20251212_": "Charge mentale et épuisement",
    "20250730_": "Concilier famille et entreprise",
    "20250527_": "Humour parental et enfants",
    "20250426_": "Lancements et collections",      # collection fête des mères
    "20260210_": "Prix juste et valeur du travail",  # sous-estimer la valeur de son métier
    "20250801_DM0GpwFqqtT": "Logistique et expédition",
    "20250604_": "Société, amitiés et actualité",
    "20250105_": "Anecdotes et relation client",
    "20260925_": "Création et coulisses de l'atelier",
    "20260902_": "Anecdotes et relation client",
    "20260606_": "Création et coulisses de l'atelier",
    "20251209_": "Présentation des produits",
    "20250708_": "Visibilité, réseaux et image de marque",
    "20250409_": "Présentation des produits",      # parodie publicitaire d'une bougie
    "20250116_": "Anecdotes et relation client",
    "20260810_": "Concilier famille et entreprise",
    "20260228_": "Anecdotes et relation client",
    "20251226_": "Humour de situation et absurde",  # vol de courrier personnel, pas d'expédition
    "20261005_": "Hauts et bas de l'entrepreneuriat",
    "20260315_": "Hauts et bas de l'entrepreneuriat",
    "20250829_": "Visibilité, réseaux et image de marque",
    "20250724_": "Réussites et records",
    "20250627_": "Lancements et collections",
    "20250601_": "Humour de situation et absurde",  # chocolat de Dubaï, pas son produit
    "20250329_": "Création et coulisses de l'atelier",
    "20260726_": "Développement personnel",
    "20250131_": "Visibilité, réseaux et image de marque",
    "20250608_": "Anecdotes et relation client",   # commande pour un hommage funéraire
    "20250408_": "Anecdotes et relation client",
    "20250306_": "Anecdotes et relation client",
    "20260915_": "Co-création et ambassadrices",   # arrêt du programme d'ambassadrices
    "20260412_": "Société, amitiés et actualité",
    "20250224_": "Création et coulisses de l'atelier",
    "20250403_": "Présentation des produits",
}


def classer(libelle):
    l = libelle.lower()
    for famille, sous, motif in GRILLE:
        if re.search(motif, l):
            return famille, sous
    return "Non classé", "Non classé"

if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8-sig", newline="") as f:
        lignes = list(csv.DictReader(f, delimiter=";"))
    videos, aff = [], {}
    for r in lignes:
        tp = (r["theme_principal"] or "").strip()
        autres = [x.strip() for x in (r.get("autres_themes") or "").split("|") if x.strip()]
        if tp == "sans parole" or not tp:
            fam, sous = SANS_PAROLE; tous = [sous]
        else:
            fam, sous = classer(tp); aff[tp] = (fam, sous)
            cle = next((k for k in CORRECTIONS if r["fichier"].startswith(k)), None)
            if cle:                                      # correction manuelle documentée
                sous = CORRECTIONS[cle]; fam = {so: fa for fa, so, _ in GRILLE}[sous]
            tous = [sous]
            for x in autres:
                aff[x] = classer(x)
                if aff[x][1] not in tous: tous.append(aff[x][1])
        videos.append(dict(fichier=r["fichier"], lien=r["lien"], theme_gemma=tp, sous_theme=sous, famille=fam,
                           corrige="oui" if (tp != "sans parole" and any(r["fichier"].startswith(k) for k in CORRECTIONS)) else "non",
                           sous_themes_abordes=" | ".join(tous)))

    with open("videos_themes.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(videos[0]), delimiter=";"); w.writeheader(); w.writerows(videos)
    with open("affectations.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";"); w.writerow(["libelle_gemma", "famille", "sous_theme"])
        for l, (fa, so) in sorted(aff.items(), key=lambda x: (x[1][1], x[0])): w.writerow([l, fa, so])

    principal = Counter(v["sous_theme"] for v in videos)
    aborde = Counter(s for v in videos for s in v["sous_themes_abordes"].split(" | "))
    fam_de = {so: fa for fa, so, _ in GRILLE}; fam_de[SANS_PAROLE[1]] = SANS_PAROLE[0]; fam_de["Non classé"] = "Non classé"
    libs = defaultdict(list)
    for v in videos: libs[v["sous_theme"]].append(v["theme_gemma"])
    with open("sous_themes.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["famille", "sous_theme", "videos_theme_principal", "videos_qui_l_abordent", "libelles_gemma_regroupes"])
        for so, n in principal.most_common():
            w.writerow([fam_de[so], so, n, aborde[so], " | ".join(sorted(set(libs[so])))])

    n = len(videos)
    print(f"{sum(v['corrige'] == 'oui' for v in videos)} vidéos corrigées à la main après relecture du sujet")
    print(f"{n} vidéos ; {len(aff)} libellés différents écrits par Gemma ; "
          f"{sum(1 for v in aff.values() if v[1] == 'Non classé')} libellés non classés\n")
    par_fam = Counter(v["famille"] for v in videos)
    for fa, nf in par_fam.most_common():
        print(f"{fa} — {nf} vidéos ({100 * nf / n:.0f} %)")
        for so, k in principal.most_common():
            if fam_de[so] == fa: print(f"    {so:45s} {k:4d} en thème principal, abordé dans {aborde[so]}")
    print("\nContrôle : affectations.csv (libellé -> sous-thème) ; liste détaillée : sous_themes.csv")
