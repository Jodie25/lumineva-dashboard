/* Dashboard Lumineva : graphiques et tableaux. Les chiffres viennent de data/donnees.json (créé par scripts/preparer_donnees.py). */
fetch("data/donnees.json").then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }).then(init).catch(e=>{
  const m=document.createElement("p"); m.className="wrap note"; m.textContent="Les données ne se chargent pas. Ouvrez le site avec la commande du fichier LISEZMOI.md (python3 -m http.server), pas par un double-clic.";
  document.querySelector("main").prepend(m); console.error(e); });

function init(D){
const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(n));
const eur = n => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const MOIS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const mlab = m => { const [y,mm]=m.split('-'); return MOIS[+mm-1]+' '+y.slice(2); };
const el = (t,a={},txt) => { const e=document.createElement(t); for(const k in a) e.setAttribute(k,a[k]); if(txt!=null) e.textContent=txt; return e; };
/* Chaque page ne contient qu'une partie des éléments : un élément absent reçoit un bloc vide, non affiché. */
const $ = id => document.getElementById(id) || el('div');
const k = D.kpi;
const ventes = {commandes:k.commandes, ca:k.ca};

/* KPI */
[[fmt(k.reels),'réels analysés, de janvier 2025 à octobre 2026'],
 [ (k.vues/1e6).toFixed(1).replace('.',',')+' M','vues au total sur ces réels'],
 [fmt(k.abo),'abonnés gagnés grâce aux réels'],
 [fmt(ventes.commandes),'commandes web analysées'],
 [eur(ventes.ca),'de chiffre d\'affaires net TTC'],
 [fmt(k.clients),'clientes différentes']].forEach(([b,s])=>{const d=el('div',{class:'kpi'});d.append(el('b',{class:'num'},b),el('span',{},s));$('kpis').append(d);});

$('ig-lead').textContent = `${fmt(k.viral_n)} réels viraux sur ${k.reels} (${String(Math.round(k.viral_n/k.reels*100))} %) apportent ${String(k.viral_vues_share).replace('.',',')} % des vues et ${String(k.viral_abo_share).replace('.',',')} % des abonnés gagnés. Un réel ordinaire fait environ ${fmt(k.med_vues)} vues.`;
const cm = (D.countries.FR+D.countries.BE+D.countries.CH+D.countries.RE);
$('sales-lead').textContent = `Panier moyen : ${eur(ventes.ca/ventes.commandes)} pour environ ${String(k.articles).replace('.',',')} articles. ${fmt(k.clients)} clientes, dont ${String(k.repeat_pct).replace('.',',')} % ont commandé plusieurs fois. Le code BIENVENUE10 a servi ${fmt(k.bienvenue)} fois. Livraison : ${Math.round(D.countries.FR/cm*100)} % en France, ${Math.round(D.countries.BE/cm*100)} % en Belgique, puis la Suisse et La Réunion.`;

/* Entonnoirs */
function funnel(id, rows){ const box=$(id); const max=rows[0][1];
  rows.forEach(([lab,v,disp])=>{ const r=el('div',{class:'row'}); const b=el('div',{class:'bar'}); const i=el('i'); i.style.width=Math.max(4,v/max*100)+'%'; b.append(i); const em=el('em',{},lab); b.append(em); r.append(b, el('span',{class:'val'},disp||fmt(v))); box.append(r); }); }
funnel('funnel-sales',[['Commandes uniques',1602],['– 7 annulées, 1 test',1594],['– 17 ventes hors site',1577]]);
funnel('funnel-reels',[['Réels trouvés depuis 2024',639],['Depuis le 1er janv. 2025',457],['Base finale (+31 récents)',487]]);
funnel('funnel-theme',[['Réels bruts',487],['Avec parole (≥ 15 mots)',365],['Exclus',122]]);
funnel('funnel-labels',[['Libellés libres (Gemma)',950],['Sous-thèmes',26],['Thèmes finaux',10]]);

