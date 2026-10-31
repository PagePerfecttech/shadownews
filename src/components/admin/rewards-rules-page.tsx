'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Coins,
  Award,
  Zap,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Save,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  History,
  AlertTriangle,
  UserCheck
} from 'lucide-react'
import { authFetchJson } from '@/lib/utils'

interface LevelConfig {
  id: string
  levelKey: string
  displayName: string
  rankOrder: number
  badgeColor: string
  minApprovedArticles: number
  minApprovalRate: number
  minTotalViews: number
  minPerformanceScore: number
  maxWarningsAllowed: number
  maxFakeNewsAllowed: number
  demotionScoreThreshold: number
  dailyPostLimit: number
  weeklyPostLimit: number
  perCategoryDailyLimit: number
  payPerApprovedArticle: number
  breakingBonus: number
  exclusiveBonus: number
  viewsBonusThreshold: number
  viewsBonusAmount: number
  penaltyRejectedArticle: number
  penaltyFakeNews: number
  canPublishDirectly: boolean
  isActive: boolean
}

interface LevelAudit {
  id: string
  reporterId: string
  fromLevel: string
  toLevel: string
  action: string
  reason: string | null
  changedBy: string | null
  createdAt: string
  reporter?: {
    name: string
    phone: string
  }
}

export default function RewardsRulesPage() {
  const [levels, setLevels] = useState<LevelConfig[]>([])
  const [audits, setAudits] = useState<LevelAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [activeLevelKey, setActiveLevelKey] = useState<string>('junior')

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<{ levels: LevelConfig[]; audits: LevelAudit[] }>('/api/admin/rewards/rules')
      setLevels(data.levels || [])
      setAudits(data.audits || [])
      if (data.levels && data.levels.length > 0 && !activeLevelKey) {
        setActiveLevelKey(data.levels[0].levelKey)
      }
    } catch {
      toast.error('Failed to load reward & level configurations')
    } finally {
      setLoading(false)
    }
  }, [activeLevelKey])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleLevelChange = (levelKey: string, field: keyof LevelConfig, value: unknown) => {
    setLevels((prev) =>
      prev.map((l) => (l.levelKey === levelKey ? { ...l, [field]: value } : l))
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await authFetchJson<{ success: boolean; levels: LevelConfig[] }>('/api/admin/rewards/rules', {
        method: 'PUT',
        body: JSON.stringify({ levels }),
      })
      if (res.success) {
        toast.success('Reward and Level rules saved successfully! Live in mobile app.')
        setLevels(res.levels)
      } else {
        toast.error('Failed to save rules')
      }
    } catch {
      toast.error('Network error saving reward rules')
    } finally {
      setSaving(false)
    }
  }

  const handleRunPromotionEngine = async () => {
    try {
      setEvaluating(true)
      const res = await authFetchJson<{
        success: boolean
        report: { evaluatedCount: number; promotedCount: number; demotedCount: number; flaggedCount: number }
      }>('/api/admin/rewards/rules', {
        method: 'POST',
      })
      if (res.success) {
        const { evaluatedCount, promotedCount, demotedCount, flaggedCount } = res.report
        toast.success(
          `Promotion Engine completed! Evaluated: ${evaluatedCount}, Promoted: ${promotedCount}, Demoted: ${demotedCount}, Recommended: ${flaggedCount}`
        )
        fetchRules()
      } else {
        toast.error('Promotion engine run failed')
      }
    } catch {
      toast.error('Error running promotion engine')
    } finally {
      setEvaluating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const currentLevel = levels.find((l) => l.levelKey === activeLevelKey) || levels[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="h-6 w-6 text-amber-500" /> Reward, Level & Submission Rules
          </h1>
          <p className="text-sm text-muted-foreground">
            Single Source of Truth for reporter career ranks, cash reward rates, limits, and automated promotion/demotion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRunPromotionEngine}
            disabled={evaluating}
            className="flex items-center gap-2"
          >
            <Play className={`h-4 w-4 ${evaluating ? 'animate-spin' : 'text-blue-600'}`} />
            {evaluating ? 'Evaluating...' : 'Run Engine Now'}
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save All Rules'}
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="levels" className="w-full">
        <TabsList className="grid grid-cols-2 w-72 mb-4">
          <TabsTrigger value="levels" className="flex items-center gap-2">
            <Award className="h-4 w-4" /> Career Levels
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Audit Log ({audits.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="space-y-6">
          {/* Level Switcher Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {levels.map((lvl) => {
              const isSelected = lvl.levelKey === activeLevelKey
              return (
                <div
                  key={lvl.levelKey}
                  onClick={() => setActiveLevelKey(lvl.levelKey)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                      ? 'border-red-600 bg-red-50/50 dark:bg-red-950/20 shadow-sm ring-2 ring-red-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 bg-card'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Rank {lvl.rankOrder}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: lvl.badgeColor }}
                    />
                  </div>
                  <div className="font-semibold text-sm truncate">{lvl.displayName}</div>
                  <div className="text-xs text-emerald-600 font-bold mt-1">
                    ₹{lvl.payPerApprovedArticle} / news
                  </div>
                </div>
              )
            })}
          </div>

          {currentLevel && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 1: Rewards & Penalties (₹) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Coins className="h-5 w-5 text-amber-500" /> Earning & Penalty Rates
                  </CardTitle>
                  <CardDescription>Direct cash values credited/debited to wallet in ₹</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Pay per Approved Article (₹)
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={currentLevel.payPerApprovedArticle}
                      onChange={(e) =>
                        handleLevelChange(currentLevel.levelKey, 'payPerApprovedArticle', parseFloat(e.target.value) || 0)
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Breaking News Bonus (₹)
                      </label>
                      <Input
                        type="number"
                        step="0.5"
                        value={currentLevel.breakingBonus}
                        onChange={(e) =>
                          handleLevelChange(currentLevel.levelKey, 'breakingBonus', parseFloat(e.target.value) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Exclusive Bonus (₹)
                      </label>
                      <Input
                        type="number"
                        step="0.5"
                        value={currentLevel.exclusiveBonus}
                        onChange={(e) =>
                          handleLevelChange(currentLevel.levelKey, 'exclusiveBonus', parseFloat(e.target.value) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
                    <div className="text-xs font-bold text-gray-500 uppercase">Viral Views Bonus</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-muted-foreground">Every X views:</span>
                        <Input
                          type="number"
                          value={currentLevel.viewsBonusThreshold}
                          onChange={(e) =>
                            handleLevelChange(currentLevel.levelKey, 'viewsBonusThreshold', parseInt(e.target.value, 10) || 1000)
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground">Reward (₹):</span>
                        <Input
                          type="number"
                          step="0.5"
                          value={currentLevel.viewsBonusAmount}
                          onChange={(e) =>
                            handleLevelChange(currentLevel.levelKey, 'viewsBonusAmount', parseFloat(e.target.value) || 0)
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-rose-600">
                        Penalty for Rejected Article (₹)
                      </label>
                      <Input
                        type="number"
                        step="0.5"
                        value={currentLevel.penaltyRejectedArticle}
                        onChange={(e) =>
                          handleLevelChange(currentLevel.levelKey, 'penaltyRejectedArticle', parseFloat(e.target.value) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-rose-700">
                        Penalty for Fake News Flag (₹)
                      </label>
                      <Input
                        type="number"
                        step="1"
                        value={currentLevel.penaltyFakeNews}
                        onChange={(e) =>
                          handleLevelChange(currentLevel.levelKey, 'penaltyFakeNews', parseFloat(e.target.value) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Submission Caps & Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-500" /> Submission Limits & Scope
                  </CardTitle>
                  <CardDescription>Anti-spam caps enforced at API and app levels</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Daily Post Limit (posts / day)
                    </label>
                    <Input
                      type="number"
                      value={currentLevel.dailyPostLimit}
                      onChange={(e) =>
                        handleLevelChange(currentLevel.levelKey, 'dailyPostLimit', parseInt(e.target.value, 10) || 1)
                      }
                      className="mt-1"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Crime news is exempt.</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Weekly Post Limit (posts / week)
                    </label>
                    <Input
                      type="number"
                      value={currentLevel.weeklyPostLimit}
                      onChange={(e) =>
                        handleLevelChange(currentLevel.levelKey, 'weeklyPostLimit', parseInt(e.target.value, 10) || 1)
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Per-Category Daily Limit
                    </label>
                    <Input
                      type="number"
                      value={currentLevel.perCategoryDailyLimit}
                      onChange={(e) =>
                        handleLevelChange(currentLevel.levelKey, 'perCategoryDailyLimit', parseInt(e.target.value, 10) || 1)
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold">Direct Publishing</label>
                        <p className="text-[11px] text-muted-foreground">Skip editorial approval queue</p>
                      </div>
                      <Switch
                        checked={currentLevel.canPublishDirectly}
                        onCheckedChange={(val) =>
                          handleLevelChange(currentLevel.levelKey, 'canPublishDirectly', val)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold">Rank Active Status</label>
                        <p className="text-[11px] text-muted-foreground">Enable this career tier</p>
                      </div>
                      <Switch
                        checked={currentLevel.isActive}
                        onCheckedChange={(val) =>
                          handleLevelChange(currentLevel.levelKey, 'isActive', val)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Promotion / Demotion Thresholds */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" /> Promotion Thresholds
                  </CardTitle>
                  <CardDescription>Requirements to be promoted to {currentLevel.displayName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Min Approved Articles
                      </label>
                      <Input
                        type="number"
                        value={currentLevel.minApprovedArticles}
                        onChange={(e) =>
                          handleLevelChange(currentLevel.levelKey, 'minApprovedArticles', parseInt(e.target.value, 10) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Min Approval Rate (%)
                      </label>
                      <Input
                        type="number"
                        value={currentLevel.minApprovalRate}
                        onChange={(e) =>
                          handleLevelChange(currentLevel.levelKey, 'minApprovalRate', parseFloat(e.target.value) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Min Total Views
                      </label>
                      <Input
                        type="number"
                        value={currentLevel.minTotalViews}
                        onChange={(e) =>
                          handleLevelChange(currentLevel.levelKey, 'minTotalViews', parseInt(e.target.value, 10) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Min Performance Score
                      </label>
                      <Input
                        type="number"
                        value={currentLevel.minPerformanceScore}
                        onChange={(e) =>
                          handleLevelChange(currentLevel.levelKey, 'minPerformanceScore', parseInt(e.target.value, 10) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Max Warnings Allowed
                      </label>
                      <Input
                        type="number"
                        value={currentLevel.maxWarningsAllowed}
                        onChange={(e) =>
                          handleLevelChange(currentLevel.levelKey, 'maxWarningsAllowed', parseInt(e.target.value, 10) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Max Fake News Flags
                      </label>
                      <Input
                        type="number"
                        value={currentLevel.maxFakeNewsAllowed}
                        onChange={(e) =>
                          handleLevelChange(currentLevel.levelKey, 'maxFakeNewsAllowed', parseInt(e.target.value, 10) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <label className="text-xs font-semibold text-rose-600">
                      Demotion Score Floor
                    </label>
                    <Input
                      type="number"
                      value={currentLevel.demotionScoreThreshold}
                      onChange={(e) =>
                        handleLevelChange(currentLevel.levelKey, 'demotionScoreThreshold', parseInt(e.target.value, 10) || 0)
                      }
                      className="mt-1"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      If score drops below this floor, demotion is triggered automatically.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Audit History */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-5 w-5 text-gray-500" /> Promotion & Demotion Engine Audit Trail
              </CardTitle>
              <CardDescription>
                Permanent record of every rank transition, reason, and triggering actor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {audits.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No level transitions recorded yet. Run the engine or update a reporter level.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Initiated By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(a.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          {a.reporter?.name || a.reporterId}
                          {a.reporter?.phone && (
                            <div className="text-[10px] text-muted-foreground">{a.reporter.phone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs uppercase">
                            {a.fromLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-red-600 text-white text-xs uppercase">
                            {a.toLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              a.action === 'promoted'
                                ? 'bg-emerald-600 text-white'
                                : a.action === 'demoted'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-gray-600 text-white'
                            }
                          >
                            {a.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-xs truncate" title={a.reason || ''}>
                          {a.reason || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.changedBy || 'system'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

