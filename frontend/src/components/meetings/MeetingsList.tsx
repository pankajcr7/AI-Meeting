'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Meeting, User } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  FileAudio,
  Upload,
  Mic,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface MeetingsListProps {
  limit?: number;
  showPagination?: boolean;
  emptyActions?: boolean;
  onUploadClick?: () => void;
  onRecordClick?: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  uploading: { label: 'Uploading', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  transcribing: { label: 'Transcribing', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  summarizing: { label: 'Summarizing', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-200' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800 border-red-200' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 7) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  return format(date, 'MMM d, yyyy');
}

function formatDuration(seconds?: number): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function getUserInfo(uploadedBy: User | string): { name: string; avatar?: string } {
  if (typeof uploadedBy === 'string') return { name: 'Unknown' };
  return { name: uploadedBy.name, avatar: uploadedBy.avatar };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function MeetingsList({
  limit = 10,
  showPagination = true,
  emptyActions = true,
  onUploadClick,
  onRecordClick,
}: MeetingsListProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchMeetings = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await api.get('/meetings', { params: { page, limit } });
      setMeetings(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchMeetings(1);
  }, [fetchMeetings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileAudio className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-1">No meetings yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Upload a meeting recording or start a new recording to get started with
          AI-powered transcription and action item extraction.
        </p>
        {emptyActions && (
          <div className="flex gap-2 mt-4">
            <Button className="gap-2" onClick={onUploadClick}>
              <Upload className="h-4 w-4" />
              Upload Meeting
            </Button>
            <Button variant="outline" className="gap-2" onClick={onRecordClick}>
              <Mic className="h-4 w-4" />
              Record Meeting
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => {
        const status = statusConfig[meeting.status] || statusConfig.processing;
        const user = getUserInfo(meeting.uploadedBy);
        const duration = formatDuration(meeting.duration);

        return (
          <Card
            key={meeting._id}
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => router.push(`/meetings/${meeting._id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {meeting.recordingType === 'browser' ? (
                    <Mic className="h-5 w-5 text-primary" />
                  ) : (
                    <Upload className="h-5 w-5 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-medium truncate">{meeting.title}</h4>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(meeting.createdAt)}</span>
                    {duration && <span>{duration}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {user.name}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {showPagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMeetings(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {pagination.page} / {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMeetings(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
