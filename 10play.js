const fs = require('fs');

const OUTPUT = './output/10play_epg.xml';

function escapeXML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + ' +0000';
}

(async () => {
  console.log('🌐 Fetching 10 Play EPG...');

  
const EPG_URL = 'https://10.com.au/api/live-tv/wa';
  
const res = await fetch(EPG_URL, {
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json'
  }
});

const text = await res.text();

// 🧠 detect if it's actually JSON
if (!text.trim().startsWith('{')) {
  console.log('❌ 10Play returned non-JSON (likely blocked)');
  console.log(text.substring(0, 200));
  process.exit(1);
}

const data = JSON.parse(text);

  const schedule = data.schedule?.WA;

  if (!schedule) {
    console.log('❌ No WA schedule found');
    return;
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n`;

  // 🧠 Loop channels (ten, 10bold, 10peach, etc)
  Object.entries(schedule).forEach(([channelKey, programs]) => {

    const channelId = `10play.${channelKey}`;

    xml += `  <channel id="${channelId}">\n`;
    xml += `    <display-name>${channelKey.toUpperCase()}</display-name>\n`;
    xml += `  </channel>\n`;

    programs.forEach(p => {
      const start = new Date(p.startDate);
      const stop = new Date(p.endDate);

      xml += `  <programme start="${formatDate(start)}" stop="${formatDate(stop)}" channel="${channelId}">\n`;
      xml += `    <title>${escapeXML(p.title)}</title>\n`;

      if (p.description) {
        xml += `    <desc>${escapeXML(p.description)}</desc>\n`;
      }

      if (p.rating) {
        xml += `    <rating>\n`;
        xml += `      <value>${escapeXML(p.rating)}</value>\n`;
        xml += `    </rating>\n`;
      }

      xml += `  </programme>\n`;
    });

  });

  xml += `</tv>`;

  fs.writeFileSync(OUTPUT, xml);

  console.log('✅ EPG generated successfully');
})();
