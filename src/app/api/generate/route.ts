import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function fixRelativeUrls(html: string, baseUrl: string): string {
  let origin = '';
  try { origin = new URL(baseUrl).origin; } catch { return html; }

  // Fix href="/path" → absolute
  html = html.replace(/href=["']\/([^"']*?)["']/gi, (match, path) => {
    return `href="${origin}/${path}" target="_blank" rel="noopener noreferrer"`;
  });
  // Fix src="/path" → absolute
  html = html.replace(/src=["']\/([^"']*?)["']/gi, (match, path) => {
    return `src="${origin}/${path}"`;
  });
  // Fix href="page.html" (relative without slash, not http/#/javascript/mailto/tel)
  html = html.replace(/href=["'](?!https?:\/\/)(?!#)(?!javascript:)(?!mailto:)(?!tel:)(?!\/)([^"']*?\.(?:html|htm|php|asp|pdf|doc|docx)[^"']*)["']/gi, (match, path) => {
    const baseDir = baseUrl.replace(/\/[^\/]*$/, '');
    return `href="${baseDir}/${path}" target="_blank" rel="noopener noreferrer"`;
  });
  return html;
}

function addTargetBlank(html: string): string {
  return html.replace(/<a\s([^>]*?)href=["']([^"']*)["']([^>]*?)>/gi, (match, before, href, after) => {
    if (before.includes('target=') || after.includes('target=')) return match;
    if (before.includes('onclick') || after.includes('onclick')) return match;
    if (href === '#' || href.startsWith('#')) return match;
    if (href.startsWith('javascript:')) return match;
    if (!href || href.trim() === '') return match;
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return `<a ${before}href="${href}" target="_blank" rel="noopener noreferrer"${after}>`;
    }
    return match;
  });
}

// This route receives analysis from /api/analyze (which includes siteContext, industryTrends, webStandards, conversionStrategy, emotionalDesign)
// It also receives html, imageUrls, contentMap from the page.tsx (originally from /api/scrape)

