#!/usr/bin/env node
/**
 * Valida blog.json prima del deploy.
 * Controlla: JSON sintatticamente valido, campi obbligatori presenti per
 * ogni album e ogni opera, e che ogni immagine_url referenziata esista
 * davvero dentro la cartella images/.
 *
 * Uscita con codice diverso da 0 se trova un problema:
 * questo blocca il deploy di GitHub Pages prima che l'errore arrivi online.
 */

const fs = require('fs');
const path = require('path');

const BLOG_JSON_PATH = path.join(__dirname, '..', 'blog.json');

let errori = [];

let blog;
try {
  let raw = fs.readFileSync(BLOG_JSON_PATH, 'utf8');
  raw = raw.replace(/^\uFEFF/, '');
  blog = JSON.parse(raw);
} catch (err) {
  console.error(`❌ blog.json non è un JSON valido: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(blog)) {
  console.error('❌ blog.json deve contenere un array di album, non un oggetto singolo.');
  process.exit(1);
}

blog.forEach((album, indexAlbum) => {
  const etichettaAlbum = `Album #${indexAlbum + 1} (id: ${album.id ?? 'mancante'}, nome: "${album.nome ?? '?'}")`;

  if (!album.id) errori.push(`${etichettaAlbum}: campo "id" mancante.`);
  if (!album.nome) errori.push(`${etichettaAlbum}: campo "nome" mancante.`);
  if (typeof album.pubblicato !== 'boolean') {
    errori.push(`${etichettaAlbum}: "pubblicato" deve essere true o false (booleano).`);
  }
  if (!Array.isArray(album.opere)) {
    errori.push(`${etichettaAlbum}: campo "opere" deve essere un array.`);
    return;
  }

  album.opere.forEach((opera, indexOpera) => {
    const etichettaOpera = `${etichettaAlbum} → Opera #${indexOpera + 1} ("${opera.titolo ?? '?'}")`;

    if (!opera.titolo) errori.push(`${etichettaOpera}: campo "titolo" mancante.`);
    if (!opera.immagine_url) {
      errori.push(`${etichettaOpera}: campo "immagine_url" mancante.`);
    } else if (opera.immagine_url.startsWith('images/')) {
      const imgPath = path.join(__dirname, '..', opera.immagine_url);
      if (!fs.existsSync(imgPath)) {
        errori.push(`${etichettaOpera}: il file "${opera.immagine_url}" non esiste nella cartella images/. Hai caricato l'immagine?`);
      }
    }
  });
});

const idVisti = new Set();
blog.forEach((album, indexAlbum) => {
  if (idVisti.has(album.id)) {
    errori.push(`Album #${indexAlbum + 1}: id "${album.id}" duplicato — ogni album deve avere un id univoco.`);
  }
  idVisti.add(album.id);
});

if (errori.length > 0) {
  console.error(`\n❌ Trovati ${errori.length} problema/i in blog.json:\n`);
  errori.forEach(e => console.error(`  • ${e}`));
  console.error('\nCorreggi blog.json e fai un nuovo commit. Il deploy è stato bloccato per evitare di pubblicare un sito con dati incompleti.\n');
  process.exit(1);
}

const totaleOpere = blog.reduce((sum, a) => sum + (a.opere?.length || 0), 0);
console.log(`✅ blog.json valido — ${blog.length} album, ${totaleOpere} opera/e totali.`);
process.exit(0);
