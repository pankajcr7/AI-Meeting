'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Mic, FileText, ListChecks, Plug, ArrowRight, Zap, Shield, Clock,
  ChevronRight, Play, Sparkles, Globe, Users, BarChart3, Star,
  MessageSquare, CheckCircle2, ArrowUpRight, Menu, X
} from 'lucide-react';

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    const el = ref.current;
    if (el) {
      el.querySelectorAll('.reveal').forEach((child) => observer.observe(child));
    }
    return () => observer.disconnect();
  }, []);
  return ref;
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let start = 0;
          const duration = 2000;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            start = Math.floor(eased * target);
            setCount(start);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

function FloatingOrb({ className, color, size, delay }: {
  className?: string; color: string; size: number; delay: number;
}) {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-20 ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 grid-pattern opacity-100" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] glow-blue" />
      <div className="absolute top-[20%] right-0 w-[600px] h-[600px] glow-purple" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] glow-pink" />
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <Mic className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">AI Meeting</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {['Features', 'How it Works', 'Pricing'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login"
              className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/signup"
              className="relative group px-5 py-2.5 text-sm font-medium text-white rounded-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
              Get Started Free
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 blur-xl opacity-0 group-hover:opacity-40 transition-opacity" />
            </Link>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white p-2">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#09090b]/95 backdrop-blur-xl border-t border-white/5 px-4 pb-6 pt-2">
          {['Features', 'How it Works', 'Pricing'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-zinc-400 hover:text-white transition-colors">
              {item}
            </a>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/login" className="px-4 py-2.5 text-center text-sm text-zinc-300 border border-white/10 rounded-full">Sign In</Link>
            <Link href="/signup" className="px-4 py-2.5 text-center text-sm font-medium text-white rounded-full bg-gradient-to-r from-blue-600 to-violet-600">Get Started Free</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <GridBackground />

      <FloatingOrb color="radial-gradient(circle, rgba(59,130,246,0.3), transparent)" size={400} delay={0} className="top-20 -left-20 animate-float-slow" />
      <FloatingOrb color="radial-gradient(circle, rgba(147,51,234,0.25), transparent)" size={350} delay={2} className="top-40 -right-20 animate-float-delayed" />
      <FloatingOrb color="radial-gradient(circle, rgba(236,72,153,0.2), transparent)" size={300} delay={4} className="bottom-20 left-1/3 animate-float" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-30">
        <div className="absolute inset-0 animate-spin-slow">
          <div className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-blue-400" />
          <div className="absolute bottom-0 left-1/2 w-1 h-1 rounded-full bg-violet-400" />
          <div className="absolute top-1/2 left-0 w-1 h-1 rounded-full bg-pink-400" />
          <div className="absolute top-1/2 right-0 w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </div>
        <svg className="w-full h-full animate-spin-slow" style={{ animationDuration: '40s' }} viewBox="0 0 600 600" fill="none">
          <circle cx="300" cy="300" r="200" stroke="url(#grad1)" strokeWidth="0.5" opacity="0.3" />
          <circle cx="300" cy="300" r="260" stroke="url(#grad2)" strokeWidth="0.5" opacity="0.2" />
          <circle cx="300" cy="300" r="140" stroke="url(#grad3)" strokeWidth="0.5" opacity="0.25" />
          <defs>
            <linearGradient id="grad1" x1="0" y1="0" x2="600" y2="600"><stop stopColor="#3b82f6" /><stop offset="1" stopColor="#a855f7" /></linearGradient>
            <linearGradient id="grad2" x1="600" y1="0" x2="0" y2="600"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#ec4899" /></linearGradient>
            <linearGradient id="grad3" x1="0" y1="600" x2="600" y2="0"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#3b82f6" /></linearGradient>
          </defs>
        </svg>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="animate-orbit opacity-60">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 backdrop-blur-sm border border-blue-500/20 flex items-center justify-center">
            <Mic className="w-4 h-4 text-blue-400" />
          </div>
        </div>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="animate-orbit-reverse opacity-60">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 backdrop-blur-sm border border-violet-500/20 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-violet-400" />
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">New</span>
            </div>
            <span className="text-sm text-zinc-400">AI-powered meeting intelligence</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          </div>
        </div>

        <h1 className="animate-slide-up text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9] mb-6">
          <span className="text-white">Never miss a</span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent animate-gradient-text">
            meeting detail
          </span>
          <br />
          <span className="text-white">again.</span>
        </h1>

        <p className="animate-slide-up-delayed max-w-2xl mx-auto text-lg sm:text-xl text-zinc-400 leading-relaxed mb-10">
          Record, transcribe, and extract action items automatically.
          Your AI meeting assistant that turns conversations into outcomes.
        </p>

        <div className="animate-slide-up-delayed flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup"
            className="group relative inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40">
            Start Free Trial
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
          </Link>
          <button className="group inline-flex items-center gap-2.5 px-6 py-4 text-base text-zinc-300 hover:text-white transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-white/15 group-hover:border-white/20 transition-all">
              <Play className="w-4 h-4 ml-0.5" />
            </div>
            Watch Demo
          </button>
        </div>

        <div className="animate-fade-in mt-16 flex items-center justify-center gap-8 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Free 14-day trial</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>No credit card</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090b] to-transparent" />
    </section>
  );
}

