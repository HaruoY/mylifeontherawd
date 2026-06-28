/**
 * Geocoding inverso condiviso: data una coppia lat/lng, restituisce il nome
 * della nazione tramite l'API pubblica di Nominatim (OpenStreetMap).
 *
 * Usa una cache in localStorage per evitare di richiamare l'API più volte
 * per le stesse coordinate, e una coda seriale per rispettare il limite
 * di fair-use di Nominatim (massimo 1 richiesta al secondo).
 */

const GEO_CACHE_KEY = 'geo-nazione-cache-v4';
const GEO_RICHIESTA_INTERVALLO_MS = 1100;

let geoCache = null;
let geoUltimaRichiesta = 0;
let geoCodaPromise = Promise.resolve();

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
  } catch {
  }
}

function geoChiaveCache(lat, lng) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

async function geoRichiestaConRateLimit(url) {
  geoCodaPromise = geoCodaPromise.then(async () => {
    const attesa = geoUltimaRichiesta + GEO_RICHIESTA_INTERVALLO_MS - Date.now();
    if (attesa > 0) {
      await new Promise(r => setTimeout(r, attesa));
    }
    geoUltimaRichiesta = Date.now();
  });
  await geoCodaPromise;

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' }
  });
  if (!res.ok) throw new Error(`Geocoding fallito: ${res.status}`);
  return res.json();
}

/**
 * Restituisce { nome, codice, stato } per la posizione alle coordinate date.
 * "nome" è il nome della nazione (es. "Denmark"), "codice" è il codice
 * ISO 3166-1 alpha-2 in minuscolo (es. "dk"). "stato" è lo stato federale
 * (es. "California") SOLO quando la nazione è gli Stati Uniti, altrimenti
 * è null — usato per mostrare un pin per stato invece che per nazione
 * nel caso specifico degli USA.
 * Restituisce null se il geocoding fallisce.
 */
async function getNazione(lat, lng) {
  const cache = geoCaricaCache();
  const chiave = geoChiaveCache(lat, lng);

  if (cache[chiave]) {
    return cache[chiave];
  }

  try {
    // zoom=8 (livello regionale) invece di zoom=3 (livello nazionale):
    // necessario per ottenere address.state, ma restituisce comunque
    // anche country/country_code nella stessa risposta.
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=8`;
    const data = await geoRichiestaConRateLimit(url);
    const nome = data && data.address ? data.address.country : null;
    const codice = data && data.address ? data.address.country_code : null;
    const stato = (codice === 'us' && data && data.address) ? data.address.state || null : null;

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
