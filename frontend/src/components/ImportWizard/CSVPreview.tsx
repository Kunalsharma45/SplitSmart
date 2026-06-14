import React from 'react';
import Papa from 'papaparse';
import detectAnomaliesForRows, { Anomaly } from '../../utils/anomalyDetector';
import AnomalyCard from './AnomalyCard';

type RawRow = { [k: string]: string };

export type PreviewRow = {
  row_number: number;
  raw: RawRow;
  valid: boolean;
  errors: string[];
  parsed_row: any | null;
  anomalies?: Anomaly[];
};

type Props = {
  file: File | null;
  maxRows?: number;
  onPreview?: (rows: PreviewRow[]) => void;
  groupMembers?: string[];
  groupId?: string;
};

export default function CSVPreview({ file, maxRows = 200, onPreview, groupMembers, groupId }: Props) {
  const [rows, setRows] = React.useState<PreviewRow[]>([]);
  const [summary, setSummary] = React.useState<{clean:number,warnings:number,errors:number,infos:number}>({clean:0,warnings:0,errors:0,infos:0});
  const [editingRow, setEditingRow] = React.useState<number | null>(null);
  const [editingDraft, setEditingDraft] = React.useState<RawRow | null>(null);

  function reanalyzeAndEmit(newRows: PreviewRow[]) {
    const rawRows = newRows.map(r => r.raw);
    const anomaliesAll = detectAnomaliesForRows(rawRows as any, groupMembers);
    const out: PreviewRow[] = newRows.map((r, idx) => {
      const anomalies = anomaliesAll[idx] || [];
      const combinedErrors = [...(r.errors || []), ...anomalies.filter(a=>a.level==='error').map(a=>a.message)];
      const valid = combinedErrors.length === 0;
      return { ...r, errors: combinedErrors, valid, anomalies };
    });
    const counts = {clean:0,warnings:0,errors:0,infos:0};
    anomaliesAll.forEach((alist) => {
      if (!alist || alist.length === 0) counts.clean++;
      else {
        let hasError=false,hasWarn=false,hasInfo=false;
        alist.forEach(a=>{ if (a.level==='error') hasError=true; if (a.level==='warning') hasWarn=true; if (a.level==='info') hasInfo=true; });
        if (hasError) counts.errors++; else if (hasWarn) counts.warnings++; else if (hasInfo) counts.infos++;
      }
    });
    setSummary(counts);
    setRows(out);
    if (onPreview) onPreview(out);
  }

  React.useEffect(() => {
    if (!file) {
      setRows([]);
      if (onPreview) onPreview([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = (Papa as any).parse(text, { header: true, skipEmptyLines: true, preview: maxRows });
      const out: PreviewRow[] = [];
      parsed.data.forEach((raw: any, idx: number) => {
        const title = (raw.title || '').trim();
        const date = (raw.date || '').trim();
        const amount = (raw.amount || '').trim();
        const paid_by = (raw.paid_by || '').trim();
        const split_type = ((raw.split_type || 'EQUAL') as string).toUpperCase();
        const parsed_row = {
          title,
          date,
          amount,
          currency: (raw.currency || 'INR').toUpperCase(),
          category: raw.category || 'Other',
          paid_by: paid_by,
          split_type,
          splits: raw.splits || '',
        };
        out.push({ row_number: idx + 1, raw, valid: true, errors: [], parsed_row });
      });
      reanalyzeAndEmit(out);
    };
    reader.readAsText(file);
  }, [file, maxRows, onPreview]);

  if (!file) return null;

  return (
    <div className="mt-4 rounded-2xl bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700">Client-side Preview ({rows.length} rows)</div>
        <div className="text-sm text-slate-600">
          <span className="text-green-600 font-semibold">{summary.clean} clean</span>
          <span className="mx-2 text-yellow-600 font-semibold">{summary.warnings} warnings</span>
          <span className="mx-2 text-red-600 font-semibold">{summary.errors} errors</span>
          <span className="ml-2 text-sky-600 font-semibold">{summary.infos} infos</span>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {rows.slice(0, 50).map((r) => (
            <div key={r.row_number} className={`rounded p-2 ${r.valid ? 'bg-white border' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex justify-between text-sm font-semibold">
                <div>Row #{r.row_number}</div>
                <div className="flex items-center gap-3">
                  <div>{r.valid ? 'Clean' : 'Issues'}</div>
                  <button onClick={() => { setEditingRow(r.row_number); setEditingDraft(r.raw); }} className="text-xs text-sky-600">Edit</button>
                </div>
              </div>

              {/* If row has issues, render AnomalyCard for each error/warning */}
              {!r.valid && r.anomalies && r.anomalies.length > 0 && (
                <div className="mt-2 space-y-3">
                  {r.anomalies.map((anomaly, index) => (
                    <AnomalyCard
                      key={index}
                      anomaly={anomaly}
                      rowNumber={r.row_number}
                      rawRowData={r.raw}
                      groupId={groupId || ''}
                      groupMembers={[]}
                      onActionApplied={(action) => {
                        if (action === 'REJECT') {
                          // Remove the row from the preview list
                          const updated = rows.filter(rr => rr.row_number !== r.row_number);
                          reanalyzeAndEmit(updated);
                        } else if (action === 'KEEP') {
                          // Clean up error state/allow row
                          const updated = rows.map(rr => rr.row_number === r.row_number ? { ...rr, valid: true } : rr);
                          setRows(updated);
                        }
                      }}
                      onSkip={() => {}}
                    />
                  ))}
                </div>
              )}

              {editingRow === r.row_number && editingDraft && (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block"><div className="text-xs font-medium">Title</div><input value={editingDraft.title || ''} onChange={(e)=>setEditingDraft({...editingDraft, title: e.target.value})} className="mt-1 w-full rounded border px-2 py-1"/></label>
                    <label className="block"><div className="text-xs font-medium">Date</div><input value={editingDraft.date || ''} onChange={(e)=>setEditingDraft({...editingDraft, date: e.target.value})} className="mt-1 w-full rounded border px-2 py-1"/></label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block"><div className="text-xs font-medium">Amount</div><input value={editingDraft.amount || ''} onChange={(e)=>setEditingDraft({...editingDraft, amount: e.target.value})} className="mt-1 w-full rounded border px-2 py-1"/></label>
                    <label className="block"><div className="text-xs font-medium">Paid by (username)</div><input value={editingDraft.paid_by || ''} onChange={(e)=>setEditingDraft({...editingDraft, paid_by: e.target.value})} className="mt-1 w-full rounded border px-2 py-1"/></label>
                  </div>
                  <label className="block"><div className="text-xs font-medium">Splits</div><input value={editingDraft.splits || ''} onChange={(e)=>setEditingDraft({...editingDraft, splits: e.target.value})} className="mt-1 w-full rounded border px-2 py-1"/></label>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      // apply edit
                      const updated = rows.map(rr => rr.row_number === r.row_number ? {...rr, raw: editingDraft, parsed_row: {
                        title: (editingDraft.title||'').trim(), date: (editingDraft.date||'').trim(), amount: (editingDraft.amount||'').trim(), currency: (editingDraft.currency||'INR').toUpperCase(), category: editingDraft.category||'Other', paid_by: (editingDraft.paid_by||'').trim(), split_type: (editingDraft.split_type||'EQUAL').toUpperCase(), splits: editingDraft.splits||''
                      }} : rr);
                      setEditingRow(null); setEditingDraft(null); reanalyzeAndEmit(updated);
                    }} className="rounded px-3 py-1 bg-emerald-600 text-white text-sm">Save</button>
                    <button onClick={() => { setEditingRow(null); setEditingDraft(null); }} className="rounded px-3 py-1 bg-gray-200 text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
        ))}
        {rows.length > 50 && <div className="text-xs text-slate-500">Showing first 50 rows...</div>}
      </div>
    </div>
  );
}
