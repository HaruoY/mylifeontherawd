/**
 * ottimizza-immagini.js
 *
 * Comprime tutte le immagini in images/ che superano la soglia di peso,
 * sovrascrivendo il file originale con la versione ottimizzata.
 * Genera anche la thumbnail -thumb.jpg se mancante.
 *
 * Uso: node ottimizza-immagini.js
 * REQUISITI: npm install sharp (già installato)
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR    = __dirname;
const IMAGES_DIR  = path.join(ROOT_DIR, 'images');

const IMG_MAX_PX    = 1600;
const IMG_QUALITY   = 82;
const THUMB_MAX_PX  = 600;
const THUMB_QUALITY = 75;
const SOGLIA_BYTES  = 500 * 1024; // comprime solo file > 500KB

async function main() {
  const sharp = require('sharp');

  const files = fs.readdirSync(IMAGES_DIR)
    .filter(f => /\.(jpe?g)$/i.test(f) && !f.includes('-thumb'));

  console.log(`--- Ottimizzazione immagini (${files.length} file trovati) ---\n`);

  let compresse = 0;
  let thumbnail = 0;
  let saltate   = 0;

  for (const file of files) {
    const percorso = path.join(IMAGES_DIR, file);
    const stat = fs.statSync(percorso);
    const base = file.replace(/\.(jpe?g)$/i, '');
    const ext  = path.extname(file);
    const percorsoThumb = path.join(IMAGES_DIR, `${base}-thumb${ext}`);

    // Comprimi se supera la soglia
    if (stat.size > SOGLIA_BYTES) {
      const prima = (stat.size / 1024).toFixed(0);
      const tmp = percorso + '.tmp.jpg';
      await sharp(percorso)
        .resize({ width: IMG_MAX_PX, height: IMG_MAX_PX, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: IMG_QUALITY })
        .toFile(tmp);
      fs.renameSync(tmp, percorso);
      const dopo = (fs.statSync(percorso).size / 1024).toFixed(0);
      console.log(`✓ ${file}: ${prima}KB → ${dopo}KB`);
      compresse++;
    } else {
      saltate++;
    }

    // Genera thumbnail se mancante
    if (!fs.existsSync(percorsoThumb)) {
      await sharp(percorso)
        .resize({ width: THUMB_MAX_PX, height: THUMB_MAX_PX, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: THUMB_QUALITY })
        .toFile(percorsoThumb);
      console.log(`  → thumbnail: ${base}-thumb${ext}`);
      thumbnail++;
    }
  }

  console.log(`\nCompresse: ${compresse} | Thumbnail generate: ${thumbnail} | Saltate (già ok): ${saltate}`);

  if (compresse + thumbnail === 0) {
    console.log('Nessuna modifica necessaria.');
    return;
  }

  console.log('\n--- Pubblico su GitHub ---');
  try {
    execSync('git add images/', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync(`git commit -m "Ottimizza immagini: ${compresse} compresse, ${thumbnail} thumbnail generate"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync('git push', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('Pubblicato!');
  } catch {
    console.error('Errore commit/push. Esegui manualmente: git add images/ && git commit -m "..." && git push');
  }
}

main().catch(err => { console.error('Errore:', err.message); process.exit(1); });
