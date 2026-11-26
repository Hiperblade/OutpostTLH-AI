# Analisi delle meccaniche di gioco

Analisi delle regole di OutpostTLH ricavata dal codice (novembre 2026), con i problemi trovati e una proposta per ciascuno. I termini seguono il [glossario](../GLOSSARY.md).

Stato: ✅ risolto · ⏳ aperto

## Riepilogo

| # | Problema | Area | Stato |
|---|---|---|---|
| 1 | Il Benessere non ha effetti | Regole | ✅ |
| 2 | Barre di Ferro e minerali senza magazzino | Regole | ✅ |
| 3 | I cloni di un risveglio muoiono tutti nello stesso turno | Regole | ⏳ |
| 4 | Energia a microonde illimitata e quasi gratuita | Regole | ⏳ |
| 5 | I cloni costano molto rispetto a quanto rendono | Equilibrio | ⏳ |
| 6 | I coloni nati diventano utili molto tardi | Equilibrio | ⏳ |
| 7 | La felicità parte da 0 e dimezza la manodopera | Equilibrio | ⏳ |
| 8 | La fame uccide in fretta e senza preavviso | Equilibrio | ⏳ |
| 9 | Con poca manodopera il lavoro costa più materiali | Equilibrio | ⏳ |
| 10 | Manca la terza fase (Spazioporto, terraformazione) | Meccaniche mancanti | ⏳ |
| 11 | Manca il sistema di eventi | Meccaniche mancanti | ⏳ |
| 12 | Limite della precedenza del personale | Meccaniche mancanti | ⏳ |
| 13 | Mancano avvisi di fine turno | Informazioni | ⏳ |
| 14 | Il report Energia non distingue gli edifici a riposo | Informazioni | ✅ |
| 15 | Refusi e descrizioni segnaposto nei testi | Informazioni | ✅ |

**Da dove partire:** 4 e 13. Sono interventi piccoli che cambiano molto la sensazione di gioco.

## A. Regole che non funzionano o si contraddicono

### 1. Il Benessere non ha effetti

Il Benessere si calcola da alloggi e cure mediche e compare nei report, ma il turno non lo usa per nient'altro. Tutta la filiera medica (Industria Farmaceutica, Fabbrica Chimica per i Kit Medici, Struttura Medica: 13 addetti in tutto) serve solo a dimezzare la mortalità dei Pensionati.

**Proposta:** far dipendere dal Benessere qualcosa di visibile: il ritmo delle nascite, la mortalità di tutti i coloni o un tetto alla felicità.

**Risolto ✅** con la malattia: più il Benessere è basso, più coloni nati si ammalano (fino al 10% dei sani a turno). I malati non lavorano e non studiano, rischiano di morire (5% a turno, 10% i Pensionati) e guariscono da soli (10% a turno) o con una Cura. Ogni Cura consuma un Kit Medico ed è limitata dalle Strutture Mediche attive: 1 a turno la base, 3 l'avanzata. I cloni non si ammalano e per le cure mediche non contano. Le Strutture Mediche non consumano più Kit Medici.

### 2. Barre di Ferro e minerali senza magazzino

Le Barre di Ferro non stanno in nessun magazzino: quelle non usate nel turno in cui vengono prodotte si perdono. Nella partita di prova le Fonderie producevano 11 barre e i cantieri ne usavano 7. Se i cantieri avanzati sono più delle barre prodotte in un turno, gli ultimi restano fermi.

**Proposta:** mettere Barre di Ferro, minerali metallici e cristalli nel Magazzino generico. Le unità per-turno (ricerca, produzione, istruzione) possono restare non accumulabili.

**Risolto ✅** in modo diverso: il Magazzino tiene solo ciò che il giocatore crea in produzione e i suoi scarti. Gli edifici che producono da soli hanno una **scorta interna**, che conta anche se l'edificio è fermo: 10 Barre di Ferro per Fonderia, 10 unità farmaceutiche per Industria Farmaceutica, 10 unità per beni per Fabbrica di Beni; miniere e cupole tengono le loro. Il nuovo **Deposito** (profondità, Metallurgia Avanzata) aggiunge 5 a ogni semilavorato. I report mostrano i semilavorati e quanto materiale va perso.

### 3. I cloni di un risveglio muoiono tutti nello stesso turno

I cloni risvegliati insieme muoiono tutti nello stesso turno, dopo 55 turni. Se reggono un laboratorio, quello si ferma di colpo, senza preavviso.

**Proposta:** un avviso qualche turno prima, oppure una durata con una variazione casuale, come per i robot.

### 4. Energia a microonde illimitata e quasi gratuita

Un Satellite a Microonde costa 3 unità di produzione e 1 struttura standard, nessuna materia prima, e alimenta un Impianto a Microonde da 500 di energia costruito in un turno. Tokamak (barre radioattive e filiera chimica), Centrale Geotermica (fumarole profonde) e Bobina Elettrostatica perdono così ogni motivo di esistere.

