import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased relative overflow-hidden">
      {/* Decorative Glowing Radial Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
              FairShare
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition">
              Sign In
            </Link>
            <Link to="/register" className="inline-flex items-center justify-center text-sm font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 px-4 py-2 rounded-xl text-white shadow-lg shadow-indigo-600/20 transition duration-150">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 relative">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-950 text-indigo-300 border border-indigo-900/50 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Spreetail Internship Assignment Submission
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.15]">
            Expense Splitting,<br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Perfected for Flatmates.
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed">
            Outgrow your messy shared spreadsheet. Import raw data, resolve duplicate anomalies, handle multi-currency trips, and auto-calculate fair balances with date-aware group memberships.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/register" className="inline-flex items-center justify-center text-base font-semibold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 px-8 py-4 rounded-2xl text-white shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
              Create Free Account
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center text-base font-semibold border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 backdrop-blur px-8 py-4 rounded-2xl text-slate-200 hover:text-white hover:border-slate-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
              Access Your Dashboard
            </Link>
          </div>
        </div>

        {/* Interactive Flatmate Scenario Showcase */}
        <section className="mt-24 border border-slate-900 bg-slate-950/60 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 blur-[80px] pointer-events-none" />
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h2 className="text-2xl font-bold text-white">Solving the Real Spreadsheet Mess</h2>
            <p className="mt-2 text-slate-400 text-sm">
              We parsed the flatmates' shared spreadsheet exports containing currency differences, overlaps, and moving dates. Here is how FairShare resolves their specific concerns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Aisha */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition duration-300">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-sm mb-3">A</div>
              <h3 className="font-semibold text-white text-sm">Aisha's View</h3>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                "One number per person. Who pays whom."
              </p>
              <div className="mt-3 py-1.5 px-2.5 bg-indigo-950/30 border border-indigo-900/50 rounded-lg text-[10px] text-indigo-300 font-mono text-center">
                Rohan owes Aisha ₹2,300
              </div>
            </div>

            {/* Rohan */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition duration-300">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-sm mb-3">R</div>
              <h3 className="font-semibold text-white text-sm">Rohan's Drilldown</h3>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                "I want to see exactly which expenses make up my balance."
              </p>
              <div className="mt-3 py-1.5 px-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-mono">
                <div className="flex justify-between border-b border-slate-800 pb-1"><span>Rent Split</span><span>₹1,500</span></div>
                <div className="flex justify-between pt-1"><span>Groceries</span><span>₹800</span></div>
              </div>
            </div>

            {/* Priya */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition duration-300">
              <div className="w-8 h-8 rounded-lg bg-purple-950 text-purple-400 flex items-center justify-center font-bold text-sm mb-3">P</div>
              <h3 className="font-semibold text-white text-sm">Priya's Currency</h3>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                "Trip was in USD. Convert correctly, don't treat $ as ₹."
              </p>
              <div className="mt-3 py-1.5 px-2.5 bg-purple-950/30 border border-purple-900/50 rounded-lg text-[10px] text-purple-300 font-mono text-center">
                $50 USD &rarr; ₹4,150 INR
              </div>
            </div>

            {/* Sam */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition duration-300">
              <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center font-bold text-sm mb-3">S</div>
              <h3 className="font-semibold text-white text-sm">Sam's Timeline</h3>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                "I moved in mid-April. March bills are not mine."
              </p>
              <div className="mt-3 py-1.5 px-2.5 bg-amber-950/30 border border-amber-900/50 rounded-lg text-[10px] text-amber-300 text-center">
                Exempt before Apr 15
              </div>
            </div>

            {/* Meera */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition duration-300">
              <div className="w-8 h-8 rounded-lg bg-rose-950 text-rose-400 flex items-center justify-center font-bold text-sm mb-3">M</div>
              <h3 className="font-semibold text-white text-sm">Meera's Controls</h3>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                "Clean up duplicates but let me approve deletions first."
              </p>
              <div className="mt-3 py-1.5 px-2.5 bg-rose-950/30 border border-rose-900/50 rounded-lg text-[10px] text-rose-300 text-center font-semibold">
                Pending Approval Queue
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mt-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* CSV Import */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-8 hover:bg-slate-900/30 hover:border-slate-800 transition duration-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-indigo-400 flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Smart CSV Parser</h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Upload messy spreadsheet files. Our local client-side validator processes rows instantly, identifying 12 distinct anomaly classes including splits mismatches and duplicate transactions.
              </p>
            </div>

            {/* AI Explainer */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-8 hover:bg-slate-900/30 hover:border-slate-800 transition duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">AI Anomaly Explainer</h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Stuck on a flagged data warning? One click triggers a GPT-4o-mini request through our secure backend proxy to explain what went wrong and how to fix it in plain, conversational English.
              </p>
            </div>

            {/* Simplification */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-8 hover:bg-slate-900/30 hover:border-slate-800 transition duration-300">
              <div className="w-12 h-12 rounded-2xl bg-purple-950 text-purple-400 flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Debt Minimization</h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Our transaction engine applies a debt-simplification graph algorithm. It aggregates splits and routes payments to minimize the absolute volume and count of transfers required to settle up.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 bg-slate-950 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs text-slate-500">
            &copy; 2026 FairShare. Shared apartment budgeting built for Spreetail.
          </p>
          <div className="flex gap-6 text-xs text-slate-400 font-mono">
            <Link to="/docs/SCOPE.md" className="hover:text-white transition">Scope</Link>
            <Link to="/docs/DECISIONS.md" className="hover:text-white transition">Decisions</Link>
            <Link to="/docs/AI_USAGE.md" className="hover:text-white transition">AI Usage</Link>
            <Link to="/docs/BUILD_PLAN.md" className="hover:text-white transition">Build Plan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
