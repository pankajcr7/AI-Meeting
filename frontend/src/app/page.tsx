'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, FileText, ListChecks, Plug, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'Transcription',
    description: 'Upload or record meetings and get accurate AI-powered transcriptions in minutes.',
  },
  {
    icon: FileText,
    title: 'Summarization',
    description: 'Get concise, intelligent summaries highlighting key decisions and topics discussed.',
  },
  {
    icon: ListChecks,
    title: 'Action Items',
    description: 'Automatically extract action items with assignees, deadlines, and priorities.',
  },
  {
    icon: Plug,
    title: 'Integrations',
    description: 'Sync action items to Slack, Notion, and Asana to keep your team aligned.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Mic className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">AI Meeting</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 text-center max-w-4xl">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm text-muted-foreground mb-6">
              Powered by AI
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              AI Meeting Recorder +{' '}
              <span className="text-primary">Action Tracker</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Auto-transcribe, summarize, and extract action items from your meetings.
              Never miss a follow-up again.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="gap-2">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                From recording to action items, we handle the entire meeting workflow.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {features.map((feature) => (
                <Card key={feature.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to transform your meetings?</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join teams who are already saving hours every week.
            </p>
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start for Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} AI Meeting. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
