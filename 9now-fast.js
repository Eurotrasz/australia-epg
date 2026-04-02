const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const headers = response.headers();
      const ct = headers['content-type'] || '';

if (ct.includes('json')) {
  const text = await response.text();

  if (
    text.includes('Seinfeld') ||
    text.includes('Top Gear') ||
    text.includes('Crime') ||
    text.includes('Paranormal')
  ) {
    console.log('\n🎯 FOUND FAST CHANNEL DATA:');
    console.log(url);

    fs.writeFileSync('./json/9now_fast.json', text);
  }
}


    } catch (e) {}
  });

  console.log('🌐 Loading 9Now...');
  await page.goto('https://www.9now.com.au/live', {
    waitUntil: 'networkidle2'
  });

  await new Promise(r => setTimeout(r, 15000));

  await browser.close();

  console.log('✅ Capture complete');
})();