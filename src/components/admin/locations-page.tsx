'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, MapPin, Upload, Search, FileSpreadsheet, Loader2 } from 'lucide-react'
import { authFetchJSON, authFetchJson } from '@/lib/utils'

interface StateItem { id: string; name: string; code: string; isActive: boolean; _count?: { districts: number; news: number } }
interface DistrictItem { id: string; name: string; stateId: string; isActive: boolean; state?: { name: string; code?: string }; _count?: { news: number; mandals: number } }
interface MandalItem { id: string; name: string; districtId: string; isActive: boolean; district?: { name: string; state?: { name: string; code: string } }; _count?: { news: number } }

export default function LocationsPage() {
  const [states, setStates] = useState<StateItem[]>([])
  const [districts, setDistricts] = useState<DistrictItem[]>([])
  const [mandals, setMandals] = useState<MandalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('districts')

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStateId, setFilterStateId] = useState('')
  const [filterDistrictId, setFilterDistrictId] = useState('')

  // Dialogs
  const [stateDialogOpen, setStateDialogOpen] = useState(false)
  const [districtDialogOpen, setDistrictDialogOpen] = useState(false)
  const [mandalDialogOpen, setMandalDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)

  // Edit items
  const [editState, setEditState] = useState<StateItem | null>(null)
  const [editDistrict, setEditDistrict] = useState<DistrictItem | null>(null)
  const [editMandal, setEditMandal] = useState<MandalItem | null>(null)

  // Forms
  const [stateForm, setStateForm] = useState({ name: '', code: '', isActive: true })
  const [districtForm, setDistrictForm] = useState({ name: '', stateId: '', isActive: true })
  const [mandalForm, setMandalForm] = useState({ name: '', districtId: '', isActive: true })

  // Bulk Import state
  const [bulkType, setBulkType] = useState<'districts' | 'mandals'>('mandals')
  const [bulkTargetStateId, setBulkTargetStateId] = useState('')
  const [bulkTargetDistrictId, setBulkTargetDistrictId] = useState('')
  const [bulkCsvText, setBulkCsvText] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const fetchStates = useCallback(async () => {
    try {
      const data = await authFetchJson<StateItem[]>('/api/admin/states', undefined, true)
      setStates(data)
    } catch { toast.error('Failed to load states') }
  }, [])

  const fetchDistricts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<DistrictItem[]>('/api/admin/districts', undefined, true)
      setDistricts(data)
    } catch { toast.error('Failed to load districts') }
    finally { setLoading(false) }
  }, [])

  const fetchMandals = useCallback(async () => {
    try {
      const data = await authFetchJson<MandalItem[]>('/api/admin/mandals', undefined, true)
      setMandals(data)
    } catch { toast.error('Failed to load mandals') }
  }, [])

  useEffect(() => {
    fetchStates()
    fetchDistricts()
    fetchMandals()
  }, [fetchStates, fetchDistricts, fetchMandals])

  const telanganaState = states.find(s => s.code === 'TG')

  // Filtered lists
  const filteredDistricts = useMemo(() => {
    return districts.filter(d => {
      const matchSearch = searchQuery === '' || d.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchState = !filterStateId || d.stateId === filterStateId
      return matchSearch && matchState
    })
  }, [districts, searchQuery, filterStateId])

  const filteredMandals = useMemo(() => {
    return mandals.filter(m => {
      const matchSearch = searchQuery === '' || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.district?.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchDistrict = !filterDistrictId || m.districtId === filterDistrictId
      const matchState = !filterStateId || m.district?.state?.name === states.find(s => s.id === filterStateId)?.name
      return matchSearch && matchDistrict && matchState
    })
  }, [mandals, searchQuery, filterDistrictId, filterStateId, states])

  const handleSaveState = async () => {
    try {
      if (editState) {
        await authFetchJSON(`/api/admin/states`, { method: 'PUT', body: JSON.stringify({ id: editState.id, ...stateForm }) })
        toast.success('State updated')
      } else {
        await authFetchJSON('/api/admin/states', { method: 'POST', body: JSON.stringify(stateForm) })
        toast.success('State created')
      }
      setStateDialogOpen(false)
      setEditState(null)
      fetchStates()
    } catch { toast.error('Failed to save state') }
  }

  const handleSaveDistrict = async () => {
    try {
      if (editDistrict) {
        await authFetchJSON(`/api/admin/districts`, { method: 'PUT', body: JSON.stringify({ id: editDistrict.id, ...districtForm }) })
        toast.success('District updated')
      } else {
        await authFetchJSON('/api/admin/districts', { method: 'POST', body: JSON.stringify(districtForm) })
        toast.success('District created')
      }
      setDistrictDialogOpen(false)
      setEditDistrict(null)
      fetchDistricts()
    } catch { toast.error('Failed to save district') }
  }

  const handleDeleteDistrict = async (id: string) => {
    if (!confirm('Delete this district?')) return
    try {
      await authFetchJSON(`/api/admin/districts`, { method: 'DELETE', body: JSON.stringify({ id }) })
      toast.success('District deleted')
      fetchDistricts()
    } catch { toast.error('Failed to delete') }
  }

  const handleSaveMandal = async () => {
    try {
      if (editMandal) {
        await authFetchJSON(`/api/admin/mandals`, { method: 'PUT', body: JSON.stringify({ id: editMandal.id, ...mandalForm }) })
        toast.success('Mandal updated')
      } else {
        await authFetchJSON('/api/admin/mandals', { method: 'POST', body: JSON.stringify(mandalForm) })
        toast.success('Mandal created')
      }
      setMandalDialogOpen(false)
      setEditMandal(null)
      fetchMandals()
    } catch { toast.error('Failed to save mandal') }
  }

  const handleDeleteMandal = async (id: string) => {
    if (!confirm('Delete this mandal?')) return
    try {
      await authFetchJSON(`/api/admin/mandals`, { method: 'DELETE', body: JSON.stringify({ id }) })
      toast.success('Mandal deleted')
      fetchMandals()
    } catch { toast.error('Failed to delete') }
  }

  const handleToggleStateActive = async (s: StateItem) => {
    try {
      await authFetchJSON('/api/admin/states', {
        method: 'PUT',
        body: JSON.stringify({ id: s.id, name: s.name, code: s.code, isActive: !s.isActive })
      })
      setStates(prev => prev.map(item => item.id === s.id ? { ...item, isActive: !item.isActive } : item))
      toast.success(`State ${!s.isActive ? 'activated' : 'deactivated'}`)
    } catch { toast.error('Failed to update state status') }
  }

  const handleToggleDistrictActive = async (d: DistrictItem) => {
    try {
      await authFetchJSON('/api/admin/districts', {
        method: 'PUT',
        body: JSON.stringify({ id: d.id, name: d.name, stateId: d.stateId, isActive: !d.isActive })
      })
      setDistricts(prev => prev.map(item => item.id === d.id ? { ...item, isActive: !item.isActive } : item))
      toast.success(`District ${!d.isActive ? 'activated' : 'deactivated'}`)
    } catch { toast.error('Failed to update district status') }
  }

  const handleToggleMandalActive = async (m: MandalItem) => {
    try {
      await authFetchJSON('/api/admin/mandals', {
        method: 'PUT',
        body: JSON.stringify({ id: m.id, name: m.name, districtId: m.districtId, isActive: !m.isActive })
      })
      setMandals(prev => prev.map(item => item.id === m.id ? { ...item, isActive: !item.isActive } : item))
      toast.success(`Mandal ${!m.isActive ? 'activated' : 'deactivated'}`)
    } catch { toast.error('Failed to update mandal status') }
  }

  const handleBulkImport = async () => {
    if (!bulkCsvText.trim()) {
      toast.error('Please paste or upload CSV rows')
      return
    }

    const lines = bulkCsvText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) return

    setIsImporting(true)
    try {
      if (bulkType === 'mandals') {
        if (!bulkTargetDistrictId) {
          toast.error('Please select the Target District for these mandals')
          setIsImporting(false)
          return
        }
        // Lines can be: "MandalName" or "DistrictName, MandalName"
        const items = lines.map(line => {
          const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
          const name = parts.length > 1 ? parts[1] : parts[0]
          return { name, districtId: bulkTargetDistrictId, isActive: true }
        }).filter(item => item.name && item.name.toLowerCase() !== 'mandal' && item.name.toLowerCase() !== 'mandal name')

        await authFetchJSON('/api/admin/mandals', { method: 'POST', body: JSON.stringify(items) })
        toast.success(`Successfully imported ${items.length} mandals!`)
        fetchMandals()
      } else {
        if (!bulkTargetStateId) {
          toast.error('Please select the Target State for these districts')
          setIsImporting(false)
          return
        }
        const items = lines.map(line => {
          const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
          const name = parts[0]
          return { name, stateId: bulkTargetStateId, isActive: true }
        }).filter(item => item.name && item.name.toLowerCase() !== 'district' && item.name.toLowerCase() !== 'district name')

        await authFetchJSON('/api/admin/districts', { method: 'POST', body: JSON.stringify(items) })
        toast.success(`Successfully imported ${items.length} districts!`)
        fetchDistricts()
      }

      setBulkDialogOpen(false)
      setBulkCsvText('')
    } catch (err: any) {
      toast.error(err?.message || 'Bulk import failed')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Location Management</h1>
          <p className="text-sm text-muted-foreground">Manage normalized States, Districts, and Mandals hierarchy with bulk CSV import.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Bulk CSV Import
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); setSearchQuery('') }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2">
          <TabsList>
            <TabsTrigger value="districts"><MapPin className="h-4 w-4 mr-2" />Districts ({districts.length})</TabsTrigger>
            <TabsTrigger value="mandals">Mandals ({mandals.length})</TabsTrigger>
            <TabsTrigger value="states">States ({states.length})</TabsTrigger>
          </TabsList>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            {activeTab !== 'states' && (
              <select
                className="h-9 border rounded-md px-2 text-xs bg-background"
                value={filterStateId}
                onChange={e => { setFilterStateId(e.target.value); setFilterDistrictId('') }}
              >
                <option value="">All States</option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            )}

            {activeTab === 'mandals' && (
              <select
                className="h-9 border rounded-md px-2 text-xs bg-background max-w-[160px]"
                value={filterDistrictId}
                onChange={e => setFilterDistrictId(e.target.value)}
              >
                <option value="">All Districts</option>
                {districts
                  .filter(d => !filterStateId || d.stateId === filterStateId)
                  .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* STATES TAB */}
        <TabsContent value="states" className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditState(null); setStateForm({ name: '', code: '', isActive: true }); setStateDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" /> Add State
            </Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Districts</TableHead>
                    <TableHead>News Published</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {states.filter(s => searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-gray-900">{s.name}</TableCell>
                      <TableCell><Badge variant="outline">{s.code}</Badge></TableCell>
                      <TableCell>{s._count?.districts || 0}</TableCell>
                      <TableCell>{s._count?.news || 0}</TableCell>
                      <TableCell>
                        <Switch checked={s.isActive} onCheckedChange={() => handleToggleStateActive(s)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => { setEditState(s); setStateForm({ name: s.name, code: s.code, isActive: s.isActive }); setStateDialogOpen(true) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DISTRICTS TAB */}
        <TabsContent value="districts" className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Showing {filteredDistricts.length} districts</span>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditDistrict(null); setDistrictForm({ name: '', stateId: filterStateId || telanganaState?.id || '', isActive: true }); setDistrictDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" /> Add District
            </Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>District Name</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Mandals</TableHead>
                        <TableHead>News</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDistricts.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-semibold text-gray-900">{d.name}</TableCell>
                          <TableCell><Badge variant="secondary">{d.state?.name || '-'}</Badge></TableCell>
                          <TableCell>{d._count?.mandals || 0}</TableCell>
                          <TableCell>{d._count?.news || 0}</TableCell>
                          <TableCell>
                            <Switch checked={d.isActive} onCheckedChange={() => handleToggleDistrictActive(d)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="icon" variant="ghost" onClick={() => { setEditDistrict(d); setDistrictForm({ name: d.name, stateId: d.stateId, isActive: d.isActive }); setDistrictDialogOpen(true) }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDeleteDistrict(d.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MANDALS TAB */}
        <TabsContent value="mandals" className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Showing {filteredMandals.length} mandals</span>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditMandal(null); setMandalForm({ name: '', districtId: filterDistrictId || '', isActive: true }); setMandalDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" /> Add Mandal
            </Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mandal Name</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>News</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMandals.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-semibold text-gray-900">{m.name}</TableCell>
                          <TableCell>{m.district?.name || '-'}</TableCell>
                          <TableCell><Badge variant="outline">{m.district?.state?.name || '-'}</Badge></TableCell>
                          <TableCell>{m._count?.news || 0}</TableCell>
                          <TableCell>
                            <Switch checked={m.isActive} onCheckedChange={() => handleToggleMandalActive(m)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="icon" variant="ghost" onClick={() => { setEditMandal(m); setMandalForm({ name: m.name, districtId: m.districtId, isActive: m.isActive }); setMandalDialogOpen(true) }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDeleteMandal(m.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* State Dialog */}
      <Dialog open={stateDialogOpen} onOpenChange={setStateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editState ? 'Edit State' : 'Add State'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input placeholder="e.g. Telangana" value={stateForm.name} onChange={e => setStateForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Code (2-3 chars) *</Label><Input placeholder="e.g. TG" value={stateForm.code} onChange={e => setStateForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} maxLength={3} /></div>
            <div className="flex items-center gap-2"><Switch checked={stateForm.isActive} onCheckedChange={v => setStateForm(p => ({ ...p, isActive: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStateDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveState}>{editState ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* District Dialog */}
      <Dialog open={districtDialogOpen} onOpenChange={setDistrictDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDistrict ? 'Edit District' : 'Add District'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>District Name *</Label><Input placeholder="e.g. Warangal" value={districtForm.name} onChange={e => setDistrictForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>State *</Label>
              <select className="w-full border rounded-md p-2 text-sm bg-background" value={districtForm.stateId} onChange={e => setDistrictForm(p => ({ ...p, stateId: e.target.value }))}>
                <option value="">Select state</option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={districtForm.isActive} onCheckedChange={v => setDistrictForm(p => ({ ...p, isActive: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistrictDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveDistrict}>{editDistrict ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mandal Dialog */}
      <Dialog open={mandalDialogOpen} onOpenChange={setMandalDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editMandal ? 'Edit Mandal' : 'Add Mandal'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Mandal Name *</Label><Input placeholder="e.g. Mulug" value={mandalForm.name} onChange={e => setMandalForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>District *</Label>
              <select className="w-full border rounded-md p-2 text-sm bg-background" value={mandalForm.districtId} onChange={e => setMandalForm(p => ({ ...p, districtId: e.target.value }))}>
                <option value="">Select district</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.state?.code})</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={mandalForm.isActive} onCheckedChange={v => setMandalForm(p => ({ ...p, isActive: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMandalDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveMandal}>{editMandal ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk CSV Import Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-red-600" />
              Bulk CSV Import Locations
            </DialogTitle>
            <DialogDescription>
              Quickly paste or import a list of Mandals or Districts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                <input type="radio" checked={bulkType === 'mandals'} onChange={() => setBulkType('mandals')} />
                Import Mandals
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                <input type="radio" checked={bulkType === 'districts'} onChange={() => setBulkType('districts')} />
                Import Districts
              </label>
            </div>

            {bulkType === 'mandals' ? (
              <div className="space-y-2">
                <Label>Target District *</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-background"
                  value={bulkTargetDistrictId}
                  onChange={e => setBulkTargetDistrictId(e.target.value)}
                >
                  <option value="">Select District for Mandals</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.state?.code})</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Target State *</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-background"
                  value={bulkTargetStateId}
                  onChange={e => setBulkTargetStateId(e.target.value)}
                >
                  <option value="">Select State for Districts</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>CSV / List (one per line) *</Label>
                <span className="text-[11px] text-muted-foreground">e.g. Mulug, Eturnagaram, Govindaraopet</span>
              </div>
              <textarea
                rows={6}
                value={bulkCsvText}
                onChange={e => setBulkCsvText(e.target.value)}
                placeholder={bulkType === 'mandals' ? "Mulug\nEturnagaram\nGovindaraopet\nTadvai" : "Warangal\nHanamkonda\nKarimnagar"}
                className="w-full border rounded-md p-2 text-xs font-mono bg-background"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleBulkImport} disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
