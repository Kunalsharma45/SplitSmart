import React from 'react';
import Navbar from '../components/Navbar';

export default function ApprovalQueuePage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Navbar />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold">Approval Queue (Draft)</h1>
          <p className="mt-2 text-slate-600">Approvals and audit log UI scaffold for expense approvals.</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow">No pending approvals.</div>
      </div>
    </div>
  );
}
