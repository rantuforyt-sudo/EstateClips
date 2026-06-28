import Link from "next/link";
import {
  Film,
  Zap,
  Home,
  Star,
  ArrowRight,
  Check,
  Captions,
  Sparkles,
  Video,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-obsidian-300 text-slate-200">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 backdrop-blur-xl bg-obsidian-300/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Film className="w-4 h-4 text-obsidian-300" />
            </div>
            <span className="text-lg font-bold text-white">
              Estate<span className="text-amber-500">Clips</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-obsidian-300 px-4 py-2 rounded-xl transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Built exclusively for real estate agents
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Turn property tours
            <br />
            into{" "}
            <span className="text-gradient-gold">viral clips</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your listing video. EstateClips AI detects the best moments,
            generates professional captions, adds room labels, and creates
            shareable clips — in minutes.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-obsidian-300 font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-xl shadow-amber-500/20 text-lg"
            >
              Start for free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-8 py-4 rounded-xl transition-all duration-200 text-lg"
            >
              Sign in
            </Link>
          </div>

          <p className="text-sm text-slate-600 mt-4">
            No credit card required · Free forever
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Real estate intelligence built in
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              EstateClips understands your content and applies the right
              treatment automatically.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Home,
                color: "amber",
                title: "Content Detection",
                desc: "Automatically identifies Property Tours, Luxury Listings, Open Houses, Market Updates, Neighborhood Tours, and more.",
              },
              {
                icon: Captions,
                color: "emerald",
                title: "Smart Captions",
                desc: "Removes filler words, fixes grammar, highlights keywords, and creates animated subtitles that enhance — not clutter.",
              },
              {
                icon: Video,
                color: "blue",
                title: "Room Labels",
                desc: "Detects mentions of kitchen, pool, master bedroom, office, and more — adds attractive overlays at the right moments.",
              },
              {
                icon: Star,
                color: "amber",
                title: "Highlight Detection",
                desc: "AI scores every moment and picks the most compelling 15–60 second windows that drive engagement.",
              },
              {
                icon: Zap,
                color: "emerald",
                title: "Template Matching",
                desc: "Luxury listings get elegant fonts. Open houses display address, date, and time. Talking heads get Reels-ready captions.",
              },
              {
                icon: Sparkles,
                color: "blue",
                title: "One Click, Multiple Clips",
                desc: "Upload once, get multiple ready-to-post clips for Instagram, TikTok, YouTube Shorts, and Facebook Reels.",
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-200"
              >
                <div
                  className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center ${
                    color === "amber"
                      ? "bg-amber-500/15 text-amber-400"
                      : color === "emerald"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-blue-500/15 text-blue-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-200 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Types */}
      <section className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Every type of real estate content
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Property Tour", color: "blue" },
              { label: "Luxury Listing", color: "amber" },
              { label: "Open House", color: "emerald" },
              { label: "Market Update", color: "indigo" },
              { label: "Neighborhood Tour", color: "yellow" },
              { label: "Agent Reel", color: "pink" },
              { label: "Listing Walkthrough", color: "teal" },
              { label: "Talking Head", color: "purple" },
            ].map(({ label }) => (
              <div
                key={label}
                className="border border-slate-800 rounded-xl px-4 py-3 text-center text-sm text-slate-400 hover:border-amber-500/30 hover:text-amber-400 transition-all duration-150 cursor-default"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              From upload to shareable in minutes
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Upload your video",
                desc: "Drop any property video up to 500MB. MP4, MOV, AVI, WebM, MKV all supported.",
              },
              {
                step: "02",
                title: "AI analyzes everything",
                desc: "EstateClips transcribes speech, detects scenes, identifies rooms, classifies content type, and scores every moment.",
              },
              {
                step: "03",
                title: "Clips are generated",
                desc: "The AI picks the best 3–6 moments, generates cleaned captions, adds room labels, and applies the right template.",
              },
              {
                step: "04",
                title: "Download and post",
                desc: "Preview each clip, toggle captions, and download. Ready for Instagram, TikTok, Facebook, and YouTube Shorts.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="flex gap-6 items-start p-6 bg-slate-900/30 rounded-2xl border border-slate-800"
              >
                <div className="text-3xl font-bold text-amber-500/40 font-display w-12 flex-shrink-0">
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 mb-1">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to clip your listings?
          </h2>
          <p className="text-slate-400 mb-8">
            Free forever. No credit card. No subscriptions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            {["No credit card", "Unlimited projects", "AI-powered"].map(
              (item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-400">
                  <Check className="w-4 h-4 text-emerald-400" />
                  {item}
                </div>
              )
            )}
          </div>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-obsidian-300 font-bold px-10 py-4 rounded-xl transition-all duration-200 shadow-xl shadow-amber-500/20 text-lg"
          >
            Get started free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-400">
              EstateClips
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Built for real estate agents · Powered by Google Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
}