/* Graphiques SVG */
function tipFor(box){ let t=box.querySelector('.tip'); if(!t){t=el('div',{class:'tip'});box.append(t);} return t; }
function bars(id, data, {fmtV=fmt, color=()=> 'var(--accent)', h=240, ref=null, labEvery=1, tipText}={}){
  const box=$(id); const draw=()=>{
    box.querySelectorAll('svg').forEach(s=>s.remove());
    const W=Math.max(280, box.clientWidth), H=h, m={t:14,r:8,b:34,l:48};
    const iw=W-m.l-m.r, ih=H-m.t-m.b; const max=Math.max(...data.map(d=>d.v), ref?ref.v:0)*1.08;
    const ns='http://www.w3.org/2000/svg'; const s=document.createElementNS(ns,'svg'); s.setAttribute('viewBox',`0 0 ${W} ${H}`); s.setAttribute('role','img');
    const g=(tag,a)=>{const e=document.createElementNS(ns,tag);for(const k in a)e.setAttribute(k,a[k]);return e;};
    const ticks=niceTicks(max,4); const gg=g('g',{class:'grid'});
    ticks.forEach(tv=>{const y=m.t+ih-tv/max*ih; gg.append(g('line',{x1:m.l,x2:W-m.r,y1:y,y2:y})); const tx=g('text',{x:m.l-6,y:y+4,'text-anchor':'end'}); tx.textContent=fmtV(tv); gg.append(tx);});
    s.append(gg);
    const bw=iw/data.length; const tip=tipFor(box);
    data.forEach((d,i)=>{ const bh=d.v/max*ih; const x=m.l+i*bw+bw*.14, y=m.t+ih-bh;
      const r=g('rect',{x, y, width:Math.max(1,bw*.72), height:Math.max(0,bh), rx:2, fill:color(d,i)});
      r.addEventListener('mouseenter',()=>{tip.textContent=tipText?tipText(d):`${d.l} : ${fmtV(d.v)}`; tip.style.left=(x+bw*.36)/W*box.clientWidth+'px'; tip.style.top=y/H*box.clientHeight+'px'; tip.classList.add('on');});
      r.addEventListener('mouseleave',()=>tip.classList.remove('on')); s.append(r);
      if(i%labEvery===0){const tx=g('text',{x:m.l+i*bw+bw/2,y:H-m.b+16,'text-anchor':'middle'}); tx.textContent=d.l; s.append(tx);} });
    if(ref){ const y=m.t+ih-ref.v/max*ih; s.append(g('line',{x1:m.l,x2:W-m.r,y1:y,y2:y,stroke:'var(--accent-2)','stroke-width':2,'stroke-dasharray':'5 4'})); const tx=g('text',{x:W-m.r,y:y-6,'text-anchor':'end'}); tx.textContent=ref.l; tx.style.fill='var(--accent-2)'; tx.style.fontWeight='700'; s.append(tx);}
    box.prepend(s); };
  draw(); new ResizeObserver(()=>draw()).observe(box);
}
function hbars(id, data, {fmtV=fmt, color=()=> 'var(--accent)', ref=null}={}){
  const box=$(id); const draw=()=>{
    box.querySelectorAll('svg').forEach(s=>s.remove());
    const W=Math.max(280,box.clientWidth), rowH=40, labW=Math.min(190, W*.42), m={t:ref?22:6,r:56,b:6};
    const H=m.t+data.length*rowH+m.b, iw=W-labW-m.r; const max=Math.max(...data.map(d=>d.v), ref?ref.v:0)*1.02;
    const ns='http://www.w3.org/2000/svg'; const s=document.createElementNS(ns,'svg'); s.setAttribute('viewBox',`0 0 ${W} ${H}`); s.setAttribute('role','img');
    const g=(tag,a)=>{const e=document.createElementNS(ns,tag);for(const k in a)e.setAttribute(k,a[k]);return e;};
    data.forEach((d,i)=>{ const y=m.t+i*rowH; const w=d.v/max*iw;
      const lb=g('text',{x:labW-10,y:y+rowH/2+4,'text-anchor':'end'}); lb.textContent=d.l; lb.style.fill='var(--ink)'; lb.style.fontSize='13px'; s.append(lb);
      s.append(g('rect',{x:labW,y:y+8,width:Math.max(2,w),height:rowH-16,rx:3,fill:color(d,i)}));
      const vt=g('text',{x:labW+w+6,y:y+rowH/2+4}); vt.textContent=fmtV(d.v); vt.style.fontWeight='700'; vt.style.fill='var(--ink)'; s.append(vt); });
    if(ref){ const x=labW+ref.v/max*iw; s.append(g('line',{x1:x,x2:x,y1:m.t-4,y2:H-m.b,stroke:'var(--accent-2)','stroke-width':2,'stroke-dasharray':'5 4'})); const tx=g('text',{x,y:12,'text-anchor':'middle'}); tx.textContent=ref.l; tx.style.fill='var(--accent-2)'; tx.style.fontWeight='700'; s.append(tx);}
    box.prepend(s); };
  draw(); new ResizeObserver(()=>draw()).observe(box);
}
function niceTicks(max,n){ const step0=max/n, p=Math.pow(10,Math.floor(Math.log10(step0))); const st=[1,2,2.5,5,10].map(x=>x*p).find(x=>x>=step0); const out=[]; for(let v=0; v<=max; v+=st) out.push(+v.toFixed(6)); return out; }
const short = v => v>=1e6 ? (v/1e6).toFixed(1).replace('.',',')+' M' : v>=1000 ? (v/1000).toFixed(v>=1e4?0:1).replace('.',',')+' k' : fmt(v);
const ratio = v => v.toFixed(2).replace('.',',');

