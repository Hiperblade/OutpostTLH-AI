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
Un colono adulto e già istruito uscito da una capsula criogenica: lavora con un quarto del rendimento di un Lavoratore (1 punto lavoro contro 4), non risente della felicità, mangia la metà di un colono, a fine vita lavorativa muore invece di diventare Pensionato e non conta per la vittoria.
_Evitare_: replicante, colono artificiale

**Lotto di cloni**:
I cloni risvegliati nello stesso turno: invecchiano insieme e muoiono tutti nello stesso turno, alla fine della vita lavorativa; il turno prima la colonia riceve l'avviso di scadenza.
_Evitare_: generazione di cloni, gruppo

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

**Sussistenza**:
Quanto supporto vitale (habitat) e cibo bastano alla colonia; sotto il pieno i coloni muoiono di fame o di inospitalità, prima i Pensionati e per ultimi i Bambini, e non nascono bambini.
_Evitare_: sopravvivenza, subsistence

**Benessere**:
Quanto alloggi e cure mediche bastano ai coloni; è basso se manca anche solo uno dei due. Per gli alloggi contano anche i cloni, per le cure mediche no. Più è basso, più coloni si ammalano.
_Evitare_: wellness, salute

**Colono malato**:
Un colono nato sul pianeta che non lavora, non studia e rischia di morire finché non guarisce, da solo o con una cura. I cloni non si ammalano.
_Evitare_: infortunato, invalido

**Cura**:
Il comando con cui il giocatore guarisce i coloni malati, consumando un Kit Medico per malato; a ogni turno se ne possono fare tante quante ne permettono le Strutture Mediche attive. Con le cure automatiche, scelta di tutta la colonia, avviene da sola a ogni turno.
_Evitare_: guarigione (che può anche avvenire da sola)

**Coloni contenti**:
I coloni vivi di ogni età, quando la colonia è in piena sussistenza e la felicità è alta; cloni e capsule non contano.

**Nascita**:
Un gruppo di 5 bambini nati dall'Asilo: ogni Asilo a pieno personale ne prepara uno ogni 2 turni, e nasce solo se la colonia è in piena sussistenza e cibo, alloggi e habitat bastano anche per i nuovi nati. Il giocatore può sospendere le nascite di tutta la colonia: gli Asili restano a riposo.

**Mortalità naturale**:
La morte per vecchiaia dei Pensionati, rallentata dalle cure mediche.

### Lavoro

**Manodopera**:
Il lavoro disponibile in un turno, in punti lavoro: 4 per Lavoratore, 4 per RoboWorker, 2 per Pensionato, 1 per clone; la felicità riduce solo quella di Lavoratori e Pensionati. Cantieri e produzione usano prima quella dei robot, gli edifici con personale solo quella di Lavoratori, Pensionati e cloni. Non si accumula tra un turno e l'altro.
_Evitare_: workforce, work unit, forza lavoro

**Punti lavoro**:
L'unità di misura della manodopera e dei tempi: costruzioni, produzioni e ricerche durano un certo numero di punti, e un cantiere o una produzione riceve al massimo 4 punti a turno (un Lavoratore a tempo pieno).
_Evitare_: turni di lavoro, ore uomo

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
Edificio che a ogni turno richiede manodopera di Lavoratori o cloni per funzionare (laboratori, istruzione, cure mediche, svago, industrie specializzate): 4 punti per ogni addetto; con meno punti funziona e produce in proporzione, senza nessun punto è fermo. I robot non possono farne il personale.
_Evitare_: edificio presidiato

**Edificio a riposo**:
Laboratorio o industria che in questo turno non lavora perché nessuno studio o produzione in coda (né altro edificio) usa ciò che produce: non consuma energia né personale.
_Evitare_: edificio spento, in pausa

**Precedenza del personale**:
L'ordine in cui la manodopera di Lavoratori, Pensionati e cloni va agli edifici con personale, scelto dal giocatore per ogni edificio: Alta, Normale (predefinita) o Bassa; a pari precedenza decide il tipo di edificio.
_Evitare_: priorità (riservato all'ordine fisso dei tipi di edificio)

**Costo per turno di cantiere**:
I materiali che un cantiere consuma a ogni turno di lavoro; se mancano, il cantiere resta fermo quel turno.
_Evitare_: costo di costruzione (inteso come costo una tantum)

**Impianto a Microonde**:
Centrale che riceve energia da un Satellite a Microonde in orbita; consuma il satellite quando viene piazzata e se ne possono avere al massimo 3.
_Evitare_: centrale solare, ripetitore

**Satellite a Microonde**:
Satellite prodotto dalla colonia (con Barre di Ferro) che alimenta un Impianto a Microonde; il kit di atterraggio ne porta uno.

**Centro di ricerca automatico**:
Edificio di superficie che conduce senza coloni le ricerche necessarie a rendere la colonia abitabile.
_Evitare_: laboratorio robotico

### Robot di cantiere

**RoboMiner**:
Robot che avvia una miniera su una risorsa; come RoboDozer e RoboDigger è un'unità consumabile che va prodotta.
_Evitare_: miner, minatore

### Materiali

**Magazzino**:
Lo spazio comune per ciò che il giocatore crea esplicitamente in produzione (Kit Medici, Beni) e per gli scarti di quelle produzioni; robot e satelliti stanno nelle Rimesse, i materiali radioattivi nelle Aree di Stoccaggio.
_Evitare_: deposito, scorta

**Scorta interna**:
La piccola riserva che un edificio conserva di ciò che produce da solo (minerali, cibo, semilavorati); conta per tutta la colonia finché l'edificio esiste, anche se è fermo o a riposo. Ciò che non trova posto va perso.
_Evitare_: deposito interno, magazzino

**Semilavorati**:
I materiali prodotti dagli edifici per altre lavorazioni: Barre di Ferro, unità farmaceutiche e unità per beni.
_Evitare_: intermedi, componenti

**Deposito**:
Edificio di profondità che aumenta la scorta interna di ogni semilavorato.
_Evitare_: magazzino profondo

**Scarti**:
Materiali di risulta delle produzioni (scarti di fusione, tossici, radioattivi) che occupano il magazzino o le Aree di Stoccaggio; quelli di fusione e tossici si smaltiscono, quelli radioattivi si possono solo stoccare.
_Evitare_: waste, rifiuti

### Eventi

**Evento**:
Un fatto imprevisto che colpisce la colonia (incidente, catastrofe, scoperta, ribellione).
_Evitare_: incidente generico, accadimento

**Ribellione**:
Evento causato da una felicità bassa protratta troppo a lungo.
_Evitare_: rivolta
