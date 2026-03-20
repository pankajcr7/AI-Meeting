'use client';

import { Button } from '@/components/ui/button';
import { Copy, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MeetingSummaryProps {
  summary: string;
}

export function MeetingSummary({ summary }: MeetingSummaryProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast.success('Summary copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Meeting Summary</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div className="rounded-lg border bg-muted/30 p-6">
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
