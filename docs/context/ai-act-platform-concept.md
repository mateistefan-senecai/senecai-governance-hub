# SenecAI — Platforma de Conformitate AI Act
## Notă de concept (pentru vibecoding / Claude Code)

**Viziune pe termen lung:** Un hub de guvernanță pe tot parcursul ciclului de viață pentru AI Act.

**Concept pentru MVP:** O platformă care ajută companiile să își inventarieze sistemele de IA, să își mapeze rolul juridic, să clasifice riscul, să identifice obligațiile și să genereze un plan practic de conformitate.

---

## Context și principii de arhitectură

- **Poziționare:** la început, platforma este folosită pentru a complementa livrarea de servicii către clienții SenecAI — nu este vândută ca produs de sine stătător.
- **Extensibilitate:** modulele construite aici (arbori de decizie pentru rol/risc, mapare obligații, sistem de raportare incidente) vor fi preluate ca bază pentru o platformă extinsă, cu module similare pentru GDPR, DORA, NIS2 și CRA. **Arborii de decizie, maparea obligațiilor și raportarea incidentelor trebuie construite ca reguli configurabile (date), nu logică hard-codată** — ca să poată fi reutilizate/adaptate pentru celelalte regulamente fără rescriere.
- **Date & izolare per client:** fără izolare fizică/logică per client în acest stadiu (decizie curentă); de revizitat doar dacă un client din sector reglementat (bancar/asigurări) o cere explicit.
- **Generare automată de documente:** confirmată ca funcționalitate (ex. documentație tehnică Anexa IV, rapoarte). **Orice document generat automat trebuie revizuit de consultant înainte de livrarea către client.**
- **Ordine de build recomandată:** Modulul 1 → Modulul 2 → Modulul 3 → Modulul 4, în paralel cu modulul echivalent pentru GDPR. Modulele 5 și 6 sunt bonus, planificate pentru versiunea 2.0 a platformei (nu fac parte din MVP).

---

## Modulul 1: Inventarul sistemelor de AI, Clasificarea riscurilor

**Ce se întâmplă aici:** pe baza informațiilor introduse de client, platforma aplică regulile înscrise în arborii de decizie și stabilește, pentru fiecare sistem, rolul juridic și clasificarea de risc corespunzătoare.

### Feature 1.1 — Inventar sisteme AI
Pe baza datelor încărcate de utilizator (formulare manuale pentru MVP), platforma înregistrează sistemele de IA utilizate. Inventarul va conține:
- Numele sistemului de IA și scopul propus
- Funcția de business și utilizarea internă/externă
- Utilizatorii și persoanele afectate
- Datele utilizate și modele/API-uri terțe
- Nivelul de autonomie și supravegherea umană
- Etc. — *întreaga listă de luat din chestionarele Excel trimise clienților* (de extras înainte de build)

### Feature 1.2 — Maparea rolurilor
Utilizând logica juridică (arbori de decizie configurabili), platforma identifică rolul pentru fiecare sistem: **provider, deployer, importator, distribuitor, downstream provider**.

### Feature 1.3 — Clasificarea categoriei de risc
Utilizând logica juridică (arbori de decizie configurabili), platforma identifică clasificarea preliminară a riscurilor conform AI Act: **interzis, high-risk, limitat, minim**.

> **Notă:** Maparea rolului și clasificarea riscului trebuie revizuite de un consultant.

---

## Modulul 2: Planul de conformitate

**Ce se întâmplă aici:** în funcție de rolul juridic și de nivelul de risc, platforma derivă obligațiile aplicabile. Pe baza gap assessment-ului, se stabilește câte dintre aceste obligații sunt deja îndeplinite și pentru câte mai este nevoie de lucru. La final, utilizatorul primește un **compliance roadmap**: unde se află în acest moment și ce mai are de făcut pentru a deveni compliant — sub forma raportului **AI Act Readiness & Full Compliance Roadmap**, care include și un **scor de conformitate**.

### Feature 2.1 — Maparea obligațiilor
Platforma mapează obligațiile specifice în funcție de rol și risc, evidențiind nivelul și decalajele de conformitate. Platforma va distinge între:
- a) Obligații provider high-risk → Feature 2.1a
- b) Obligații deployer high-risk
- c) Obligații generale: AI literacy, transparență, politică de guvernanță internă

**Feature 2.1a — Obligații pentru high-risk**
Fabrica de „dosare" (bazată pe documentație): pe baza datelor introduse, platforma generează automat (sau cel puțin produce șabloane pentru) documentația tehnică conform Anexei IV. *(Revizuit de consultant înainte de livrare.)*

**Feature 2.1b — Obligații pentru non-high-risk**
Un tracker pentru a afișa nivelul de conformitate cu obligații precum: transparența, politicile de guvernanță, AI literacy, autoevaluare (acolo unde este cazul).

### Feature 2.2 — Gap assessment (evaluarea decalajelor de conformitate)
După clasificarea de risc și maparea obligațiilor (Feature 2.1), utilizatorul primește un chestionar structurat pe baza căruia platforma stabilește în ce măsură obligațiile identificate sunt deja îndeplinite de companie.

