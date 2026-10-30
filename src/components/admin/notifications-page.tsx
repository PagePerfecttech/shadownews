'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Trash2, Bell, Send } from 'lucide-react'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'

interface NotificationItem {
  id: string
  title: string
  body: string
  imageUrl: string | null
  targetType: string
  targetValue: string | null
  newsId: string | null
  scheduledAt: string | null
  status: string
  sentCount: number
  deliveredCount: number
  openedCount: number
  createdAt: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [testingNotification, setTestingNotification] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<Record<string, unknown>>({
    title: '', body: '', imageUrl: '', targetType: 'all',
    targetValue: '', newsId: '', scheduledAt: '', sendNow: true,
  })

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<NotificationItem[]>('/api/admin/notifications')
      setNotifications(data)
    } catch { toast.error('Failed to load notifications') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const handleSave = async () => {
    try {
      const res = await authFetchJSON('/api/admin/notifications', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Notification created')
      setDialogOpen(false)
      fetchNotifications()
    } catch { toast.error('Failed to create notification') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification?')) return
    try {
      await authFetch(`/api/admin/notifications/${id}`, { method: 'DELETE' })
      toast.success('Notification deleted')
      fetchNotifications()
    } catch { toast.error('Failed to delete') }
  }

  const handleSendTestNotification = async () => {
    setTestingNotification(true)
    try {
      const res = await authFetch('/api/admin/notifications/test', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Test notification sent successfully to topic "all"!')
      } else {
        toast.error(data.error || 'Failed to send test notification')
      }
    } catch {
      toast.error('Network error sending test notification')
    } finally {
      setTestingNotification(false)
    }
  }

  const targetLabels: Record<string, string> = {
    all: 'All Users',
    district: 'By District',
    category: 'By Category',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Push Notifications</h1>
          <p className="text-sm text-muted-foreground">{notifications.length} notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={handleSendTestNotification}
            disabled={testingNotification}
          >
            <Bell className="h-4 w-4 mr-2" />
            {testingNotification ? 'Sending Test...' : 'Send Test Notification'}
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setForm({ title: '', body: '', imageUrl: '', targetType: 'all', targetValue: '', newsId: '', scheduledAt: '', sendNow: true }); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" /> Create Notification
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map(n => (
                    <TableRow key={n.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{n.body}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{targetLabels[n.targetType] || n.targetType}</Badge></TableCell>
                      <TableCell><Badge className={statusColors[n.status] || ''}>{n.status}</Badge></TableCell>
                      <TableCell className="text-sm">{n.sentCount?.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{n.deliveredCount?.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{n.openedCount?.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDelete(n.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {notifications.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No notifications yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Push Notification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title as string} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Notification title" /></div>
            <div className="space-y-2"><Label>Body</Label><Textarea value={form.body as string} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Notification message" rows={3} /></div>
            <div className="space-y-2"><Label>Image URL</Label><Input value={form.imageUrl as string} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="Optional image" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target</Label>
                <select className="w-full border rounded-md p-2 text-sm" value={form.targetType as string} onChange={e => setForm(p => ({ ...p, targetType: e.target.value }))}>
                  <option value="all">All Users</option>
                  <option value="district">Specific District</option>
                  <option value="category">Specific Category</option>
                </select>
              </div>
              {form.targetType !== 'all' && (
                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input value={form.targetValue as string} onChange={e => setForm(p => ({ ...p, targetValue: e.target.value }))} placeholder="ID" />
                </div>
              )}
            </div>
            <div className="space-y-2"><Label>Deep Link (News ID)</Label><Input value={form.newsId as string} onChange={e => setForm(p => ({ ...p, newsId: e.target.value }))} placeholder="Optional - links to news article" /></div>
            <div className="space-y-2"><Label>Schedule (leave empty for draft)</Label><Input type="datetime-local" value={form.scheduledAt as string} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value, sendNow: !e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { setForm(p => ({ ...p, sendNow: false })); handleSave() }}>Save Draft</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setForm(p => ({ ...p, sendNow: true })); handleSave() }}>
              <Send className="h-4 w-4 mr-2" /> Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
