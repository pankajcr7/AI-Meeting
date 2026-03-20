'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { ActionItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MeetingsList } from '@/components/meetings/MeetingsList';
import { UploadMeetingDialog } from '@/components/meetings/UploadMeetingDialog';
import {
  FileAudio,
  ListChecks,
  Clock,
  Upload,
  Mic,
  CheckCircle2,
  Circle,
  Flag,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const priorityConfig: Record<string, { className: string }> = {
  high: { className: 'bg-red-100 text-red-700 border-red-200' },
  medium: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { className: 'bg-green-100 text-green-700 border-green-200' },
};

const statusCycle: Record<string, string> = {
  pending: 'in-progress',
  'in-progress': 'completed',
  completed: 'pending',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === 'in-progress') return <Clock className="h-4 w-4 text-blue-600" />;
  return <Circle className="h-4 w-4 text-slate-400" />;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [stats, setStats] = useState({ meetings: 0, actionItems: 0, pending: 0 });
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [meetingsRes, itemsRes] = await Promise.all([
          api.get('/meetings', { params: { page: 1, limit: 1 } }),
          api.get('/action-items'),
        ]);

        const items: ActionItem[] = itemsRes.data.data || [];
        const pendingCount = items.filter(
          (i) => i.status === 'pending' || i.status === 'in-progress'
        ).length;

        setStats({
          meetings: meetingsRes.data.pagination?.total || 0,
          actionItems: items.length,
          pending: pendingCount,
        });

        const pendingItems = items
          .filter((i) => i.status !== 'completed')
          .sort((a, b) => {
            if (!a.deadline && !b.deadline) return 0;
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          })
          .slice(0, 5);

        setActionItems(pendingItems);
      } catch {}
    };
    fetchStats();
  }, [listKey]);

  const handleStatusToggle = async (item: ActionItem) => {
    const nextStatus = statusCycle[item.status];
    try {
      await api.put(`/action-items/${item._id}`, { status: nextStatus });
      setActionItems((prev) =>
        prev.map((i) =>
          i._id === item._id ? { ...i, status: nextStatus as ActionItem['status'] } : i
        )
      );
      setStats((prev) => {
        const delta = nextStatus === 'completed' ? -1 : item.status === 'completed' ? 1 : 0;
        return { ...prev, pending: prev.pending + delta };
      });
    } catch {}
  };

  const statCards = [
    { label: 'Total Meetings', value: String(stats.meetings), icon: FileAudio, color: 'text-blue-600' },
    { label: 'Action Items', value: String(stats.actionItems), icon: ListChecks, color: 'text-green-600' },
    { label: 'Pending Tasks', value: String(stats.pending), icon: Clock, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your meeting activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button className="gap-2" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload Meeting
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => router.push('/meetings/record')}>
              <Mic className="h-4 w-4" />
              Record Meeting
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Action Items</CardTitle>
            <Link href="/action-items">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {actionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No pending action items.
              </p>
            ) : (
              <div className="space-y-2">
                {actionItems.map((item) => {
                  const isOverdue =
                    item.deadline &&
                    item.status !== 'completed' &&
                    new Date(item.deadline) < new Date();
                  return (
                    <div
                      key={item._id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <button
                        onClick={() => handleStatusToggle(item)}
                        className="shrink-0 hover:scale-110 transition-transform"
                      >
                        <StatusIcon status={item.status} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="outline"
                            className={`text-[9px] py-0 ${priorityConfig[item.priority]?.className}`}
                          >
                            {item.priority}
                          </Badge>
                          {item.deadline && (
                            <span
                              className={`text-[10px] flex items-center gap-1 ${
                                isOverdue ? 'text-red-600' : 'text-muted-foreground'
                              }`}
                            >
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(item.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <MeetingsList
            key={listKey}
            limit={5}
            showPagination={false}
            onUploadClick={() => setUploadOpen(true)}
            onRecordClick={() => router.push('/meetings/record')}
          />
        </CardContent>
      </Card>

      <UploadMeetingDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => setListKey((k) => k + 1)}
      />
    </div>
  );
}