**Proposta:** dare al satellite un costo in Barre di Ferro, oppure limitare il numero di satelliti, oppure ridurne la potenza col passare dei turni.

## B. Equilibrio

### 5. I cloni costano molto rispetto a quanto rendono

Un clone dà 1 punto lavoro ma consuma cibo e alloggio come un colono. Per il personale di un laboratorio (20 punti) servono 20 cloni: 20 cibo a turno e 2 Residenziali. Un robot dà 4 punti, non mangia, ma non può fare il personale. All'inizio della fase colonia la salita è molto ripida.

**Proposta:** 2 punti per clone, oppure un consumo di cibo dimezzato.

### 6. I coloni nati diventano utili molto tardi

Da bambino a Lavoratore servono circa 24 turni: 6 da bambino, 13 di scuola e 5 di università, con Scuola e Università con personale. La vittoria chiede 200 coloni nati e contenti per 20 turni. Con un Asilo, che fa nascere 5 bambini ogni 2 turni, solo le nascite richiedono 80 turni.

**Proposta:** una stima dei turni alla vittoria nel report Umani, oppure un ritmo delle nascite legato al numero di Asili e al Benessere.

### 7. La felicità parte da 0 e dimezza la manodopera

Senza svago la felicità vale 0, e i coloni rendono 2 punti invece di 4. È già stato proposto di partire dal 50%, con +2% per bambino nato e −1% per colono morto. Per ora il calcolo resta invariato.

### 8. La fame uccide in fretta e senza preavviso

Se la sussistenza media scende sotto il 100%, a ogni turno muore la quota corrispondente di coloni, bambini e studenti compresi. Non c'è nessun avviso prima che il cibo finisca.

**Proposta:** un avviso quando le riserve di cibo coprono meno di 3 turni, e morti che colpiscono per primi i più fragili (Pensionati).

### 9. Con poca manodopera il lavoro costa più materiali

I materiali di un cantiere o di una produzione si pagano a ogni passo di lavoro, anche se il passo riceve 1 punto invece di 4. Con un solo clone lo stesso lavoro costa quattro volte i materiali.

**Proposta:** materiali pagati in proporzione ai punti ricevuti.

## C. Meccaniche mancanti

### 10. Manca la terza fase

Lo Spazioporto non produce niente e la terraformazione non esiste. La vittoria dipende solo dalla popolazione, e Fisica Quantistica, che sblocca lo Spazioporto, è un vicolo cieco.

**Proposta:** legare la vittoria, o un obiettivo alternativo, allo Spazioporto in funzione: per esempio un certo numero di carichi lanciati.

### 11. Manca il sistema di eventi

Incidenti, catastrofi, scoperte e ribellioni per felicità bassa protratta sono rimandati. Gli eventi del turno hanno già un registro dove inserirli.

### 12. Limite della precedenza del personale

Il personale di un edificio che non può funzionare (per esempio per mancanza di energia) passa solo agli edifici esaminati dopo di lui nel turno. Uno già esaminato resta fermo anche se ci sarebbero punti liberi.

**Proposta:** un secondo passaggio che riassegna i punti liberi agli edifici fermi solo per mancanza di personale.

## D. Informazioni per il giocatore

### 13. Mancano avvisi di fine turno

**Proposta:** messaggi per cibo in esaurimento, robot vicini a fine vita, cloni in scadenza, magazzini pieni e materiali prodotti e andati persi.

### 14. Il report Energia non distingue gli edifici a riposo ✅

Gli edifici a riposo o disattivati non comparivano nei report di energia e cibo. Ora hanno la colonna "A riposo", in grigio, accanto ad "Attivi" e "Fermi" (in rosso).

### 15. Refusi e descrizioni segnaposto ✅

Corretti "Superficie", "Idroponica", "Scienze Umane" e altri refusi. Le descrizioni segnaposto con "…" sono state sostituite con testi veri. Sono state aggiunte le descrizioni mancanti di edifici, risorse, prodotti e report. Gli identificativi interni (per esempio `Univesity`) restano invariati perché i salvataggi li usano.

## Note di funzionamento utili

- **Punti lavoro:** Lavoratore 4, robot 4, Pensionato 2, clone 1. Un cantiere riceve al massimo 4 punti a turno.
- **Edifici con personale:** 4 punti per addetto. Con meno punti producono in proporzione; i robot non possono farne il personale.
- **Unità di controllo:** limitano quante Ruspe e Scavatrici lavorano insieme. Il Modulo di Atterraggio ne dà 4, il Comando Robotico 8, quello avanzato 16.
- **Istruzione:** la Scuola istruisce 80 Studenti a turno e l'Università 30 Universitari. Senza di esse i giovani non avanzano e non lavoreranno mai.
- **Nascite:** un gruppo di 5 bambini ogni 2 turni per Asilo, se cibo e alloggi bastano anche per loro.