Pe baza răspunsurilor, platforma identifică lacunele (gap-urile) de conformitate — diferența dintre ce are compania deja pregătit/implementat și ce se cere din perspectiva reglementării.

Rezultatul evaluării alimentează direct planul de conformitate (Feature 2.3).

Scorul de conformitate se calculează inițial pe baza acestui gap assessment și se actualizează ulterior, pe măsură ce execuția planului avansează — pe baza marcajelor de progres și a evidențelor introduse în Modulul 3 (Tracking).

### Feature 2.3 — Plan de conformitate & Raport AI Act Readiness
Platforma generează un plan de conformitate practic, care traduce cerințele legale în puncte de acțiune concrete: redactarea documentației, crearea politicilor interne, pregătirea notificărilor de transparență etc. Fiecare punct de acțiune include: termen limită, status, responsabil (owner) și necesitatea revizuirii de către un expert.

La final, utilizatorul primește un **compliance roadmap**: unde se află compania în acest moment și ce mai are de făcut pentru a deveni compliant. Acesta ia forma raportului **AI Act Readiness & Full Compliance Roadmap** — descărcabil, actualizat pe măsură ce procesul de conformitate avansează — care include și scorul de conformitate curent.

---

## Modulul 3: Tracking

Odată ce începe implementarea planului de conformitate (Modulul 2), consultantul actualizează progresul direct în platformă și atașează evidențele (documentație sau alte forme de probă) care atestă îndeplinirea obligațiilor.

### Feature 3.1 — Actualizare progres
Pentru fiecare obligație/acțiune din planul de conformitate, consultantul marchează statusul de implementare (neînceput / în lucru / finalizat).

### Feature 3.2 — Repository de evidențe
Pentru fiecare obligație/acțiune, se pot atașa documente sau alte forme de evidență (politici semnate, capturi de ecran, rapoarte etc.) care demonstrează îndeplinirea acesteia. Pe măsură ce progresul este actualizat și evidențele sunt atașate, scorul de conformitate calculat inițial la gap assessment (Feature 2.2) se recalculează.

---

## Modulul 4: Observator de monitorizare EU AI Act

### Feature 4.1
Dashboard/sistem de notificări care afișează toate actualizările privind EU AI Act și alertează utilizatorul atunci când o nouă propunere sau modificare legislativă îi afectează obligațiile conform AI Act.

> **Notă:** Cea mai ușor de construit funcționalitate — știrile relevante pot fi încărcate manual în platformă (MVP).

---

## Module bonus — de construit în versiunea 2.0 a platformei

### Modulul 5 (Bonus): Gestionare conformității end-to-end pt sistemele high-risk

Pentru sisteme high-risk, dincolo de dosarul tehnic din Modulul 2, platforma va oferi conformitate operațională (bazată pe software):
- **5.1** — Panou de control pentru gestionarea riscurilor: registru de riscuri „live" care se actualizează pe măsură ce performanța modelului sau datele de intrare se modifică
- **5.2** — Fluxuri automate de guvernanță a datelor
- **5.3** — Interfață pentru supraveghere umană
- **5.4** — Trasabilitatea și evidența rezultatelor IA
- **5.5** — Jurnale de raportare a incidentelor *(potențial de transferat/unificat cu Feature 6.2)*

> **Notă:** Cel mai important și mai valoros modul relativ la obligațiile high-risk — potențial de monetizare consistentă. **De construit în versiunea 2.0 a platformei.**

### Modulul 6 (Bonus): Monitorizarea post-implementare

**Feature 6.1** — Dashboard de control pentru monitorizarea post-implementare: pentru sistemele de IA cu risc ridicat, platforma ajută la crearea și menținerea unui plan de monitorizare post-implementare, incluzând modificările caracteristicilor sistemelor de IA și schimbările de reglementare. Platforma va defini: ce va fi monitorizat, cine este responsabil, frecvența monitorizării, datele colectate.

**Feature 6.2** — Jurnal de incidente și probleme: platforma va permite utilizatorilor să înregistreze anomalii de performanță, outputuri neașteptate, reclamații ale utilizatorului etc.

> **Notă:** Strâns legat de Modulul 5 — obligația de monitorizare post-implementare face parte din suita de obligații pentru sistemele high-risk. **De construit în versiunea 2.0 a platformei.**

---

## Sumar — schelet complet

```
Modulul 1 — Inventar & Evaluare
  1.1 Inventar sisteme AI
  1.2 Maparea rolurilor
  1.3 Clasificarea de risc

Modulul 2 — Plan de conformitate
  2.1  Maparea obligațiilor
  2.1a  → Obligații high-risk (generare documentație Anexa IV)
  2.1b  → Obligații non-high-risk (tracker)
  2.2  Gap assessment
  2.3  Plan de conformitate & Raport AI Act Readiness (+ compliance score)

Modulul 3 — Tracking
  3.1 Actualizare progres
  3.2 Repository de evidențe

Modulul 4 — Observator de monitorizare EU AI Act
  4.1 Dashboard/notificări legislative

── BONUS (v2.0) ──
Modulul 5 — Gestionare conformității end-to-end (high-risk)
  5.1–5.5
Modulul 6 — Monitorizare post-implementare
  6.1–6.2
```
