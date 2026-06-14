import React, { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

type Member = {
  user: { id: string; username: string };
  role?: string;
  joined_at?: string;
  left_at?: string | null;
};

type Props = {
  groupId: string;
  members: Member[];
  onCreated?: () => void;
  currentUserId?: string | number;
  expenseToEdit?: any;
  onSaved?: () => void;
  onCancel?: () => void;
};

export default function ExpenseForm({ groupId, members, onCreated, currentUserId, expenseToEdit, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [splitType, setSplitType] = useState<'EQUAL' | 'UNEQUAL' | 'PERCENTAGE' | 'SHARE'>('EQUAL');
  const [paidBy, setPaidBy] = useState<string | number>(currentUserId || (members[0]?.user.id ?? ''));
  const [remainderTo, setRemainderTo] = useState<'PAYER' | 'FIRST_ACTIVE'>('PAYER');
  const [unsplitValues, setUnsplitValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; amount?: string }>({});
  const [splitsErrors, setSplitsErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const visibleMembers = members.filter((m) => !m.left_at);

  const roundDown2 = (v: number) => Math.floor(v * 100) / 100;

  const preview = useMemo(() => {
    const amt = Number(amount);
    if (!visibleMembers.length || isNaN(amt) || amt <= 0) return { rows: [], remainder: 0, totalAssigned: 0 };

    if (splitType === 'EQUAL') {
      const n = visibleMembers.length;
      const per = roundDown2(amt / n);
      const rows = visibleMembers.map((m) => ({ user_id: m.user.id, username: m.user.username, owed: per }));
      const totalAssigned = rows.reduce((s, r) => s + r.owed, 0);
      const remainder = roundDown2(amt - totalAssigned);
      // assign remainder to payer in preview
      if (remainder > 0) {
        if (remainderTo === 'PAYER') {
          const idx = rows.findIndex((r) => String(r.user_id) === String(paidBy));
          if (idx >= 0) rows[idx].owed = roundDown2(rows[idx].owed + remainder);
        } else {
          // first active
          rows[0].owed = roundDown2(rows[0].owed + remainder);
        }
      }
      const totalAssignedWithRem = rows.reduce((s, r) => s + r.owed, 0);
      return { rows, remainder, totalAssigned: totalAssignedWithRem };
    }

    if (splitType === 'PERCENTAGE') {
      const rows = visibleMembers.map((m) => {
        const pct = parseFloat(unsplitValues[m.user.id] || '0') || 0;
        const owed = roundDown2((pct / 100) * amt);
        return { user_id: m.user.id, username: m.user.username, owed, pct };
      });
      const assigned = rows.reduce((s, r) => s + r.owed, 0);
      const remainder = roundDown2(amt - assigned);
      if (remainder > 0) {
        if (remainderTo === 'PAYER') {
          const idx = rows.findIndex((r) => String(r.user_id) === String(paidBy));
          if (idx >= 0) rows[idx].owed = roundDown2(rows[idx].owed + remainder);
        } else {
          rows[0].owed = roundDown2(rows[0].owed + remainder);
        }
      }
      return { rows, remainder, totalAssigned: rows.reduce((s, r) => s + r.owed, 0) };
    }

    if (splitType === 'SHARE') {
      const shares = visibleMembers.map((m) => ({ id: m.user.id, shares: Math.max(0, Math.floor(parseFloat(unsplitValues[m.user.id] || '0') || 0)) }));
      const totalShares = shares.reduce((s, x) => s + x.shares, 0);
      if (totalShares <= 0) return { rows: [], remainder: 0, totalAssigned: 0 };
      const rows = visibleMembers.map((m) => {
        const myShares = shares.find((s) => s.id === m.user.id)?.shares || 0;
        const owed = roundDown2((myShares / totalShares) * amt);
        return { user_id: m.user.id, username: m.user.username, owed, shares: myShares };
      });
      const assigned = rows.reduce((s, r) => s + r.owed, 0);
      const remainder = roundDown2(amt - assigned);
      if (remainder > 0) {
        if (remainderTo === 'PAYER') {
          const idx = rows.findIndex((r) => String(r.user_id) === String(paidBy));
          if (idx >= 0) rows[idx].owed = roundDown2(rows[idx].owed + remainder);
        } else {
          rows[0].owed = roundDown2(rows[0].owed + remainder);
        }
      }
      return { rows, remainder, totalAssigned: rows.reduce((s, r) => s + r.owed, 0) };
    }

    if (splitType === 'UNEQUAL') {
      const rows = visibleMembers.map((m) => ({ user_id: m.user.id, username: m.user.username, owed: roundDown2(parseFloat(unsplitValues[m.user.id] || '0') || 0) }));
      return { rows, remainder: roundDown2(Number(amount) - rows.reduce((s, r) => s + r.owed, 0)), totalAssigned: rows.reduce((s, r) => s + r.owed, 0) };
    }

    return { rows: [], remainder: 0, totalAssigned: 0 };
  }, [amount, splitType, unsplitValues, visibleMembers, paidBy]);

  const clientValidation = useMemo(() => {
    const amt = Number(amount) || 0;
    const errors: string[] = [];
    if (amt <= 0) errors.push('Amount must be positive');
    if (!visibleMembers.length) errors.push('No active members in group');
    if (splitType === 'PERCENTAGE') {
      const sum = visibleMembers.reduce((s, m) => s + (parseFloat(unsplitValues[m.user.id] || '0') || 0), 0);
      if (Math.abs(sum - 100) > 0.001) errors.push('Percentages must sum to 100');
    }
    if (splitType === 'SHARE') {
      const totalShares = visibleMembers.reduce((s, m) => s + (Math.max(0, Math.floor(parseFloat(unsplitValues[m.user.id] || '0') || 0))), 0);
      if (totalShares <= 0) errors.push('At least one share must be positive');
    }
    if (splitType === 'UNEQUAL') {
      const sum = visibleMembers.reduce((s, m) => s + (roundDown2(parseFloat(unsplitValues[m.user.id] || '0') || 0)), 0);
      if (Math.abs(sum - amt) > 1) errors.push('Unequal split sums must match total within ±1');
    }
    return errors;
  }, [amount, splitType, unsplitValues, visibleMembers]);

  const percentSum = useMemo(() => visibleMembers.reduce((s, m) => s + (parseFloat(unsplitValues[m.user.id] || '0') || 0), 0), [unsplitValues, visibleMembers]);

  // load expenseToEdit into form state
  useEffect(() => {
    if (!expenseToEdit) {
      setTitle('');
      setAmount('');
      setCurrency('INR');
      setSplitType('EQUAL');
      setPaidBy(currentUserId || (members[0]?.user.id ?? ''));
      setRemainderTo('PAYER');
      setUnsplitValues({});
      setFieldErrors({});
      setSplitsErrors({});
      setError(null);
      return;
    }

    setTitle(expenseToEdit.title || '');
    setAmount(String(expenseToEdit.amount || ''));
    setCurrency(expenseToEdit.currency || 'INR');
    setSplitType(expenseToEdit.split_type || 'EQUAL');
    setPaidBy(expenseToEdit.paid_by_id || expenseToEdit.paid_by || currentUserId || (members[0]?.user.id ?? ''));
    // populate unsplitValues from splits
    const map: Record<string, string> = {};
    if (Array.isArray(expenseToEdit.splits)) {
      expenseToEdit.splits.forEach((s: any) => {
        if (s.user_id) {
          if (s.amount_owed != null) map[s.user_id] = String(s.amount_owed);
          if (s.percentage != null) map[s.user_id] = String(s.percentage);
          if (s.shares != null) map[s.user_id] = String(s.shares);
        }
      });
    }
    setUnsplitValues(map);
    setFieldErrors({});
    setSplitsErrors({});
    setError(null);
  }, [expenseToEdit, currentUserId, members]);

  const handleChangeValue = (userId: string, val: string) => {
    setUnsplitValues((s) => ({ ...s, [userId]: val }));
  };

  const validateAndBuild = () => {
    setError(null);
    const total = Math.round(Number(amount) * 100) / 100;
    if (!title || !amount || isNaN(Number(amount)) || total <= 0) {
      setError('Enter a valid title and positive amount');
      return null;
    }

    const payload: any = {
      group: groupId,
      title,
      amount: Math.round(Number(amount) * 100) / 100,
      currency,
      split_type: splitType,
      paid_by_id: paidBy,
    };

    if (splitType === 'UNEQUAL') {
      const splits = visibleMembers.map((m) => {
        const val = parseFloat(unsplitValues[m.user.id] || '0');
        return { user_id: m.user.id, amount_owed: Math.round((isNaN(val) ? 0 : val) * 100) / 100 };
      });
      const sum = splits.reduce((s, x) => s + (x.amount_owed || 0), 0);
      if (Math.abs(sum - payload.amount) > 1) {
        setError('Unequal split sums must match total within ±1 (currency rounding).');
        return null;
      }
      payload.splits = splits;
    }

    if (splitType === 'EQUAL' && remainderTo === 'FIRST_ACTIVE') {
      // Build explicit equal splits and add remainder to first active
      const n = visibleMembers.length;
      const per = roundDown2(payload.amount / n);
      const rows = visibleMembers.map((m) => ({ user_id: m.user.id, amount_owed: per }));
      const assigned = rows.reduce((s, r) => s + r.amount_owed, 0);
      const remainder = roundDown2(payload.amount - assigned);
      if (remainder > 0) {
        rows[0].amount_owed = roundDown2(rows[0].amount_owed + remainder);
      }
      payload.splits = rows;
    }

    if (splitType === 'PERCENTAGE') {
      const splits = visibleMembers.map((m) => {
        const val = parseFloat(unsplitValues[m.user.id] || '0');
        return { user_id: m.user.id, percentage: Math.round((isNaN(val) ? 0 : val) * 100) / 100 };
      });
      const sum = splits.reduce((s, x) => s + (x.percentage || 0), 0);
      if (Math.abs(sum - 100) > 0.001) {
        setError('Percentages must sum to 100.');
        return null;
      }
      payload.splits = splits;
    }

    if (splitType === 'SHARE') {
      const splits = visibleMembers.map((m) => {
        const val = parseFloat(unsplitValues[m.user.id] || '0');
        return { user_id: m.user.id, shares: Math.max(0, Math.floor(isNaN(val) ? 0 : val)) };
      });
      const totalShares = splits.reduce((s, x) => s + x.shares, 0);
      if (totalShares <= 0) {
        setError('Shares must be positive for at least one participant.');
        return null;
      }
      payload.splits = splits;
    }

    // EQUAL requires no explicit splits; backend will compute.
    return payload;
  };

  const submit = async () => {
    const payload = validateAndBuild();
    if (!payload) return;
    setSubmitting(true);
    setFieldErrors({});
    setSplitsErrors({});
    setError(null);
    try {
      if (expenseToEdit && expenseToEdit.id) {
        await api.put(`/expenses/${expenseToEdit.id}/`, payload);
        if (onSaved) onSaved();
      } else {
        await api.post('/expenses/', payload);
        if (onCreated) onCreated();
      }
      // reset only on create
      if (!expenseToEdit) {
        setTitle('');
        setAmount('');
        setUnsplitValues({});
      }
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp && typeof resp === 'object') {
        // Map field errors
        if (resp.title) setFieldErrors((f) => ({ ...f, title: String(resp.title[0] ?? resp.title) }));
        if (resp.amount) setFieldErrors((f) => ({ ...f, amount: String(resp.amount[0] ?? resp.amount) }));
        // non_field_errors or detail
        if (resp.non_field_errors) setError(String(resp.non_field_errors[0] ?? resp.non_field_errors));
        if (resp.detail) setError(String(resp.detail));
        // splits errors: could be list or dict
        if (resp.splits) {
          if (Array.isArray(resp.splits)) {
            // try to map by user_id if available in each element
            resp.splits.forEach((s: any, idx: number) => {
              if (s && typeof s === 'object') {
                // find a user id in our unsplitValues mapping by index if possible
                const m = visibleMembers[idx];
                if (m && s.user_id) {
                  setSplitsErrors((p) => ({ ...p, [m.user.id]: String(Object.values(s)[0]) }));
                } else if (m) {
                  setSplitsErrors((p) => ({ ...p, [m.user.id]: String(Object.values(s)[0] ?? '') }));
                }
              } else if (typeof s === 'string') {
                // generic splits error
                setError((prev) => (prev ? prev + '\n' + s : s));
              }
            });
          } else if (typeof resp.splits === 'object') {
            // map by user id keys
            Object.entries(resp.splits).forEach(([k, v]) => {
              setSplitsErrors((p) => ({ ...p, [k]: String((v as any)[0] ?? v) }));
            });
          }
        }
      } else {
        setError('Failed to save expense');
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg w-96">
      <h3 className="text-sm font-semibold">{expenseToEdit ? 'Edit Expense' : 'Add Expense'}</h3>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="mt-2 block rounded border px-3 py-2 w-full" />
      {fieldErrors.title && <div className="mt-1 text-sm text-red-600">{fieldErrors.title}</div>}
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="mt-2 block rounded border px-3 py-2 w-full" />
      {fieldErrors.amount && <div className="mt-1 text-sm text-red-600">{fieldErrors.amount}</div>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded border px-3 py-2">
          <option value="INR">INR</option>
          <option value="USD">USD</option>
        </select>
        <select value={splitType} onChange={(e) => setSplitType(e.target.value as any)} className="rounded border px-3 py-2">
          <option value="EQUAL">Equal</option>
          <option value="UNEQUAL">Unequal</option>
          <option value="PERCENTAGE">Percentage</option>
          <option value="SHARE">Share</option>
        </select>
      </div>

      <div className="mt-3">
        <label className="text-sm">Paid by</label>
        <select value={String(paidBy)} onChange={(e) => setPaidBy(e.target.value)} className="mt-1 rounded border px-3 py-2 w-full">
          {visibleMembers.map((m) => (
            <option key={m.user.id} value={m.user.id}>{m.user.username}</option>
          ))}
        </select>
      </div>

      <div className="mt-2">
        <label className="text-sm">Remainder assignment</label>
        <select value={remainderTo} onChange={(e) => setRemainderTo(e.target.value as any)} className="mt-1 rounded border px-3 py-2 w-full">
          <option value="PAYER">Assign remainder to payer</option>
          <option value="FIRST_ACTIVE">Assign remainder to first active</option>
        </select>
      </div>

      {splitType !== 'EQUAL' && (
        <div className="mt-3">
          <div className="text-sm font-medium">Per-participant values</div>
          <div className="mt-2 space-y-2 max-h-40 overflow-auto">
                  {visibleMembers.map((m) => {
              const valStr = unsplitValues[m.user.id] || '';
              const valNum = parseFloat(valStr);
              let localErr = '';
              if (splitType === 'PERCENTAGE') {
                if (isNaN(valNum) || valNum < 0) localErr = 'Enter a valid percentage';
              }
              if (splitType === 'SHARE') {
                if (isNaN(valNum) || valNum < 0 || !Number.isInteger(Number(valNum))) localErr = 'Enter a non-negative integer shares';
              }
              if (splitType === 'UNEQUAL') {
                if (isNaN(valNum) || valNum < 0) localErr = 'Enter a valid amount';
              }
              return (
                <div key={m.user.id} className="flex items-center gap-2">
                  <div className="flex-1 text-sm">{m.user.username}</div>
                  <div className="flex flex-col items-end">
                    <input
                      value={unsplitValues[m.user.id] || ''}
                      onChange={(e) => handleChangeValue(m.user.id, e.target.value)}
                      placeholder={splitType === 'PERCENTAGE' ? '% (e.g. 25)' : splitType === 'SHARE' ? 'shares' : 'amount'}
                      className={`w-24 rounded border px-2 py-1 text-right ${splitsErrors[m.user.id] || localErr ? 'border-red-500' : ''}`}
                    />
                    {splitsErrors[m.user.id] && <div className="text-xs text-red-600 mt-1">{splitsErrors[m.user.id]}</div>}
                    {!splitsErrors[m.user.id] && localErr && <div className="text-xs text-red-600 mt-1">{localErr}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {splitType === 'PERCENTAGE' && Math.abs(percentSum - 100) > 0.001 && (
            <div className="mt-2 text-sm text-red-600">Percentages must sum to 100 (current: {percentSum.toFixed(2)})</div>
          )}
        </div>
      )}

      {/* Preview */}
      <div className="mt-3">
        <div className="text-sm font-medium">Preview</div>
        <div className="mt-2 rounded border bg-slate-50 p-2">
          {preview.rows.length === 0 ? (
            <div className="text-sm text-slate-600">No preview available</div>
          ) : (
            <div className="space-y-1">
              {preview.rows.map((r: any) => (
                <div key={r.user_id} className="flex items-center justify-between text-sm">
                  <div>
                    {r.username} {String(r.user_id) === String(paidBy) ? <span className="ml-2 rounded-full bg-amber-100 px-2 text-xs">Payer</span> : null}
                  </div>
                  <div>{currency} {r.owed.toFixed(2)}</div>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-semibold border-t pt-2">
                <div>Total</div>
                <div>{currency} {preview.totalAssigned.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      {clientValidation.length > 0 && (
        <div className="mt-2 text-sm text-amber-700">
          {clientValidation.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button onClick={submit} disabled={submitting || clientValidation.length > 0} className="flex-1 rounded-2xl bg-slate-900 px-3 py-2 text-white disabled:opacity-60">
          {submitting ? 'Saving...' : (expenseToEdit ? 'Save Changes' : 'Add Expense')}
        </button>
        {expenseToEdit && onCancel ? (
          <button onClick={onCancel} type="button" className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-700">
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
