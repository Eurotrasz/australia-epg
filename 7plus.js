const puppeteer = require('puppeteer');
const fs = require('fs');

const OUTPUT = './output/7plus_epg.xml';

function escapeXML(str = '') {
  return str
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

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  let epgData = null;

  // 🎯 intercept correct response
  page.on('response', async (response) => {
    try {
      const headers = response.headers();
      const ct = headers['content-type'] || '';

      if (ct.includes('json')) {
        const text = await response.text();

        if (
          text.includes('mediaItems') &&
          text.includes('startTime') &&
          text.includes('endTime')
        ) {
          console.log('🎯 7plus EPG captured');

          epgData = JSON.parse(text);
        }
      }
    } catch (e) {}
  });

  console.log('🌐 Loading 7plus...');
  await page.goto('https://7plus.com.au/live-tv', {
    waitUntil: 'networkidle2'
  });

  await new Promise(r => setTimeout(r, 10000));

  await browser.close();

  if (!epgData) {
    console.log('❌ Failed to capture EPG');
    return;
  }

  // 🔥 convert to XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n`;

  const channels = epgData.mediaItems || [];

  channels.forEach(ch => {
    const channelName = ch.name || 'Unknown';

    const channelId = '7plus.' + channelName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    xml += `  <channel id="${escapeXML(channelId)}">\n`;
    xml += `    <display-name>${escapeXML(channelName)}</display-name>\n`;
    xml += `  </channel>\n`;

    const items = ch.schedules?.items || [];

    items.forEach(p => {
      xml += `  <programme start="${formatDate(p.startTime)}" stop="${formatDate(p.endTime)}" channel="${channelId}">\n`;
      xml += `    <title>${escapeXML(p.title)}</title>\n`;
      xml += `  </programme>\n`;
    });
  });

  xml += `</tv>`;

  fs.writeFileSync(OUTPUT, xml);

  console.log('✅ 7plus EPG generated automatically');
})();