const fs = require('fs');

const NORMAL = './json/9now_live.json';
const FAST = './json/9now_fast.json';
const OUTPUT = './output/9now_epg.xml';

function escapeXML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date) {
  return new Date(date)
    .toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0] + ' +0000';
}

// 🔍 extract channels (normal + FAST)
function extractChannels(obj) {
  let results = [];

  if (Array.isArray(obj)) {
    obj.forEach(item => {
      results = results.concat(extractChannels(item));
    });
  } else if (typeof obj === 'object' && obj !== null) {

    // 🟢 normal channels
    if (Array.isArray(obj.airings)) {
      results.push({
        name: obj.name,
        programmes: obj.airings
      });
    }

    // 🟡 FAST channels with items (KEY FIX)
    if (Array.isArray(obj.items) && obj.name) {
      results.push({
        name: obj.name,
        programmes: [], // no timestamps
        items: obj.items,
        currentProgramName: obj.currentProgramName
      });
    }

    // fallback (single current show)
    if (obj.name && obj.currentProgramName) {
      results.push({
        name: obj.name,
        programmes: [],
        currentProgramName: obj.currentProgramName
      });
    }

    for (const key in obj) {
      results = results.concat(extractChannels(obj[key]));
    }
  }

  return results;
}

// 📥 load both
const normalData = JSON.parse(fs.readFileSync(NORMAL, 'utf8'));
const fastData = JSON.parse(fs.readFileSync(FAST, 'utf8'));

// 🔥 combine
let channels = [
  ...extractChannels(normalData),
  ...extractChannels(fastData)
];

// 🧹 dedupe
const seen = new Set();
channels = channels.filter(ch => {
  if (!ch.name) return false;

  const key = ch.name.toLowerCase();
  if (seen.has(key)) return false;

  seen.add(key);
  return true;
});

console.log(`📺 Total channels: ${channels.length}`);

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n`;

channels.forEach(ch => {
  const name = ch.name;

  const id = '9now.' + name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  xml += `  <channel id="${escapeXML(id)}">\n`;
  xml += `    <display-name>${escapeXML(name)}</display-name>\n`;
  xml += `  </channel>\n`;

  // 🔥 FAST channels (no real timestamps)
  if (!ch.programmes || ch.programmes.length === 0) {
    const now = new Date();

    // 🧠 use real show names if available
    const items = ch.items || [];

    if (items.length > 0) {
      for (let i = 0; i < Math.min(items.length, 12); i++) {
        const start = new Date(now.getTime() + i * 30 * 60000);
        const stop = new Date(start.getTime() + 30 * 60000);

        const title =
          items[i].title ||
          items[i].name ||
          ch.currentProgramName ||
          name;

        xml += `  <programme start="${formatDate(start)}" stop="${formatDate(stop)}" channel="${id}">\n`;
        xml += `    <title>${escapeXML(title)}</title>\n`;
        xml += `  </programme>\n`;
      }

      return;
    }

    // fallback if nothing else exists
    const fallbackTitle = ch.currentProgramName || name;

    for (let i = 0; i < 12; i++) {
      const start = new Date(now.getTime() + i * 30 * 60000);
      const stop = new Date(start.getTime() + 30 * 60000);

      xml += `  <programme start="${formatDate(start)}" stop="${formatDate(stop)}" channel="${id}">\n`;
      xml += `    <title>${escapeXML(fallbackTitle)}</title>\n`;
      xml += `  </programme>\n`;
    }

    return;
  }

  // 🟢 normal EPG
  ch.programmes.forEach(p => {
    const start = p.startDate || p.startTime;
    const stop = p.endDate || p.endTime;
    const title = p.title || p.name || p.programName || name;

    if (!start || !stop) return;

    xml += `  <programme start="${formatDate(start)}" stop="${formatDate(stop)}" channel="${id}">\n`;
    xml += `    <title>${escapeXML(title)}</title>\n`;
    xml += `  </programme>\n`;
  });
});

xml += `</tv>`;

fs.writeFileSync(OUTPUT, xml);

console.log('✅ FULL 9Now EPG generated (normal + FAST, populated nicely)');