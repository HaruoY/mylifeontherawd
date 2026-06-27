/**
 * Geocoding inverso condiviso: data una coppia lat/lng, restituisce il nome
 * della nazione tramite l'API pubblica di Nominatim (OpenStreetMap).
 *
 * Usa una cache in localStorage per evitare di richiamare l'API più volte
 * per le stesse coordinate, e una coda seriale per rispettare il limite
 * di fair-use di Nominatim (massimo 1 richiesta al secondo).
 */

const GEO_CACHE_KEY = 'geo-nazione-cache-v1';
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
    headers: { 'Accept-Language': 'it' }
  });
  if (!res.ok) throw new Error(`Geocoding fallito: ${res.status}`);
  return res.json();
}

async function getNazione(lat, lng) {
  const cache = geoCaricaCache();
  const chiave = geoChiaveCache(lat, lng);

  if (cache[chiave]) {
    return cache[chiave];
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=3`;
    const data = await geoRichiestaConRateLimit(url);
    const nazione = data && data.address ? data.address.country : null;

    if (nazione) {
      cache[chiave] = nazione;
      geoSalvaCache();
    }

    return nazione;
  } catch (err) {
    console.error('Errore nel geocoding inverso:', err);
    return null;
  }
}
