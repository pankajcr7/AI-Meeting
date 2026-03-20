'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Search, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface TranscriptViewerProps {
  transcript: string;
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      toast.success('Transcript copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const highlightedText = useMemo(() => {
    if (!search.trim()) return null;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = transcript.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }, [transcript, search]);

  const matchCount = useMemo(() => {
    if (!search.trim()) return 0;
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (transcript.match(regex) || []).length;
  }, [transcript, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Full Transcript</span>
        </div>
        <div className="flex items-center gap-2">
          {showSearch ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transcript..."
                  className="h-8 w-48 pr-8 text-sm"
                  autoFocus
                />
                {search && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {matchCount}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setShowSearch(false);
                  setSearch('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-lg border bg-muted/30 p-6 max-h-[600px] overflow-y-auto">
        <div className="text-sm leading-7 whitespace-pre-wrap text-foreground/90">
          {highlightedText || transcript}
        </div>
      </div>
    </div>
  );
}
