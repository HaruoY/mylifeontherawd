/**
 * Geocoding inverso condiviso.
 *
 * Ordine di priorità per ogni coppia lat/lng:
 *   1. geo-statica.json (file nel repo, pre-calcolato, caricato una sola volta)
 *   2. localStorage (cache browser per sessioni successive)
 *   3. Nominatim API (solo per coordinate non ancora note)
 *
 * Questo garantisce che la mappa sia praticamente istantanea per tutte
 * le coordinate già pubblicate, senza chiamate di rete superflue.
 */

const GEO_CACHE_KEY = 'geo-nazione-cache-v4';
const GEO_RICHIESTA_INTERVALLO_MS = 1100;

let geoCache = null;
let geoCacheStatica = null;   // contenuto di geo-statica.json
let geoCacheStaticaPromise = null;
let geoUltimaRichiesta = 0;
let geoCodaPromise = Promise.resolve();

// Carica geo-statica.json una sola volta per pagina
function geoCaricaStatica() {
  if (geoCacheStaticaPromise) return geoCacheStaticaPromise;
  geoCacheStaticaPromise = fetch('./geo-statica.json')
    .then(r => r.ok ? r.json() : {})
    .catch(() => {})
    .then(data => { geoCacheStatica = data || {}; return geoCacheStatica; });
  return geoCacheStaticaPromise;
}

function geoCaricaCache() {
  if (geoCache) return geoCache;
  try {
    geoCache = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
  } catch {
    geoCache = {};
  }
  return geoCache;
}

function geoSalvaCache() {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geoCache));
  } catch {}
}

function geoChiaveCache(lat, lng) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

async function geoRichiestaConRateLimit(url) {
  geoCodaPromise = geoCodaPromise.then(async () => {
    const attesa = geoUltimaRichiesta + GEO_RICHIESTA_INTERVALLO_MS - Date.now();
    if (attesa > 0) await new Promise(r => setTimeout(r, attesa));
    geoUltimaRichiesta = Date.now();
  });
  await geoCodaPromise;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`Geocoding fallito: ${res.status}`);
  return res.json();
}

/**
 * Restituisce { nome, codice, stato } per le coordinate date.
 * Controlla prima geo-statica.json, poi localStorage, poi Nominatim.
 */
async function getNazione(lat, lng) {
  const chiave = geoChiaveCache(lat, lng);

  // 1. Cache statica (file nel repo, nessuna latenza)
  const statica = await geoCaricaStatica();
  if (statica[chiave]) return statica[chiave];

  // 2. Cache localStorage (visite precedenti dello stesso browser)
  const cache = geoCaricaCache();
  if (cache[chiave]) return cache[chiave];

  // 3. Nominatim (solo se la coordinata è nuova)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=8`;
    const data = await geoRichiestaConRateLimit(url);
    const nome   = data?.address?.country || null;
    const codice = data?.address?.country_code || null;
    const stato  = (codice === 'us' && data?.address?.state) ? data.address.state : null;
    if (!nome) return null;
    const risultato = { nome, codice: codice || null, stato };
    cache[chiave] = risultato;
    geoSalvaCache();
    return risultato;
  } catch (err) {
    console.error('Errore nel geocoding inverso:', err);
    return null;
  }
}
