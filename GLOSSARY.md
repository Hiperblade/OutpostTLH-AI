# OutpostTLH

Gestionale a turni di una colonia spaziale: si sceglie un pianeta e un sito, si atterra, i robot preparano il sito, si risvegliano i coloni, si fa crescere la colonia e si raggiungono gli obiettivi finali.

## Linguaggio

### Partita

**Partita giocabile**:
Una partita completa, dalla creazione della partita a una condizione di vittoria o di sconfitta, che si può salvare e riprendere.
_Evitare_: demo, sandbox

**Creazione della partita**:
La procedura iniziale in cui il giocatore sceglie il tipo di pianeta e il sito di atterraggio.
_Evitare_: setup, nuova mappa

**Fase di preparazione**:
La prima fase della partita (le fasi descrivono l'andamento del gioco, non sono stati distinti): senza coloni svegli, i robot esplorano, trovano le risorse e costruiscono ciò che serve ad accogliere i coloni.

**Fase della colonia**:
La seconda fase, dal risveglio dei coloni: si gestiscono coloni, produzione, cure mediche, istruzione e svago.

**Fase degli obiettivi**:
La terza fase, in cui la colonia lavora ai traguardi finali come lo spazioporto, la terraformazione e la vittoria.
_Evitare_: endgame

**Tipo di pianeta**:
Una delle sette categorie di pianeta (vulcanico, asteroide, ghiacciato, desertico, giungla, roccioso, pietroso) che determina l'aspetto dei terreni e l'abbondanza di ciascuna risorsa.
_Evitare_: tipologia, typology

**Pianeta**:
Un pianeta del catalogo, appartenente a un tipo di pianeta, con i propri siti.

**Sito**:
La regione del pianeta scelta per l'atterraggio, dove si svolge l'intera partita; la sua mappa del terreno stabilisce la morfologia della superficie.
_Evitare_: mappa, zona

**Morfologia**:
Quanto è praticabile una casella: spianata, sgombra, accidentata, impervia, inaccessibile.
_Evitare_: detriti, difficoltà del terreno

**Vittoria**:
La colonia mantiene una popolazione minima di coloni contenti per un numero stabilito di turni consecutivi; i cloni non contano.

**Sconfitta**:
Non resta in piedi nessun Headquarter; oppure non resta manodopera e non c'è modo di riaverla (nessun RoboWorker, nessun Lavoratore o clone, nessun Centro Criogenico attivo); oppure, dopo l'arrivo dei primi coloni, non ci sono più coloni, né nascite possibili, né capsule criogeniche, né un Centro Criogenico.

### Coloni

**Kit di atterraggio**:
Ciò che la colonia riceve atterrando: i moduli di base, i robot di cantiere e i RoboWorker; niente cibo e niente coloni.

**Capsula criogenica**:
Un clone in attesa di risveglio, preparato dal Centro Criogenico con i minerali; non consuma risorse e non lavora finché non viene risvegliato.
_Evitare_: coloni iniziali, ibernato

**Clone**:
Un colono adulto e già istruito uscito da una capsula criogenica: lavora come un Lavoratore, ma a fine vita lavorativa muore invece di diventare Pensionato e non conta per la vittoria.
_Evitare_: replicante, colono artificiale

**Risveglio**:
La trasformazione di capsule criogeniche in cloni, a gruppi di 5, compiuta da un Centro Criogenico quando cibo, alloggi e habitat bastano per tutti.

**Centro Criogenico**:
Edificio sotterraneo automatico che prepara una capsula criogenica a turno con i minerali, fino a 10, e risveglia i cloni.
_Evitare_: crio-centro, centro di risveglio
_Evitare_: scongelamento

**Generazione**:
I coloni nati nello stesso turno, che attraversano insieme le fasi di vita.

**Bambini**, **Studenti**, **Universitari**, **Lavoratori**, **Pensionati**:
Le fasi di vita di una generazione; i Lavoratori forniscono manodopera e i Pensionati ne forniscono metà, Studenti e Universitari consumano istruzione.
_Evitare_: Infants, Students, Researchers, Scientists, Retirees; Scienziati, Ricercatori

**Felicità**:
Il grado di soddisfazione dei coloni (istruzione, svago, beni); quando è bassa i coloni forniscono meno manodopera.
_Evitare_: happiness, morale

**Coloni contenti**:
I coloni vivi di ogni età, quando la colonia è in piena sussistenza e la felicità è alta; cloni e capsule non contano.

**Mortalità naturale**:
La morte per vecchiaia dei Pensionati, rallentata dalle cure mediche.

### Lavoro

**Manodopera**:
Il lavoro disponibile in un turno, fornito dai Lavoratori, dai cloni, dai Pensionati (che valgono metà) e dai RoboWorker; cantieri e produzione usano prima quella dei robot, gli edifici con personale solo quella dei Lavoratori. Non si accumula tra un turno e l'altro.
_Evitare_: workforce, work unit, forza lavoro

**RoboWorker**:
Robot lavoratore che fornisce manodopera robotica e occupa spazio nel magazzino robotico.
_Evitare_: roboticsWorker, worker, Robo-Worker

**Deterioramento dei robot**:
L'usura che ogni robot accumula lavorando, fino alla fine della sua durata, quando va fuori uso e va sostituito; è una delle sfide della fase di preparazione.
_Evitare_: degrado, rottura

### Costruzione e ricerca

**Edificio automatico**:
Edificio che funziona con la sola energia, senza personale; è ciò che si costruisce nella fase di preparazione.

**Edificio con personale**:
Edificio che a ogni turno richiede manodopera dei Lavoratori per funzionare (laboratori, istruzione, cure mediche, svago, industrie specializzate).
_Evitare_: edificio presidiato

**Costo per turno di cantiere**:
I materiali che un cantiere consuma a ogni turno di lavoro; se mancano, il cantiere resta fermo quel turno.
_Evitare_: costo di costruzione (inteso come costo una tantum)

**Centro di ricerca automatico**:
Edificio di superficie che conduce senza coloni le ricerche necessarie a rendere la colonia abitabile.
_Evitare_: laboratorio robotico

### Robot di cantiere

**RoboMiner**:
Robot che avvia una miniera su una risorsa; come RoboDozer e RoboDigger è un'unità consumabile che va prodotta.
_Evitare_: miner, minatore

### Materiali

**Scarti**:
Materiali di risulta di produzioni e ricette (scarti di fusione, tossici, radioattivi) che occupano il magazzino; quelli di fusione e tossici si smaltiscono, quelli radioattivi si possono solo stoccare.
_Evitare_: waste, rifiuti

### Eventi

**Evento**:
Un fatto imprevisto che colpisce la colonia (incidente, catastrofe, scoperta, ribellione).
_Evitare_: incidente generico, accadimento

**Ribellione**:
Evento causato da una felicità bassa protratta troppo a lungo.
_Evitare_: rivolta
