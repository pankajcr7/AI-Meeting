'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Integration } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Loader2,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Zap,
  RefreshCw,
} from 'lucide-react';

interface PlatformOption {
  id: string;
  name: string;
}

const platformMeta: Record<
  string,
  { label: string; color: string; bgColor: string; letter: string; settingsKey: string; optionsLabel: string; optionsEndpoint: string }
> = {
  slack: {
    label: 'Slack',
    color: 'text-[#4A154B]',
    bgColor: 'bg-[#4A154B]',
    letter: 'S',
    settingsKey: 'channelId',
    optionsLabel: 'Channel',
    optionsEndpoint: '/integrations/slack/channels',
  },
  notion: {
    label: 'Notion',
    color: 'text-black',
    bgColor: 'bg-black',
    letter: 'N',
    settingsKey: 'databaseId',
    optionsLabel: 'Database',
    optionsEndpoint: '/integrations/notion/databases',
  },
  asana: {
    label: 'Asana',
    color: 'text-[#F06A6A]',
    bgColor: 'bg-[#F06A6A]',
    letter: 'A',
    settingsKey: 'projectId',
    optionsLabel: 'Project',
    optionsEndpoint: '/integrations/asana/projects',
  },
};

function getConnectedByName(integration: Integration): string {
  if (!integration.connectedBy) return 'Unknown';
  if (typeof integration.connectedBy === 'object') {
    return (integration.connectedBy as any).name || 'Unknown';
  }
  return 'Team member';
}

export function IntegrationSettings() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [platformOptions, setPlatformOptions] = useState<Record<string, PlatformOption[]>>({});
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({});
  const [savingSettings, setSavingSettings] = useState<Record<string, boolean>>({});

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await api.get('/integrations');
      setIntegrations(res.data.data);
    } catch {
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = params.get('integration');
    const status = params.get('status');
    const message = params.get('message');

    if (platform && status) {
      if (status === 'success') {
        toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected successfully!`);
        fetchIntegrations();
      } else if (status === 'error') {
        toast.error(`Failed to connect ${platform}: ${message || 'Unknown error'}`);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchIntegrations]);

  const getIntegration = (type: string): Integration | undefined =>
    integrations.find((i) => i.type === type);

  const handleConnect = async (type: string) => {
    setConnecting(type);
    try {
      const res = await api.get(`/integrations/${type}/connect`);
      window.location.href = res.data.data.url;
    } catch {
      toast.error(`Failed to initiate ${type} connection`);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    setDisconnecting(integration._id);
    try {
      await api.delete(`/integrations/${integration._id}`);
      setIntegrations((prev) => prev.filter((i) => i._id !== integration._id));
      toast.success(`${platformMeta[integration.type]?.label} disconnected`);
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(null);
    }
  };

  const loadOptions = async (type: string) => {
    const meta = platformMeta[type];
    if (!meta) return;

    setLoadingOptions((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await api.get(meta.optionsEndpoint);
      setPlatformOptions((prev) => ({ ...prev, [type]: res.data.data }));
    } catch {
      toast.error(`Failed to load ${meta.optionsLabel.toLowerCase()}s`);
    } finally {
      setLoadingOptions((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSettingChange = async (
    type: string,
    field: string,
    value: string | boolean
  ) => {
    setSavingSettings((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await api.put(`/integrations/${type}/settings`, { [field]: value });
      setIntegrations((prev) =>
        prev.map((i) => (i.type === type ? { ...i, settings: res.data.data.settings } : i))
      );
      toast.success('Settings updated');
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setSavingSettings((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleTestConnection = async (type: string) => {
    toast.loading(`Testing ${platformMeta[type]?.label} connection...`, { id: `test-${type}` });
    try {
      await loadOptions(type);
      toast.success(`${platformMeta[type]?.label} connection is working!`, { id: `test-${type}` });
    } catch {
      toast.error(`${platformMeta[type]?.label} connection test failed`, { id: `test-${type}` });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your favorite tools.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Connect your favorite tools to automatically sync action items.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(['slack', 'notion', 'asana'] as const).map((type) => {
          const meta = platformMeta[type];
          const integration = getIntegration(type);
          const isConnected = !!integration;
          const options = platformOptions[type] || [];
          const isLoadingOpts = loadingOptions[type] || false;
          const isSaving = savingSettings[type] || false;

          const settingsValue =
            integration?.settings?.[meta.settingsKey as keyof typeof integration.settings] as string | undefined;

          return (
            <div key={type} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-lg ${meta.bgColor} flex items-center justify-center`}
                  >
                    <span className="text-sm font-bold text-white">{meta.letter}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{meta.label}</p>
                    {isConnected ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600">Connected</span>
                        {integration.externalWorkspaceName && (
                          <span className="text-xs text-muted-foreground">
                            &middot; {integration.externalWorkspaceName}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not connected</p>
                    )}
                  </div>
                </div>
                {!isConnected ? (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(type)}
                    disabled={connecting === type}
                    className="gap-2"
                  >
                    {connecting === type ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Connect
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(type)}
                      className="gap-1.5"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Test
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          disabled={disconnecting === integration._id}
                        >
                          {disconnecting === integration._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Disconnect
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Disconnect {meta.label}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the {meta.label} integration. Action items
                            already synced will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDisconnect(integration)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Disconnect
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>

              {isConnected && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Connected by {getConnectedByName(integration)} &middot;{' '}
                        {new Date(integration.connectedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{meta.optionsLabel}</Label>
                      <div className="flex gap-2">
                        <Select
                          value={settingsValue || ''}
                          onValueChange={(val) =>
                            handleSettingChange(type, meta.settingsKey, val)
                          }
                          onOpenChange={(open) => {
                            if (open && options.length === 0) loadOptions(type);
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue
                              placeholder={
                                isLoadingOpts
                                  ? 'Loading...'
                                  : `Select a ${meta.optionsLabel.toLowerCase()}`
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingOpts ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            ) : options.length === 0 ? (
                              <div className="py-4 text-center text-sm text-muted-foreground">
                                No {meta.optionsLabel.toLowerCase()}s found
                              </div>
                            ) : (
                              options.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => loadOptions(type)}
                          disabled={isLoadingOpts}
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${isLoadingOpts ? 'animate-spin' : ''}`}
                          />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs">Auto-sync</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically sync new action items
                        </p>
                      </div>
                      <Switch
                        checked={integration.settings?.autoSync || false}
                        onCheckedChange={(checked) =>
                          handleSettingChange(type, 'autoSync', checked)
                        }
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
