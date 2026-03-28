import { NextRequest, NextResponse } from 'next/server';

function cleanHtml(raw: string): string {
  let cleaned = raw;
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  cleaned = cleaned.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '[SVG_GRAPHIC]');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
  cleaned = cleaned.replace(/data:[^"'\s)]+/g, '[DATA_URI]');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n/g, '\n');
  return cleaned.trim();
}

function extractImageUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  let origin = '';
  try { origin = new URL(baseUrl).origin; } catch { return urls; }

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    let imgUrl = match[1];
    if (imgUrl.startsWith('data:') || imgUrl.includes('placeholder')) continue;
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
    else if (imgUrl.startsWith('/')) imgUrl = origin + imgUrl;
    else if (!imgUrl.startsWith('http')) { try { imgUrl = new URL(imgUrl, baseUrl).href; } catch { continue; } }
    if (!urls.includes(imgUrl)) urls.push(imgUrl);
  }

  const bgRegex = /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgRegex.exec(html)) !== null) {
    let bgUrl = match[1];
    if (bgUrl.startsWith('data:')) continue;
    if (bgUrl.startsWith('/')) bgUrl = origin + bgUrl;
    else if (!bgUrl.startsWith('http')) { try { bgUrl = new URL(bgUrl, baseUrl).href; } catch { continue; } }
    if (!urls.includes(bgUrl)) urls.push(bgUrl);
  }

  return urls;
}

function extractContentMap(html: string): string {
  const sections: string[] = [];

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) sections.push(`PAGE TITLE: ${titleMatch[1].trim()}`);

  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (metaMatch) sections.push(`META DESCRIPTION: ${metaMatch[1].trim()}`);

  const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  const headings: string[] = [];
  while ((match = headingRegex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text) headings.push(`${match[1].toUpperCase()}: ${text}`);
  }
  if (headings.length) sections.push(`HEADINGS:\n${headings.join('\n')}`);

  const navRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const links: string[] = [];
  while ((match = navRegex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text && text.length < 100) links.push(`${text} → ${match[1]}`);
  }
  if (links.length) sections.push(`NAVIGATION/LINKS:\n${links.slice(0, 50).join('\n')}`);

  const imgRegex2 = /<img[^>]+(?:src=["']([^"']+)["'])[^>]*(?:alt=["']([^"']+)["'])?[^>]*>/gi;
  const images: string[] = [];
  while ((match = imgRegex2.exec(html)) !== null) {
    const src = match[1] || '';
    const alt = match[2] || 'no alt text';
    if (!src.startsWith('data:')) images.push(`IMAGE: src="${src}" alt="${alt}"`);
  }
  if (images.length) sections.push(`IMAGES:\n${images.join('\n')}`);

  return sections.join('\n\n');
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    let targetUrl = url;
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
    try { new URL(targetUrl); } catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }); }

    let screenshot: string | null = null;
    let rawHtml: string | null = null;

    try {
      const ssRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&embed=screenshot.url`);
      const ssData = await ssRes.json();
      if (ssData.status === 'success' && ssData.data?.screenshot?.url) screenshot = ssData.data.screenshot.url;
    } catch (e) { console.log('Screenshot API failed'); }

    try {
      const htmlRes = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(15000),
      });
      rawHtml = await htmlRes.text();
    } catch (e) { console.log('HTML fetch failed:', e); }

    const cleanedHtml = rawHtml ? cleanHtml(rawHtml) : null;
    const imageUrls = rawHtml ? extractImageUrls(rawHtml, targetUrl) : [];
    const contentMap = rawHtml ? extractContentMap(rawHtml) : '';
    const html = cleanedHtml && cleanedHtml.length > 60000 ? cleanedHtml.substring(0, 60000) + '\n<!-- truncated -->' : cleanedHtml;

    return NextResponse.json({ screenshot, html, imageUrls, contentMap, url: targetUrl, scannedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json({ error: error.message || 'Failed to scan target' }, { status: 500 });
  }
}
