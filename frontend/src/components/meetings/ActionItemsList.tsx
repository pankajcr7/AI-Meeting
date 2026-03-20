'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ActionItem, Integration } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Pencil,
  Trash2,
  User,
  Calendar,
  Flag,
  Loader2,
  ListChecks,
  CheckCircle2,
  Circle,
  Clock,
  Share2,
  ExternalLink,
} from 'lucide-react';

interface ActionItemsListProps {
  meetingId: string;
}

const priorityConfig: Record<string, { label: string; className: string; icon: string }> = {
  high: { label: 'High', className: 'bg-red-100 text-red-700 border-red-200', icon: '!!!' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '!!' },
  low: { label: 'Low', className: 'bg-green-100 text-green-700 border-green-200', icon: '!' },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  'in-progress': { label: 'In Progress', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
};

const statusCycle: Record<string, string> = {
  pending: 'in-progress',
  'in-progress': 'completed',
  completed: 'pending',
};

const platformLabels: Record<string, { label: string; color: string }> = {
  slack: { label: 'Slack', color: 'bg-[#4A154B] text-white' },
  notion: { label: 'Notion', color: 'bg-black text-white' },
  asana: { label: 'Asana', color: 'bg-[#F06A6A] text-white' },
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (status === 'in-progress') return <Clock className="h-5 w-5 text-blue-600" />;
  return <Circle className="h-5 w-5 text-slate-400" />;
}

interface ItemFormState {
  title: string;
  description: string;
  assignee: string;
  deadline: string;
  priority: string;
}

const emptyForm: ItemFormState = {
  title: '',
  description: '',
  assignee: '',
  deadline: '',
  priority: 'medium',
};

export function ActionItemsList({ meetingId }: ActionItemsListProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editItem, setEditItem] = useState<ActionItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ItemFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [syncingItem, setSyncingItem] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get(`/action-items/meeting/${meetingId}`);
      setItems(res.data.data);
    } catch {
      toast.error('Failed to load action items');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await api.get('/integrations');
      setIntegrations(res.data.data);
    } catch {
      // silently fail — integrations are optional
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchIntegrations();
  }, [fetchItems, fetchIntegrations]);

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const handleStatusToggle = async (item: ActionItem) => {
    const nextStatus = statusCycle[item.status];
    try {
      await api.put(`/action-items/${item._id}`, { status: nextStatus });
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, status: nextStatus as ActionItem['status'] } : i))
      );
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        const res = await api.put(`/action-items/${editItem._id}`, {
          title: formData.title,
          description: formData.description,
          assignee: formData.assignee || 'Unassigned',
          deadline: formData.deadline || null,
          priority: formData.priority,
        });
        setItems((prev) => prev.map((i) => (i._id === editItem._id ? res.data.data : i)));
        toast.success('Action item updated');
      } else {
        const res = await api.post('/action-items', {
          title: formData.title,
          description: formData.description,
          assignee: formData.assignee || 'Unassigned',
          deadline: formData.deadline || null,
          priority: formData.priority,
          meeting: meetingId,
        });
        setItems((prev) => [res.data.data, ...prev]);
        toast.success('Action item created');
      }
      closeForm();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/action-items/${id}`);
      setItems((prev) => prev.filter((i) => i._id !== id));
      toast.success('Action item deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleSyncToPlatform = async (itemId: string, platform: string) => {
    setSyncingItem(`${itemId}-${platform}`);
    try {
      const res = await api.post(`/integrations/${platform}/sync/${itemId}`);
      setItems((prev) =>
        prev.map((i) =>
          i._id === itemId
            ? {
                ...i,
                syncedTo: [
                  ...i.syncedTo,
                  { platform: platform as any, externalId: res.data.data.externalId, syncedAt: new Date().toISOString() },
                ],
              }
            : i
        )
      );
      toast.success(`Synced to ${platformLabels[platform]?.label || platform}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || `Failed to sync to ${platform}`);
    } finally {
      setSyncingItem(null);
    }
  };

  const handleSyncAllPlatforms = async (itemId: string) => {
    for (const integration of integrations) {
      const item = items.find((i) => i._id === itemId);
      const alreadySynced = item?.syncedTo?.some((s) => s.platform === integration.type);
      if (!alreadySynced) {
        await handleSyncToPlatform(itemId, integration.type);
      }
    }
  };

  const openEdit = (item: ActionItem) => {
    setEditItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      assignee: item.assignee || '',
      deadline: item.deadline ? item.deadline.split('T')[0] : '',
      priority: item.priority,
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditItem(null);
    setFormData(emptyForm);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const counts = {
    all: items.length,
    pending: items.filter((i) => i.status === 'pending').length,
    'in-progress': items.filter((i) => i.status === 'in-progress').length,
    completed: items.filter((i) => i.status === 'completed').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Action Items</span>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'in-progress', 'completed'] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            className="text-xs capitalize"
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : statusConfig[s]?.label || s} ({counts[s]})
          </Button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? 'No action items yet. Add one manually or they will be extracted by AI.'
              : 'No items match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const syncedPlatforms = item.syncedTo?.map((s) => s.platform) || [];
            const unsyncedIntegrations = integrations.filter(
              (int) => !syncedPlatforms.includes(int.type)
            );

            return (
              <Card key={item._id} className="group hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleStatusToggle(item)}
                      className="mt-0.5 shrink-0 hover:scale-110 transition-transform"
                      title={`Click to change to ${statusCycle[item.status]}`}
                    >
                      <StatusIcon status={item.status} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${
                              item.status === 'completed' ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {integrations.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={syncingItem?.startsWith(item._id) || false}
                                >
                                  {syncingItem?.startsWith(item._id) ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Share2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {unsyncedIntegrations.map((int) => (
                                  <DropdownMenuItem
                                    key={int.type}
                                    onClick={() => handleSyncToPlatform(item._id, int.type)}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                    Sync to {platformLabels[int.type]?.label || int.type}
                                  </DropdownMenuItem>
                                ))}
                                {unsyncedIntegrations.length > 1 && (
                                  <DropdownMenuItem
                                    onClick={() => handleSyncAllPlatforms(item._id)}
                                  >
                                    <Share2 className="h-3.5 w-3.5 mr-2" />
                                    Sync to All
                                  </DropdownMenuItem>
                                )}
                                {unsyncedIntegrations.length === 0 && (
                                  <DropdownMenuItem disabled>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-600" />
                                    Synced to all platforms
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete action item?</AlertDialogTitle>
                                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(item._id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${priorityConfig[item.priority]?.className}`}>
                          <Flag className="h-3 w-3 mr-1" />
                          {priorityConfig[item.priority]?.label}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${statusConfig[item.status]?.className}`}>
                          {statusConfig[item.status]?.label}
                        </Badge>
                        {item.assignee && item.assignee !== 'Unassigned' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="h-3 w-3" />
                            {item.assignee}
                          </span>
                        )}
                        {item.deadline && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.deadline).toLocaleDateString()}
                          </span>
                        )}
                        {syncedPlatforms.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            {syncedPlatforms.map((p) => (
                              <Badge
                                key={p}
                                className={`text-[9px] px-1.5 py-0 ${platformLabels[p]?.color || 'bg-gray-500 text-white'}`}
                              >
                                {platformLabels[p]?.label || p}
                              </Badge>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Action Item' : 'Add Action Item'}</DialogTitle>
            <DialogDescription>
              {editItem ? 'Update the action item details.' : 'Create a new action item for this meeting.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                placeholder="Action item title"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Assignee</label>
                <Input
                  value={formData.assignee}
                  onChange={(e) => setFormData((f) => ({ ...f, assignee: e.target.value }))}
                  placeholder="Person responsible"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Deadline</label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData((f) => ({ ...f, deadline: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Priority</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={formData.priority === p ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 capitalize"
                    onClick={() => setFormData((f) => ({ ...f, priority: p }))}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editItem ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
