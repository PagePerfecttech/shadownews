import Link from 'next/link'
import { Shield, ArrowLeft, Lock, Eye, Trash2, Smartphone, MapPin, Database, Mail } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy | Shadow News',
  description: 'Privacy Policy for Shadow News mobile applications, website, and editorial platform.',
}

export default function PrivacyPolicyPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/60 text-xs font-semibold text-red-400">
            <Shield className="w-3.5 h-3.5" />
            Transparency & Data Protection
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400">
            Last Updated: {lastUpdated} • Effective Date: Immediately upon publication
          </p>
        </div>

        {/* Callout: Account Deletion */}
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-red-300 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Looking to Delete Your Account or Data?
            </h4>
            <p className="text-xs text-slate-300">
              You can submit an account and personal data deletion request directly online at any time.
            </p>
          </div>
          <Link
            href="/delete-account"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0 transition-colors shadow"
          >
            Account Deletion Form
          </Link>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          {/* 1. Introduction */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              1. Introduction
            </h2>
            <p>
              Welcome to <strong>Shadow News</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), a modern hyperlocal digital news and media platform operated by Page Perfect Tech. We are committed to protecting your privacy and ensuring transparency regarding how your personal information is collected, stored, used, and shared.
            </p>
            <p>
              This Privacy Policy applies to our mobile applications (Android APK, Google Play releases, iOS apps), website (<strong>shadownews.in</strong>, <strong>m.shadownews.in</strong>), and associated backend services. By installing, downloading, browsing, or using Shadow News, you consent to the data practices described in this policy.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              2. Information We Collect
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Smartphone className="w-4 h-4 text-red-400" />
                  Account & Profile Information
                </div>
                <p className="text-xs text-slate-400">
                  When you register or log in, we collect your <strong>mobile phone number</strong> for secure OTP authentication. Optional profile data includes your name, email address, language preference (Telugu/English), and profile avatar.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Location Data (Hyperlocal Delivery)
                </div>
                <p className="text-xs text-slate-400">
                  With your permission, we collect your approximate or precise geographic coordinates to deliver news stories, weather, and civic alerts specific to your <strong>State, District, and Mandal</strong> in Telangana and Andhra Pradesh.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Database className="w-4 h-4 text-blue-400" />
                  Reporter Verification Data
                </div>
                <p className="text-xs text-slate-400">
                  Citizens applying to become verified Ground Reporters provide identification credentials, assigned operational mandals, and bank/UPI payment payout details for revenue disbursements.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Eye className="w-4 h-4 text-amber-400" />
                  Device, Usage & Push Notification Data
                </div>
                <p className="text-xs text-slate-400">
                  We collect device hardware details, operating system version, unique installation IDs, IP addresses, and Firebase Cloud Messaging (FCM) tokens required to deliver breaking news alerts.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Device Permissions */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              3. Device Permissions We Request
            </h2>
            <p>Our mobile app may request the following permissions only when necessary for specific features:</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li>
                <strong className="text-white">Location (ACCESS_COARSE_LOCATION / ACCESS_FINE_LOCATION):</strong> Used to match your location to your local district/mandal for customized regional news. You can manually choose your district without granting location access.
              </li>
              <li>
                <strong className="text-white">Camera & Storage/Photos (CAMERA / READ_MEDIA_IMAGES):</strong> Used exclusively by reporters when capturing or uploading news photos, video footage, or updating user profile avatars.
              </li>
              <li>
                <strong className="text-white">Push Notifications (POST_NOTIFICATIONS):</strong> Used to deliver critical breaking news and regional public safety alerts. You may disable notifications at any time in app settings.
              </li>
            </ul>
          </section>

          {/* 4. How We Use Your Information */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              4. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li>To deliver real-time news articles, video shorts, and localized regional feeds.</li>
              <li>To authenticate user sessions via secure SMS OTP.</li>
              <li>To calculate and process reporter payout rewards and maintain verified journalistic transparency.</li>
              <li>To moderate user-submitted comments, detect duplicate stories, and prevent hate speech or misinformation.</li>
              <li>To analyze aggregate usage trends to optimize app speed, battery efficiency, and CDN caching.</li>
            </ul>
          </section>

          {/* 5. Third-Party Services & Advertising */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              5. Third-Party Services & Data Sharing
            </h2>
            <p>
              We do <strong>not sell, rent, or trade</strong> your personal information to third parties. We only share data with essential infrastructure providers under strict confidentiality agreements:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li><strong>Cloudflare R2 & CDN:</strong> For fast, secure worldwide distribution of news images and media.</li>
              <li><strong>Google Firebase:</strong> For real-time authentication and FCM push notifications.</li>
              <li><strong>Neon PostgreSQL:</strong> Encrypted, serverless database hosting for application state.</li>
              <li><strong>Google AdMob & Direct Sponsors:</strong> To display non-intrusive banner and native advertisements that fund our ground journalism operations.</li>
            </ul>
          </section>

          {/* 6. Data Security & Storage */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              6. Data Security & Encryption
            </h2>
            <p>
              We enforce industry-standard security protocols, including TLS 1.3 encryption in transit, strict bcrypt password hashing, encrypted database connections with SSL mode required, and JWT token authorization for all administrative endpoints.
            </p>
          </section>

          {/* 7. Data Retention & Your Rights */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              7. Data Retention & Your Deletion Rights
            </h2>
            <p>
              Under applicable data protection regulations including the Digital Personal Data Protection Act (DPDP), you have the right to access, rectify, or request deletion of your personal data.
            </p>
            <p>
              To initiate an account and data wipe, visit our dedicated online deletion page at{' '}
              <Link href="/delete-account" className="text-red-400 underline font-semibold">
                shadownews.in/delete-account
              </Link>{' '}
              or email us at <strong>admin@shadownews.in</strong>. Upon request, your account is immediately deactivated and personal identifiers permanently removed from active databases within 30 days.
            </p>
          </section>

          {/* 8. Contact & Grievance Officer */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              8. Contact & Grievance Redressal
            </h2>
            <p>
              If you have any questions, concerns, or grievances regarding this Privacy Policy or our data practices, please reach out to our designated Grievance Officer:
            </p>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs text-slate-300">
              <p><strong className="text-white">Organization:</strong> Shadow News / Page Perfect Tech</p>
              <p><strong className="text-white">Grievance Officer:</strong> Editorial & Compliance Department</p>
              <p><strong className="text-white">Official Email:</strong> <a href="mailto:admin@shadownews.in" className="text-red-400 underline">admin@shadownews.in</a></p>
              <p><strong className="text-white">Operational Head:</strong> Hyderabad, Telangana, India</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

