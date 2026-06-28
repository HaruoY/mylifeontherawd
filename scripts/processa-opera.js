/**
 * Elabora una Issue "Nuova opera (museo)" creata dal template GitHub Issue
 * Forms. Estrae i campi, scarica l'immagine allegata, la ridimensiona,
 * la salva in images/ e aggiunge l'opera all'album museo corrispondente
 * in blog.json — creando l'album se non esiste ancora.
 *
 * Pensato per essere eseguito da GitHub Actions, con il corpo della
 * Issue passato tramite variabile d'ambiente ISSUE_BODY.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BLOG_JSON_PATH = path.join(__dirname, '..', 'blog.json');
const IMAGES_DIR = path.join(__dirname, '..', 'images');

const issueBody = process.env.ISSUE_BODY;

if (!issueBody) {
  console.error('❌ Variabile ISSUE_BODY non trovata. Questo script va eseguito da GitHub Actions.');
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
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'opera';
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
  const museo = estraiCampo(issueBody, 'Museo');
  const luogoMuseo = estraiCampo(issueBody, 'Città del museo');
  const titoloOpera = estraiCampo(issueBody, 'Titolo dell\'opera');
  const artista = estraiCampo(issueBody, 'Artista e anno');
  const descrizione = estraiCampo(issueBody, 'Descrizione');
  const immagineTesto = estraiCampo(issueBody, 'Immagine');

  const erroriValidazione = [];

  if (!museo) erroriValidazione.push('Il nome del museo è obbligatorio.');
  if (!titoloOpera) erroriValidazione.push('Il titolo dell\'opera è obbligatorio.');

  const urlImmagine = estraiUrlImmagine(immagineTesto);
  if (!urlImmagine) {
    erroriValidazione.push('Nessuna immagine trovata. Assicurati di averla trascinata nel campo "Immagine" e che il link sia stato generato da GitHub.');
  }

  if (erroriValidazione.length > 0) {
    console.error('::error::Validazione fallita');
    erroriValidazione.forEach(e => console.error(`  • ${e}`));
    fs.writeFileSync(path.join(__dirname, 'errori.txt'), erroriValidazione.join('\n'));
    process.exit(1);
  }

  // Scarica l'immagine originale in una posizione temporanea.
  // Il nome del file combina museo + titolo opera per evitare collisioni
  // tra opere omonime di musei diversi.
  const nomeFile = `${slugify(museo)}-${slugify(titoloOpera)}.jpg`;
  const percorsoTemp = path.join(__dirname, 'temp-' + nomeFile);
  const percorsoFinale = path.join(IMAGES_DIR, nomeFile);

  console.log(`Scarico l'immagine da ${urlImmagine}...`);
  await scaricaFile(urlImmagine, percorsoTemp);

  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const sharp = require('sharp');
  await sharp(percorsoTemp)
    .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(percorsoFinale);

  fs.unlinkSync(percorsoTemp);
  console.log(`Immagine salvata in ${percorsoFinale}`);

  // Aggiorna blog.json: trova l'album del museo, o lo crea se non esiste.
  const blogRaw = fs.readFileSync(BLOG_JSON_PATH, 'utf8').replace(/^\uFEFF/, '');
  const blog = JSON.parse(blogRaw);

  let album = blog.find(m => m.nome === museo);

  if (!album) {
    const nuovoId = blog.length > 0 ? Math.max(...blog.map(m => m.id)) + 1 : 1;
    album = {
      id: nuovoId,
      nome: museo,
      luogo: luogoMuseo || null,
      pubblicato: true,
      opere: []
    };
    blog.push(album);
    console.log(`Creato nuovo album: "${museo}"`);
  } else {
    console.log(`Aggiungo l'opera all'album esistente: "${museo}"`);
  }

  album.opere.push({
    titolo: titoloOpera,
    artista: artista || null,
    immagine_url: `images/${nomeFile}`,
    descrizione: descrizione || null
  });

  fs.writeFileSync(BLOG_JSON_PATH, JSON.stringify(blog, null, 2) + '\n');

  console.log(`✅ Opera "${titoloOpera}" aggiunta all'album "${museo}".`);

  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    fs.appendFileSync(githubOutput, `titolo=${titoloOpera}\n`);
    fs.appendFileSync(githubOutput, `museo=${museo}\n`);
  }
}

main().catch(err => {
  console.error(`❌ Errore durante l'elaborazione: ${err.message}`);
  fs.writeFileSync(path.join(__dirname, 'errori.txt'), `Errore tecnico: ${err.message}`);
  process.exit(1);
});
