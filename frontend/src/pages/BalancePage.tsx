import React from 'react';
import Navbar from '../components/Navbar';

export default function BalancePage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Navbar />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold">Balances & Simplification (Draft)</h1>
          <p className="mt-2 text-slate-600">Balance engine drill-down UI scaffold; will show per-member balances and simplified debts.</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow">Loading balances…</div>
      </div>
    </div>
  );
}
