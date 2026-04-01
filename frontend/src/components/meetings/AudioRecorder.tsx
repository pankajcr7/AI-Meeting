'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Mic, MicOff, Pause, Play, Square, Loader2 } from 'lucide-react';

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'saving';

export function AudioRecorder() {
  const router = useRouter();
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(32).fill(0));
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const updateLevels = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const bars = 32;
    const step = Math.floor(data.length / bars);
    const levels = [];
    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += data[i * step + j];
      }
      levels.push(sum / step / 255);
    }
    setAudioLevels(levels);
    animFrameRef.current = requestAnimationFrame(updateLevels);
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        setShowSaveDialog(true);
      };

      recorder.start(1000);
      setState('recording');
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      animFrameRef.current = requestAnimationFrame(updateLevels);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError(err.message || 'Failed to start recording');
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
      animFrameRef.current = requestAnimationFrame(updateLevels);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setState('stopped');
    setAudioLevels(new Array(32).fill(0));
  };

  const saveRecording = async () => {
    setState('saving');
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('title', title || `Recording ${new Date().toLocaleString()}`);

    try {
      await api.post('/meetings/record', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Recording saved successfully');
      cleanup();
      router.push('/meetings');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save recording');
      setState('stopped');
      setShowSaveDialog(true);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
  };

  const discardRecording = () => {
    cleanup();
    setState('idle');
    setElapsed(0);
    setShowSaveDialog(false);
    setTitle('');
    setAudioLevels(new Array(32).fill(0));
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-end justify-center gap-0.5 h-24 w-full max-w-md">
              {audioLevels.map((level, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/80 rounded-t transition-all duration-75"
                  style={{
                    height: `${Math.max(4, level * 96)}px`,
                    opacity: state === 'recording' ? 0.4 + level * 0.6 : 0.2,
                  }}
                />
              ))}
            </div>

            <div className="text-5xl font-mono font-bold tracking-wider tabular-nums">
              {formatTime(elapsed)}
            </div>

            {state === 'recording' && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                Recording
              </div>
            )}

            {state === 'paused' && (
              <p className="text-sm text-yellow-600 font-medium">Paused</p>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm w-full max-w-md text-center">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              {state === 'idle' && (
                <Button size="lg" onClick={startRecording} className="gap-2 px-8">
                  <Mic className="h-5 w-5" />
                  Start Recording
                </Button>
              )}

              {state === 'recording' && (
                <>
                  <Button size="lg" variant="outline" onClick={pauseRecording} className="gap-2">
                    <Pause className="h-5 w-5" />
                    Pause
                  </Button>
                  <Button size="lg" variant="destructive" onClick={stopRecording} className="gap-2">
                    <Square className="h-5 w-5" />
                    Stop & Save
                  </Button>
                </>
              )}

              {state === 'paused' && (
                <>
                  <Button size="lg" variant="outline" onClick={resumeRecording} className="gap-2">
                    <Play className="h-5 w-5" />
                    Resume
                  </Button>
                  <Button size="lg" variant="destructive" onClick={stopRecording} className="gap-2">
                    <Square className="h-5 w-5" />
                    Stop & Save
                  </Button>
                </>
              )}

              {state === 'saving' && (
                <Button size="lg" disabled className="gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSaveDialog} onOpenChange={(v) => { if (!v && state !== 'saving') setShowSaveDialog(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Recording</DialogTitle>
            <DialogDescription>
              Give your recording a title before saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Meeting Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly standup, Sprint planning..."
              disabled={state === 'saving'}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Duration: {formatTime(elapsed)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={discardRecording} disabled={state === 'saving'}>
              Discard
            </Button>
            <Button onClick={saveRecording} disabled={state === 'saving'} className="gap-2">
              {state === 'saving' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Recording'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
