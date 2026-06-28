# Guida al sito — My life on the rawd

Questa guida copre tutto quello che serve per gestire il sito: come è strutturato, come aggiungere foto di viaggio, come aggiungere opere a un album museo, e come risolvere i problemi più comuni.

---

## 1. Come è strutturato il sito

```
index.html      → landing page (foto a piena pagina, nome, "Enter")
map.html        → mappa del mondo + statistiche di viaggio
travel.html     → elenco dei viaggi, raggruppati per nome viaggio
trip.html       → foto di un singolo viaggio (pagina dinamica)
blog.html       → elenco degli album museo
museum.html     → opere di un singolo museo (pagina dinamica)
bio.html        → la tua bio
gear.html       → la tua attrezzatura

foto.json       → dati di tutte le foto di viaggio
blog.json       → dati di tutti gli album museo
images/         → tutte le immagini del sito
```

Il menu in alto, presente in ogni pagina tranne la landing, è: Travel - Map - Blog - Bio - Gear. Cliccare sul nome "My life on the rawd" in alto a sinistra torna sempre alla landing.

---

## 2. Aggiungere una foto di viaggio (via Issue)

1. Vai su Issues -> New issue nel repository
2. Scegli il template Nuova foto
3. Compila Titolo, Categoria (reportage / street / architettura / arte / paesaggi), Luogo, Latitudine/Longitudine, Data
4. Trascina la foto nel campo Immagine
5. Submit new issue

In 1-2 minuti l'automazione scarica la foto, la comprime, l'aggiunge a foto.json, e la Issue si chiude da sola.

Nota: il campo "viaggio" non è nel form, va aggiunto manualmente dopo, o dimmelo in chat.

---

## 3. Aggiungere un'opera a un album museo (via Issue)

1. Issues -> New issue -> Nuova opera (museo)
2. Compila Museo (nome identico ogni volta), Citta del museo, Titolo dell'opera, Artista e anno, Descrizione
3. Trascina la foto dell'opera
4. Submit new issue

Una Issue per ogni opera. Se il museo non esiste viene creato, altrimenti l'opera si aggiunge a quello esistente.

---

## 4. Se qualcosa non si aggiorna sul sito

A. File non scaricato: verifica con dir $HOME\Downloads\nomefile (o Downloads\files\nomefile)
B. File non committato: verifica con git status prima di git add
C. Cache del browser: forza il refresh con Ctrl+Shift+R

Verifica diretta dei dati pubblicati:
https://haruoy.github.io/mylifeontherawd/foto.json
https://haruoy.github.io/mylifeontherawd/blog.json

---

## 5. Comandi di riferimento rapido

```powershell
cd C:\portfolio-foto
git status
git add .
git commit -m "Descrizione della modifica"
git push
git log --oneline -5
```

---

## Domande frequenti

Come rimuovo una foto o un'opera senza eliminarla? Cambia "pubblicato": true in false nel json corrispondente.

Posso avere due viaggi nello stesso paese? Si, il campo viaggio e' testo libero.

Perche' i pin USA mostrano lo stato? Scelta voluta: per gli USA un pin per stato, altrove un pin per nazione.

Come si calcolano i km? Distanza in linea d'aria tra foto consecutive ordinate per data, e' una stima.
