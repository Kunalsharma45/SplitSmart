import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-lg text-center">
        <h1 className="text-4xl font-bold">Shared Expenses</h1>
        <p className="mt-4 text-slate-600">Track group expenses, split bills, and settle balances easily.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/register" className="rounded-2xl bg-slate-900 px-6 py-3 text-white">Get Started</Link>
          <Link to="/login" className="rounded-2xl border border-slate-200 px-6 py-3">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
