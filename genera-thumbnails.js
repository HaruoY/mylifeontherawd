/**
 * genera-thumbnails.js
 *
 * Script one-shot per generare le thumbnail delle foto GIA' pubblicate,
 * che non ce l'hanno ancora perche' sono state aggiunte prima del sistema thumbnail.
 *
 * Aggiorna anche foto.json aggiungendo thumbnail_url a ogni voce mancante.
 *
 * Uso: node genera-thumbnails.js
 *
 * REQUISITI: npm install sharp (gia' installato se usi publish.js)
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR      = __dirname;
const IMAGES_DIR    = path.join(ROOT_DIR, 'images');
const FOTO_JSON     = path.join(ROOT_DIR, 'foto.json');

const THUMB_MAX_PX  = 600;
const THUMB_QUALITY = 75;

async function main() {
  const sharp = require('sharp');

  const foto = JSON.parse(fs.readFileSync(FOTO_JSON, 'utf8').replace(/^\uFEFF/, ''));
  let aggiornate = 0;

  for (const voce of foto) {
    if (voce.thumbnail_url) {
      // thumbnail gia' presente, controllo che il file esista fisicamente
      const percorsoThumb = path.join(ROOT_DIR, voce.thumbnail_url);
      if (fs.existsSync(percorsoThumb)) continue;
    }

    if (!voce.immagine_url) continue;

    const percorsoImg = path.join(ROOT_DIR, voce.immagine_url);
    if (!fs.existsSync(percorsoImg)) {
      console.warn(`File non trovato, saltato: ${voce.immagine_url}`);
      continue;
    }

    // Ricava il nome thumb dall'immagine originale
    const ext  = path.extname(voce.immagine_url);           // .jpg
    const base = voce.immagine_url.replace(ext, '');        // images/nome
    const thumbUrl = `${base}-thumb${ext}`;                 // images/nome-thumb.jpg
    const percorsoThumb = path.join(ROOT_DIR, thumbUrl);

    await sharp(percorsoImg)
      .resize({ width: THUMB_MAX_PX, height: THUMB_MAX_PX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: THUMB_QUALITY })
      .toFile(percorsoThumb);

    voce.thumbnail_url = thumbUrl;
    console.log(`✓ ${path.basename(percorsoImg)} → ${path.basename(percorsoThumb)}`);
    aggiornate++;
  }

  if (aggiornate === 0) {
    console.log('Tutte le foto hanno gia\' la thumbnail. Nessuna azione necessaria.');
    return;
  }

  fs.writeFileSync(FOTO_JSON, JSON.stringify(foto, null, 2) + '\n');
  console.log(`\nfoto.json aggiornato (${aggiornate} thumbnail generate).`);

  console.log('\n--- Pubblico su GitHub ---');
  try {
    execSync('git add .', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync(`git commit -m "Genera thumbnail per ${aggiornate} foto esistenti"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync('git push', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('Pubblicato!');
  } catch (err) {
    console.error('Errore commit/push. Esegui manualmente: git add . && git commit -m "..." && git push');
  }
}

main().catch(err => {
  console.error('Errore:', err.message);
  process.exit(1);
});