const features = [
  {
    icon: Mic, title: 'Smart Transcription', color: 'blue',
    description: 'Upload or record — get word-perfect transcripts with speaker identification powered by advanced AI models.',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    iconGradient: 'from-blue-500 to-cyan-400',
    borderColor: 'border-blue-500/20',
  },
  {
    icon: Sparkles, title: 'AI Summarization', color: 'violet',
    description: 'Get concise, structured summaries highlighting decisions, key discussions, and next steps — in seconds.',
    gradient: 'from-violet-500/10 to-purple-500/10',
    iconGradient: 'from-violet-500 to-purple-400',
    borderColor: 'border-violet-500/20',
  },
  {
    icon: ListChecks, title: 'Action Extraction', color: 'emerald',
    description: 'AI identifies action items with assignees, deadlines, and priority levels. No more forgotten follow-ups.',
    gradient: 'from-emerald-500/10 to-green-500/10',
    iconGradient: 'from-emerald-500 to-green-400',
    borderColor: 'border-emerald-500/20',
  },
  {
    icon: Plug, title: 'Deep Integrations', color: 'pink',
    description: 'Push action items to Slack, Notion, and Asana automatically. Keep your whole team in sync.',
    gradient: 'from-pink-500/10 to-rose-500/10',
    iconGradient: 'from-pink-500 to-rose-400',
    borderColor: 'border-pink-500/20',
  },
  {
    icon: Shield, title: 'Enterprise Security', color: 'amber',
    description: 'End-to-end encryption, SOC 2 compliance, and granular access controls for your sensitive meetings.',
    gradient: 'from-amber-500/10 to-yellow-500/10',
    iconGradient: 'from-amber-500 to-yellow-400',
    borderColor: 'border-amber-500/20',
  },
  {
    icon: Zap, title: 'Real-time Processing', color: 'cyan',
    description: 'From upload to insights in under 2 minutes. Our pipeline processes audio 10x faster than real-time.',
    gradient: 'from-cyan-500/10 to-sky-500/10',
    iconGradient: 'from-cyan-500 to-sky-400',
    borderColor: 'border-cyan-500/20',
  },
];