const rm=D.reels_month.map(r=>({l:mlab(r.m),v:r.med,n:r.n,abo:r.abo}));
bars('ch-views', rm, {fmtV:short, labEvery:3, tipText:d=>`${d.l} : ${fmt(d.v)} vues médianes (${d.n} réels)`});
bars('ch-abo', rm.map(r=>({...r,v:r.abo})), {fmtV:short, labEvery:3, color:()=> 'var(--accent-2)', tipText:d=>`${d.l} : ${fmt(d.v)} abonnés gagnés`});


const partial = new Set(['2025-06','2025-12','2026-01','2026-06','2026-10']);
bars('ch-ca', D.sales_month.map(r=>({l:mlab(r.m),v:r.ca,n:r.n,m:r.m})), {fmtV:short, labEvery:2, color:d=>partial.has(d.m)?'var(--accent-2)':'var(--accent)', tipText:d=>`${d.l} : ${eur(d.v)} · ${fmt(d.n)} commandes${partial.has(d.m)?' (mois partiel)':''}`});
const JOURS={Monday:'lun.',Tuesday:'mar.',Wednesday:'mer.',Thursday:'jeu.',Friday:'ven.',Saturday:'sam.',Sunday:'dim.'};
bars('ch-wd', D.weekday.map(r=>({l:JOURS[r.d],v:r.ca,n:r.n})), {fmtV:short, h:220, color:d=>d.l==='dim.'?'var(--accent)':'var(--ink-2)', tipText:d=>`${d.l} : ${eur(d.v)} · ${fmt(d.n)} commandes`});
bars('ch-hr', D.hours.map((v,i)=>({l:i+'h',v})), {h:220, labEvery:3, color:(d,i)=>(i>=10&&i<=14)?'var(--accent)':'var(--ink-2)', tipText:d=>`${d.l} : ${fmt(d.v)} commandes`});
hbars('ch-fam', D.families.map(f=>({l:f.f,v:f.ca})), {fmtV:short, color:(d,i)=>i===0?'var(--accent)':'var(--ink-2)'});

/* Tableaux */
const tbody = id => document.querySelector('#'+id+' tbody') || $(id);
D.top_reels.forEach(r=>{ const tr=el('tr'); const a=el('a',{href:r.lien,target:'_blank',rel:'noopener'},r.resume); const td=el('td'); td.append(a);
  tr.append(el('td',{class:'num'},r.date), td, el('td',{class:'n'},fmt(r.vues)), el('td',{class:'n'},fmt(r.abo))); tbody('tb-top').append(tr); });
D.top_products.forEach(p=>{ const tr=el('tr'); tr.append(el('td',{},p.p), el('td',{class:'n'},fmt(p.q)), el('td',{class:'n'},eur(p.ca))); tbody('tb-prod').append(tr); });


/* Fiabilité */
hbars('ch-rel',[{l:'Solides',v:19},{l:'À vérifier',v:7},{l:'Fragiles',v:8}],{color:(d,i)=>['var(--ok)','var(--warn)','var(--bad)'][i]});
[["Texte d'accroche à l'écran","RapidOCR → EasyOCR","85 %","0,27","Deux lecteurs de texte différents ne lisent pas la même chose dans les images : on ne peut pas se fier au oui / non."],
 ["Voix in (on la voit parler)","YuNet → MediaPipe (lèvres)","51 %","0,17","La détection par le visage ne correspond pas à ce qu'on voit sur les lèvres."],
 ["Voix off (on l'entend sans la voir)","YuNet → MediaPipe (lèvres)","58 %","0,25","L'absence de visage ne veut pas dire que la voix est hors écran."],
 ["Produit seul à l'écran","CLIP + SFace → SigLIP + ArcFace","94 %","0,87","Les outils détectent presque pareil, mais la conclusion sur les vues change (+29 % avec l'un, +21 % avec l'autre)."],
 ["Appel à l'action en description","Claude → Qwen2.5-7B","48 %","0,15","La définition d'un appel à l'action n'est pas assez nette (une question au public compte-t-elle ?)."],
 ["Sujet","Claude → mDeBERTa","29 %","0,22","Les IA de contrôle ne voient pas les sujets pareil. Le sujet est traité à part par l'équipe (Gemma + bge-m3 + K-means)."],
 ["Sujet","Claude → Qwen2.5-7B","37 %","0,30","Même constat : accord de 29 à 37 %."],
 ["Format","Claude → mDeBERTa","7 %","-0,01","L'outil de contrôle n'est pas d'accord du tout avec la lecture de Claude."]].forEach(r=>{
  const tr=el('tr'); tr.append(el('td',{},r[0]),el('td',{},r[1]),el('td',{class:'n'},r[2]),el('td',{class:'n'},r[3]),el('td',{class:'why'},r[4])); $('tb-frag').append(tr); });
