# Rivl

**Outbuild any product in just a few minutes.**

Rivl is an AI-powered competitive analysis engine that doesn't just critique websites — it rebuilds them better. Paste any URL, pick your pettiness level, and watch as three AI models research, roast, and redesign the site in real-time.

## What it does

1. 🔍 **Scan** — Extracts HTML, images, links, and content from any live site
2. 🧠 **Research** — Gemini 2.5 Flash with Google Search grounding researches competitors, current design trends, conversion psychology, and industry standards in real-time
3. 🔥 **Roast** — Generates a devastating teardown that references specific elements and names competitors doing it better
4. ⚡ **Generate** — Gemini 2.5 Pro builds a strategically superior version using conversion optimization, emotional design, and current industry patterns
5. 🛡️ **Review** — Gemini 3.1 Pro independently audits the output for missing content, broken images, and accessibility issues — then fixes everything it finds

## The Pettiness Slider

Level 1: *Polite Nod* — gentle improvements, same vibe  
Level 5: *No Mercy Review* — every flaw exposed  
Level 10: *Extinction Event* — makes the original look like it was built in 2015

## Tech Stack

- **Framework:** Next.js 14 (TypeScript)
- **Styling:** Tailwind CSS
- **AI Pipeline:** Gemini 2.5 Flash → Gemini 2.5 Pro → Gemini 3.1 Pro Preview
- **AI Features:** Google Search Grounding, multimodal vision, multi-model QA
- **Deployment:** Nexlayer (AI-native cloud, single YAML)

## How it's different

Bolt, Lovable, and v0 build from a **description** — a blank canvas. Rivl builds from a **living competitor**. It's adversarial, not generative. We analyze what exists, find every weakness, and build something specifically better.

## Quick Start
```bash
git clone https://github.com/yourusername/rivl.git
cd rivl
npm install
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local
npm run dev
```

## Deploy to Nexlayer
```bash
docker build --platform=linux/amd64 -t ttl.sh/rivl:1d .
docker push ttl.sh/rivl:1d
# Then deploy via Nexlayer MCP or playground
```

## The Startup Case

Competitive analysis is a **$5B+ market**. Similarweb, Crayon, and Klue give you reports. Rivl gives you a **working alternative**. Target users: founders doing market research, agencies pitching redesigns, product managers evaluating competitor UX.

## Built for

🏆 Hacklanta 2026 — Nexlayer "All-In" Startup Track

---

*Your competitor's worst nightmare just got a deploy button.*
```
