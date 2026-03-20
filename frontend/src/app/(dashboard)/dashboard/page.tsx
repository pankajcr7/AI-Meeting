'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileAudio, ListChecks, Clock, Upload, Mic } from 'lucide-react';

const stats = [
  { label: 'Total Meetings', value: '0', icon: FileAudio, color: 'text-blue-600' },
  { label: 'Action Items', value: '0', icon: ListChecks, color: 'text-green-600' },
  { label: 'Pending Tasks', value: '0', icon: Clock, color: 'text-orange-600' },
];

export default function DashboardPage() {
  const { user } = useAuth();

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
        {stats.map((stat) => (
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
            <Button className="gap-2" onClick={() => {}}>
              <Upload className="h-4 w-4" />
              Upload Meeting
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => {}}>
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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileAudio className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No meetings yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Upload a meeting recording or start a new recording to get started with
              AI-powered transcription and action item extraction.
            </p>
            <Button className="mt-4 gap-2" onClick={() => {}}>
              <Upload className="h-4 w-4" />
              Upload your first meeting
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
