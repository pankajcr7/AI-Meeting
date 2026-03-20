'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ActionItem, Meeting } from '@/types';
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
  FileAudio,
  ArrowUpDown,
  CheckSquare,
} from 'lucide-react';
import Link from 'next/link';

const priorityConfig: Record<string, { label: string; className: string; order: number }> = {
  high: { label: 'High', className: 'bg-red-100 text-red-700 border-red-200', order: 0 },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 border-yellow-200', order: 1 },
  low: { label: 'Low', className: 'bg-green-100 text-green-700 border-green-200', order: 2 },
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

export default function ActionItemsPage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'created'>('created');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editItem, setEditItem] = useState<ActionItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ItemFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      params.sortBy = sortBy;
      const res = await api.get('/action-items', { params });
      setItems(res.data.data);
    } catch {
      toast.error('Failed to load action items');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, sortBy]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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

  const handleBulkComplete = async () => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      await api.post('/action-items/bulk-update', {
        ids: Array.from(selectedIds),
        status: 'completed',
      });
      setItems((prev) =>
        prev.map((i) => (selectedIds.has(i._id) ? { ...i, status: 'completed' } : i))
      );
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} items marked as completed`);
    } catch {
      toast.error('Bulk update failed');
    } finally {
      setBulkUpdating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i._id)));
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
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
      toast.success('Action item deleted');
    } catch {
      toast.error('Failed to delete');
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

  const filteredItems = items;

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'deadline') {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sortBy === 'priority') {
      return (priorityConfig[a.priority]?.order ?? 1) - (priorityConfig[b.priority]?.order ?? 1);
    }
    return 0;
  });

  const counts = {
    all: items.length,
    pending: items.filter((i) => i.status === 'pending').length,
    'in-progress': items.filter((i) => i.status === 'in-progress').length,
    completed: items.filter((i) => i.status === 'completed').length,
  };

  const getMeetingTitle = (meeting: any) => {
    if (!meeting) return null;
    if (typeof meeting === 'string') return null;
    return meeting.title;
  };

  const getMeetingId = (meeting: any) => {
    if (!meeting) return null;
    if (typeof meeting === 'string') return meeting;
    return meeting._id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Action Items</h1>
          <p className="text-muted-foreground text-sm">
            Manage action items across all meetings.
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Action Item
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { key: 'all', label: 'Total', count: counts.all, color: 'text-foreground', bg: 'bg-muted' },
          { key: 'pending', label: 'Pending', count: counts.pending, color: 'text-orange-600', bg: 'bg-orange-50' },
          { key: 'in-progress', label: 'In Progress', count: counts['in-progress'], color: 'text-blue-600', bg: 'bg-blue-50' },
          { key: 'completed', label: 'Completed', count: counts.completed, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat) => (
          <Card
            key={stat.key}
            className={`cursor-pointer transition-shadow hover:shadow-md ${
              statusFilter === stat.key ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setStatusFilter(stat.key)}
          >
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Priority:</span>
          {['all', 'high', 'medium', 'low'].map((p) => (
            <Button
              key={p}
              variant={priorityFilter === p ? 'default' : 'outline'}
              size="sm"
              className="text-xs capitalize"
              onClick={() => setPriorityFilter(p)}
            >
              {p === 'all' ? 'All' : p}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          {[
            { key: 'created', label: 'Recent' },
            { key: 'deadline', label: 'Deadline' },
            { key: 'priority', label: 'Priority' },
          ].map((s) => (
            <Button
              key={s.key}
              variant={sortBy === s.key ? 'default' : 'outline'}
              size="sm"
              className="text-xs gap-1"
              onClick={() => setSortBy(s.key as typeof sortBy)}
            >
              <ArrowUpDown className="h-3 w-3" />
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" className="gap-2" onClick={handleBulkComplete} disabled={bulkUpdating}>
            {bulkUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckSquare className="h-3 w-3" />}
            Mark Completed
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No action items</p>
          <p className="text-sm text-muted-foreground mt-1">
            Action items will appear here after meetings are processed.
          </p>
          <Button className="mt-4 gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create Manually
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedItems.length > 1 && (
            <div className="flex items-center gap-2 px-1 pb-1">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-xs text-muted-foreground">Select all</span>
            </div>
          )}
          {sortedItems.map((item) => {
            const meetingTitle = getMeetingTitle(item.meeting);
            const meetingId = getMeetingId(item.meeting);
            const isOverdue =
              item.deadline &&
              item.status !== 'completed' &&
              new Date(item.deadline) < new Date();

            return (
              <Card key={item._id} className="group hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item._id)}
                      onChange={() => toggleSelect(item._id)}
                      className="h-4 w-4 rounded border-gray-300 mt-1 shrink-0"
                    />
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
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] ${
                              isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {new Date(item.deadline).toLocaleDateString()}
                            {isOverdue && ' (overdue)'}
                          </span>
                        )}
                        {meetingTitle && meetingId && (
                          <Link
                            href={`/meetings/${meetingId}`}
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                          >
                            <FileAudio className="h-3 w-3" />
                            {meetingTitle}
                          </Link>
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
            <DialogTitle>{editItem ? 'Edit Action Item' : 'New Action Item'}</DialogTitle>
            <DialogDescription>
              {editItem ? 'Update the action item details.' : 'Create a standalone action item.'}
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
