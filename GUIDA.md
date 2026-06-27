# Guida al portfolio fotografico

Questa guida copre due cose separate:
- **Parte A** — il setup iniziale, da fare una sola volta
- **Parte B** — come aggiungere una foto, da fare ogni volta che vuoi pubblicare un nuovo scatto

Se hai già un repository GitHub funzionante, salta direttamente alla **Parte B**.

---

## Parte A — Setup iniziale (una volta sola)

### A1. Crea il repository su GitHub

1. Vai su [github.com/new](https://github.com/new)
2. Nome repository: scegli quello che preferisci (es. `portfolio-foto`)
3. Visibilità: **Public** (necessario per usare GitHub Pages gratuitamente)
4. Non aggiungere README, .gitignore o licenza — li abbiamo già pronti
5. Clicca **Create repository**

### A2. Carica i file del progetto

Hai due modi, scegli quello che preferisci.

**Modo 1 — dall'interfaccia web di GitHub (nessun comando)**

1. Nella pagina del repository appena creato, clicca **uploading an existing file**
2. Trascina dentro tutti i file: `index.html`, `foto.json`, `.gitignore`, e le cartelle `images/`, `.github/`, `scripts/` con il loro contenuto
   - Nota: GitHub a volte non accetta il drag&drop di cartelle vuote o annidate dall'interfaccia web. Se la cartella `.github/workflows/` non si carica bene, usa il Modo 2.
3. In basso, scrivi un messaggio di commit (es. "Setup iniziale del portfolio")
4. Clicca **Commit changes**

**Modo 2 — da terminale (consigliato, più affidabile per cartelle annidate)**

```bash
cd cartella-dove-hai-i-file
git init
git add .
git commit -m "Setup iniziale del portfolio"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/portfolio-foto.git
git push -u origin main
```

Sostituisci `TUO-USERNAME` e `portfolio-foto` con i tuoi valori reali.

### A3. Attiva GitHub Pages

1. Nel repository, vai su **Settings** (in alto)
2. Nel menu laterale, clicca **Pages**
3. Sotto **Build and deployment → Source**, seleziona **GitHub Actions** (non "Deploy from a branch" — useremo il workflow automatico)
4. Salva

### A4. Primo deploy automatico

Se hai già fatto il push nel passaggio A2, il workflow si avvia da solo. Verifica così:

1. Vai sulla tab **Actions** del repository
2. Dovresti vedere un'esecuzione in corso o completata, chiamata "Valida e pubblica il portfolio"
3. Se è verde ✅, il sito è online
4. Torna su **Settings → Pages**: in alto trovi l'URL pubblico del tuo sito (tipo `https://tuo-username.github.io/portfolio-foto/`)

Se è rossa ❌, clicca sull'esecuzione per leggere l'errore — il messaggio è pensato per essere comprensibile (es. ti dirà esattamente quale campo manca in `foto.json`).

**Il setup iniziale finisce qui.** Da questo momento, ogni volta che modifichi `foto.json` o aggiungi un'immagine e fai push, il sito si aggiorna da solo in 1-2 minuti, senza altre azioni da parte tua.

### A5. Verifica che le Issue siano abilitate

Il meccanismo per aggiungere foto tramite Issue (Parte B, Modo 1) richiede che le Issue siano attive sul repository — di solito lo sono già di default, ma è bene controllare:

1. **Settings → General**
2. Scorri fino a **Features**
3. Assicurati che la casella **Issues** sia selezionata

Da questo momento, nella tab **Issues → New issue** dovresti vedere il template **📷 Nuova foto** tra le opzioni disponibili.

---

## Parte B — Aggiungere una foto

Hai due modi per aggiungere una foto. Il primo (via Issue) è il più comodo e funziona anche da smartphone, senza aprire file o editor. Il secondo (manuale) resta disponibile come alternativa, utile se preferisci controllare ogni passaggio o se per qualche motivo l'automazione non è disponibile.

### Modo 1 — Tramite Issue (consigliato)

1. Vai sul tuo repository GitHub, tab **Issues → New issue**
2. Scegli il template **📷 Nuova foto**
3. Compila i campi: titolo, categoria, luogo, coordinate (opzionali), data
4. Nel campo **Immagine** in fondo al form, trascina il file della foto (o clicca dentro il campo e scegli "Aggiungi file"). Aspetta che GitHub mostri il link generato automaticamente — non modificarlo
5. Clicca **Submit new issue**
6. Aspetta 1-2 minuti: l'automazione scarica l'immagine, la comprime, aggiorna `foto.json` e fa il commit da sola
7. La Issue si chiude da sé con un commento **✅ Foto pubblicata** quando tutto va a buon fine

**Se qualcosa non va**: la Issue resta aperta, riceve l'etichetta `errore` e un commento che spiega esattamente cosa correggere (es. categoria scritta in modo diverso da quelle previste, o immagine mancante). Puoi semplicemente aprire una nuova Issue corretta.

### Modo 2 — Manuale, tramite carica.html

Usa questo modo se preferisci preparare il file in locale prima di caricarlo, o se vuoi vedere l'anteprima della compressione prima di pubblicare.

#### B1. Prepara la foto con lo strumento locale

1. Apri il file `carica.html` sul tuo computer con doppio clic (si apre nel browser, nessuna installazione richiesta)
2. Trascina la foto che vuoi pubblicare nell'area di caricamento
3. Aspetta un istante: lo strumento la ridimensiona e comprime automaticamente, e ti mostra il confronto tra dimensione originale e compressa
4. Compila i campi:
   - **Titolo** (obbligatorio)
   - **Categoria**: scegli tra Reportage, Street, Architettura, Arte, Paesaggi
   - **Luogo** (es. "Vigo, ES") — opzionale ma consigliato
   - **Latitudine / Longitudine** — opzionali. Se non le conosci, lasciale vuote
   - **Data dello scatto** — pre-compilata con la data di oggi, modificala se serve
5. Clicca **Genera file pronti**

#### B2. Scarica i due output

Nel pannello che appare:
- Clicca **Scarica immagine** → si scarica un file `.jpg` già compresso, con un nome basato sul titolo
- Clicca **Copia** sul blocco JSON → il testo è ora negli appunti del tuo computer

#### B3. Carica l'immagine su GitHub

1. Vai nel tuo repository su GitHub, entra nella cartella `images/`
2. Clicca **Add file → Upload files**
3. Carica il file `.jpg` scaricato al passaggio precedente
4. Commit (puoi scrivere un messaggio breve, es. "Aggiunta foto Galizia")

#### B4. Aggiorna foto.json

1. Sempre nel repository, apri il file `foto.json`
2. Clicca l'icona della **matita** (Edit this file) in alto a destra
3. Trova la parentesi quadra di apertura dell'array (`[` alla prima riga) e posiziona il cursore subito dopo
4. Incolla il blocco JSON che avevi copiato — assicurati che resti dentro le quadre `[ ... ]` dell'array, e che ci sia una virgola tra una voce e l'altra (lo strumento aggiunge già la virgola finale automaticamente)
5. Controlla che il file resti JSON valido: ogni `{ }` deve avere la sua virgola di separazione dal blocco successivo, tranne l'ultimo elemento dell'array
6. In basso, scrivi un messaggio di commit e clicca **Commit changes**

#### B5. Verifica il deploy

1. Vai sulla tab **Actions**
2. Aspetta che l'esecuzione più recente diventi verde ✅ (di solito meno di un minuto)
3. Se diventa rossa ❌, apri il log: lo script di validazione ti dirà esattamente cosa correggere (es. "categoria non valida", "il file images/xyz.jpg non esiste" — capita se hai dimenticato il passaggio B3)
4. Apri il tuo sito (l'URL di GitHub Pages) e verifica che la foto compaia

---

## Come funziona dietro le quinte (per curiosità tecnica)

Ci sono due workflow distinti in `.github/workflows/`:

- **`aggiungi-foto-da-issue.yml`** — si attiva quando apri una Issue dal template "Nuova foto". Estrae i campi dal form, scarica l'immagine, la ridimensiona con la libreria `sharp`, aggiorna `foto.json` e fa un commit su `main`.
- **`deploy.yml`** — si attiva ad ogni push su `main` (quindi anche quando è il workflow precedente a fare il commit). Valida `foto.json` e pubblica su GitHub Pages.

Quando aggiungi una foto via Issue, **vedrai quindi due esecuzioni in sequenza** nella tab Actions: prima quella che elabora la Issue, poi quella di deploy che parte automaticamente dal commit appena creato. È il comportamento corretto, non un errore.

---

## Domande frequenti

**Posso aggiungere più foto in una volta?**
Via Issue: apri una Issue per ciascuna foto (il form richiede un'immagine alla volta). Via metodo manuale: ripeti B1-B2 per ogni foto, poi incolla tutti i blocchi JSON insieme in `foto.json` e carica tutte le immagini insieme in un solo commit.

**Come rimuovo una foto dal sito senza eliminarla?**
Apri `foto.json` su GitHub, trova la voce, e cambia `"pubblicato": true` in `"pubblicato": false`. Resta nel file ma non compare sul sito.

**Ho aperto una Issue ma non succede nulla.**
Controlla che la Issue abbia ricevuto automaticamente l'etichetta `nuova-foto` (la mette il template) — se l'hai creata da "New issue" senza scegliere il template, l'automazione non si attiva. Verifica anche la tab **Actions**: se l'esecuzione non parte nemmeno, controlla in **Settings → Actions → General** che i workflow siano abilitati.

**Posso modificare i dati di una foto già pubblicata tramite Issue?**
No, il meccanismo Issue gestisce solo l'aggiunta di nuove foto. Per modificare titolo, categoria o coordinate di una foto esistente, edita direttamente `foto.json` su GitHub (Modo 2, passaggio B4).

**Cosa faccio se il deploy fallisce e non capisco perché?**
Apri **Actions → l'esecuzione fallita → il passaggio "Controlla che foto.json sia corretto"** (per il deploy) o **"Elabora la Issue"** (per l'aggiunta via Issue): il messaggio elenca ogni problema trovato, in italiano.

**Posso usare un dominio mio invece di github.io?**
Sì, è supportato nativamente da GitHub Pages (Settings → Pages → Custom domain), ma non è coperto in questa guida: se ti interessa, possiamo affrontarlo separatamente.
