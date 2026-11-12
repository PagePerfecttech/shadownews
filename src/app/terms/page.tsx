import Link from 'next/link'
import { FileText, ArrowLeft, Shield, AlertCircle, CheckCircle, Scale, Mail } from 'lucide-react'

export const metadata = {
  title: 'Terms & Conditions | Shadow News',
  description: 'Terms of Service and Conditions of Use for Shadow News.',
}

export default function TermsAndConditionsPage() {
  const lastUpdated = 'November 12, 2026'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
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

        {/* Hero Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-xs font-semibold text-blue-400">
            <Scale className="w-3.5 h-3.5" />
            Legal Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-xs text-slate-400">
            Last Updated: {lastUpdated} • Please read these terms carefully before using our services
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          {/* 1. Acceptance */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              These Terms and Conditions (&ldquo;Terms&rdquo;) govern your access to and use of <strong>Shadow News</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), including our mobile applications, web platforms, APIs, and media services.
            </p>
            <p>
              By accessing, browsing, installing, or registering an account on Shadow News, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you must discontinue using our services immediately.
            </p>
          </section>

          {/* 2. User Accounts & Verification */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              2. User Accounts & Authentication
            </h2>
            <p>
              To access certain features (such as commenting, bookmarking, and local news reporting), you may be required to register using your valid mobile phone number and verify ownership via One-Time Password (OTP).
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li>You agree to provide accurate and complete registration information.</li>
              <li>You are solely responsible for maintaining the confidentiality of your credentials and account access.</li>
              <li>You must notify us immediately of any unauthorized use or security breach of your account.</li>
            </ul>
          </section>

          {/* 3. Editorial & Ground Reporter Guidelines */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              3. Citizen Journalism & Ground Reporter Code of Conduct
            </h2>
            <p>
              Shadow News empowers local citizens and verified journalists to report news from districts, mandals, and villages across Telangana and Andhra Pradesh. Reporters must strictly abide by our journalistic standards:
            </p>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-white">Strict Content Prohibitions:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li><strong className="text-red-400">Defamation & Slander:</strong> Submitting false, malicious, unverified, or defamatory claims against individuals, public officials, or organizations.</li>
                <li><strong className="text-red-400">Hate Speech & Communal Disharmony:</strong> Promoting violence, hatred, communal tension, caste-based abuse, or religious hostility.</li>
                <li><strong className="text-red-400">Explicit or Graphic Violence:</strong> Uploading gratuitous violence, gore, obscenity, or pornography.</li>
                <li><strong className="text-red-400">Plagiarism & Copyright Infringement:</strong> Re-uploading copyrighted TV broadcast footage, watermarked photos, or articles without explicit license or credit.</li>
              </ul>
            </div>
            <p className="text-xs text-slate-400">
              Shadow News reserves the right to review, edit, reject, or permanently unpublish any news submission, and suspend reporter accounts violating these guidelines.
            </p>
          </section>

          {/* 4. Reporter Rewards & Wallet Policies */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              4. Reporter Wallet & Reward Payouts
            </h2>
            <p>
              Verified reporters may earn financial incentives based on validated news submissions, article reach, and reader engagement metrics established by the editorial board:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li>Rewards are credited to your in-app Shadow News Wallet upon editorial verification of story quality and accuracy.</li>
              <li>Withdrawal requests are processed via UPI or direct bank transfer to accounts matching the reporter&rsquo;s verified KYC profile.</li>
              <li>Fraudulent activities, duplicate bot clicks, false location spoofing, or submitting plagiarized RSS articles will result in immediate forfeiture of wallet balance and permanent account termination.</li>
            </ul>
          </section>

          {/* 5. Intellectual Property & Content License */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              5. Intellectual Property & License
            </h2>
            <p>
              By submitting content (articles, photos, videos, commentaries) to Shadow News, you grant us a worldwide, perpetual, royalty-free, irrevocable license to publish, display, distribute, syndicate, and promote the material across our digital apps, websites, social media channels, and partner feeds.
            </p>
            <p>
              The Shadow News logo, brand trademarks, app interface, design tokens, software code, and editorial compilations are the exclusive intellectual property of Page Perfect Tech and protected by copyright and intellectual property laws.
            </p>
          </section>

          {/* 6. Disclaimers & Limitation of Liability */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              6. Disclaimers & Limitation of Liability
            </h2>
            <p>
              Shadow News is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis. While our editorial team strives for rigorous factual reporting, we do not guarantee the completeness, timeliness, or absolute accuracy of user-submitted ground news or external RSS syndications.
            </p>
            <p className="text-xs text-slate-400">
              To the fullest extent permitted by law, Shadow News and Page Perfect Tech shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from your use of or inability to use the platform.
            </p>
          </section>

          {/* 7. Account Deletion & Termination */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              7. Account Deletion & Termination
            </h2>
            <p>
              You may request deletion of your account and personal data at any time via our online form at{' '}
              <Link href="/delete-account" className="text-red-400 underline font-semibold">
                shadownews.in/delete-account
              </Link>
              . We reserve the right to suspend or terminate accounts that breach these Terms without prior notice.
            </p>
          </section>

          {/* 8. Governing Law & Jurisdiction */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              8. Governing Law & Jurisdiction
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to these Terms or your use of the service shall be subject to the exclusive jurisdiction of the competent courts in Hyderabad, Telangana, India.
            </p>
          </section>

          {/* 9. Contact Us */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              9. Contact Information
            </h2>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs text-slate-300">
              <p><strong className="text-white">Organization:</strong> Shadow News (Page Perfect Tech)</p>
              <p><strong className="text-white">Legal & Compliance Email:</strong> <a href="mailto:admin@shadownews.in" className="text-red-400 underline">admin@shadownews.in</a></p>
              <p><strong className="text-white">Headquarters:</strong> Hyderabad, Telangana, India</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

