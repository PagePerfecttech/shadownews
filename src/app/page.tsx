import Link from 'next/link'
import {
  Flame,
  PlaySquare,
  MapPin,
  ShieldCheck,
  Award,
  Sparkles,
  Smartphone,
  Bell,
  ArrowRight,
  ExternalLink,
  Lock,
  CheckCircle2,
  Users,
  Radio,
  FileText,
  ChevronRight,
  Zap,
} from 'lucide-react'

export const metadata = {
  title: 'Shadow News | Hyperlocal Telugu Ground News & Video Shorts',
  description: 'Real-time ground news, breaking regional alerts, and video shorts across Telangana and Andhra Pradesh. Authentic community journalism from verified reporters.',
}

export default function LandingPage() {
  const categories = [
    { name: 'Politics', telugu: 'రాజకీయాలు', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
    { name: 'Crime', telugu: 'నేరాలు', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    { name: 'Agriculture', telugu: 'వ్యవసాయం', color: 'bg-lime-500/10 text-lime-400 border-lime-500/30' },
    { name: 'Entertainment', telugu: 'సినిమా & వినోదం', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    { name: 'Business', telugu: 'వాణిజ్యం', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    { name: 'Technology', telugu: 'టెక్నాలజీ', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
    { name: 'Sports', telugu: 'క్రీడలు', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    { name: 'Education', telugu: 'విద్య & ఉద్యోగాలు', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
    { name: 'Health', telugu: 'ఆరోగ్యం', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    { name: 'Infrastructure', telugu: 'అభివృద్ధి', color: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30' },
  ]

  const features = [
    {
      icon: MapPin,
      title: 'Hyperlocal Mandal Level Coverage',
      desc: 'Filter verified ground reports right down to your district, assembly constituency, and mandal in Telangana and Andhra Pradesh.',
      color: 'text-red-500 bg-red-500/10',
    },
    {
      icon: PlaySquare,
      title: 'Fast Vertical Video Shorts',
      desc: 'Engaging, sub-60-second video news shorts designed for quick mobile browsing with seamless autoplay and sharing.',
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      icon: Users,
      title: 'Verified Ground Citizen Reporters',
      desc: 'Hundreds of local citizen reporters on the ground submitting authentic news, backed by transparent wallet rewards.',
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      icon: Sparkles,
      title: 'AI-Enhanced Telugu Editorial',
      desc: 'Smart Telugu linguistic intelligence and fact-checking assistance that refines raw field submissions into polished articles.',
      color: 'text-purple-500 bg-purple-500/10',
    },
    {
      icon: Bell,
      title: 'Sub-Second Breaking Alerts',
      desc: 'Ultra-low latency Firebase Cloud Messaging (FCM) notifications for critical regional news, traffic, and emergency developments.',
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      icon: ShieldCheck,
      title: 'Zero-Tolerance Misinformation Shield',
      desc: 'Rigorous multi-layer editorial verification, duplicate detection, and automated spam filtering keep news authentic.',
      color: 'text-cyan-500 bg-cyan-500/10',
    },
  ]

  const tgDistricts = [
    'Hyderabad', 'Warangal', 'Karimnagar', 'Khammam', 'Nizamabad', 'Nalgonda',
    'Medchal-Malkajgiri', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Adilabad',
    'Mahabubnagar', 'Bhadradri Kothagudem', 'Jagtial', 'Suryapet'
  ]

  const apDistricts = [
    'Visakhapatnam', 'Vijayawada (NTR)', 'Guntur', 'Tirupati', 'Kurnool',
    'East Godavari', 'West Godavari', 'Ananthapuramu', 'Chittoor', 'Nellore',
    'Kakinada', 'Kadapa (YSR)', 'Srikakulam', 'Vizianagaram'
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-red-600 selection:text-white">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white p-0.5 shadow-lg flex items-center justify-center ring-1 ring-red-500/30">
              <img src="/logo.png" alt="Shadow News" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Shadow News
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Hyperlocal Ground Journalism</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#coverage" className="hover:text-white transition-colors">Regional Coverage</a>
            <a href="#categories" className="hover:text-white transition-colors">Categories</a>
            <a href="#reporter" className="hover:text-white transition-colors">Become a Reporter</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Admin Login CTA */}
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-xs font-semibold text-slate-200 hover:text-white transition-colors bg-slate-900/60"
            >
              <Lock className="w-3.5 h-3.5 text-red-400" />
              <span>Admin Login</span>
            </Link>

            {/* Live Web App CTA */}
            <a
              href="https://m.shadownews.in"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all shadow-md shadow-red-900/30 hover:shadow-red-800/50"
            >
              <span>Open Web App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[250px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & Call to Action */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-semibold text-white">Shadow News Ecosystem</span>
                <span className="text-slate-500">•</span>
                <span className="text-red-400 font-medium">Telangana & Andhra Pradesh</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                Real-Time Ground News &{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400">
                  Video Shorts
                </span>{' '}
                at Your Fingertips.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Delivering authentic Telugu ground journalism straight from verified reporters in your mandal.
                Experience lightning-fast breaking alerts, curated video shorts, and hyperlocal civic updates without noise or misinformation.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <a
                  href="https://m.shadownews.in"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all shadow-xl shadow-red-900/40 hover:scale-[1.02]"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Launch Mobile Web App</span>
                  <ExternalLink className="w-4 h-4 ml-0.5" />
                </a>

                <Link
                  href="/admin"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-bold text-sm transition-all hover:scale-[1.02]"
                >
                  <Lock className="w-4 h-4 text-red-400" />
                  <span>Staff & Admin Portal</span>
                  <ArrowRight className="w-4 h-4 ml-0.5 text-slate-400" />
                </Link>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-900">
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-black text-white">2 States</div>
                  <div className="text-xs text-slate-400">Telangana & AP</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-black text-red-500">59</div>
                  <div className="text-xs text-slate-400">Districts Covered</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-black text-amber-400">215+</div>
                  <div className="text-xs text-slate-400">Mandals & Towns</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-black text-emerald-400">24/7</div>
                  <div className="text-xs text-slate-400">Real-Time Alerts</div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive App Preview Card */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-sm rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl p-4 sm:p-5 backdrop-blur-xl">
                {/* Mock Phone Status Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white p-0.5">
                      <img src="/logo.png" alt="Shadow News" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-white text-xs">Shadow News Live</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Connecting Mandals
                  </div>
                </div>

                {/* Simulated Breaking Card */}
                <div className="my-3 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/90 shadow-md">
                  <div className="relative aspect-video bg-gradient-to-tr from-slate-900 to-red-950/40 flex items-center justify-center p-4">
                    <div className="text-center space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider">
                        <Flame className="w-3 h-3" /> Breaking News
                      </div>
                      <p className="text-xs text-slate-200 font-semibold line-clamp-2 px-2">
                        తెలంగాణ & ఆంధ్రప్రదేశ్ తాజా వార్తలు మరియు ప్రత్యేక కథనాలు
                      </p>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-slate-300 font-mono">
                      Just now
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                        <MapPin className="w-3 h-3" /> Hyderabad / Nizamabad
                      </span>
                      <span>Verified Ground Report</span>
                    </div>
                    <h3 className="text-xs font-bold text-white leading-snug">
                      హైపర్‌లోకల్ జర్నలిజం ద్వారా గ్రామీణ మరియు పట్టణ సమస్యల సమగ్ర సమాచారం
                    </h3>
                  </div>
                </div>

                {/* Simulated Shorts Quick Bar */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <PlaySquare className="w-3.5 h-3.5 text-amber-400" />
                      Trending Shorts (షార్ట్స్)
                    </span>
                    <span className="text-[10px] text-amber-400 font-semibold">Under 60s</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="aspect-[9/14] rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-end p-1.5 text-[10px] text-slate-300 font-medium">
                      <span>రైతు వార్తలు</span>
                    </div>
                    <div className="aspect-[9/14] rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-end p-1.5 text-[10px] text-slate-300 font-medium">
                      <span>పాలిటిక్స్</span>
                    </div>
                    <div className="aspect-[9/14] rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-end p-1.5 text-[10px] text-slate-300 font-medium">
                      <span>సినిమా</span>
                    </div>
                  </div>
                </div>

                {/* Launch Button inside Mock */}
                <div className="mt-3">
                  <a
                    href="https://m.shadownews.in"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-xs shadow-md transition-all"
                  >
                    Experience Full Mobile App
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Grid */}
      <section id="features" className="py-16 sm:py-24 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-red-400 tracking-wider uppercase">
              Engineered for Speed & Truth
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Why Millions Rely on Shadow News
            </h3>
            <p className="text-sm text-slate-400">
              Built on cutting-edge Next.js Turbopack architecture, Cloudflare high-speed CDN, and serverless PostgreSQL to deliver news within seconds of occurrence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all hover:-translate-y-1 shadow-lg space-y-3"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 4. Regional Coverage Section */}
      <section id="coverage" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-red-400 tracking-wider uppercase">
                Hyperlocal Footprint
              </h2>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Covering 59 Districts in Both Telugu States
              </h3>
              <p className="text-xs text-slate-400 max-w-xl">
                From capital metropolitan hubs to remote rural gram panchayats, our ground reporters ensure no community issue goes unnoticed.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1.5 rounded-lg shrink-0">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Active Ground Reporting Network
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Telangana */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  Telangana State (33 Districts)
                </h4>
                <span className="text-[11px] font-semibold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800/50">
                  తెలంగాణ
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tgDistricts.map((d, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-medium hover:border-slate-700 hover:text-white transition-colors"
                  >
                    {d}
                  </span>
                ))}
                <span className="px-2.5 py-1 rounded-md bg-slate-950/50 border border-dashed border-slate-800 text-[11px] text-slate-500">
                  + 18 more districts
                </span>
              </div>
            </div>

            {/* Andhra Pradesh */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Andhra Pradesh (26 Districts)
                </h4>
                <span className="text-[11px] font-semibold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                  ఆంధ్రప్రదేశ్
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {apDistricts.map((d, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-medium hover:border-slate-700 hover:text-white transition-colors"
                  >
                    {d}
                  </span>
                ))}
                <span className="px-2.5 py-1 rounded-md bg-slate-950/50 border border-dashed border-slate-800 text-[11px] text-slate-500">
                  + 12 more districts
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. News Categories */}
      <section id="categories" className="py-16 sm:py-24 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xs font-bold text-red-400 tracking-wider uppercase">Diverse Beats</h2>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Every Category You Care About
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {categories.map((cat, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${cat.color} backdrop-blur-sm transition-transform hover:scale-105 flex flex-col justify-between`}
              >
                <div className="text-xs font-bold">{cat.name}</div>
                <div className="text-[11px] opacity-75 mt-1 font-medium">{cat.telugu}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Citizen Reporter Call to Action */}
      <section id="reporter" className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 border border-red-900/50 p-8 sm:p-12 shadow-2xl">
            <div className="relative z-10 max-w-2xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-xs font-bold text-red-300">
                <Award className="w-3.5 h-3.5" />
                Join the Shadow News Reporter Network
              </div>

              <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Become the Voice of Your Village & Mandal
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Are you passionate about community journalism? Download the Shadow News mobile app, apply as a ground reporter, submit verified local news with photos and video, and earn transparent monetary rewards deposited directly into your UPI or bank wallet.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href="https://m.shadownews.in"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-lg hover:scale-105"
                >
                  <span>Apply via Mobile App</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <Link
                  href="/terms"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reporter Guidelines</span>
                </Link>
              </div>
            </div>

            <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
              <div className="w-64 h-64 rounded-full bg-red-500/30 blur-3xl" />
              <img src="/logo.png" alt="Shadow News" className="w-48 h-48 object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* 7. Quick Legal / Direct Access Strip */}
      <section className="py-6 border-t border-slate-900 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Editorial Platform & API Services Operational</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms & Conditions
            </Link>
            <span>•</span>
            <Link href="/delete-account" className="text-red-400 hover:text-red-300 font-medium transition-colors">
              Account Deletion Form
            </Link>
            <span>•</span>
            <Link href="/admin" className="text-white hover:text-red-400 font-bold transition-colors">
              Admin Portal →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
