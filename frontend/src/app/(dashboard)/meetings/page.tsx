'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MeetingsList } from '@/components/meetings/MeetingsList';
import { UploadMeetingDialog } from '@/components/meetings/UploadMeetingDialog';
import { Button } from '@/components/ui/button';
import { Upload, Mic } from 'lucide-react';

export default function MeetingsPage() {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [listKey, setListKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-muted-foreground text-sm">
            View and manage all your meeting recordings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => router.push('/meetings/record')}>
            <Mic className="h-4 w-4" />
            Record
          </Button>
        </div>
      </div>

      <MeetingsList
        key={listKey}
        onUploadClick={() => setUploadOpen(true)}
        onRecordClick={() => router.push('/meetings/record')}
      />

      <UploadMeetingDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => setListKey((k) => k + 1)}
      />
    </div>
  );
}