function FeaturesSection() {
  const sectionRef = useScrollReveal();
  return (
    <section id="features" className="relative py-32 overflow-hidden" ref={sectionRef}>
      <div className="absolute inset-0 grid-pattern opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] glow-purple opacity-50" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="reveal inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Features
          </div>
          <h2 className="reveal text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            Everything you need,
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">nothing you don&apos;t</span>
          </h2>
          <p className="reveal text-lg text-zinc-400 max-w-2xl mx-auto">
            A complete meeting intelligence platform that handles the busywork so you can focus on what matters.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <div key={feature.title} className={`reveal reveal-delay-${(i % 4) + 1} group`}>
              <div className={`glass-card rounded-2xl p-7 h-full`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} border ${feature.borderColor} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-5 h-5 bg-gradient-to-br ${feature.iconGradient} bg-clip-text`} style={{ color: feature.color === 'blue' ? '#60a5fa' : feature.color === 'violet' ? '#a78bfa' : feature.color === 'emerald' ? '#34d399' : feature.color === 'pink' ? '#f472b6' : feature.color === 'amber' ? '#fbbf24' : '#22d3ee' }} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    num: '01', title: 'Upload or Record',
    description: 'Drop your audio file or record directly in the browser. Supports MP3, WAV, M4A, and more.',
    icon: Mic, color: 'blue',
  },
  {
    num: '02', title: 'AI Processes',
    description: 'Our pipeline transcribes with speaker diarization, then summarizes and extracts key information.',
    icon: Sparkles, color: 'violet',
  },
  {
    num: '03', title: 'Get Insights',
    description: 'Review your transcript, summary, and action items. Edit, assign, and set deadlines.',
    icon: BarChart3, color: 'emerald',
  },
  {
    num: '04', title: 'Sync Everywhere',
    description: 'Push action items to Slack, Notion, or Asana. Set reminders. Never drop the ball.',
    icon: Globe, color: 'pink',
  },
];

function HowItWorksSection() {
  const sectionRef = useScrollReveal();
  return (
    <section id="how-it-works" className="relative py-32 overflow-hidden" ref={sectionRef}>
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-0 right-0 w-[600px] h-[400px] glow-blue opacity-40" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="reveal inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            How it Works
          </div>
          <h2 className="reveal text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            From meeting to action
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">in 4 simple steps</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-16 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {steps.map((step, i) => (
            <div key={step.num} className={`reveal reveal-delay-${i + 1}`}>
              <div className="relative text-center group">
                <div className="relative inline-flex mb-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${
                    step.color === 'blue' ? 'from-blue-500/15 to-blue-600/5 border-blue-500/20' :
                    step.color === 'violet' ? 'from-violet-500/15 to-violet-600/5 border-violet-500/20' :
                    step.color === 'emerald' ? 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/20' :
                    'from-pink-500/15 to-pink-600/5 border-pink-500/20'
                  } border flex items-center justify-center group-hover:scale-110 transition-all duration-300`}>
                    <step.icon className={`w-7 h-7 ${
                      step.color === 'blue' ? 'text-blue-400' :
                      step.color === 'violet' ? 'text-violet-400' :
                      step.color === 'emerald' ? 'text-emerald-400' : 'text-pink-400'
                    }`} />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#09090b] border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-400">
                    {step.num.replace('0', '')}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductPreview() {
  const sectionRef = useScrollReveal();
  return (
    <section className="relative py-32 overflow-hidden" ref={sectionRef}>
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="reveal">
          <div className="gradient-border rounded-2xl overflow-hidden bg-[#09090b]">
            <div className="p-1">
              <div className="rounded-xl bg-gradient-to-b from-zinc-900 to-[#09090b] overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-zinc-500">AI Meeting — Dashboard</span>
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">Weekly Standup</h3>
                      <p className="text-sm text-zinc-500 mt-1">March 18, 2026 &middot; 23 min &middot; 4 participants</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Completed
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { label: 'Duration', value: '23:41', sub: 'minutes' },
                      { label: 'Action Items', value: '7', sub: 'extracted' },
                      { label: 'Key Topics', value: '4', sub: 'identified' },
                    ].map((stat) => (
                      <div key={stat.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-zinc-500">{stat.sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <h4 className="text-sm font-medium text-zinc-300 mb-3">Summary</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      The team reviewed sprint progress, with frontend reaching 80% completion on the dashboard redesign.
                      Backend API for meeting processing is ready for testing. Two blockers were identified around the
                      transcription service integration. The team agreed to prioritize bug fixes before the Friday release.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <h4 className="text-sm font-medium text-zinc-300 mb-3">Action Items</h4>
                    <div className="space-y-2.5">
                      {[
                        { task: 'Fix transcription timeout bug', assignee: 'Sarah', priority: 'high', color: 'text-red-400 bg-red-500/10' },
                        { task: 'Review PR #42 dashboard changes', assignee: 'Mike', priority: 'medium', color: 'text-yellow-400 bg-yellow-500/10' },
                        { task: 'Update API docs for v2 endpoints', assignee: 'Alex', priority: 'low', color: 'text-blue-400 bg-blue-500/10' },
                      ].map((item) => (
                        <div key={item.task} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded border border-white/20" />
                            <span className="text-sm text-zinc-300">{item.task}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${item.color}`}>{item.priority}</span>
                            <span className="text-xs text-zinc-500">{item.assignee}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const stats = [
  { value: 10, suffix: 'k+', label: 'Meetings Processed' },
  { value: 98, suffix: '%', label: 'Transcription Accuracy' },
  { value: 50, suffix: 'k+', label: 'Action Items Extracted' },
  { value: 2, suffix: 'min', label: 'Avg. Processing Time' },
];

function StatsSection() {
  const sectionRef = useScrollReveal();
  return (
    <section className="relative py-24 overflow-hidden" ref={sectionRef}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.03] to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={stat.label} className={`reveal reveal-delay-${i + 1} text-center`}>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-sm text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const testimonials = [
  {
    quote: "AI Meeting cut our post-meeting admin time by 80%. Action items just appear in Slack — it's like magic.",
    author: 'Sarah Chen', role: 'Engineering Lead', company: 'Veritas Tech',
  },
  {
    quote: "We stopped losing track of decisions. Every meeting now has a clear paper trail and accountability.",
    author: 'Marcus Johnson', role: 'Product Manager', company: 'ScaleUp Inc',
  },
  {
    quote: "The transcription accuracy is incredible. Even with heavy accents and cross-talk, it nails it.",
    author: 'Priya Sharma', role: 'VP Operations', company: 'GlobalSync',
  },
];

function TestimonialsSection() {
  const sectionRef = useScrollReveal();
  return (
    <section className="relative py-32 overflow-hidden" ref={sectionRef}>
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[400px] glow-pink opacity-30" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="reveal inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm font-medium mb-6">
            <MessageSquare className="w-3.5 h-3.5" />
            Testimonials
          </div>
          <h2 className="reveal text-4xl md:text-5xl font-bold text-white tracking-tight">
            Loved by teams
            <br />
            <span className="bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">worldwide</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={t.author} className={`reveal reveal-delay-${i + 1}`}>
              <div className="glass-card rounded-2xl p-7 h-full flex flex-col">
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed flex-1 mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
                    {t.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.author}</p>
                    <p className="text-xs text-zinc-500">{t.role}, {t.company}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const sectionRef = useScrollReveal();
  return (
    <section className="relative py-32 overflow-hidden" ref={sectionRef}>
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="reveal">
          <div className="gradient-border rounded-3xl">
            <div className="rounded-3xl bg-gradient-to-b from-zinc-900/80 to-[#09090b]/80 backdrop-blur-xl p-12 md:p-16 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] glow-blue opacity-60" />

              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                  Ready to transform
                  <br />
                  your meetings?
                </h2>
                <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10">
                  Join thousands of teams already saving hours every week.
                  Start your free trial — no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/signup"
                    className="group relative inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40">
                    Get Started Free
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link href="/login"
                    className="inline-flex items-center gap-2 px-6 py-4 text-base text-zinc-400 hover:text-white transition-colors">
                    Sign In
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Integrations', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Help Center', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
];

function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-[#09090b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 via-violet-500 to-pink-500 flex items-center justify-center">
                <Mic className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">AI Meeting</span>
            </Link>
            <p className="text-sm text-zinc-500 leading-relaxed">
              AI-powered meeting intelligence for modern teams.
            </p>
          </div>
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">{group.title}</h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">&copy; {new Date().getFullYear()} AI Meeting. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {['X', 'GH', 'LI'].map((social) => (
              <a key={social} href="#"
                className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-xs text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ProductPreview />
      <StatsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
