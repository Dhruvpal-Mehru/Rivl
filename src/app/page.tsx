'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TAGLINES = [
  'Outbuild any product in 90 seconds.',
  'Paste a URL. Expose the flaws. Ship something better.',
  'Your competitor\'s worst nightmare just got a deploy button.',
];

function GlitchText({ text, className }: { text: string; className?: string }) {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={`${className} ${isGlitching ? 'animate-glitch' : ''}`}>
      {text}
    </span>
  );
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
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
    }, 40);
    return () => clearInterval(interval);
  }, [text, started]);

  return (
    <span className="font-mono text-rivl-muted text-sm">
      {displayed}
      {displayed.length < text.length && started && (
        <span className="cursor-blink" />
      )}
    </span>
  );
}

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pettiness, setPettiness] = useState(5);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const pettyLabels = [
    '', 'Polite Nod', 'Gentle Nudge', 'Honest Feedback',
    'Constructive Criticism', 'No Mercy Review', 'Savage Takedown',
    'Public Humiliation', 'Corporate Warfare', 'Scorched Earth',
    'Extinction Event'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsAnalyzing(true);

    // Encode the URL and pettiness level, navigate to analysis page
    const encoded = encodeURIComponent(url.trim());
    router.push(`/rivl?url=${encoded}&pettiness=${pettiness}`);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <main className="min-h-screen relative grid-bg">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-rivl-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-rivl-red/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rivl-accent to-rivl-red flex items-center justify-center">
            <span className="font-display font-bold text-sm text-white">R</span>
          </div>
          <GlitchText text="Rivl" className="font-display font-bold text-xl tracking-tight" />
        </div>
        <div className="flex items-center gap-6">
          <span className="text-rivl-muted text-sm font-mono">v0.1.0</span>
          <a
            href="https://github.com"
            className="text-rivl-muted hover:text-rivl-white transition-colors text-sm"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 pt-24 pb-32 max-w-4xl mx-auto">
        {/* Badge */}
        <div
          className="mb-8 px-4 py-1.5 rounded-full border border-rivl-border bg-rivl-card/50 backdrop-blur-sm
                     flex items-center gap-2 animate-fadeIn"
        >
          <span className="w-2 h-2 rounded-full bg-rivl-green animate-pulse" />
          <span className="text-xs font-mono text-rivl-muted">
            Powered by Gemini + Nexlayer
          </span>
        </div>

        {/* Main heading */}
        <h1
          className="font-display font-bold text-6xl md:text-8xl text-center leading-[0.95] tracking-tight mb-6"
          style={{ animationDelay: '0.1s' }}
        >
          <span className="block">Paste a URL.</span>
          <span className="block text-gradient-rivl">Outbuild it.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-rivl-muted text-lg md:text-xl text-center max-w-2xl mb-4 animate-slideUp" style={{ animationDelay: '0.3s' }}>
          AI analyzes any live product, exposes every weakness, then generates and deploys 
          a better version — live, with a real URL.
        </p>

        {/* Terminal-style tagline */}
        <div className="mb-12 animate-slideUp" style={{ animationDelay: '0.5s' }}>
          <TypewriterText text="$ rivl --target competitor.com --pettiness 10 --deploy" delay={1000} />
        </div>

        {/* URL Input */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl animate-slideUp"
          style={{ animationDelay: '0.6s' }}
        >
          <div className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-rivl-accent/50 via-rivl-red/50 to-rivl-accent/50 rounded-2xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative bg-rivl-card border border-rivl-border rounded-2xl p-2 flex items-center gap-2">
              <div className="flex items-center gap-2 pl-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rivl-muted">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste any product URL..."
                className="flex-1 bg-transparent text-rivl-white placeholder:text-rivl-muted/50 
                         outline-none text-lg py-3 font-body"
              />
              <button
                type="submit"
                disabled={!url.trim() || isAnalyzing}
                className="px-6 py-3 bg-gradient-to-r from-rivl-accent to-rivl-red text-white font-display 
                         font-bold rounded-xl text-sm tracking-wide uppercase
                         hover:shadow-lg hover:shadow-rivl-accent/20 
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-all duration-300 active:scale-95
                         whitespace-nowrap"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing
                  </span>
                ) : (
                  'Rivl It'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Pettiness Slider */}
        <div className="w-full max-w-md mt-8 animate-slideUp" style={{ animationDelay: '0.8s' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-rivl-muted uppercase tracking-widest">
              Pettiness Level
            </span>
            <span className="text-xs font-mono text-rivl-accent font-bold">
              {pettyLabels[pettiness]}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={pettiness}
            onChange={(e) => setPettiness(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-rivl-muted/50 font-mono">kind</span>
            <span className="text-[10px] text-rivl-red/70 font-mono">ruthless</span>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-24 w-full max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Scan',
                desc: 'AI crawls the target — screenshots, HTML, copy, UX patterns. Nothing hides.',
                icon: '🔍',
              },
              {
                step: '02',
                title: 'Roast',
                desc: 'Gemini tears it apart. Load times, UX crimes, bad copy, missing features — all exposed.',
                icon: '🔥',
              },
              {
                step: '03',
                title: 'Ship',
                desc: 'Generates an improved version and deploys it live on Nexlayer. Real URL. Real product.',
                icon: '🚀',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="comparison-card bg-rivl-card/50 border border-rivl-border rounded-xl p-6 backdrop-blur-sm"
                style={{ animationDelay: `${1 + i * 0.2}s` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-mono text-rivl-accent text-xs">{item.step}</span>
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-rivl-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <p className="text-rivl-muted/50 text-sm font-mono">
            Built for Hacklanta 2026 · Deployed on{' '}
            <a href="https://nexlayer.com" className="text-rivl-accent hover:underline">
              Nexlayer
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
