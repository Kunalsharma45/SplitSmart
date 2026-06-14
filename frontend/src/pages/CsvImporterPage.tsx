import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../lib/api';
import CSVPreview, { PreviewRow } from '../components/ImportWizard/CSVPreview';

type ParsedRow = {
  row_number: number;
  valid: boolean;
  errors: string[];
  parsed_row: any | null;
  preview: {
    title?: string;
    date?: string;
    amount?: string;
    currency?: string;
    paid_by?: string;
    split_type?: string;
  };
};

export default function CsvImporterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [groupId, setGroupId] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [clientRows, setClientRows] = useState<PreviewRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<{id:string, username:string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    setRows([]);
    setClientRows([]);
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
  };

  React.useEffect(() => {
    if (!groupId) {
      setGroupMembers([]);
      return;
    }
    // fetch group members
    const fetchMembers = async () => {
      try {
        const resp = await api.get(`/groups/${groupId}/members/`);
        // resp.data.data is array of group member objects with nested `user`
        const mapped = (resp.data.data || []).map((m: any) => ({ id: m.user.id, username: m.user.username }));
        setGroupMembers(mapped);
      } catch (e) {
        setGroupMembers([]);
      }
    };
    fetchMembers();
  }, [groupId]);
  const parseCsv = async () => {
    // Prefer client-side preview if available
    if (!groupId) {
      setError('Please enter a group ID.');
      return;
    }
    setError(null);
    setSuccess(null);
    if (clientRows && clientRows.length > 0) {
      // map usernames -> ids
      const memberMap: Record<string,string> = {};
      groupMembers.forEach((m) => { memberMap[m.username.toLowerCase()] = m.id; });

      // convert client rows into server-compatible preview objects for import
      const transformed = clientRows.map((r) => {
        const pr = r.parsed_row || {};
        const split_type = (pr.split_type || 'EQUAL').toUpperCase();
        const base: any = {
          group: groupId,
          title: pr.title,
          description: (r.raw && r.raw.description) || '',
          amount: pr.amount,
          currency: pr.currency || 'INR',
          exchange_rate: pr.currency === 'INR' ? '1' : pr.exchange_rate || '',
          amount_inr: pr.amount,
          date: pr.date,
          category: pr.category || 'Other',
          paid_by_id: memberMap[(pr.paid_by || '').toLowerCase()] || pr.paid_by,
          split_type: split_type,
          import_source: 'CSV',
          import_row_number: r.row_number,
        };

        if (split_type !== 'EQUAL') {
          const splitsRaw = pr.splits || '';
          const entries = splitsRaw.split(';').map((s:string) => s.trim()).filter(Boolean);
          const splits = entries.map((entry: string) => {
            const [userKey, val] = entry.split('=');
            const uid = memberMap[(userKey||'').toLowerCase()] || (userKey||'');
            if (split_type === 'UNEQUAL') return { user_id: uid, amount_owed: (val||'').trim() };
            if (split_type === 'PERCENTAGE') return { user_id: uid, percentage: (val||'').replace('%','').trim() };
            if (split_type === 'SHARE') return { user_id: uid, shares: parseInt((val||'').trim(),10) };
            return { user_id: uid };
          });
          base.splits = splits;
        }

        return base;
      });
      setRows(transformed as any);
      setSuccess(`Client parsed ${clientRows.length} row(s). ${clientRows.filter(r => r.valid).length} valid.`);
      return;
    }
    // fallback to server parse
    if (!file) {
      setError('Please select a CSV file and enter a group ID.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('group_id', groupId);
      const response = await api.post('/imports/csv/parse/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRows(response.data.data.rows);
      setSuccess(`Parsed ${response.data.data.summary.total_rows} row(s). ${response.data.data.summary.valid_rows} valid, ${response.data.data.summary.invalid_rows} invalid.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to parse CSV file.');
    } finally {
      setLoading(false);
    }
  };

  const importRows = async () => {
    if (!rows.length || !groupId) {
      setError('No rows to import. Please parse a CSV file first.');
      return;
    }
    const validRows = rows.filter((row) => row.valid).map((row) => row.parsed_row);
    if (!validRows.length) {
      setError('There are no valid rows to import. Fix the CSV and re-parse.');
      return;
    }
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.post('/imports/csv/', { group_id: groupId, rows: validRows });
      setSuccess(`${response.data.data.created.length} expense(s) imported successfully.`);
      setRows([]);
      setFile(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to import CSV rows.';
      const apiErrors = err?.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        // concatenate row errors for display
        const mapped = apiErrors.map((e: any) => `Row ${e.row_number}: ${JSON.stringify(e.errors)}`).join(' | ');
        setError(`${message} — ${mapped}`);
      } else {
        setError(message);
      }
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const header = 'title,date,amount,currency,exchange_rate,category,paid_by,split_type,splits\n';
    const example = 'Groceries,2026-06-14,1200,INR,,Food,aisha,UNEQUAL,aisha=1200\n';
    const blob = new Blob([header + example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Navbar />
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold">CSV Importer</h1>
          <p className="mt-2 text-slate-600">Upload a CSV to preview expense rows, fix any parsing errors, and then confirm import.</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Group ID</span>
              <input value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="Group UUID" className="mt-1 w-full rounded border px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">CSV File</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="mt-1 w-full" />
            </label>
          </div>

          {/* Client-side preview component */}
          <CSVPreview file={file} onPreview={(rows) => setClientRows(rows)} groupId={groupId} />


          <div className="flex flex-wrap gap-3">
            <button onClick={parseCsv} disabled={!file || !groupId || loading} className="rounded-2xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60">Parse CSV</button>
            <button onClick={importRows} disabled={!rows.length || importing} className="rounded-2xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60">Import Valid Rows</button>
            <button onClick={downloadTemplate} className="rounded-2xl bg-sky-600 px-4 py-2 text-white">Download CSV Template</button>
          </div>

          {error && <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

          {rows.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-700">Parsed Rows</div>
                <div className="mt-4 space-y-3">
                  {rows.map((row) => (
                    <div key={row.row_number} className={`rounded-2xl border p-3 ${row.valid ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-900">
                        <div>Row #{row.row_number}</div>
                        <div>{row.valid ? 'Valid' : 'Invalid'}</div>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm text-slate-700">
                        <div><span className="font-medium">Title:</span> {row.preview.title || '—'}</div>
                        <div><span className="font-medium">Date:</span> {row.preview.date || '—'}</div>
                        <div><span className="font-medium">Amount:</span> {row.preview.amount || '—'}</div>
                        <div><span className="font-medium">Currency:</span> {row.preview.currency || '—'}</div>
                        <div><span className="font-medium">Paid by:</span> {row.preview.paid_by || '—'}</div>
                        <div><span className="font-medium">Split:</span> {row.preview.split_type || 'EQUAL'}</div>
                      </div>
                      {row.parsed_row && row.parsed_row.splits && (
                        <div className="mt-3 text-sm text-slate-700">
                          <div className="font-medium">Splits</div>
                          <ul className="mt-2 list-disc pl-5">
                            {row.parsed_row.splits.map((s: any, i: number) => {
                              const uname = groupMembers.find(g => g.id === s.user_id)?.username || s.user_id || (s.user || s.user_id);
                              return (
                                <li key={i}>
                                  {uname} — {s.amount_owed ?? s.original_amount ?? '0'}
                                  {s.percentage ? ` (${s.percentage}% )` : ''}
                                  {s.shares ? ` (${s.shares} share${s.shares > 1 ? 's' : ''})` : ''}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      {!row.valid && row.errors.length > 0 && (
                        <div className="mt-3 rounded-2xl bg-red-100 p-3 text-sm text-red-700">
                          <div className="font-medium">Errors</div>
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {row.errors.map((message, idx) => <li key={idx}>{message}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
