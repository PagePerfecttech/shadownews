'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Smartphone,
  Mail,
  HelpCircle,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function DeleteAccountPage() {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [accountType, setAccountType] = useState<'reader' | 'reporter'>('reader')
  const [deletionScope, setDeletionScope] = useState<'full' | 'activity_only'>('full')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittedData, setSubmittedData] = useState<{ referenceId: string; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone.trim()) {
      toast.error('Please enter your registered mobile number.')
      return
    }

    if (!confirmed) {
      toast.error('Please confirm that you understand the deletion terms.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/user/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          email,
          accountType,
          deletionScope,
          reason,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit deletion request')
      }

      setSubmittedData({
        referenceId: data.referenceId,
        message: data.message,
      })
      toast.success('Account deletion request submitted successfully.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit request'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shadow News
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md overflow-hidden bg-white p-0.5 shadow">
              <img src="/logo.png" alt="Shadow News" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">Shadow News</span>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/60 text-xs font-semibold text-red-400 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Account & Data Deletion Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Request Account & Personal Data Deletion
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            In compliance with Google Play Store, Apple App Store, and the Indian Digital Personal Data Protection Act,
            Shadow News users and registered reporters may request deletion of their account and associated personal data.
          </p>
        </div>

        {/* Informational Guidance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-red-400">
              <Trash2 className="w-4 h-4" />
              What Will Be Deleted
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Profile data (name, mobile number, email, avatar).</li>
              <li>Authentication credentials & active login sessions.</li>
              <li>Device FCM notification tokens and alert preferences.</li>
              <li>Saved bookmarks, article comments, and interaction history.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              Retention for Legal Compliance
            </div>
            <p className="text-slate-400 leading-relaxed">
              News articles previously published publicly by reporters may remain in public archives for journalistic integrity. Financial payout records and statutory tax audit logs may be retained for the period mandated by applicable law.
            </p>
          </div>
        </div>

        {/* Form or Success State */}
        {submittedData ? (
          <Card className="bg-slate-900 border-slate-800 shadow-2xl text-slate-200">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <CardTitle className="text-xl text-white">Deletion Request Received</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Your request has been logged and assigned a tracking reference ID.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 text-center space-y-1">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Reference Tracking ID
                </span>
                <p className="text-lg font-mono font-bold text-emerald-400">
                  {submittedData.referenceId}
                </p>
              </div>

              <div className="text-xs text-slate-300 space-y-2 leading-relaxed bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                <p>{submittedData.message}</p>
                <p className="text-slate-400">
                  If you have questions or wish to follow up on your request, contact our data protection team at{' '}
                  <a href="mailto:admin@shadownews.in" className="text-red-400 underline font-medium">
                    admin@shadownews.in
                  </a>{' '}
                  quoting your reference ID above.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white">
                  <Link href="/">Return to Shadow News Home</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmittedData(null)
                    setPhone('')
                    setEmail('')
                    setReason('')
                    setConfirmed(false)
                  }}
                  className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Submit Another Request
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900 border-slate-800 shadow-2xl text-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-white">Account Deletion Form</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Please provide the phone number associated with your Shadow News account.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-red-500" />
                    Registered Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. 9876543210 or +919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-red-600 text-sm"
                  />
                  <p className="text-[11px] text-slate-500">
                    The 10-digit mobile number you used to sign in via OTP or Truecaller.
                  </p>
                </div>

                {/* Email (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    Email Address (Optional)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-red-600 text-sm"
                  />
                  <p className="text-[11px] text-slate-500">
                    Used to send you a confirmation copy of your deletion receipt.
                  </p>
                </div>

                {/* Account Type */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">Account Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccountType('reader')}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        accountType === 'reader'
                          ? 'border-red-600 bg-red-950/30 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">Reader / App User</div>
                      <div className="text-[11px] text-slate-500">General news reader</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType('reporter')}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        accountType === 'reporter'
                          ? 'border-red-600 bg-red-950/30 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">Ground Reporter</div>
                      <div className="text-[11px] text-slate-500">Registered reporter with wallet</div>
                    </button>
                  </div>
                </div>

                {/* Scope of Deletion */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">Deletion Scope</Label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/50 cursor-pointer hover:border-slate-700">
                      <input
                        type="radio"
                        name="scope"
                        checked={deletionScope === 'full'}
                        onChange={() => setDeletionScope('full')}
                        className="mt-1 text-red-600 focus:ring-red-500"
                      />
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Delete Entire Account & All Personal Data (Recommended)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Completely deactivates your account, wipes personal details, device tokens, bookmarks, and session history.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/50 cursor-pointer hover:border-slate-700">
                      <input
                        type="radio"
                        name="scope"
                        checked={deletionScope === 'activity_only'}
                        onChange={() => setDeletionScope('activity_only')}
                        className="mt-1 text-red-600 focus:ring-red-500"
                      />
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Clear App Activity & Interaction History Only
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Keeps login profile active but removes all comments, bookmarks, and personalized recommendations.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-xs font-semibold text-slate-300">
                    Reason for Deletion (Optional feedback)
                  </Label>
                  <Textarea
                    id="reason"
                    rows={3}
                    placeholder="Help us improve: let us know why you are choosing to delete your account..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-red-600 text-sm"
                  />
                </div>

                {/* Confirmation Checkbox */}
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/40 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-xs text-red-200 leading-relaxed">
                      I understand that once processed, my personal account details cannot be recovered.
                      If I wish to use Shadow News in the future, a new account will need to be registered.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={submitting || !confirmed || !phone.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 text-sm transition-all shadow-lg shadow-red-900/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting Deletion Request...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Confirm & Submit Deletion Request
                    </>
                  )}
                </Button>

                <p className="text-center text-[11px] text-slate-500">
                  By submitting, you agree to the terms in our{' '}
                  <Link href="/privacy" className="text-slate-400 underline hover:text-white">
                    Privacy Policy
                  </Link>
                  . Requests are processed within statutory timelines (typically 30 days).
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

