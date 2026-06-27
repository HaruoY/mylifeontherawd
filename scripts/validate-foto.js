#!/usr/bin/env node
/**
 * Valida foto.json prima del deploy.
 * Controlla: JSON sintatticamente valido, campi obbligatori presenti,
 * categoria tra i valori consentiti, e che ogni immagine_url referenziata
 * esista davvero dentro la cartella images/.
 *
 * Uscita con codice diverso da 0 se trova un problema:
 * questo blocca il deploy di GitHub Pages prima che l'errore arrivi online.
 */

const fs = require('fs');
const path = require('path');

const FOTO_JSON_PATH = path.join(__dirname, '..', 'foto.json');
const IMAGES_DIR = path.join(__dirname, '..', 'images');
const CATEGORIE_VALIDE = ['reportage', 'street', 'architettura', 'arte', 'paesaggi'];
const CAMPI_OBBLIGATORI = ['id', 'titolo', 'categoria', 'immagine_url', 'pubblicato'];

let errori = [];

// 1. Il file esiste ed è JSON valido?
let foto;
try {
  let raw = fs.readFileSync(FOTO_JSON_PATH, 'utf8');
  // Rimuove un eventuale BOM (Byte Order Mark) iniziale: alcuni editor o
  // comandi (es. PowerShell Set-Content -Encoding utf8) lo aggiungono
  // automaticamente, e JSON.parse() non lo tollera.
  raw = raw.replace(/^\uFEFF/, '');
  foto = JSON.parse(raw);
} catch (err) {
  console.error(`❌ foto.json non è un JSON valido: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(foto)) {
  console.error('❌ foto.json deve contenere un array di oggetti, non un oggetto singolo.');
  process.exit(1);
}

// 2. Ogni voce ha i campi obbligatori e valori validi?
foto.forEach((item, index) => {
  const etichetta = `Voce #${index + 1} (id: ${item.id ?? 'mancante'}, titolo: "${item.titolo ?? '?'}")`;

  CAMPI_OBBLIGATORI.forEach(campo => {
    if (item[campo] === undefined || item[campo] === null || item[campo] === '') {
      errori.push(`${etichetta}: campo obbligatorio "${campo}" mancante o vuoto.`);
    }
  });

  if (item.categoria && !CATEGORIE_VALIDE.includes(item.categoria)) {
    errori.push(`${etichetta}: categoria "${item.categoria}" non valida. Valori ammessi: ${CATEGORIE_VALIDE.join(', ')}.`);
  }

  if (typeof item.pubblicato !== 'boolean') {
    errori.push(`${etichetta}: "pubblicato" deve essere true o false (booleano), non una stringa.`);
  }

  // 3. Se l'immagine è locale (dentro images/), controlla che il file esista davvero.
  if (item.immagine_url && item.immagine_url.startsWith('images/')) {
    const imgPath = path.join(__dirname, '..', item.immagine_url);
    if (!fs.existsSync(imgPath)) {
      errori.push(`${etichetta}: il file "${item.immagine_url}" non esiste nella cartella images/. Hai caricato l'immagine?`);
    }
  }

  if (item.lat != null && (item.lat < -90 || item.lat > 90)) {
    errori.push(`${etichetta}: latitudine "${item.lat}" fuori range (-90, 90) — probabile errore di inserimento.`);
  }
  if (item.lng != null && (item.lng < -180 || item.lng > 180)) {
    errori.push(`${etichetta}: longitudine "${item.lng}" fuori range (-180, 180) — probabile errore di inserimento.`);
  }
});

// 4. ID duplicati?
const idVisti = new Set();
foto.forEach((item, index) => {
  if (idVisti.has(item.id)) {
    errori.push(`Voce #${index + 1}: id "${item.id}" duplicato — ogni foto deve avere un id univoco.`);
  }
  idVisti.add(item.id);
});

if (errori.length > 0) {
  console.error(`\n❌ Trovati ${errori.length} problema/i in foto.json:\n`);
  errori.forEach(e => console.error(`  • ${e}`));
  console.error('\nCorreggi foto.json e fai un nuovo commit. Il deploy è stato bloccato per evitare di pubblicare un sito con dati incompleti.\n');
  process.exit(1);
}

console.log(`✅ foto.json valido — ${foto.length} scatto/i, ${foto.filter(f => f.pubblicato).length} pubblicato/i.`);
process.exit(0);
