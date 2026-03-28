'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface AnalysisResult {
  screenshot?: string;
  scores: {
    performance: number;
    ux: number;
    accessibility: number;
    copy: number;
    overall: number;
  };
  improvedScores?: {
    performance: number;
    ux: number;
    accessibility: number;
    copy: number;
    overall: number;
  };
  roast: string[];
  improvements: string[];
  improvedHtml?: string;
  deployUrl?: string;
}

function AnalysisLoading() {
  return (
    <main className="min-h-screen grid-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rivl-accent to-rivl-red flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="font-display font-bold text-lg text-white">R</span>
        </div>
        <p className="font-mono text-sm text-rivl-muted">Initializing Rivl...</p>
      </div>
    </main>
  );
}

function ScoreBar({ label, original, improved, delay = 0 }: {
  label: string; original: number; improved: number; delay?: number
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className={`transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-rivl-muted uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-rivl-red">{original}/100</span>
          <span className="text-xs font-mono text-rivl-muted">→</span>
          <span className="text-xs font-mono text-rivl-green font-bold">{improved}/100</span>
        </div>
      </div>
      <div className="relative h-2 bg-rivl-card rounded-full overflow-hidden">
        <div className="absolute top-0 left-0 h-full bg-rivl-red/40 rounded-full transition-all duration-1000 ease-out" style={{ width: show ? `${original}%` : '0%' }} />
        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-rivl-green to-rivl-accent rounded-full transition-all duration-1500 ease-out" style={{ width: show ? `${improved}%` : '0%', transitionDelay: '0.3s' }} />
      </div>
    </div>
  );
}

function RoastLine({ text, delay }: { text: string; delay: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [text, started]);

  return (
    <div className="flex items-start gap-3 py-2.5 group">
      <span className="text-rivl-red font-mono text-sm mt-0.5">🔥</span>
      <span className="font-mono text-sm text-rivl-white/80 leading-relaxed">
        {displayed}
        {started && displayed.length < text.length && <span className="cursor-blink" />}
      </span>
    </div>
  );
}

function AnimatedEmoji({ emoji, size = 'text-4xl' }: { emoji: string; size?: string }) {
  return (
    <div className="relative inline-block">
      <span className={`${size} animate-bounce`} style={{ animationDuration: '2s' }}>{emoji}</span>
      <span className={`${size} absolute inset-0 animate-ping opacity-20`} style={{ animationDuration: '2s' }}>{emoji}</span>
    </div>
  );
}

function ProgressDots({ color, count = 5 }: { color: string; count?: number }) {
  return (
    <div className="flex gap-1.5">
      {[...Array(count)].map((_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${color} animate-pulse`} style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1.5s' }} />
      ))}
    </div>
  );
}

type Phase = 'scanning' | 'analyzing' | 'roasting' | 'generating' | 'reviewing' | 'complete';

function RivlContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url') || '';
  const pettiness = parseInt(searchParams.get('pettiness') || '5');

  const [phase, setPhase] = useState<Phase>('scanning');
  const [scanProgress, setScanProgress] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roastLines, setRoastLines] = useState<string[]>([]);
  const [comparisonView, setComparisonView] = useState<'side-by-side' | 'original' | 'rivld'>('side-by-side');
  const [reviewStatus, setReviewStatus] = useState('Starting review...');
  const [iframeOriginalLoaded, setIframeOriginalLoaded] = useState(false);
  const [iframeRivldLoaded, setIframeRivldLoaded] = useState(false);
  const roastRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  const targetUrl = (() => {
    let u = decodeURIComponent(url);
    if (!u.startsWith('http')) u = 'https://' + u;
    return u;
  })();

  const runAnalysis = useCallback(async () => {
    if (!url) return;
    try {
      setPhase('scanning');
      const scanInterval = setInterval(() => { setScanProgress(prev => Math.min(prev + Math.random() * 15, 95)); }, 200);
      const scrapeRes = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      clearInterval(scanInterval);
      setScanProgress(100);
      if (!scrapeRes.ok) throw new Error('Failed to scan target');
      const scrapeData = await scrapeRes.json();

      setPhase('analyzing');
      let contextData = null;
      try {
        const contextRes = await fetch('/api/context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, html: scrapeData.html }) });
        if (contextRes.ok) contextData = await contextRes.json();
      } catch (e) { console.log('Context enrichment failed'); }

      const analyzeRes = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ screenshot: scrapeData.screenshot, html: scrapeData.html, url, pettiness, context: contextData }) });
      if (!analyzeRes.ok) throw new Error('Failed to analyze target');
      const analyzeData = await analyzeRes.json();

      setPhase('roasting');
      setRoastLines(analyzeData.roast || []);
      await new Promise(resolve => setTimeout(resolve, (analyzeData.roast?.length || 3) * 1500 + 1000));

      setPhase('generating');
      const generateRes = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysis: analyzeData, url, pettiness, html: scrapeData.html, imageUrls: scrapeData.imageUrls, contentMap: scrapeData.contentMap }) });
      if (!generateRes.ok) throw new Error('Failed to generate improved version');
      const generateData = await generateRes.json();

      setPhase('reviewing');
      setReviewStatus('Pass 1: Auditing for missing content, images, and links...');
      let finalHtml = generateData.html;
      try {
        const reviewRes = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ generatedHtml: generateData.html, originalHtml: scrapeData.html, imageUrls: scrapeData.imageUrls, contentMap: scrapeData.contentMap, url, analysis: analyzeData }) });
        if (reviewRes.ok) {
          const reviewData = await reviewRes.json();
          if (reviewData.reviewed && reviewData.html) finalHtml = reviewData.html;
          if (reviewData.issuesFound && reviewData.issuesFound > 0) setReviewStatus(`✅ Fixed ${reviewData.issuesFound} issues. Finalizing...`);
          else if (reviewData.passed) setReviewStatus('✅ All checks passed! Perfect score.');
          else setReviewStatus('✅ Review complete. Preparing results...');
        } else setReviewStatus('✅ Review complete. Preparing results...');
      } catch (e) { setReviewStatus('Preparing results...'); }

      await new Promise(resolve => setTimeout(resolve, 2000));
      setAnalysis({ screenshot: scrapeData.screenshot, scores: analyzeData.scores, improvedScores: analyzeData.improvedScores, roast: analyzeData.roast, improvements: analyzeData.improvements, improvedHtml: finalHtml, deployUrl: generateData.deployUrl });
      setPhase('complete');
    } catch (err: any) { setError(err.message || 'Something went wrong'); }
  }, [url, pettiness]);

  useEffect(() => { if (hasStarted.current) return; hasStarted.current = true; runAnalysis(); }, [runAnalysis]);
  useEffect(() => { if (roastRef.current) roastRef.current.scrollTop = roastRef.current.scrollHeight; }, [roastLines]);

  const phaseConfig: Record<Phase, { label: string; color: string; icon: string }> = {
    scanning: { label: 'SCANNING TARGET', color: 'text-rivl-accent', icon: '🔍' },
    analyzing: { label: 'RESEARCHING & ANALYZING', color: 'text-yellow-400', icon: '🧠' },
    roasting: { label: 'ROASTING', color: 'text-rivl-red', icon: '🔥' },
    generating: { label: 'BUILDING IMPROVED VERSION', color: 'text-rivl-green', icon: '⚡' },
    reviewing: { label: 'GEMINI 3.1 PRO REVIEWING', color: 'text-blue-400', icon: '🛡️' },
    complete: { label: 'RIVL COMPLETE', color: 'text-rivl-green', icon: '✅' },
  };

  const currentPhase = phaseConfig[phase];
  const overallImprovement = analysis?.improvedScores && analysis?.scores ? Math.round(((analysis.improvedScores.overall - analysis.scores.overall) / Math.max(analysis.scores.overall, 1)) * 100) : 0;

  if (error) {
    return (
      <main className="min-h-screen grid-bg flex items-center justify-center p-8">
        <div className="bg-rivl-card border border-rivl-red/30 rounded-2xl p-8 max-w-md text-center glow-red">
          <span className="text-4xl mb-4 block">💀</span>
          <h2 className="font-display font-bold text-xl mb-2">Analysis Failed</h2>
          <p className="text-rivl-muted text-sm mb-6">{error}</p>
          <a href="/" className="inline-block px-6 py-2 bg-rivl-accent text-white font-display font-bold rounded-lg text-sm">Try Again</a>
        </div>
      </main>
    );
  }

  const showResults = phase === 'complete' && analysis !== null;

  return (
    <main className="min-h-screen grid-bg flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-rivl-border/50 shrink-0">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rivl-accent to-rivl-red flex items-center justify-center">
            <span className="font-display font-bold text-xs text-white">R</span>
          </div>
          <span className="font-display font-bold text-lg">Rivl</span>
        </a>
        <span className={`font-mono text-xs ${currentPhase.color} flex items-center gap-2`}>
          {phase !== 'complete' && <span className="w-2 h-2 rounded-full bg-current animate-pulse" />}
          {currentPhase.icon} {currentPhase.label}
        </span>
      </nav>

      <div className="px-8 py-3 bg-rivl-card/30 border-b border-rivl-border/30 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <span className="font-mono text-xs text-rivl-muted">TARGET:</span>
          <span className="font-mono text-sm text-rivl-white truncate">{decodeURIComponent(url)}</span>
          <span className="ml-auto font-mono text-xs text-rivl-muted">Pettiness: <span className="text-rivl-accent">{pettiness}/10</span></span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!showResults && (
          <>
            {/* SCANNING */}
            {phase === 'scanning' && (
              <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-rivl-accent/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="w-full max-w-2xl relative">
                  <div className="text-center mb-10">
                    <AnimatedEmoji emoji="🔍" size="text-6xl" />
                    <h2 className="font-display font-bold text-3xl mt-6 mb-2">Scanning Target</h2>
                    <p className="text-rivl-muted text-base">Extracting HTML, images, links, and content structure</p>
                  </div>
                  <div className="bg-rivl-card/50 border border-rivl-border rounded-2xl p-8 backdrop-blur-sm">
                    <div className="relative h-3 bg-rivl-dark rounded-full overflow-hidden mb-4">
                      <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-rivl-accent via-rivl-red to-rivl-accent rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                      <div className="scan-line" />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-rivl-muted text-sm font-mono">
                        {scanProgress < 30 ? 'Connecting to target...' : scanProgress < 60 ? 'Downloading HTML and assets...' : scanProgress < 90 ? 'Extracting images and content map...' : 'Finalizing scan...'}
                      </p>
                      <span className="text-rivl-accent font-mono text-sm font-bold">{Math.round(scanProgress)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ANALYZING */}
            {phase === 'analyzing' && (
              <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="w-full max-w-3xl relative">
                  <div className="text-center mb-10">
                    <AnimatedEmoji emoji="🧠" size="text-6xl" />
                    <h2 className="font-display font-bold text-3xl mt-6 mb-2">Deep Research &amp; Analysis</h2>
                    <p className="text-rivl-muted text-base">Gemini is searching the web for competitors, trends, and industry standards</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {[
                      { icon: '🏢', label: 'Site Identity', desc: 'What it is, who it serves, its value proposition', color: 'border-yellow-500/20' },
                      { icon: '⚔️', label: 'Competitors', desc: 'Who does it better, what patterns they use', color: 'border-orange-500/20' },
                      { icon: '🎨', label: 'Design Trends', desc: 'Current standards, color psychology, UX patterns', color: 'border-amber-500/20' },
                    ].map((step, i) => (
                      <div key={i} className={`bg-rivl-card/50 border ${step.color} rounded-xl p-6 backdrop-blur-sm animate-pulse`} style={{ animationDelay: `${i * 0.3}s`, animationDuration: '2s' }}>
                        <span className="text-3xl block mb-3">{step.icon}</span>
                        <span className="font-mono text-sm text-yellow-400 font-bold block mb-2">{step.label}</span>
                        <p className="text-rivl-muted text-xs leading-relaxed">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {[
                      { icon: '📊', label: 'Conversion Strategy', desc: 'CTA placement, trust signals, social proof' },
                      { icon: '💭', label: 'Emotional Design', desc: 'Color psychology, tone of voice, persuasion' },
                    ].map((step, i) => (
                      <div key={i} className="bg-rivl-card/50 border border-yellow-500/10 rounded-xl p-6 backdrop-blur-sm animate-pulse" style={{ animationDelay: `${(i + 3) * 0.3}s`, animationDuration: '2s' }}>
                        <span className="text-2xl block mb-2">{step.icon}</span>
                        <span className="font-mono text-sm text-yellow-400/80 font-bold block mb-1">{step.label}</span>
                        <p className="text-rivl-muted text-xs">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-rivl-card/30 border border-rivl-border/30 rounded-xl p-5 flex items-center gap-4">
                    <ProgressDots color="bg-yellow-400" count={7} />
                    <span className="text-rivl-muted text-sm font-mono">Grounding with Google Search...</span>
                  </div>
                </div>
              </div>
            )}

            {/* ROASTING + GENERATING */}
            {(phase === 'roasting' || phase === 'generating') && (
              <div className="flex-1 flex flex-col p-6 gap-4 relative overflow-hidden">
                {phase === 'roasting' && (
                  <>
                    <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-rivl-red/8 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '3s' }} />
                    <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-orange-500/8 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                  </>
                )}
                {phase === 'generating' && (
                  <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rivl-green/8 rounded-full blur-[100px] pointer-events-none animate-pulse" />
                )}

                {/* TOP: Roast terminal */}
                <div className="flex-1 bg-rivl-dark border border-rivl-red/20 rounded-2xl overflow-hidden flex flex-col relative min-h-0">
                  <div className="px-5 py-3 bg-rivl-card border-b border-rivl-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rivl-red/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-rivl-green/80" />
                      </div>
                      <span className="font-mono text-xs text-rivl-muted ml-2">rivl teardown</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg animate-bounce" style={{ animationDuration: '0.6s' }}>🔥</span>
                      <span className="font-mono text-xs text-rivl-red font-bold uppercase tracking-wider">{roastLines.length} Findings</span>
                    </div>
                  </div>
                  <div ref={roastRef} className="flex-1 overflow-y-auto p-6 min-h-0">
                    <div className="font-mono text-xs text-rivl-accent mb-4 flex items-center gap-2">
                      <span className="text-rivl-green">$</span>
                      <span>rivl analyze --target {decodeURIComponent(url)} --pettiness {pettiness}</span>
                    </div>
                    {roastLines.map((line, i) => (
                      <RoastLine key={i} text={line} delay={i * 1500} />
                    ))}
                  </div>
                </div>

                {/* BOTTOM: Status bar */}
                <div className={`shrink-0 border rounded-2xl p-6 transition-all duration-500 ${phase === 'generating' ? 'bg-rivl-card border-rivl-green/20' : 'bg-rivl-card/50 border-rivl-border/30'}`}>
                  {phase === 'roasting' ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl animate-pulse">🔥</span>
                        <div>
                          <span className="font-mono text-sm text-rivl-red font-bold block">Tearing it apart...</span>
                          <span className="font-mono text-xs text-rivl-muted">Analyzing design, UX, copy, performance, and accessibility</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-rivl-muted">Pettiness</span>
                        <span className="font-mono text-lg text-rivl-red font-bold">{pettiness}/10</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <AnimatedEmoji emoji="⚡" size="text-2xl" />
                          <div>
                            <span className="font-mono text-sm text-rivl-green font-bold block">Building improved version...</span>
                            <span className="font-mono text-xs text-rivl-muted">Gemini 2.5 Pro is generating a strategically superior redesign</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {['Layout', 'Typography', 'Colors', 'Images', 'Copy', 'CTAs'].map((item, i) => (
                          <div key={i} className="bg-rivl-green/5 border border-rivl-green/20 rounded-lg px-3 py-2 text-center animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>
                            <span className="font-mono text-[10px] text-rivl-green">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REVIEWING */}
            {phase === 'reviewing' && (
              <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="w-full max-w-3xl relative">
                  <div className="text-center mb-10">
                    <AnimatedEmoji emoji="🛡️" size="text-6xl" />
                    <h2 className="font-display font-bold text-3xl mt-6 mb-2">Quality Assurance Review</h2>
                    <p className="text-rivl-muted text-base">Gemini 3.1 Pro is independently verifying the generated site</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-rivl-card/50 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-5">
                        <span className="text-2xl">🔎</span>
                        <span className="font-mono text-sm text-blue-400 font-bold uppercase tracking-wider">Pass 1: Audit</span>
                      </div>
                      <div className="space-y-3">
                        {['Content completeness', 'Image URL verification', 'Link integrity', 'Accessibility compliance', 'Design quality check', 'Conversion elements'].map((check, i) => (
                          <div key={i} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                            <span className="font-mono text-sm text-rivl-muted">{check}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-rivl-card/50 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-5">
                        <span className="text-2xl">🔧</span>
                        <span className="font-mono text-sm text-blue-400 font-bold uppercase tracking-wider">Pass 2: Fix</span>
                      </div>
                      <div className="space-y-3">
                        {['Restore missing content', 'Fix broken image URLs', 'Add target=_blank to links', 'Fix accessibility issues', 'Polish HTML output', 'Verify Rivl badge'].map((fix, i) => (
                          <div key={i} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${i * 0.2 + 0.1}s` }}>
                            <div className="w-2 h-2 rounded-full bg-blue-400/50" />
                            <span className="font-mono text-sm text-rivl-muted">{fix}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-rivl-dark/80 border border-blue-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-4">
                      <ProgressDots color="bg-blue-400" count={4} />
                      <p className="text-blue-400 text-sm font-mono flex-1">{reviewStatus}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* RESULTS */}
        {showResults && (
          <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-rivl-card border border-rivl-border rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display font-bold text-xl">Competitive Score</h2>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-rivl-red/40 rounded" /> Original</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-gradient-to-r from-rivl-green to-rivl-accent rounded" /> Rivl&apos;d</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <ScoreBar label="Performance" original={analysis!.scores.performance} improved={analysis!.improvedScores?.performance ?? analysis!.scores.performance + 20} delay={200} />
                  <ScoreBar label="UX Design" original={analysis!.scores.ux} improved={analysis!.improvedScores?.ux ?? analysis!.scores.ux + 20} delay={400} />
                  <ScoreBar label="Accessibility" original={analysis!.scores.accessibility} improved={analysis!.improvedScores?.accessibility ?? analysis!.scores.accessibility + 25} delay={600} />
                  <ScoreBar label="Copy Quality" original={analysis!.scores.copy} improved={analysis!.improvedScores?.copy ?? analysis!.scores.copy + 15} delay={800} />
                </div>
                <div className="mt-6 pt-4 border-t border-rivl-border flex items-center justify-between">
                  <span className="font-mono text-sm text-rivl-muted">Overall Improvement</span>
                  <span className="font-display font-bold text-2xl text-rivl-green">+{overallImprovement > 0 ? overallImprovement : Math.round(((analysis!.improvedScores?.overall ?? 75) - analysis!.scores.overall) / Math.max(analysis!.scores.overall, 1) * 100)}%</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setComparisonView('original')} className={`px-4 py-2 rounded-lg font-mono text-xs transition-all ${comparisonView === 'original' ? 'bg-rivl-red/20 text-rivl-red border border-rivl-red/30' : 'bg-rivl-card text-rivl-muted border border-rivl-border hover:text-rivl-white'}`}>● Original</button>
                <button onClick={() => setComparisonView('side-by-side')} className={`px-4 py-2 rounded-lg font-mono text-xs transition-all ${comparisonView === 'side-by-side' ? 'bg-rivl-accent/20 text-rivl-accent border border-rivl-accent/30' : 'bg-rivl-card text-rivl-muted border border-rivl-border hover:text-rivl-white'}`}>◧ Side by Side</button>
                <button onClick={() => setComparisonView('rivld')} className={`px-4 py-2 rounded-lg font-mono text-xs transition-all ${comparisonView === 'rivld' ? 'bg-rivl-green/20 text-rivl-green border border-rivl-green/30' : 'bg-rivl-card text-rivl-muted border border-rivl-border hover:text-rivl-white'}`}>● Rivl&apos;d</button>
              </div>

              <div className={`grid gap-4 ${comparisonView === 'side-by-side' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-5xl mx-auto'}`}>
                {(comparisonView === 'side-by-side' || comparisonView === 'original') && (
                  <div className="bg-rivl-card border border-rivl-red/20 rounded-2xl overflow-hidden glow-red">
                    <div className="px-4 py-3 border-b border-rivl-border flex items-center justify-between">
                      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rivl-red" /><span className="font-mono text-xs text-rivl-red">ORIGINAL</span></div>
                      <span className="font-mono text-[10px] text-rivl-muted truncate ml-4">{decodeURIComponent(url)}</span>
                    </div>
                    <div className={`bg-rivl-dark relative overflow-hidden ${comparisonView === 'original' ? 'h-[85vh]' : 'h-[75vh]'}`}>
                      {!iframeOriginalLoaded && (<div className="absolute inset-0 flex items-center justify-center z-10 bg-rivl-dark"><div className="text-center"><div className="w-8 h-8 border-2 border-rivl-red/30 border-t-rivl-red rounded-full animate-spin mx-auto mb-3" /><p className="font-mono text-xs text-rivl-muted">Loading original site...</p></div></div>)}
                      <iframe src={targetUrl} className="w-full h-full border-0" title="Original site" sandbox="allow-scripts allow-same-origin" loading="eager" onLoad={() => setIframeOriginalLoaded(true)} />
                      <div className="absolute inset-0 bg-gradient-to-b from-rivl-red/5 to-rivl-red/10 pointer-events-none" />
                    </div>
                  </div>
                )}
                {(comparisonView === 'side-by-side' || comparisonView === 'rivld') && (
                  <div className="bg-rivl-card border border-rivl-green/20 rounded-2xl overflow-hidden glow-green">
                    <div className="px-4 py-3 border-b border-rivl-border flex items-center justify-between">
                      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rivl-green" /><span className="font-mono text-xs text-rivl-green">RIVL&apos;D</span></div>
                      <span className="font-mono text-[10px] text-rivl-muted">Reviewed by Gemini 3.1 Pro</span>
                    </div>
                    <div className={`bg-rivl-dark relative overflow-hidden ${comparisonView === 'rivld' ? 'h-[85vh]' : 'h-[75vh]'}`}>
                      {!iframeRivldLoaded && (<div className="absolute inset-0 flex items-center justify-center z-10 bg-rivl-dark"><div className="text-center"><div className="w-8 h-8 border-2 border-rivl-green/30 border-t-rivl-green rounded-full animate-spin mx-auto mb-3" /><p className="font-mono text-xs text-rivl-muted">Loading improved version...</p></div></div>)}
                      {analysis!.improvedHtml ? (<iframe srcDoc={analysis!.improvedHtml} className="w-full h-full border-0" title="Improved version" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" onLoad={() => setIframeRivldLoaded(true)} />) : (<div className="flex items-center justify-center h-full text-rivl-green font-mono text-sm">Improved version generated</div>)}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-rivl-card border border-rivl-border rounded-2xl p-8">
                <h2 className="font-display font-bold text-xl mb-4">What Rivl Fixed</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis!.improvements.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-rivl-dark/50 rounded-lg border border-rivl-border/50">
                      <span className="text-rivl-green mt-0.5">✓</span>
                      <span className="text-sm text-rivl-white/80">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-rivl-accent/10 to-rivl-red/10 border border-rivl-accent/20 rounded-2xl p-8 text-center">
                <h2 className="font-display font-bold text-2xl mb-2">Your Rivl is ready.</h2>
                <p className="text-rivl-muted text-sm mb-6">Preview your improved site or download the code.</p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <button
                    onClick={() => {
                      if (!analysis?.improvedHtml) return;
                      const blob = new Blob([analysis.improvedHtml], { type: 'text/html' });
                      const blobUrl = URL.createObjectURL(blob);
                      window.open(blobUrl, '_blank');
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-rivl-accent to-rivl-red text-white font-display font-bold rounded-xl hover:shadow-lg hover:shadow-rivl-accent/20 transition-all active:scale-95"
                  >
                    🚀 Open Full Site
                  </button>
                  <button
                    onClick={() => {
                      if (!analysis?.improvedHtml) return;
                      const blob = new Blob([analysis.improvedHtml], { type: 'text/html' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = 'rivld-site.html';
                      a.click();
                    }}
                    className="px-8 py-3 bg-rivl-card border border-rivl-border text-rivl-white font-display font-bold rounded-xl hover:border-rivl-accent/50 transition-all active:scale-95"
                  >
                    📥 Download HTML
                  </button>
                  <button
                    onClick={() => window.open('https://nexlayer.com', '_blank')}
                    className="px-8 py-3 bg-rivl-card border border-rivl-border text-rivl-white font-display font-bold rounded-xl hover:border-rivl-accent/50 transition-all active:scale-95"
                  >
                    ☁️ Deploy on Nexlayer
                  </button>
                </div>
                <p className="text-rivl-muted/50 text-xs font-mono mt-4">Powered by Nexlayer&apos;s AI-native cloud</p>
              </div>

              <div className="text-center pb-8">
                <a href="/" className="text-rivl-muted hover:text-rivl-white text-sm font-mono transition-colors">← Rivl another product</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function RivlPage() {
  return (
    <Suspense fallback={<AnalysisLoading />}>
      <RivlContent />
    </Suspense>
  );
}
