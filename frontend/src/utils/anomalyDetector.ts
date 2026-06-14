type RawRow = { [k: string]: string };

export type Anomaly = {
  level: 'error' | 'warning' | 'info';
  code: string;
  message: string;
};

function parseNumberLike(value: string): { ok: boolean; value?: number } {
  if (!value) return { ok: false };
  // remove commas and currency symbols
  const cleaned = value.replace(/[,₹$]/g, '').trim();
  if (cleaned === '') return { ok: false };
  const n = Number(cleaned);
  if (Number.isFinite(n)) return { ok: true, value: n };
  return { ok: false };
}

function isISODate(s: string) {
  // simple YYYY-MM-DD check
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const SETTLEMENT_KEYWORDS = ['settlement', 'paid back', 'paidback', 'transfer', 'refund'];

export function detectAnomaliesForRows(rows: RawRow[], groupMembers?: string[]) {
  const anomaliesList: Anomaly[][] = [];

  // Precompute duplicates key map
  const keyMap = new Map<string, number[]>();
  rows.forEach((r, idx) => {
    const key = `${(r.date||'').trim()}|${(r.amount||'').trim()}|${(r.description||'').trim()}|${(r.paid_by||'').trim()}`;
    const arr = keyMap.get(key) || [];
    arr.push(idx);
    keyMap.set(key, arr);
  });

  // Determine dominant date format (simple heuristic)
  const dateFormats = new Map<string, number>();
  rows.forEach((r) => {
    const d = (r.date||'').trim();
    if (!d) return;
    const fmt = d.includes('/') ? 'slash' : (d.includes('-') ? 'dash' : 'other');
    dateFormats.set(fmt, (dateFormats.get(fmt)||0) + 1);
  });
  const dominantDateFmt = Array.from(dateFormats.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;

  rows.forEach((raw, idx) => {
    const anomalies: Anomaly[] = [];
    const title = (raw.title || '').trim();
    const date = (raw.date || '').trim();
    const amountRaw = (raw.amount || '').trim();
    const paid_by = (raw.paid_by || '').trim();
    const description = (raw.description || '').toLowerCase() || '';
    const currency = (raw.currency || '').toUpperCase() || '';

    // Errors
    if (!date) anomalies.push({ level: 'error', code: 'missing_date', message: 'Missing date' });
    if (!amountRaw) anomalies.push({ level: 'error', code: 'missing_amount', message: 'Missing amount' });
    if (!paid_by) anomalies.push({ level: 'error', code: 'missing_paid_by', message: 'Missing paid_by' });

    // amount parse
    const amt = parseNumberLike(amountRaw);
    if (amountRaw && !amt.ok) anomalies.push({ level: 'error', code: 'invalid_amount', message: 'Amount is not a valid number' });

    // date parse
    if (date && !isISODate(date)) {
      // try Date.parse to see if it's readable
      const parsed = Date.parse(date);
      if (Number.isNaN(parsed)) anomalies.push({ level: 'error', code: 'invalid_date', message: 'Unreadable date format' });
      else if (dominantDateFmt && ((dominantDateFmt === 'dash' && date.includes('/')) || (dominantDateFmt === 'slash' && date.includes('-')))) {
        anomalies.push({ level: 'warning', code: 'date_inconsistency', message: 'Date format inconsistent with other rows' });
      }
    }

    // warnings
    // duplicate detection
    const key = `${date}|${amountRaw}|${(raw.description||'').trim()}|${paid_by}`;
    const dupIndexes = keyMap.get(key) || [];
    if (dupIndexes.length > 1) {
      const others = dupIndexes.filter(i => i !== idx).map(i => i+1).slice(0,3);
      anomalies.push({ level: 'warning', code: 'duplicate_row', message: `Duplicate of row(s) ${others.join(', ')}` });
    }

    // negative amounts
    if (amt.ok && (amt.value as number) < 0) anomalies.push({ level: 'warning', code: 'negative_amount', message: 'Negative amount detected' });

    // USD detection
    if (currency === 'USD' || /\$/.test(amountRaw) || /\bUSD\b/i.test(description)) anomalies.push({ level: 'warning', code: 'usd_detected', message: 'USD detected — conversion may be required' });

    // settlement keywords
    if (SETTLEMENT_KEYWORDS.some(k => description.includes(k))) anomalies.push({ level: 'warning', code: 'settlement_text', message: 'Description suggests settlement/transfer' });

    // amount has currency symbol inside amount column
    if (/[,₹$]/.test(amountRaw)) anomalies.push({ level: 'warning', code: 'currency_symbol_in_amount', message: 'Currency symbol found in amount' });

    // splits checks: parse simple UNEQUAL entries like a=100;b=50
    const splitType = (raw.split_type || 'EQUAL').toUpperCase();
    if (splitType !== 'EQUAL') {
      const splitsRaw = (raw.splits || '').trim();
      const entries = splitsRaw ? splitsRaw.split(';').map(s=>s.trim()).filter(Boolean) : [];
      if (entries.length === 0) anomalies.push({ level: 'warning', code: 'splits_missing', message: 'Splits missing for non-equal split type' });
      else {
        if (splitType === 'UNEQUAL') {
          let total = 0;
          let ok = true;
          entries.forEach(e => {
            const parts = e.split('=');
            if (parts.length !== 2) ok = false;
            const parsed = parseNumberLike(parts[1]||'');
            if (!parsed.ok) ok = false;
            else total += parsed.value || 0;
          });
          if (!ok) anomalies.push({ level: 'warning', code: 'invalid_splits', message: 'Unable to parse split amounts' });
          else if (amt.ok && Math.abs(total - (amt.value || 0)) > 1) anomalies.push({ level: 'warning', code: 'splits_mismatch', message: 'Split amounts do not sum to total' });
        }
        if (splitType === 'PERCENTAGE') {
          let totalP = 0;
          let ok = true;
          entries.forEach(e => {
            const parts = e.split('=');
            if (parts.length !== 2) ok = false;
            const v = parts[1].replace('%','').trim();
            const parsed = parseNumberLike(v);
            if (!parsed.ok) ok = false;
            else totalP += parsed.value || 0;
          });
          if (!ok) anomalies.push({ level: 'warning', code: 'invalid_percentage_splits', message: 'Invalid percentage split entries' });
          else if (Math.abs(totalP - 100) > 0.01) anomalies.push({ level: 'warning', code: 'percentage_not_100', message: 'Percentages do not sum to 100' });
        }
      }
    }

    // info auto-fixes
    if (/,\d{3}/.test(amountRaw)) anomalies.push({ level: 'info', code: 'comma_in_number', message: 'Commas found in amount; will be normalized' });
    if ((raw.category || '').toLowerCase() !== raw.category) anomalies.push({ level: 'info', code: 'category_case', message: 'Category casing adjusted' });
    if (((raw.description||'') !== (raw.description||'').trim())) anomalies.push({ level: 'info', code: 'trim_description', message: 'Whitespace trimmed from description' });

    // member name not in group (if members list provided)
    if (groupMembers && groupMembers.length > 0 && paid_by && !groupMembers.includes(paid_by)) {
      anomalies.push({ level: 'warning', code: 'member_not_in_group', message: 'Paid_by not found in group members' });
    }

    anomaliesList.push(anomalies);
  });

  return anomaliesList;
}

export default detectAnomaliesForRows;
