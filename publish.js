/**
 * Script di pubblicazione foto — uso indipendente, senza Claude.
 *
 * COME FUNZIONA:
 * 1. Metti la foto (JPEG) e un file di testo con lo stesso nome nella
 *    cartella nuove-foto/. Esempio:
 *      nuove-foto/tramonto-venezia.jpg
 *      nuove-foto/tramonto-venezia.txt
 *
 * 2. Il file .txt contiene poche righe semplici:
 *      titolo: Tramonto a Venezia
 *      categoria: paesaggi
 *      viaggio: Italy 2026
 *      luogo: Venezia, IT
 *      data: 2026-07-15
 *
 *    (lat/lng sono opzionali: se li lasci fuori, lo script li calcola
 *    da solo a partire dal campo "luogo")
 *
 * 3. Lancia: node publish.js
 *
 * Lo script comprime ogni foto, aggiorna foto.json, sposta gli originali
 * in nuove-foto/pubblicate/, e fa commit + push automaticamente.
 *
 * REQUISITI (da installare una sola volta):
 *   npm install sharp
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = __dirname;
const NUOVE_FOTO_DIR = path.join(ROOT_DIR, 'nuove-foto');
const PUBBLICATE_DIR = path.join(NUOVE_FOTO_DIR, 'pubblicate');
const IMAGES_DIR = path.join(ROOT_DIR, 'images');
const FOTO_JSON_PATH = path.join(ROOT_DIR, 'foto.json');

const CATEGORIE_VALIDE = ['reportage', 'street', 'architettura', 'arte', 'paesaggi'];
const GEO_CACHE_PATH = path.join(ROOT_DIR, '.geo-cache.json');

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'foto';
}

function leggiCacheGeo() {
  try {
    return JSON.parse(fs.readFileSync(GEO_CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function salvaCacheGeo(cache) {
  fs.writeFileSync(GEO_CACHE_PATH, JSON.stringify(cache, null, 2));
}

let ultimaRichiestaGeo = 0;

async function geocodifica(luogo) {
  const cache = leggiCacheGeo();
  if (cache[luogo]) return cache[luogo];

  const attesa = ultimaRichiestaGeo + 1100 - Date.now();
  if (attesa > 0) await new Promise(r => setTimeout(r, attesa));
  ultimaRichiestaGeo = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(luogo)}&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'MyLifeOnTheRawd-PublishScript/1.0 (personal portfolio, github pages)' } });
  if (!res.ok) throw new Error(`Geocoding fallito per "${luogo}": HTTP ${res.status}`);

  const risultati = await res.json();
  if (risultati.length === 0) {
    console.warn(`  Nessuna coordinata trovata per "${luogo}". La foto verra' pubblicata senza posizione.`);
    return null;
  }

  const coords = { lat: parseFloat(risultati[0].lat), lng: parseFloat(risultati[0].lon) };
  cache[luogo] = coords;
  salvaCacheGeo(cache);
  return coords;
}

function leggiMetadati(percorsoTxt) {
  const contenuto = fs.readFileSync(percorsoTxt, 'utf8').replace(/^\uFEFF/, '');
  const dati = {};
  contenuto.split('\n').forEach(riga => {
    const match = riga.match(/^\s*([a-zA-Z_]+)\s*:\s*(.+?)\s*$/);
    if (match) {
      dati[match[1].trim().toLowerCase()] = match[2].trim();
    }
  });
  return dati;
}

function trovaCoppieDaPubblicare() {
  if (!fs.existsSync(NUOVE_FOTO_DIR)) {
    fs.mkdirSync(NUOVE_FOTO_DIR, { recursive: true });
    console.log(`Creata la cartella ${NUOVE_FOTO_DIR}. Metti li' le foto da pubblicare e rilancia lo script.`);
    return [];
  }

  const file = fs.readdirSync(NUOVE_FOTO_DIR);
  const jpgFile = file.filter(f => /\.(jpe?g)$/i.test(f));

  const coppie = [];
  for (const jpg of jpgFile) {
    const base = jpg.replace(/\.(jpe?g)$/i, '');
    const txt = `${base}.txt`;
    if (file.includes(txt)) {
      coppie.push({ jpg, txt, base });
    } else {
      console.warn(`Manca il file di testo "${txt}" per "${jpg}" — questa foto verra' saltata.`);
    }
  }
  return coppie;
}

function validaMetadati(dati, nomeFoto) {
  const errori = [];
  if (!dati.titolo) errori.push('campo "titolo" mancante');
  if (!dati.categoria) {
    errori.push('campo "categoria" mancante');
  } else if (!CATEGORIE_VALIDE.includes(dati.categoria.toLowerCase())) {
    errori.push(`categoria "${dati.categoria}" non valida (valori ammessi: ${CATEGORIE_VALIDE.join(', ')})`);
  }
  if (errori.length > 0) {
    console.error(`"${nomeFoto}": ${errori.join('; ')}. Foto saltata.`);
    return false;
  }
  return true;
}

async function main() {
  console.log('--- Pubblicazione foto: avvio ---\n');

  const sharp = require('sharp');

  const coppie = trovaCoppieDaPubblicare();
  if (coppie.length === 0) {
    console.log('Nessuna foto da pubblicare trovata in nuove-foto/.');
    return;
  }

  console.log(`Trovate ${coppie.length} foto da elaborare.\n`);

  const fotoEsistenti = JSON.parse(fs.readFileSync(FOTO_JSON_PATH, 'utf8').replace(/^\uFEFF/, ''));
  let prossimoId = fotoEsistenti.length > 0 ? Math.max(...fotoEsistenti.map(f => f.id)) + 1 : 1;

  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  if (!fs.existsSync(PUBBLICATE_DIR)) fs.mkdirSync(PUBBLICATE_DIR, { recursive: true });

  const pubblicateOra = [];

  for (const { jpg, txt, base } of coppie) {
    console.log(`-> ${jpg}`);
    const percorsoJpg = path.join(NUOVE_FOTO_DIR, jpg);
    const percorsoTxt = path.join(NUOVE_FOTO_DIR, txt);

    const dati = leggiMetadati(percorsoTxt);
    if (!validaMetadati(dati, jpg)) continue;

    let lat = dati.lat ? parseFloat(dati.lat) : null;
    let lng = dati.lng ? parseFloat(dati.lng) : null;

    if ((lat == null || lng == null) && dati.luogo) {
      console.log(`  Calcolo le coordinate per "${dati.luogo}"...`);
      try {
        const coords = await geocodifica(dati.luogo);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      } catch (err) {
        console.warn(`  ${err.message}`);
      }
    }

    const nomeFileFinale = `${slugify(dati.titolo)}-${prossimoId}.jpg`;
    const percorsoFinale = path.join(IMAGES_DIR, nomeFileFinale);

    await sharp(percorsoJpg)
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 87 })
      .toFile(percorsoFinale);

    const nuovaVoce = {
      id: prossimoId,
      titolo: dati.titolo,
      categoria: dati.categoria.toLowerCase(),
      viaggio: dati.viaggio || null,
      luogo: dati.luogo || null,
      lat: lat,
      lng: lng,
      data: dati.data || new Date().toISOString().split('T')[0],
      immagine_url: `images/${nomeFileFinale}`,
      pubblicato: true
    };

    fotoEsistenti.push(nuovaVoce);
    console.log(`  Aggiunta come "${dati.titolo}" (id ${prossimoId})`);

    fs.renameSync(percorsoJpg, path.join(PUBBLICATE_DIR, jpg));
    fs.renameSync(percorsoTxt, path.join(PUBBLICATE_DIR, txt));

    pubblicateOra.push(dati.titolo);
    prossimoId++;
  }

  if (pubblicateOra.length === 0) {
    console.log('\nNessuna foto valida da pubblicare.');
    return;
  }

  fs.writeFileSync(FOTO_JSON_PATH, JSON.stringify(fotoEsistenti, null, 2) + '\n');
  console.log(`\nfoto.json aggiornato con ${pubblicateOra.length} nuova/e foto.`);

  console.log('\n--- Pubblico su GitHub ---');
  try {
    execSync('git add .', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync(`git commit -m "Aggiunge ${pubblicateOra.length} foto: ${pubblicateOra.join(', ')}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync('git push', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('\nPubblicato! Il sito si aggiornera\' in 1-2 minuti.');
  } catch (err) {
    console.error('\nErrore durante il commit/push. Controlla il messaggio sopra.');
    console.error('Puoi comunque completare manualmente con: git add . && git commit -m "..." && git push');
  }
}

main().catch(err => {
  console.error('\nErrore:', err.message);
  process.exit(1);
});
