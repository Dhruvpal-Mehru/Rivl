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
    console.log('JSON parse attempt 1 failed, trying deeper fix...');
    cleaned = cleaned.replace(/\t/g, ' ').replace(/\r\n/g, ' ').replace(/\n/g, ' ');
    try { return JSON.parse(cleaned); } catch (e2) { throw new Error('Failed to parse Gemini response as JSON'); }
  }
}

// This route receives context from /api/context and passes enriched analysis to /api/generate and /api/review
// Fields attached to output: siteContext, industryTrends, webStandards, conversionStrategy, emotionalDesign

export async function POST(req: NextRequest) {
  try {
    const { screenshot, html, url, pettiness, context } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const pettyDescriptions: Record<number, string> = {
      1: 'very polite and encouraging, point out issues gently',
      2: 'friendly but honest, like a supportive friend',
      3: 'professional and direct, no sugar coating',
      4: 'blunt and somewhat critical',
      5: 'no mercy, call out every flaw directly',
      6: 'savage, use humor to roast the weaknesses',
      7: 'absolutely brutal, each line should sting',
      8: 'corporate warfare mode, as if writing a hostile takeover memo',
      9: 'scorched earth, leave nothing standing',
      10: 'extinction event - the most devastating, witty, and memorable roast possible',
    };
    const pettyTone = pettyDescriptions[pettiness] || pettyDescriptions[5];

    // Extract all context fields — must match what /api/context returns
    const site = context?.siteContext || {};
    const trends = context?.industryTrends || {};
    const standards = context?.webStandards || {};
    const conversion = context?.conversionStrategy || {};
    const emotional = context?.emotionalDesign || {};

    const enrichedContext = `
=== SITE INTELLIGENCE ===
What this site is: ${site.whatItIs || 'Unknown'}
Site purpose: ${site.purpose || 'Unknown'}
Target audience: ${site.targetAudience || 'Unknown'}
Industry: ${site.industry || 'Unknown'}
Value proposition: ${site.valueProposition || 'Unknown'}
Company stage: ${site.companyStage || 'Unknown'}
Top competitors: ${site.competitors || 'Unknown'}
Competitor design patterns missing: ${site.competitorDesignPatterns || 'Unknown'}
Current design theme: ${site.currentDesign?.theme || 'Unknown'}
Current colors: ${site.currentDesign?.colors || 'Unknown'}
Color psychology: ${site.currentDesign?.colorPsychology || 'Unknown'}
Current typography: ${site.currentDesign?.typography || 'Unknown'}
Imagery approach: ${site.currentDesign?.imagery || 'Unknown'}
Design mood: ${site.currentDesign?.mood || 'Unknown'}
Design intent: ${site.currentDesign?.intent || 'Unknown'}
Key content: ${site.keyContent || 'Unknown'}

=== INDUSTRY DESIGN TRENDS ===
Best sites: ${trends.topDesignPatterns || 'Unknown'}
Hero patterns: ${trends.heroPatterns || 'Unknown'}
Layout trends: ${trends.layoutTrends || 'Unknown'}
Navigation trends: ${trends.navigationTrends || 'Unknown'}
Typography trends: ${trends.typographyTrends || 'Unknown'}
Color trends: ${trends.colorTrends || 'Unknown'}
Interaction trends: ${trends.interactionTrends || 'Unknown'}
Conversion best practices: ${trends.conversionBestPractices || 'Unknown'}

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
Performance: ${standards.performanceBaseline || 'Unknown'}
Accessibility: ${standards.accessibilityBaseline || 'Unknown'}
Mobile: ${standards.mobileBaseline || 'Unknown'}
Modern CSS: ${standards.modernCSSFeatures || 'Unknown'}
Image optimization: ${standards.imageOptimization || 'Unknown'}
Font optimization: ${standards.fontOptimization || 'Unknown'}
SEO: ${standards.seoBestPractices || 'Unknown'}

Current date: ${context?.currentDate || new Date().toLocaleDateString()}
`;

    const promptParts: any[] = [];
    if (screenshot) {
      try {
        const imgRes = await fetch(screenshot);
        const imgBuffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(imgBuffer).toString('base64');
        promptParts.push({ inlineData: { data: base64, mimeType: 'image/png' } });
      } catch (e) { console.log('Failed to fetch screenshot'); }
    }

    promptParts.push({ text: `You are Rivl, an elite AI competitive analysis engine. Use ALL the research context provided.

${enrichedContext}

TARGET URL: ${url}
${html ? `TARGET HTML (truncated):\n${html.substring(0, 8000)}` : 'No HTML available.'}

PETTINESS LEVEL: ${pettiness}/10
TONE: ${pettyTone}

Respond with ONLY valid JSON. No markdown. No backticks. No thinking. No trailing commas. All strings on single lines.

{
  "scores": {
    "performance": <number 10-85>,
    "ux": <number 15-80>,
    "accessibility": <number 10-75>,
    "copy": <number 15-80>,
    "overall": <number 15-80>
  },
  "improvedScores": {
    "performance": <realistic improved number>,
    "ux": <realistic improved number>,
    "accessibility": <realistic improved number>,
    "copy": <realistic improved number>,
    "overall": <realistic improved number>
  },
  "roast": [
    "<roast referencing specific element AND naming a competitor doing it better>",
    "<roast about conversion failures>",
    "<roast about emotional design failures>",
    "<roast about specific UX failure>",
    "<roast about copy quality>"
  ],
  "improvements": [
    "<improvement referencing competitor best practice>",
    "<conversion improvement>",
    "<emotional design improvement>",
    "<UX improvement>",
    "<performance improvement>",
    "<accessibility improvement>"
  ],
  "vibe": "<one word>"
}

RULES:
- 5-8 roast lines. Each references specific HTML elements AND compares against named competitors.
- 6-10 improvements. Each is actionable with real trends or competitor patterns.
- improvedScores are realistic — not always 90+. Higher pettiness = bigger gap.
- All string values on single lines. No trailing commas.
- Return ONLY valid JSON.` });

    const result = await model.generateContent(promptParts);
    const analysis = safeParseJson(result.response.text());

    // Attach context for downstream routes (generate + review)
    analysis.siteContext = site;
    analysis.industryTrends = trends;
    analysis.webStandards = standards;
    analysis.conversionStrategy = conversion;
    analysis.emotionalDesign = emotional;

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
