/**
 * aggiorna-geo-cache.js
 *
 * Genera/aggiorna geo-statica.json risolvendo tutte le coordinate
 * presenti in foto.json che non sono ancora in cache.
 *
 * Uso: node aggiorna-geo-cache.js
 * Lanciarlo dopo ogni pubblicazione di nuove foto.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = __dirname;
const FOTO_JSON = path.join(ROOT_DIR, 'foto.json');
const GEO_STATICA = path.join(ROOT_DIR, 'geo-statica.json');
const INTERVALLO_MS = 1100;

function chiave(lat, lng) {
  return `${parseFloat(lat).toFixed(3)},${parseFloat(lng).toFixed(3)}`;
}

async function risolvi(lat, lng, cache) {
  const k = chiave(lat, lng);
  if (cache[k]) return;

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=8`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'MyLifeOnTheRawd-GeoCache/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} per ${lat},${lng}`);
  const data = await res.json();

  const nome   = data?.address?.country || null;
  const codice = data?.address?.country_code || null;
  const stato  = (codice === 'us' && data?.address?.state) ? data.address.state : null;

  if (nome) {
    cache[k] = { nome, codice, stato };
    console.log(`  ✓ ${k} → ${nome}${stato ? ' / ' + stato : ''}`);
  } else {
    console.warn(`  ? ${k} → nessun risultato`);
  }
}

async function main() {
  console.log('--- Aggiornamento geo-statica.json ---\n');

  const foto = JSON.parse(fs.readFileSync(FOTO_JSON, 'utf8').replace(/^\uFEFF/, ''));
  const cache = fs.existsSync(GEO_STATICA)
    ? JSON.parse(fs.readFileSync(GEO_STATICA, 'utf8'))
    : {};

  const daRisolvere = foto.filter(p =>
    p.lat != null && p.lng != null && !cache[chiave(p.lat, p.lng)]
  );

  if (daRisolvere.length === 0) {
    console.log('Tutte le coordinate sono già in cache. Nessuna chiamata necessaria.');
  } else {
    console.log(`${daRisolvere.length} coordinate nuove da risolvere...\n`);
    for (const p of daRisolvere) {
      await risolvi(p.lat, p.lng, cache);
      await new Promise(r => setTimeout(r, INTERVALLO_MS));
    }
  }

  fs.writeFileSync(GEO_STATICA, JSON.stringify(cache, null, 2) + '\n');
  console.log(`\ngeo-statica.json aggiornato (${Object.keys(cache).length} voci totali).`);

  console.log('\n--- Pubblico su GitHub ---');
  try {
    execSync('git add geo-statica.json', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync('git commit -m "Aggiorna geo-statica.json"', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync('git push', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('Pubblicato!');
  } catch {
    console.error('Errore commit/push. Esegui manualmente: git add geo-statica.json && git commit -m "..." && git push');
  }
}

main().catch(err => { console.error('Errore:', err.message); process.exit(1); });
