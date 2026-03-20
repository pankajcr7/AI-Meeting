'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Copy, Check, Loader2 } from 'lucide-react';
import { Team, TeamMember } from '@/types';

export default function SettingsPage() {
  const { user, team, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', { name });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!team?._id) return;
    setGeneratingInvite(true);
    try {
      const { data } = await api.post(`/teams/${team._id}/invite`);
      setInviteCode(data.inviteCode);
    } catch {
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = (n: string) =>
    n
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and team settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled />
            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="mr-2 h-4 w-4" />
            ) : null}
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            {team?.name || 'No team selected'} &mdash; Manage your team members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {(team as Team)?.members?.map((member: TeamMember) => {
              const memberUser = typeof member.user === 'object' ? member.user : null;
              return (
                <div
                  key={memberUser?._id || String(member.user)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={memberUser?.avatar} />
                      <AvatarFallback className="text-xs">
                        {memberUser ? initials(memberUser.name) : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {memberUser?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {memberUser?.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                </div>
              );
            })}
            {!(team as Team)?.members?.length && (
              <p className="text-sm text-muted-foreground">No members found.</p>
            )}
          </div>
          <Separator />
          <div className="space-y-3">
            <Label>Invite Members</Label>
            {inviteCode ? (
              <div className="flex gap-2">
                <Input
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteCode}`}
                  readOnly
                  className="text-sm"
                />
                <Button variant="outline" size="icon" onClick={copyInviteLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={handleGenerateInvite} disabled={generatingInvite}>
                {generatingInvite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Invite Link
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your favorite tools.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {['Slack', 'Notion', 'Asana'].map((name) => (
              <div key={name} className="border rounded-lg p-4 text-center">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                  <span className="text-sm font-bold text-muted-foreground">
                    {name[0]}
                  </span>
                </div>
                <p className="font-medium text-sm">{name}</p>
                <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
