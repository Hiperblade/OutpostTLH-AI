# OutpostTLH

Gestionale a turni di una colonia spaziale: si sceglie un pianeta e un sito, si atterra, i robot preparano il sito, si risvegliano i coloni, si fa crescere la colonia e si raggiungono gli obiettivi finali.

## Linguaggio

### Partita

**Partita giocabile**:
Una partita completa, dalla creazione della partita a una condizione di vittoria o di sconfitta, che si può salvare e riprendere.
_Evitare_: demo

**Partita libera**:
Una partita in cui il giocatore sceglie pianeta, sito e obiettivi; può anche non averne nessuno, e allora non si vince ma si gioca finché si vuole.
_Evitare_: sandbox, partita rapida

**Missione**:
Una partita preparata, con nome e presentazione: pianeta e sito fissati, condizioni iniziali, studi ed edifici esclusi, obiettivi ed eventuale limite di turni.
_Evitare_: scenario, livello

**Condizioni iniziali**:
Con cosa parte la colonia di una missione: contenuto del kit di atterraggio, scorte aggiuntive e studi già completati.
_Evitare_: setup, dotazione

**Limite di turni**:
Il numero massimo di turni di una missione: superarlo senza aver completato gli obiettivi è una sconfitta.
_Evitare_: timer, scadenza

**Campagna**:
Una sequenza ordinata di missioni, con nome e presentazione: la prima è subito disponibile, ognuna delle successive si sblocca vincendo la precedente. Le missioni restano indipendenti: ciascuna parte dalle proprie condizioni iniziali.
_Evitare_: storia, carriera

**Avanzamento della campagna**:
Le missioni di una campagna già vinte giocandole dalla campagna; resta anche iniziando altre partite.
_Evitare_: progressi, salvataggio della campagna

**Obiettivo**:
Una condizione da raggiungere per vincere: popolazione felice, lancio della navicella, superintelligenza, terraformazione.
_Evitare_: traguardo, condizione di vittoria

**Creazione della partita**:
La procedura iniziale in cui il giocatore sceglie il tipo di pianeta e il sito di atterraggio.
_Evitare_: setup, nuova mappa