[["Produit / parfum cité à l'oral","Claude → GLiNER","80 % ; kappa 0,41"],["Produit / parfum écrit en description","Claude → GLiNER","90 % ; kappa 0,45"],["Produit / parfum écrit en description","Claude → Qwen2.5-7B","90 % ; kappa 0,48"],["Appel à l'action à l'oral","Claude → Qwen2.5-7B","82 % ; kappa 0,50"],["Lieu","CLIP → SigLIP","64 % ; kappa 0,45"],["Première image (hook visuel)","YuNet + CLIP → InsightFace + SigLIP","74 % ; kappa 0,52"],["Première coupe (secondes)","ffmpeg → PySceneDetect","Spearman 0,78"]].forEach(r=>{
  const tr=el('tr'); tr.append(el('td',{},r[0]),el('td',{},r[1]),el('td',{class:'n'},r[2])); $('tb-warn').append(tr); });

/* Outils */
[["Whisper « small » (faster-whisper)","Reconnaissance vocale : transforme la voix en texte, sans internet.","Transcription, « elle parle », nombre de mots, débit, accroche orale.","Déforme les noms propres ; peut inventer du texte sur un silence (cas écartés).","Whisper large-v3-turbo"],
 ["YuNet (OpenCV)","Détecteur de visages léger, une image par seconde.","Visage présent, face caméra, visage dès la 1re seconde, voix in / off.","Manque les visages de profil ou très petits.","InsightFace SCRFD"],
 ["SFace (OpenCV)","Empreinte de visage pour reconnaître la même personne. Groupes nommés par l'équipe.","Qui est à l'écran : Jessica, mari, filles, autres.","Données sensibles : traité en local, réduit à des rôles.","InsightFace ArcFace"],
 ["CLIP (OpenAI)","Relie images et texte : dit si l'image ressemble à « une bougie », « un atelier ».","Bougie visible, lieu.","Reconnaissance approximative.","SigLIP (Google)"],
 ["RapidOCR","Lecture de texte dans les images.","Texte d'accroche, sous-titres, annonces à l'écran.","Se trompe sur les textes stylisés.","EasyOCR"],
 ["Silero VAD + volume","Repère les pauses de la voix et mesure le volume pour entendre une musique.","Musique de fond.","Une musique ajoutée dans Instagram n'est pas dans le fichier.","AST (MIT)"],
 ["ffmpeg","Mesure le fichier vidéo lui-même.","Durée, nombre de plans, coupes, mouvement.","Aucune, c'est une mesure.","PySceneDetect"],
 ["Claude (Anthropic)","IA en ligne : lit légende et transcription, chaque réponse cite la phrase qui la prouve.","Sujet, promotion, appel à l'action, produits cités.","Il interprète. Seul outil qui reçoit du texte hors de l'ordinateur.","Qwen2.5-7B, GLiNER, mDeBERTa"],
 ["Mots-clés (expressions régulières)","Liste de mots cherchés dans la légende et la parole.","Appel à l'action, promotion, lancement, famille, prix.","Ne comprend ni l'ironie ni la négation.","Lecture par Claude"]].forEach(r=>{
  const tr=el('tr'); const t=el('td'); t.append(el('strong',{},r[0])); tr.append(t); r.slice(1).forEach(c=>tr.append(el('td',{},c))); $('tb-models').append(tr); });
[["InsightFace (SCRFD + ArcFace)","Visages, personnes à l'écran"],["SigLIP (Google)","Bougie visible, lieu"],["EasyOCR","Texte d'accroche, sous-titres"],["AST (MIT)","Musique de fond"],["PySceneDetect","Nombre de plans, coupes"],["MediaPipe Face Landmarker","Voix in / off (lèvres qui bougent)"],["Whisper large-v3-turbo","Transcription, parole, débit"],["Qwen2.5-7B (llama.cpp)","Sujet, promotion, appel à l'action, produits"],["GLiNER","Produits et parfums cités"],["mDeBERTa (zero-shot)","Sujet, format"]].forEach(r=>{
  const tr=el('tr'); tr.append(el('td',{},r[0]),el('td',{},r[1])); $('tb-ctrl').append(tr); });
