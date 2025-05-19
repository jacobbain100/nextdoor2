const { Actor, browserTools } = require('apify');
const puppeteer = require('puppeteer');

Actor.main(async () => {
    const input = await Actor.getInput();
    const { username, password, keywords } = input;

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: await browserTools.getChromiumExecutablePath(),
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    console.log('Logging into Nextdoor...');
    await page.goto('https://nextdoor.com/login/', { waitUntil: 'networkidle2' });
    await page.type('input[name=email]', username);
    await page.type('input[name=password]', password);
    await Promise.all([
        page.click('button[type=submit]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    console.log('Navigating to the feed...');
    await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'networkidle2' });

    await page.waitForSelector('[data-testid="post_message"]');

    const posts = await page.$$eval('[data-testid="post_message"]', nodes => {
        return nodes.map(el => ({
            text: el.innerText,
            url: el.closest('a')?.href || null,
        }));
    });

    const filtered = posts.filter(post =>
        post.text &&
        keywords.some(keyword =>
            post.text.toLowerCase().includes(keyword.toLowerCase())
        )
    );

    console.log(`Found ${filtered.length} matching posts.`);

    for (const post of filtered) {
        await Actor.pushData(post);
    }

    await browser.close();
});
