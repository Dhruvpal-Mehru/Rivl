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
    try { return JSON.parse(cleaned); } catch (e2) { throw new Error('Failed to parse context JSON'); }
  }
}

// Field names exported by this route — used by analyze, generate, and review:
// siteContext: { whatItIs, purpose, targetAudience, industry, valueProposition, companyStage, competitors, competitorDesignPatterns, currentDesign: { theme, colors, colorPsychology, typography, imagery, mood, intent }, keyContent }
// industryTrends: { topDesignPatterns, heroPatterns, layoutTrends, navigationTrends, typographyTrends, colorTrends, interactionTrends, conversionBestPractices }
// conversionStrategy: { primaryCTA, ctaPlacement, trustSignals, socialProof, contentHierarchy, aboveFoldContent, frictionReducers }
// emotionalDesign: { targetEmotions, colorPsychology, toneOfVoice, visualHierarchy, persuasionPrinciples }
// webStandards: { performanceBaseline, accessibilityBaseline, mobileBaseline, modernCSSFeatures, imageOptimization, fontOptimization, seoBestPractices }
// currentDate: string

export async function POST(req: NextRequest) {
  try {
    const { url, html } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', tools: [{ googleSearch: {} } as any] });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `I need you to deeply research a website and gather comprehensive context. Use Google Search to find real, current information. Be thorough.

TARGET URL: ${url}
${html ? `SITE HTML (first 5000 chars):\n${html.substring(0, 5000)}` : ''}

RESEARCH THE FOLLOWING IN DEPTH:

1. SITE IDENTITY & PURPOSE:
- What is this site/product/company? What exactly do they do?
- Who is their target audience? Demographics, job roles, age range, interests.
- What industry/niche? What is the primary goal? What is their value proposition?
- What stage is the company in?

2. COMPETITIVE LANDSCAPE:
- Top 3-5 competitors. Name them specifically.
- What do the BEST competitor websites look like?
- What design patterns do competitors use that this site is missing?

3. CURRENT DESIGN ANALYSIS:
- Visual identity: colors, typography, imagery style, layout approach.
- What mood/emotion is the design trying to evoke? Why this direction?
- Color psychology of their current palette. Typography effect on brand perception.

4. UI/UX TRENDS FOR THIS INDUSTRY (search for ${new Date().getFullYear()} trends):
- Layout patterns, hero section approaches, navigation patterns.
- Typography and font pairings trending. Color palettes working.
- Micro-interactions, animations, hover effects users expect.

5. CONVERSION & ENGAGEMENT:
- Best CTA patterns and placement for this type of site.
- Trust signals that matter most. Social proof formats that work.
- Ideal content hierarchy. Above-the-fold essentials. Form friction reducers.

6. TECHNICAL STANDARDS:
- Core Web Vitals thresholds. WCAG compliance level. Mobile-first best practices.
- Modern CSS features standard. Image and font optimization. SEO best practices.

7. EMOTIONAL DESIGN & PSYCHOLOGY:
- What emotions should this site evoke? Color psychology for this industry.
- Tone of voice that resonates. Ethical persuasion techniques.

Respond with ONLY valid JSON. No markdown. No backticks. No trailing commas. All string values on a single line.

{
  "siteContext": {
    "whatItIs": "<description>",
    "purpose": "<primary goal>",
    "targetAudience": "<specific demographics>",
    "industry": "<industry>",
    "valueProposition": "<differentiator>",
    "companyStage": "<startup/established/enterprise>",
    "competitors": "<3-5 named competitors with design descriptions>",
    "competitorDesignPatterns": "<patterns competitors use that this site lacks>",
    "currentDesign": {
      "theme": "<visual approach>",
      "colors": "<color scheme>",
      "colorPsychology": "<what colors communicate>",
      "typography": "<font choices and brand impact>",
      "imagery": "<photo/illustration/icon approach>",
      "mood": "<emotional feeling>",
      "intent": "<why this design direction>"
    },
    "keyContent": "<important sections and purpose>"
  },
  "industryTrends": {
    "topDesignPatterns": "<best sites with examples>",
    "heroPatterns": "<effective hero approaches>",
    "layoutTrends": "<current layouts>",
    "navigationTrends": "<nav patterns>",
    "typographyTrends": "<trending fonts with recommendations>",
    "colorTrends": "<trending palettes>",
    "interactionTrends": "<expected animations>",
    "conversionBestPractices": "<what converts>"
  },
  "conversionStrategy": {
    "primaryCTA": "<main call to action>",
    "ctaPlacement": "<where CTAs go>",
    "trustSignals": "<what builds trust>",
    "socialProof": "<best proof format>",
    "contentHierarchy": "<ideal content order>",
    "aboveFoldContent": "<must-see before scroll>",
    "frictionReducers": "<what reduces hesitation>"
  },
  "emotionalDesign": {
    "targetEmotions": "<emotions to evoke>",
    "colorPsychology": "<recommended colors>",
    "toneOfVoice": "<recommended tone>",
    "visualHierarchy": "<key principles>",
    "persuasionPrinciples": "<ethical techniques>"
  },
  "webStandards": {
    "performanceBaseline": "<Core Web Vitals>",
    "accessibilityBaseline": "<WCAG requirements>",
    "mobileBaseline": "<mobile expectations>",
    "modernCSSFeatures": "<CSS features to use>",
    "imageOptimization": "<image best practices>",
    "fontOptimization": "<font loading best practices>",
    "seoBestPractices": "<SEO essentials>"
  },
  "currentDate": "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}"
}

CRITICAL: Use Google Search for REAL data. Return ONLY valid JSON.` }] }]
    });

    const context = safeParseJson(result.response.text());
    return NextResponse.json(context);
  } catch (error: any) {
    console.error('Context enrichment error:', error);
    return NextResponse.json({
      siteContext: { whatItIs: 'Unable to determine', purpose: 'Unknown', targetAudience: 'General web users', industry: 'Unknown', valueProposition: 'Unknown', companyStage: 'Unknown', competitors: 'Unknown', competitorDesignPatterns: 'Unknown', currentDesign: { theme: 'Unknown', colors: 'Unknown', colorPsychology: 'Unknown', typography: 'Unknown', imagery: 'Unknown', mood: 'Unknown', intent: 'Unknown' }, keyContent: 'Unknown' },
      industryTrends: { topDesignPatterns: 'Bento grids, bold typography, dark-mode-first', heroPatterns: 'Split hero with strong CTA', layoutTrends: 'Single-page scroll, card grids', navigationTrends: 'Sticky nav with blur backdrop', typographyTrends: 'Variable fonts, fluid clamp() sizing', colorTrends: 'Dark backgrounds with vibrant accents', interactionTrends: 'Scroll-driven animations, hover reveals', conversionBestPractices: 'CTA above fold, social proof, minimal forms' },
      conversionStrategy: { primaryCTA: 'Unknown', ctaPlacement: 'Above fold and after key sections', trustSignals: 'Testimonials, logos, stats', socialProof: 'User testimonials with photos', contentHierarchy: 'Hero > Social proof > Features > CTA', aboveFoldContent: 'Headline, subtext, CTA, visual', frictionReducers: 'Free trial, no credit card, instant access' },
      emotionalDesign: { targetEmotions: 'Trust and excitement', colorPsychology: 'Blue for trust, orange for energy', toneOfVoice: 'Professional but approachable', visualHierarchy: 'Large headline > supporting text > CTA', persuasionPrinciples: 'Social proof, authority, scarcity' },
      webStandards: { performanceBaseline: 'LCP < 2.5s, INP < 200ms, CLS < 0.1', accessibilityBaseline: 'WCAG 2.2 AA', mobileBaseline: 'Mobile-first, 44px touch targets', modernCSSFeatures: 'clamp(), container queries, :has(), subgrid', imageOptimization: 'WebP/AVIF, lazy loading, srcset', fontOptimization: 'font-display:swap, preconnect, variable fonts', seoBestPractices: 'Semantic HTML, meta tags, Open Graph, structured data' },
      currentDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      _fallback: true,
    });
  }
}