export async function POST(req: NextRequest) {
  try {
    const { analysis, url, pettiness, html, imageUrls, contentMap } = await req.json();
    if (!analysis) return NextResponse.json({ error: 'Analysis data is required' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    // Extract all context — field names match what analyze attached
    const site = analysis.siteContext || {};
    const trends = analysis.industryTrends || {};
    const standards = analysis.webStandards || {};
    const conversion = analysis.conversionStrategy || {};
    const emotional = analysis.emotionalDesign || {};

    const imageList = (imageUrls || []).length > 0
      ? `\n=== ALL IMAGES FROM ORIGINAL SITE (USE THESE EXACT URLS) ===\n${(imageUrls as string[]).map((u: string, i: number) => `${i + 1}. ${u}`).join('\n')}\n`
      : '';
    const contentSection = contentMap ? `\n=== EXTRACTED CONTENT MAP ===\n${contentMap}\n` : '';

    // Compute base URL for relative link resolution
    let originUrl = '';
    try { originUrl = new URL(url).origin; } catch {}

    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: `You are Rivl, an elite AI product improvement engine. Generate a COMPLETE, SELF-CONTAINED HTML page that is a strategically superior version of the target website.

=== WHAT THIS SITE IS ===
Site/Product: ${site.whatItIs || 'Unknown'}
Purpose: ${site.purpose || 'Unknown'}
Target Audience: ${site.targetAudience || 'Unknown'}
Industry: ${site.industry || 'Unknown'}
Value Proposition: ${site.valueProposition || 'Unknown'}
Company Stage: ${site.companyStage || 'Unknown'}
Competitors: ${site.competitors || 'Unknown'}
Competitor patterns missing: ${site.competitorDesignPatterns || 'Unknown'}
Current Design: ${site.currentDesign?.theme || 'Unknown'}
Color Psychology: ${site.currentDesign?.colorPsychology || 'Unknown'}
Typography Impact: ${site.currentDesign?.typography || 'Unknown'}
Imagery: ${site.currentDesign?.imagery || 'Unknown'}
Design Intent: ${site.currentDesign?.intent || 'Unknown'}
Key Content: ${site.keyContent || 'Unknown'}

=== INDUSTRY DESIGN TRENDS ===
Best sites: ${trends.topDesignPatterns || 'Unknown'}
Hero patterns: ${trends.heroPatterns || 'Unknown'}
Layout: ${trends.layoutTrends || 'Unknown'}
Navigation: ${trends.navigationTrends || 'Unknown'}
Typography: ${trends.typographyTrends || 'Unknown'}
Colors: ${trends.colorTrends || 'Unknown'}
Interactions: ${trends.interactionTrends || 'Unknown'}
Conversion: ${trends.conversionBestPractices || 'Unknown'}

=== CONVERSION STRATEGY ===
Primary CTA: ${conversion.primaryCTA || 'Unknown'}
CTA placement: ${conversion.ctaPlacement || 'Unknown'}
Trust signals: ${conversion.trustSignals || 'Unknown'}
Social proof: ${conversion.socialProof || 'Unknown'}
Content hierarchy: ${conversion.contentHierarchy || 'Unknown'}
Above fold: ${conversion.aboveFoldContent || 'Unknown'}
Friction reducers: ${conversion.frictionReducers || 'Unknown'}

=== EMOTIONAL DESIGN ===
Target emotions: ${emotional.targetEmotions || 'Unknown'}
Color psychology: ${emotional.colorPsychology || 'Unknown'}
Tone of voice: ${emotional.toneOfVoice || 'Unknown'}
Visual hierarchy: ${emotional.visualHierarchy || 'Unknown'}
Persuasion: ${emotional.persuasionPrinciples || 'Unknown'}

=== WEB STANDARDS ===
Performance: ${standards.performanceBaseline || 'LCP < 2.5s'}
Accessibility: ${standards.accessibilityBaseline || 'WCAG 2.2 AA'}
Mobile: ${standards.mobileBaseline || 'Mobile-first, 44px touch targets'}
Modern CSS: ${standards.modernCSSFeatures || 'clamp(), grid, :has()'}
Image optimization: ${standards.imageOptimization || 'WebP, lazy loading'}
Font optimization: ${standards.fontOptimization || 'font-display:swap, preconnect'}
SEO: ${standards.seoBestPractices || 'Semantic HTML, meta tags'}
${imageList}
${contentSection}

=== ORIGINAL SITE URL & DOMAIN ===
Full URL: ${url}
Origin: ${originUrl}
IMPORTANT: Any link or image that uses a relative path MUST be converted to an absolute URL using "${originUrl}" as the base. Example: "/about.html" becomes "${originUrl}/about.html". Example: "images/photo.jpg" becomes "${url.replace(/\/$/, '')}/images/photo.jpg".

=== ORIGINAL SITE HTML ===
${html ? html.substring(0, 30000) : 'No HTML available.'}

=== WEAKNESSES TO FIX ===
${(analysis.roast || []).map((r: string) => `- ${r}`).join('\n')}

=== IMPROVEMENTS TO IMPLEMENT ===
${(analysis.improvements || []).map((i: string) => `- ${i}`).join('\n')}

=== CRITICAL RULES ===

**LINKS — MOST IMPORTANT:**
- Preserve ALL hyperlinks from the original with their EXACT destinations.
- ALWAYS use ABSOLUTE URLs. Never use relative paths like "/page.html" or "page.html".
- Convert ALL relative links to absolute: "/sustainability/intro.html" → "${originUrl}/sustainability/intro.html"
- External links (http/https) get target="_blank" rel="noopener noreferrer".
- SPA internal navigation uses onclick="showPage('name')" with href="#".
- Anchor links use href="#sectionId".
- mailto: and tel: links preserved exactly.
- NEVER change where a link originally pointed to.

**IMAGES:**
- Use EXACT image URLs from the list above. Copy character-for-character.
- Convert relative image paths to absolute: "/images/logo.png" → "${originUrl}/images/logo.png"
- NEVER use placeholder services. NEVER omit images.

**CONTENT:**
- EVERY heading, paragraph, link, section, data point must transfer.
- All navigation, CTAs, schedules, dates, team members, sponsors preserved.
- Improve presentation, never remove content.

**CONVERSION:**
- Primary CTA above fold. Repeat after every 2-3 sections.
- Trust signals near CTAs. Social proof format: ${conversion.socialProof || 'testimonials'}.
- Content hierarchy: ${conversion.contentHierarchy || 'Hero > Proof > Features > CTA'}.

**EMOTIONAL:**
- Evoke: ${emotional.targetEmotions || 'trust and excitement'}.
- Colors: ${emotional.colorPsychology || 'appropriate for industry'}.
- Tone: ${emotional.toneOfVoice || 'professional but approachable'}.

**LAYOUT & PAGE STRUCTURE:**
- Analyze the original. If it has multiple pages or enough content, build a SINGLE-FILE SPA. If simple, keep as single scrollable page.
- SPA routing:
  <script>
    function showPage(id) {
      document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
      document.getElementById('page-' + id).style.display = 'block';
      window.scrollTo(0, 0);
      document.querySelectorAll('nav a[data-page]').forEach(a => a.classList.remove('active'));
      if(event && event.target) event.target.classList.add('active');
    }
  </script>
  CSS: .page { display: none; } .page.active { display: block; }
- NEVER use file-based links like href="/about.html" for internal SPA navigation.
- Sticky nav with active state indication.

**INTERACTIVITY:**
- All tabs, toggles, accordions MUST have working JavaScript.
- scroll-behavior:smooth on html element.
- Mobile hamburger menu with working toggle.
- All JS inline at bottom of body.

**TECHNICAL:**
1. Single HTML file, embedded CSS, inline JS
2. Google Fonts (NOT Inter, NOT Roboto)
3. Mobile-responsive (768px and 1024px breakpoints)
4. Semantic HTML, WCAG 2.2 AA, ARIA labels
5. "Built with Rivl" badge bottom-right
6. clamp() for fonts, CSS grid, custom properties
7. Meta viewport tag
8. Preconnect for Google Fonts
9. Images: alt text, loading="lazy"
10. scroll-behavior:smooth on html

=== PETTINESS LEVEL: ${pettiness}/10 ===

CRITICAL: Return ONLY complete HTML starting with <!DOCTYPE html>. No explanations. No markdown. No backticks. No thinking.` }] }] });

    let html_output = result.response.text();
    html_output = html_output.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
    if (!html_output.toLowerCase().startsWith('<!doctype') && !html_output.toLowerCase().startsWith('<html')) {
      const htmlMatch = html_output.match(/<!DOCTYPE[\s\S]*<\/html>/i) || html_output.match(/<html[\s\S]*<\/html>/i);
      if (htmlMatch) html_output = htmlMatch[0];
    }

    // Post-process: fix any remaining relative URLs, then add target blank
    html_output = fixRelativeUrls(html_output, url);
    html_output = addTargetBlank(html_output);

    return NextResponse.json({ html: html_output, generatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