[["t indépendant (Levene, Welch)","Deux groupes ont-ils une moyenne différente ?"],["t apparié","Le produit se vend-il plus après la vidéo ?"],["ANOVA + Bonferroni","Plus de deux groupes : lequel diffère ?"],["MLG à deux facteurs","Deux facteurs à la fois"],["Khi² + V de Cramér","Deux critères oui / non vont-ils ensemble ?"],["Pearson + régression","Quand l'un monte, l'autre monte-t-il ?"],["Correction de Holm","Évite de conclure à tort sur 16 tests"],["Kappa de Cohen / Fleiss","Deux outils classent-ils pareil ?"]].forEach(r=>{
  const tr=el('tr'); tr.append(el('td',{},r[0]),el('td',{},r[1])); $('tb-tests').append(tr); });
[["Claude Code (Anthropic)","Agent qui écrit les scripts, lance les calculs, lit et classe le texte","Automatiser et garder chaque étape rejouable"],["Python 3.13 + pip","Langage et installateur des bibliothèques","Standard pour l'analyse de données"],["yt-dlp 2026.8.19","Télécharge les vidéos Instagram","Outil libre reconnu, sans la session de Jodie"],["ffmpeg (imageio-ffmpeg 0.6)","Assemble image et son, mesure durée et coupes","Absent du PC, fourni par la bibliothèque"],["faster-whisper 1.2.1 + ctranslate2 4.8.2","Transcription (small et large-v3-turbo)","Reconnaissance vocale locale, bonne en français"],["OpenCV 5.0 / contrib 5.1","Images, YuNet, SFace","Léger, tourne sur processeur"],["onnxruntime 1.30","Exécute CLIP, SFace, YuNet, InsightFace","Sans carte graphique"],["RapidOCR 1.2.3 / EasyOCR 1.7.2","Texte à l'écran (base / contrôle)","Deux lecteurs pour se contrôler"],["Silero VAD","Détecte la voix pour entendre la musique","Mesure musique de fond"],["transformers 4.56 + torch","AST, SigLIP, mDeBERTa","Modèles de contrôle"],["llama-cpp-python 0.3.36 + Qwen2.5 3B / 7B","Modèle de langage local de contrôle","Refaire la lecture de Claude sans internet"],["GLiNER 0.2.30","Repère les parfums dans le texte","Contrôle des produits cités"],["MediaPipe 1.2.3","Points du visage, bouche","Contrôle voix in / off"],["PySceneDetect 0.7.3","Changements de plan","Contrôle des coupes"],["InsightFace buffalo_l","Détection et reconnaissance de visages","Contrôle de YuNet / SFace"],["Ollama + Gemma 4 12B","Thèmes des réels","Comprendre un discours entier, en local"],["bge-m3 + K-means (scikit-learn)","Comparer et regrouper les libellés","Regroupement par le sens"],["pandas 2.3, numpy 2.3, scipy 1.18","Tableaux, calculs, tests statistiques","Tests du cours"],["openpyxl 3.1","Écriture de l'Excel","Fichier .xlsx propre"],["Chart.js / SVG fait main","Graphiques des pages HTML","Pages autonomes"],["Meta Business Suite","Export des statistiques des réels","Chiffres officiels d'Instagram"],["Shopify (admin)","Export des commandes","Source des ventes"]].forEach(r=>{
  const tr=el('tr'); tr.append(el('td',{},r[0]),el('td',{},r[1]),el('td',{},r[2])); $('tb-soft').append(tr); });

}

/* Page Tests : hypothèses déroulantes. Un lien vers #test-H5 ouvre l'hypothèse visée. */
(function(){
  const ouvrirCible = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const d = id && document.getElementById(id);
    if (d && d.tagName === 'DETAILS') { d.open = true; d.scrollIntoView({block:'start'}); }
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#test-"]');
    if (a) { const d = document.getElementById(a.getAttribute('href').slice(1)); if (d && d.tagName === 'DETAILS') d.open = true; }
    if (e.target.id === 't-open' || e.target.id === 't-close')
      document.querySelectorAll('details.test').forEach(d => { d.open = e.target.id === 't-open'; });
  });
  window.addEventListener('hashchange', ouvrirCible);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ouvrirCible); else ouvrirCible();
})();
