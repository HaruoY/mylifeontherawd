#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const FOTO_JSON_PATH = path.join(__dirname, '..', 'foto.json');
const IMAGES_DIR = path.join(__dirname, '..', 'images');
const CATEGORIE_VALIDE = ['reportage', 'street', 'architettura', 'arte', 'paesaggi'];

const issueBody = process.env.ISSUE_BODY;

if (!issueBody) {
  console.error('Variabile ISSUE_BODY non trovata.');
  process.exit(1);
}

function estraiCampo(body, etichetta) {
  const regex = new RegExp(`### ${etichetta}\\s*\\n\\n([\\s\\S]*?)(?=\\n### |$)`, 'i');
  const match = body.match(regex);
  if (!match) return null;
  const valore = match[1].trim();
  return (valore === '_No response_' || valore === '') ? null : valore;
}

function estraiUrlImmagine(testoImmagine) {
  if (!testoImmagine) return null;
  const matchMarkdown = testoImmagine.match(/!\[.*?\]\((https:\/\/[^\)]+)\)/);
  if (matchMarkdown) return matchMarkdown[1];
  const matchHtml = testoImmagine.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (matchHtml) return matchHtml[1];
  const matchGenerico = testoImmagine.match(/(https:\/\/github\.com\/user-attachments\/assets\/[^\s"'\)]+)/);
  if (matchGenerico) return matchGenerico[1];
  return null;
}

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'foto';
}

function scaricaFile(url, percorsoDestinazione) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'portfolio-bot' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return scaricaFile(res.headers.location, percorsoDestinazione).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download fallito, status ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(percorsoDestinazione);
      res.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(resolve));
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const titolo = estraiCampo(issueBody, 'Titolo');
  const categoria = (estraiCampo(issueBody, 'Categoria') || '').toLowerCase();
  const luogo = estraiCampo(issueBody, 'Luogo');
  const latRaw = estraiCampo(issueBody, 'Latitudine');
  const lngRaw = estraiCampo(issueBody, 'Longitudine');
  const dataRaw = estraiCampo(issueBody, 'Data dello scatto');
  const immagineTesto = estraiCampo(issueBody, 'Immagine');

  const erroriValidazione = [];
  if (!titolo) erroriValidazione.push('Il titolo e obbligatorio.');
  if (!CATEGORIE_VALIDE.includes(categoria)) {
    erroriValidazione.push(`Categoria "${categoria}" non valida.`);
  }

  const lat = latRaw ? parseFloat(latRaw) : null;
  const lng = lngRaw ? parseFloat(lngRaw) : null;
  if (latRaw && (isNaN(lat) || lat < -90 || lat > 90)) erroriValidazione.push(`Latitudine "${latRaw}" non valida.`);
  if (lngRaw && (isNaN(lng) || lng < -180 || lng > 180)) erroriValidazione.push(`Longitudine "${lngRaw}" non valida.`);

  const urlImmagine = estraiUrlImmagine(immagineTesto);
  if (!urlImmagine) {
    erroriValidazione.push('Nessuna immagine trovata.');
  }

  if (erroriValidazione.length > 0) {
    console.error('Validazione fallita');
    erroriValidazione.forEach(e => console.error(`  - ${e}`));
    fs.writeFileSync(path.join(__dirname, 'errori.txt'), erroriValidazione.join('\n'));
    process.exit(1);
  }

  const nomeFile = slugify(titolo) + '.jpg';
  const percorsoTemp = path.join(__dirname, 'temp-' + nomeFile);
  const percorsoFinale = path.join(IMAGES_DIR, nomeFile);

  console.log(`Scarico l'immagine da ${urlImmagine}...`);
  await scaricaFile(urlImmagine, percorsoTemp);

  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const sharp = require('sharp');
  await sharp(percorsoTemp)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(percorsoFinale);

  fs.unlinkSync(percorsoTemp);
  console.log(`Immagine salvata in ${percorsoFinale}`);

  const foto = JSON.parse(fs.readFileSync(FOTO_JSON_PATH, 'utf8'));
  const nuovoId = foto.length > 0 ? Math.max(...foto.map(f => f.id)) + 1 : 1;

  const nuovaVoce = {
    id: nuovoId,
    titolo,
    categoria,
    luogo: luogo || null,
    lat,
    lng,
    data: dataRaw || new Date().toISOString().split('T')[0],
    immagine_url: `images/${nomeFile}`,
    pubblicato: true
  };

  foto.push(nuovaVoce);
  fs.writeFileSync(FOTO_JSON_PATH, JSON.stringify(foto, null, 2) + '\n');
  console.log(`Voce aggiunta a foto.json con id ${nuovoId}.`);

  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    fs.appendFileSync(githubOutput, `titolo=${titolo}\n`);
    fs.appendFileSync(githubOutput, `nome_file=${nomeFile}\n`);
  }
}

main().catch(err => {
  console.error(`Errore durante l'elaborazione: ${err.message}`);
  fs.writeFileSync(path.join(__dirname, 'errori.txt'), `Errore tecnico: ${err.message}`);
  process.exit(1);
});
