# OutpostTLH

Gestionale a turni di una colonia spaziale: si sceglie un pianeta e un sito, si atterra, si costruisce su tre strati di terreno e si fa crescere la colonia fino alla fine della partita.

## Linguaggio

### Partita

**Partita giocabile**:
Una partita completa, dalla creazione della partita a una condizione di vittoria o di sconfitta, che si può salvare e riprendere.
_Evitare_: demo, sandbox

**Creazione della partita**:
La procedura iniziale in cui il giocatore sceglie il tipo di pianeta e il sito di atterraggio.
_Evitare_: setup, nuova mappa

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
La colonia raggiunge una popolazione minima e la mantiene in piena sussistenza per un numero stabilito di turni consecutivi.

**Sconfitta**:
Tutti i coloni sono morti senza possibilità di nuove nascite, oppure non resta in piedi nessun Headquarter.

### Coloni

**Kit di atterraggio**:
Ciò che la colonia riceve atterrando: i moduli di base, i robot di cantiere, i RoboWorker, una scorta di cibo e un piccolo supporto vitale.

**Coloni iniziali**:
Il primo gruppo di Lavoratori che arriva con il kit di atterraggio, quando il modulo cargo è completato.

**Generazione**:
I coloni nati nello stesso turno, che attraversano insieme le fasi di vita.

**Bambini**, **Studenti**, **Universitari**, **Lavoratori**, **Pensionati**:
Le fasi di vita di una generazione; solo i Lavoratori forniscono manodopera, Studenti e Universitari consumano istruzione.
_Evitare_: Infants, Students, Researchers, Scientists, Retirees; Scienziati, Ricercatori

**Felicità**:
Il grado di soddisfazione dei coloni (istruzione, svago, beni); quando è bassa i coloni forniscono meno manodopera.
_Evitare_: happiness, morale

### Lavoro

**Manodopera**:
Il lavoro disponibile in un turno, fornito dai Lavoratori e dai RoboWorker; è consumata dai cantieri e dalla coda di produzione e non si accumula tra un turno e l'altro.
_Evitare_: workforce, work unit, forza lavoro

**RoboWorker**:
Robot lavoratore che fornisce manodopera robotica e occupa spazio nel magazzino robotico.
_Evitare_: roboticsWorker, worker, Robo-Worker

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
