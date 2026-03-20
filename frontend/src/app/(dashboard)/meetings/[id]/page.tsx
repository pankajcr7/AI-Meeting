'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Meeting, User } from '@/types';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileAudio,
  Mic,
  Upload,
  Trash2,
  User as UserIcon,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { TranscriptViewer } from '@/components/meetings/TranscriptViewer';
import { MeetingSummary } from '@/components/meetings/MeetingSummary';
import { ActionItemsList } from '@/components/meetings/ActionItemsList';

const statusConfig: Record<string, { label: string; className: string }> = {
  uploading: { label: 'Uploading', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  transcribing: { label: 'Transcribing', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  summarizing: { label: 'Summarizing', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-200' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800 border-red-200' },
};

const processingSteps = [
  { key: 'transcribing', label: 'Transcribing audio' },
  { key: 'summarizing', label: 'Generating summary' },
  { key: 'actions', label: 'Extracting action items' },
];

function getStepState(meetingStatus: string, stepKey: string) {
  const order = ['processing', 'transcribing', 'summarizing', 'actions', 'completed'];
  const statusIdx = order.indexOf(meetingStatus);
  const stepIdx = order.indexOf(stepKey);
  if (meetingStatus === 'completed') return 'done';
  if (meetingStatus === 'failed') return 'idle';
  if (stepIdx < statusIdx) return 'done';
  if (stepIdx === statusIdx) return 'active';
  return 'idle';
}

function formatDuration(seconds?: number): string {
  if (!seconds) return 'Unknown';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function getUserInfo(uploadedBy: User | string): { name: string; avatar?: string; initials: string } {
  if (typeof uploadedBy === 'string') return { name: 'Unknown', initials: 'U' };
  const initials = uploadedBy.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return { name: uploadedBy.name, avatar: uploadedBy.avatar, initials };
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMeeting = useCallback(async () => {
    try {
      const res = await api.get(`/meetings/${id}`);
      setMeeting(res.data.data);
      return res.data.data as Meeting;
    } catch {
      toast.error('Failed to load meeting');
      router.push('/meetings');
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  useEffect(() => {
    if (!meeting) return;
    const isProcessing = ['processing', 'transcribing', 'summarizing'].includes(meeting.status);

    if (isProcessing) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/meetings/${id}`);
          const updated = res.data.data as Meeting;
          setMeeting(updated);
          if (!['processing', 'transcribing', 'summarizing'].includes(updated.status)) {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch {}
      }, 3000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [meeting?.status, id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/meetings/${id}`);
      toast.success('Meeting deleted');
      router.push('/meetings');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      await api.post(`/meetings/${id}/process`);
      toast.success('Reprocessing started');
      const updated = await fetchMeeting();
      if (updated) setMeeting(updated);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to reprocess');
    } finally {
      setReprocessing(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await api.post(`/integrations/sync-all/${id}`);
      const { synced, failed } = res.data.data;
      if (failed > 0) {
        toast.success(`Synced ${synced} items, ${failed} failed`);
      } else {
        toast.success(`Successfully synced ${synced} action items`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to sync');
    } finally {
      setSyncingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!meeting) return null;

  const isProcessing = ['processing', 'transcribing', 'summarizing'].includes(meeting.status);
  const status = statusConfig[meeting.status] || statusConfig.processing;
  const user = getUserInfo(meeting.uploadedBy);
  const audioSrc = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/meetings/${meeting._id}/audio`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/meetings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{meeting.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {meeting.status === 'completed' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleSyncAll}
              disabled={syncingAll}
            >
              {syncingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Sync All Items
            </Button>
          )}
          {(meeting.status === 'failed' || meeting.status === 'completed') && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleReprocess}
              disabled={reprocessing}
            >
              {reprocessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Reprocess
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete meeting?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the meeting recording and all associated data.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">
                  {format(new Date(meeting.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-medium">{formatDuration(meeting.duration)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                {meeting.recordingType === 'browser' ? (
                  <Mic className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium capitalize">{meeting.recordingType}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">Uploaded by</p>
                <p className="text-sm font-medium">{user.name}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <Badge variant="outline" className={status.className}>
              {isProcessing && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {status.label}
            </Badge>
            {meeting.status === 'failed' && meeting.errorMessage && (
              <span className="text-xs text-red-600 ml-2">{meeting.errorMessage}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {meeting.audioUrl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileAudio className="h-4 w-4" />
              Audio Player
            </CardTitle>
          </CardHeader>
          <CardContent>
            <audio
              ref={audioRef}
              controls
              className="w-full"
              src={token ? `${audioSrc}?token=${token}` : audioSrc}
              preload="metadata"
            />
          </CardContent>
        </Card>
      )}

      {isProcessing && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Processing Meeting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processingSteps.map((step, index) => {
                const state = getStepState(meeting.status, step.key);
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className="relative">
                      {state === 'done' ? (
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                      ) : state === 'active' ? (
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground font-medium">{index + 1}</span>
                        </div>
                      )}
                      {index < processingSteps.length - 1 && (
                        <div
                          className={`absolute left-1/2 top-8 h-4 w-0.5 -translate-x-1/2 ${
                            state === 'done' ? 'bg-green-300' : 'bg-muted'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        state === 'active'
                          ? 'font-medium text-blue-700'
                          : state === 'done'
                          ? 'text-green-700'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                      {state === 'active' && '...'}
                      {state === 'done' && ' - Done'}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {meeting.status === 'failed' && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Processing Failed</p>
                <p className="text-sm text-red-600 mt-1">
                  {meeting.errorMessage || 'An unknown error occurred during processing.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2 border-red-200 text-red-700 hover:bg-red-100"
                  onClick={handleReprocess}
                  disabled={reprocessing}
                >
                  {reprocessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Retry Processing
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="transcript">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
        </TabsList>
        <TabsContent value="transcript">
          <Card>
            <CardContent className="pt-6">
              {meeting.transcript ? (
                <TranscriptViewer transcript={meeting.transcript} />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileAudio className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {isProcessing
                      ? 'Transcript will appear here once transcription is complete.'
                      : meeting.status === 'failed'
                      ? 'Transcription failed. Try reprocessing the meeting.'
                      : 'Transcript will be available after AI processing is complete.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="summary">
          <Card>
            <CardContent className="pt-6">
              {meeting.summary ? (
                <MeetingSummary summary={meeting.summary} />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileAudio className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {isProcessing
                      ? 'Summary will appear here once analysis is complete.'
                      : meeting.status === 'failed'
                      ? 'Summary generation failed. Try reprocessing the meeting.'
                      : 'Summary will be available after AI processing is complete.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="actions">
          <Card>
            <CardContent className="pt-6">
              {meeting.status === 'completed' || meeting.status === 'failed' ? (
                <ActionItemsList meetingId={meeting._id} />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileAudio className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Action items will be extracted after AI processing is complete.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
