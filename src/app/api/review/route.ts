import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function safeParseJson(raw: string): any {
  let cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, ' ');
  try { return JSON.parse(cleaned); } catch (e) {
    cleaned = cleaned.replace(/\t/g, ' ').replace(/\r\n/g, ' ').replace(/\n/g, ' ');
    try { return JSON.parse(cleaned); } catch (e2) { return { passed: false, issues: [], summary: 'Failed to parse audit' }; }
  }
}

// This route receives: generatedHtml, originalHtml, imageUrls, contentMap, url, analysis
// analysis contains: siteContext, industryTrends, webStandards, conversionStrategy, emotionalDesign, roast, improvements

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { generatedHtml, originalHtml, imageUrls, contentMap, url, analysis } = body;

  if (!generatedHtml) return NextResponse.json({ error: 'Generated HTML is required' }, { status: 400 });
  if (!process.env.GEMINI_API_KEY) {
    console.log('No Gemini API key — skipping review');
    return NextResponse.json({ reviewed: false, html: generatedHtml, issues: [] });
  }

  console.log('Starting Gemini 3.1 Pro review...');

  // Extract context — field names match what analyze attached
  const site = analysis?.siteContext || {};
  const trends = analysis?.industryTrends || {};
  const standards = analysis?.webStandards || {};
  const conversion = analysis?.conversionStrategy || {};
  const emotional = analysis?.emotionalDesign || {};
  const roast = analysis?.roast || [];
  const improvements = analysis?.improvements || [];

  let originUrl = '';
  try { originUrl = new URL(url).origin; } catch {}

  const siteContextBlock = `
=== SITE CONTEXT ===
What it is: ${site.whatItIs || 'Unknown'}
Purpose: ${site.purpose || 'Unknown'}
Audience: ${site.targetAudience || 'Unknown'}
Industry: ${site.industry || 'Unknown'}
Competitors: ${site.competitors || 'Unknown'}
Design theme: ${site.currentDesign?.theme || 'Unknown'}
Key content: ${site.keyContent || 'Unknown'}

=== TRENDS TO FOLLOW ===
Design patterns: ${trends.topDesignPatterns || 'Unknown'}
Layout: ${trends.layoutTrends || 'Unknown'}
Typography: ${trends.typographyTrends || 'Unknown'}
Colors: ${trends.colorTrends || 'Unknown'}
Interactions: ${trends.interactionTrends || 'Unknown'}

=== CONVERSION RULES ===
Primary CTA: ${conversion.primaryCTA || 'Unknown'}
Trust signals: ${conversion.trustSignals || 'Unknown'}
Content hierarchy: ${conversion.contentHierarchy || 'Unknown'}

=== EMOTIONAL DESIGN ===
Target emotions: ${emotional.targetEmotions || 'Unknown'}
Tone: ${emotional.toneOfVoice || 'Unknown'}

=== STANDARDS ===
Performance: ${standards.performanceBaseline || 'LCP < 2.5s'}
Accessibility: ${standards.accessibilityBaseline || 'WCAG 2.2 AA'}

=== IMPROVEMENTS THAT SHOULD BE IMPLEMENTED ===
${improvements.map((i: string) => `- ${i}`).join('\n') || 'None listed'}

ORIGINAL SITE DOMAIN: ${originUrl}
(All relative URLs should use this as base)
`;

  const imageChecklist = (imageUrls || []).length > 0
    ? (imageUrls as string[]).map((u: string, i: number) => `${i + 1}. ${u}`).join('\n')
    : 'None extracted';

  try {
    const reviewModel = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

    // === PASS 1: Audit ===
    console.log('Review Pass 1: Auditing...');
    const auditResult = await reviewModel.generateContent({ contents: [{ role: 'user', parts: [{ text: `You are an elite QA auditor. You have full context about this site. Find EVERY problem.

${siteContextBlock}

ORIGINAL SITE URL: ${url}
ORIGINAL CONTENT MAP:
${contentMap || 'Not available'}

IMAGES THAT MUST EXIST:
${imageChecklist}

ORIGINAL HTML:
${(originalHtml || '').substring(0, 15000)}

=== GENERATED HTML TO AUDIT ===
${generatedHtml.substring(0, 30000)}

Check ALL of these:
1. MISSING CONTENT: Headings, sections, paragraphs, data, team members, sponsors, FAQs missing from original.
2. MISSING/BROKEN IMAGES: Each image URL from list above — is it present with EXACT original URL? Or placeholder/fake?
3. MISSING/BROKEN LINKS: Every link from original. Are external links absolute (not relative)? Do they have target="_blank"?
4. RELATIVE URL ERRORS: Any href or src using relative paths like "/page.html" instead of absolute "${originUrl}/page.html"?
5. IMPROVEMENTS NOT APPLIED: Were all improvements from the analysis actually implemented?
6. ACCESSIBILITY: Alt texts, ARIA labels, heading hierarchy.
7. INTERACTIVITY: Do tabs, toggles, SPA navigation, hamburger menus have working JavaScript?
8. MOBILE: Will it break on mobile?
9. MISSING "Built with Rivl" BADGE.

Respond with ONLY valid JSON. No markdown. No backticks.

{
  "passed": false,
  "issues": [
    {"category": "missing_content", "severity": "high", "description": "..."},
    {"category": "relative_url", "severity": "high", "description": "...", "originalUrl": "..."},
    {"category": "missing_image", "severity": "high", "description": "...", "originalUrl": "..."}
  ],
  "summary": "<one sentence>"
}

Set "passed": true ONLY if genuinely zero issues. Be strict.` }] }] });

    const audit = safeParseJson(auditResult.response.text());
    const issues = audit.issues || [];
    const passed = audit.passed === true && issues.length === 0;
    console.log(`Audit: ${issues.length} issues. Passed: ${passed}. Summary: ${audit.summary}`);

    if (passed) {
      console.log('Audit passed — returning unchanged');
      return NextResponse.json({ reviewed: true, passed: true, html: generatedHtml, issues: [], issuesFound: 0 });
    }

    // === PASS 2: Fix ===
    console.log(`Review Pass 2: Fixing ${issues.length} issues...`);
    const issueList = issues.map((issue: any, i: number) =>
      `${i + 1}. [${(issue.severity || 'medium').toUpperCase()}] ${issue.category}: ${issue.description}${issue.originalUrl ? ` (correct URL: ${issue.originalUrl})` : ''}`
    ).join('\n');

    const fixResult = await reviewModel.generateContent({ contents: [{ role: 'user', parts: [{ text: `You are a senior frontend developer fixing a generated HTML page. Fix EVERY issue below. Keep the same design.

${siteContextBlock}

ORIGINAL SITE URL: ${url}
SITE DOMAIN: ${originUrl}

CORRECT IMAGE URLS:
${imageChecklist}

ORIGINAL CONTENT:
${contentMap || 'Not available'}

ORIGINAL HTML:
${(originalHtml || '').substring(0, 15000)}

=== ISSUES TO FIX ===
${issueList}

=== RULES ===
- Add back missing content from original HTML.
- Replace placeholder image URLs with correct ones from the list.
- Convert ALL relative URLs to absolute using "${originUrl}" as base.
- External links get target="_blank" rel="noopener noreferrer".
- SPA navigation onclick links do NOT get target="_blank".
- Fix HTML errors, add missing alt texts and ARIA labels.
- Ensure "Built with Rivl" badge in bottom-right.
- Ensure all interactive JS (tabs, toggles, hamburger) works.
- Do NOT redesign — only fix.

=== HTML TO FIX ===
${generatedHtml}

Return COMPLETE fixed HTML starting with <!DOCTYPE html>. No explanations. No markdown. No backticks.` }] }] });

    let fixedHtml = fixResult.response.text().replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
    if (!fixedHtml.toLowerCase().startsWith('<!doctype') && !fixedHtml.toLowerCase().startsWith('<html')) {
      const htmlMatch = fixedHtml.match(/<!DOCTYPE[\s\S]*<\/html>/i) || fixedHtml.match(/<html[\s\S]*<\/html>/i);
      if (htmlMatch) fixedHtml = htmlMatch[0];
      else {
        console.log('Fix pass did not return valid HTML — using original');
        return NextResponse.json({ reviewed: true, passed: false, html: generatedHtml, issues, issuesFound: issues.length });
      }
    }

    console.log(`Review complete: fixed ${issues.length} issues`);
    return NextResponse.json({ reviewed: true, passed: false, issuesFound: issues.length, issues, html: fixedHtml });
  } catch (error: any) {
    console.error('Review error:', error);
    return NextResponse.json({ reviewed: false, html: generatedHtml, issues: [] });
  }
}
