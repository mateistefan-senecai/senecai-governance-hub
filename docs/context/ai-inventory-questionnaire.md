# AI Act Readiness — Chestionar Preliminar de Conformitate

Sursă: `docs/context/sources/ai-act-inventory-questionnaire.xlsx` (2 taburi). Acesta este chestionarul real trimis clienților și definește câmpurile canonice pentru Modulul 1 (Inventar & Clasificare).

## Tab 1 — "Question Log" (context organizațional, non per-sistem)

Chestionar general de context, structurat pe categorii mapate la articole din AI Act. Nu e per-sistem AI — alimentează probabil evaluarea de context/gap assessment (Modulul 2.2), nu inventarul propriu-zis. Coloane: Nr. / Categorie / Întrebare / Răspuns client / Instrucțiuni pentru răspuns / Relevanță (legală/practică) / Note interne / Atașament.

| # | Categorie | Întrebare | Relevanță (AI Act) |
|---|---|---|---|
| 1 | General | Descrieți toate cazurile de utilizare AI (produs sau operațiuni interne); inventar detaliat. | Identificarea sistemelor AI și scopul lor |
| 2 | General | În ce puncte din produs/flux operațional intervine AI (predicții, optimizare, recomandări, automatizare decizională)? | Rolul AI în proces (clasificare & obligații) |
| 3 | General | AI-ul influențează/determină decizii operaționale reale? Impact (financiar, operațional, infrastructură)? | Art. 9 — evaluare risc |
| 4 | General | Cine are responsabilitatea finală pentru deciziile AI (automat vs. operator uman)? | Art. 14 — human oversight & autonomie |
| 5 | Model | Cine a dezvoltat/furnizat modelele (intern / terți / API-uri externe)? | Provider vs. deployer |
| 6 | Model | Modelele au fost testate/validate înainte de deployment? Ce tip de testare? | Art. 15 — validare & performanță |
| 7 | Model | Ce se întâmplă dacă sistemul produce un output incorect? | Art. 9 — identificare riscuri |
| 8 | Data governance | Pe ce date au fost antrenate modelele (surse, perioadă, reale/sintetice/third-party)? | Art. 10 — data governance & calitate |
| 9 | Data governance | Care sunt sursele principale de date (senzori, API-uri, baze de date interne)? | Art. 10 — trasabilitate & origine |
| 10 | Data governance | Există validare automată a datelor (valori lipsă, outliers, consistență)? | Art. 10 — calitate & integritate |
| 11 | Data governance | Datele sunt evaluate pt. acuratețe/reprezentativitate? Cum? | Art. 10 — acuratețe & reprezentativitate |
| 12 | Data governance | Cum gestionați actualizarea datelor și problemele de calitate? | Art. 10 + Art. 9 — control continuu |
| 13 | Capabilități tehnice | Folosiți API-uri externe/servicii terțe? Ce tip și ce rol? | Dependențe externe & risc operațional |
| 14 | Capabilități tehnice | Ce acțiuni execută AI-ul autonom (acces baze de date, procese, comenzi)? Limitări? | Art. 14 + Art. 9 — autonomie & control |
| 15 | Human oversight | Poate un operator uman interveni/modifica/anula deciziile AI? Cum? | Art. 14 — control uman efectiv |
| 16 | Human oversight | Nivel de intervenție umană (human-in-the-loop / human-on-the-loop / fully automated)? | Art. 14 — clasificare autonomie |
| 17 | Logging/traciabilitate | Se generează loguri pt. decizii AI (input, output, versiune model, timestamp)? | Art. 12 — trasabilitate |
| 18 | Logging/traciabilitate | Se poate reconstrui o decizie AI (input → model → output) din loguri? | Art. 12 — auditabilitate |
| 19 | Cybersecurity | Există măsuri de securitate (control acces, anti-manipulare date, monitorizare atacuri)? | Art. 15 — robustețe & securitate |
| 20 | Cybersecurity | S-au făcut teste de securitate (penetration testing, vulnerability assessment)? | Art. 15 — validare securitate |
| 21 | Internal governance | Se monitorizează performanța în producție (accuracy, deviații)? Cum? | Art. 9 + Art. 15 — monitorizare continuă |
| 22 | Internal governance | Cine are acces la sisteme/date? Politici role-based access? | Control acces & responsabilitate |
| 23 | Internal governance | Există politici/procese de guvernanță AI (formale/informale)? | Sisteme/politici de guvernanță AI |

## Tab 2 — "Inventar Sisteme AI" (per-sistem — Modulul 1.1)

Un rând per sistem AI. Acestea sunt câmpurile canonice ale inventarului (Feature 1.1):

| # | Câmp | Descriere / instrucțiuni | Tip |
|---|---|---|---|
| 1 | Sistem AI | Numele sistemului/platformei (ex: ChatGPT, model intern, platformă terță) | text |
| 2 | Descriere sistem | Funcționalitate principală și mod de operare | text |
| 3 | Tipul cazului de utilizare | Produs (clienți finali) / Operațiuni interne / Hibrid | enum |
| 4 | Procesul de business afectat | Ex: scoring credite, triaj suport, optimizare stoc | text |
| 5 | Date de intrare (Input) | Ex: date tranzacționale, imagini, text, senzori, date utilizatori | text |
| 6 | Date de ieșire / Tip decizie (Output) | Ex: scor, recomandare, clasificare, acțiune automată, alertă | text |
| 7 | Sursa datelor | Baze de date interne / terți / API-uri externe / date generate de utilizatori / date sintetice | text |
| 8 | Mecanism de supraveghere umană | Ex: validare manuală înainte de execuție, posibilitate de anulare, audit periodic | text |
| 9 | Nivelul de autonomie al sistemului | Complet automat / Parțial automat (human-on-the-loop) / Consultativ (human-in-the-loop) | enum |
| 10 | Responsabil conformitate | Nume + rol al persoanei responsabile | text |
| 11 | Decizii influențate și impact | Ce decizii + impactul unei decizii eronate (financiar, operațional, clienți) | text |
| 12 | Număr angajați utilizatori | Câți angajați + afectează clienți finali (da/nu) + estimare | text/number |
| 13 | Stadiul de implementare | În producție / În pilotare / Planificat | enum |
| 14 | Clasificare risc (preliminară) | ⚠ Completat exclusiv de consultant. Valori: Inacceptabil / Risc ridicat / Risc limitat / Risc minim | enum, consultant-only |

Notă: coloana 14 este explicit marcată ca needing să fie completată doar de consultant, pe baza răspunsurilor clientului — confirmă principiul din nota de concept ("maparea rolului și clasificarea riscului trebuie revizuite de un consultant").
