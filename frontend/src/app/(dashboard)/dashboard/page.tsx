'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MeetingsList } from '@/components/meetings/MeetingsList';
import { UploadMeetingDialog } from '@/components/meetings/UploadMeetingDialog';
import { FileAudio, ListChecks, Clock, Upload, Mic } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [stats, setStats] = useState({ meetings: 0, actionItems: 0, pending: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/meetings', { params: { page: 1, limit: 1 } });
        setStats((prev) => ({ ...prev, meetings: res.data.pagination?.total || 0 }));
      } catch {}
    };
    fetchStats();
  }, [listKey]);

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