**Fase di preparazione**:
La prima fase della partita (le fasi descrivono l'andamento del gioco, non sono stati distinti): senza coloni svegli, i robot esplorano, trovano le risorse e costruiscono ciò che serve ad accogliere i coloni.

**Fase della colonia**:
La seconda fase, dal risveglio dei coloni: si gestiscono coloni, produzione, cure mediche, istruzione e svago.

**Fase degli obiettivi**:
La terza fase, in cui la colonia lavora ai suoi obiettivi.
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
La colonia completa tutti gli obiettivi della partita.

**Sconfitta**:
Non resta in piedi nessun Headquarter; oppure non resta manodopera e non c'è modo di riaverla (nessun RoboWorker, nessun Lavoratore o clone, nessun Centro Criogenico attivo); oppure, dopo l'arrivo dei primi coloni, non ci sono più coloni, né nascite possibili, né capsule criogeniche, né un Centro Criogenico; oppure, in una missione, si supera il limite di turni.

### Coloni

**Kit di atterraggio**:
Ciò che la colonia riceve atterrando: i moduli di base, i robot di cantiere, i RoboWorker, un satellite a microonde e uno minerario già in orbita; niente cibo e niente coloni.

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

**Popolazione felice**:
L'obiettivo di mantenere una popolazione minima di coloni contenti per un numero stabilito di turni consecutivi; i cloni non contano.

**Lancio della navicella**:
L'obiettivo di produrre allo Spazioporto scafo, motori e carburante della navicella e lanciarla.

**Superintelligenza**:
L'obiettivo di completare gli studi avanzati sull'intelligenza artificiale fino allo studio Superintelligenza, che richiede le unità di calcolo del Mainframe.

**Terraformazione**:
L'obiettivo di accumulare punti di terraformazione con i Terraformatori attivi; i punti non si perdono.
_Evitare_: processore atmosferico

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

**Precedenza**:
L'ordine in cui gli edifici ricevono ciò che serve per lavorare (personale, energia, materiali) e i cantieri robot, manodopera e materiali: prima Alta, poi Normale (predefinita), poi Bassa; a pari precedenza chi produce un materiale lavora prima di chi lo consuma. Un edificio che rifornisce un edificio con precedenza più alta lavora con quella precedenza.
_Evitare_: priorità (riservato all'ordine fisso dei tipi di edificio), precedenza del personale

**Costo per turno di cantiere**:
I materiali che un cantiere consuma a ogni turno di lavoro; se mancano, il cantiere resta fermo quel turno.
_Evitare_: costo di costruzione (inteso come costo una tantum)

**Impianto a Microonde**:
Centrale che riceve energia da un Satellite a Microonde in orbita: ogni impianto in funzione ne usa uno, e quelli senza satellite restano fermi.
_Evitare_: centrale solare, ripetitore

**Satellite**:
Oggetto prodotto dalla colonia e lanciato in orbita da un Silos di Lancio; in orbita ha una durata in turni, poi si esaurisce e libera il posto. Tipi: a microonde, minerario, minerario avanzato, termico avanzato.
_Evitare_: sonda

**Orbita**:
Gli spazi limitati in cui stanno i satelliti: l'orbita a microonde (satelliti a microonde) e l'orbita di osservazione (satelliti minerari e termici), ciascuna con un numero di posti fissato dalla partita.

**Giacimento conosciuto**:
Un giacimento che la colonia ha scoperto da sé: nel sottosuolo e in profondità quando la sua casella è stata rivelata, in superficie quando è entro 10 caselle da un edificio della colonia. Resta sempre sulla minimappa.

**Giacimento rilevato**:
Un giacimento non ancora conosciuto che un satellite di osservazione in orbita mostra sulla minimappa; sparisce quando il satellite si esaurisce.

**Satellite a Microonde**:
Satellite che alimenta un Impianto a Microonde.

**Satellite di osservazione**:
Satellite minerario (giacimenti di metallo e minerali), minerario avanzato (radioattivi) o termico avanzato (fumarole): mostra i giacimenti del suo tipo sulla minimappa.
_Evitare_: satellite spia, sonda

**Silos di Lancio**:
Edificio di superficie che lancia in orbita i satelliti e il Modulo d'Atterraggio Automatizzato, uno a turno.
_Evitare_: rampa, base di lancio

**Modulo d'Atterraggio Automatizzato**:
Modulo prodotto dalla colonia e lanciato da un Silos su un altro punto del sito, dove fonda un avamposto.

**Avamposto**:
Una seconda base della stessa colonia, con un proprio Headquarter e una propria rete di energia e manutenzione; condivide con la colonia materiali, ricerca e popolazione.
_Evitare_: seconda colonia, colonia automatica

**Centro di ricerca automatico**:
Edificio di superficie che conduce senza coloni le ricerche necessarie a rendere la colonia abitabile.
_Evitare_: laboratorio robotico

**Centro di ricerca medico**:
Laboratorio di superficie con personale, l'unico che permette gli studi medici (Virus, Triage, Patogeno alieno, Vaccino); le sue unità di ricerca valgono anche per gli altri studi.
_Evitare_: laboratorio medico, ospedale

**Nucleo di risposta epidemie**:
Edificio che, finché è attivo, dimezza la propagazione di un'epidemia: servono due contagiati per infettare un colono sano. Più nuclei non si sommano.

**Trivella**:
Edificio automatico delle profondità che estrae piccole quantità di metallo e minerali senza bisogno di una risorsa sotto di sé.
_Evitare_: miniera profonda, perforatrice

**Edificio a inclusione**:
Edificio che non esiste nella partita libera e compare solo nelle missioni che lo includono (per esempio la Trivella).
_Evitare_: edificio opzionale, edificio sbloccabile

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

Nella partita libera ogni tipo di evento si può disattivare alla creazione; nelle missioni gli eventi sono spenti finché la missione non li attiva e ne stabilisce probabilità, durata e intensità.

**Nido alieno**:
Struttura aliena dei pianeti giungla, nascosta nel sottosuolo fin dall'inizio come un giacimento; la sua scoperta rende possibili gli studi sul patogeno alieno, e costruire nelle sue vicinanze può far scoppiare un'epidemia.

**Struttura di contenimento**:
Edificio che si costruisce solo su un Nido alieno e, finché esiste, impedisce che quel Nido causi epidemie.
_Evitare_: gabbia, sigillo
_Evitare_: alveare, covo

**Epidemia**:
Evento causato da una costruzione vicino a un Nido alieno non contenuto: all'inizio si ammala l'1% dei coloni nati (i cloni sono immuni) e a ogni turno ogni contagiato ne infetta un altro, finché lo studio Vaccino non ferma il contagio; i malati si curano come sempre con i Kit Medici.
_Evitare_: pandemia, infezione

**Vaccino**:
Lo studio che ferma la propagazione dell'epidemia; compare quando si scopre un Nido alieno e si completa in pochi turni.

**Triage**:
Lo studio che dimezza per sempre la probabilità che i coloni si ammalino.

**Terremoto**:
Evento dei pianeti vulcanici: per alcuni turni danneggia tutti gli edifici di ogni strato, in proporzione alla sua intensità, e può distruggerne alcuni.
_Evitare_: sisma, scossa

**Tempesta di sabbia**:
Evento dei pianeti desertici: per alcuni turni danneggia lievemente gli edifici di superficie e spegne gli Impianti a Microonde.
_Evitare_: tempesta, uragano

**Ribellione**:
Evento causato da una felicità bassa protratta troppo a lungo.
_Evitare_: rivolta
