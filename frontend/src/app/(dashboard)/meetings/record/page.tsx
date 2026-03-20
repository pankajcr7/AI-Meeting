'use client';

import { useRouter } from 'next/navigation';
import { AudioRecorder } from '@/components/meetings/AudioRecorder';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function RecordPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Record Meeting</h1>
          <p className="text-muted-foreground text-sm">
            Record audio directly from your browser microphone.
          </p>
        </div>
      </div>
      <AudioRecorder />
    </div>
  );
}
