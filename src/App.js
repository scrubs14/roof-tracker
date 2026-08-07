import React, { useState, useEffect } from 'react';
import './index.css';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://ovdzbhvpktjctucuppxx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92ZHpiaHZwa3RqY3R1Y3VwcHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MDY4NTEsImV4cCI6MjA5NzQ4Mjg1MX0.RxgO870UY7Ia8t04ZJ3PyaohMka9mX4MalDEQKqtcEQ'
);

const PITCH_PRICES = { 'Low Pitch 1 Story': 244.96, 'Low Pitch 2 Story': 250.29, 'High Pitch 1 Story': 255.63, 'High Pitch 2 Story': 260.96, 'Metal': 330.00 };
const GUTTER_RATE = { '5"': 6, '6"': 7 };
const SIDING_RATE = 300;
const DECK_RATE = 16;
const MIN_PER_SQ = 525;

const TRADE_OPTIONS = ['Roof', 'Gutters', 'Siding', 'Concrete', 'Deck', 'Other'];

function fmt(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtS(n) { return (n < 0 ? '-$' : '$') + Math.abs(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }

function buildCost(trade) {
  const qty = parseFloat(trade.qty) || 0;
  if (trade.type === 'Roof') return qty * (PITCH_PRICES[trade.pitch] || 244.96);
  if (trade.type === 'Gutters') return qty * (GUTTER_RATE[trade.gutterSize] || 6);
  if (trade.type === 'Siding') return qty * SIDING_RATE;
  if (trade.type === 'Deck') return qty * DECK_RATE;
  return parseFloat(trade.customCost) || 0;
}

function minPrice(trade) {
  const qty = parseFloat(trade.qty) || 0;
  if (trade.type === 'Roof') return qty * MIN_PER_SQ;
  return null;
}

function calcCommission(trade) {
  const contract = parseFloat(trade.contractPrice) || 0;
  const build = buildCost(trade);
  const op = parseFloat(trade.opPct) || 5;
  const opDeduct = contract * (op / 100);
  const gross = contract - build - opDeduct;
  return gross * 0.5;
}

function newTrade(type = 'Roof') {
  return { id: Date.now() + Math.random(), type, pitch: 'Low Pitch 1 Story', gutterSize: '5"', qty: '', contractPrice: '', opPct: '5', customCost: '' };
}

function newClient() {
  return {
    id: null, name: '', trades: [newTrade('Roof')],
    outOfPocket: '', insuranceCollected: '',
    splitCommission: false, splitWith: '',
    cocSent: false, closed: false, notes: ''
  };
}

// ── TRADE ROW ─────────────────────────────────────────────────────
function TradeRow({ trade, onChange, onRemove, canRemove }) {
  const build = buildCost(trade);
  const commission = calcCommission(trade);
  const contract = parseFloat(trade.contractPrice) || 0;
  const min = minPrice(trade);
  const qty = parseFloat(trade.qty) || 0;
  const payPct = contract > 0 ? (commission / contract * 100) : 0;
  const belowMin = min && contract > 0 && contract < min;

  const inp = { background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontFamily: 'var(--font-b)', fontSize: 13, padding: '8px 10px', outline: 'none', width: '100%' };
  const sel = { ...inp, cursor: 'pointer', WebkitAppearance: 'none' };
  const lbl = { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--dim)', display: 'block', marginBottom: 4, fontWeight: 600 };

  return (
    <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gold)' }}>{trade.type}</div>
        {canRemove && <button onClick={onRemove} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--dim)', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>Remove</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 12 }}>

        {/* Trade Type */}
        <div>
          <label style={lbl}>Trade Type</label>
          <select style={sel} value={trade.type} onChange={e => onChange('type', e.target.value)}>
            {TRADE_OPTIONS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Pitch (roof only) */}
        {trade.type === 'Roof' && (
          <div>
            <label style={lbl}>Pitch / Stories</label>
            <select style={sel} value={trade.pitch} onChange={e => onChange('pitch', e.target.value)}>
              {Object.entries(PITCH_PRICES).map(([k, v]) => <option key={k} value={k}>{k} (${v}/sq)</option>)}
            </select>
          </div>
        )}

        {/* Gutter size */}
        {trade.type === 'Gutters' && (
          <div>
            <label style={lbl}>Gutter Size</label>
            <select style={sel} value={trade.gutterSize} onChange={e => onChange('gutterSize', e.target.value)}>
              <option value='5"'>5" ($6/LF)</option>
              <option value='6"'>6" ($7/LF)</option>
            </select>
          </div>
        )}

        {/* Qty */}
        <div>
          <label style={lbl}>{trade.type === 'Gutters' ? 'Linear Feet' : trade.type === 'Roof' || trade.type === 'Siding' ? 'Squares' : trade.type === 'Deck' ? 'Boards' : 'Qty / Units'}</label>
          <input style={inp} type="number" value={trade.qty} onChange={e => onChange('qty', e.target.value)} placeholder="0" />
        </div>

        {/* Custom cost (Other/Concrete) */}
        {(trade.type === 'Other' || trade.type === 'Concrete') && (
          <div>
            <label style={lbl}>Your Build Cost ($)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--dim)', fontSize: 13 }}>$</span>
              <input style={{ ...inp, paddingLeft: 22 }} type="number" value={trade.customCost} onChange={e => onChange('customCost', e.target.value)} placeholder="0.00" />
            </div>
          </div>
        )}

        {/* O&P */}
        <div>
          <label style={lbl}>O&P %</label>
          <select style={sel} value={trade.opPct} onChange={e => onChange('opPct', e.target.value)}>
            <option value="5">5% — Self-Gen Lead</option>
            <option value="15">15% — Roof Guys Lead</option>
          </select>
        </div>

        {/* Contract Price */}
        <div>
          <label style={lbl}>Contract Price ($)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--dim)', fontSize: 13 }}>$</span>
            <input style={{ ...inp, paddingLeft: 22, borderColor: belowMin ? 'var(--red)' : 'var(--border)' }} type="number" value={trade.contractPrice} onChange={e => onChange('contractPrice', e.target.value)} placeholder="0.00" />
          </div>
        </div>
      </div>

      {/* Calculated info */}
      {qty > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8, padding: '12px', background: 'var(--card)', borderRadius: 8 }}>
          {trade.type === 'Roof' && min && (
            <div style={{ gridColumn: '1/-1', marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 2 }}>Bare Minimum ({qty} sq × ${MIN_PER_SQ})</div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 800, color: belowMin ? 'var(--red)' : 'var(--gold)' }}>
                {fmt(min)} {belowMin && '⚠️ Contract below minimum!'}
              </div>
              {/* Per-pitch minimum */}
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                At pitch build cost: {fmt(build)} &nbsp;·&nbsp; Min charge: {fmt(min)}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 3 }}>Build Cost</div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 20, fontWeight: 800, color: 'var(--red)' }}>{fmt(build)}</div>
          </div>
          {contract > 0 && <>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 3 }}>Your Commission</div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 20, fontWeight: 800, color: commission >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(commission)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 3 }}>Payout %</div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 20, fontWeight: 800, color: payPct >= 20 ? 'var(--green)' : payPct >= 12 ? 'var(--gold)' : 'var(--red)' }}>{payPct.toFixed(1)}%</div>
            </div>
          </>}
        </div>
      )}
    </div>
  );
}

// ── CLIENT CARD ───────────────────────────────────────────────────
function ClientCard({ client, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);

  const totalContract = client.trades.reduce((s, t) => s + (parseFloat(t.contractPrice) || 0), 0);
  const totalCommission = client.trades.reduce((s, t) => s + calcCommission(t), 0);
  const outOfPocket = parseFloat(client.outOfPocket) || 0;
  const insuranceCollected = parseFloat(client.insuranceCollected) || 0;
  const remaining = totalContract - outOfPocket - insuranceCollected;

  const updateTrade = (idx, field, val) => {
    const trades = [...client.trades];
    trades[idx] = { ...trades[idx], [field]: val };
    onUpdate({ ...client, trades });
  };

  const removeTrade = (idx) => {
    const trades = client.trades.filter((_, i) => i !== idx);
    onUpdate({ ...client, trades });
  };

  const addTrade = () => onUpdate({ ...client, trades: [...client.trades, newTrade('Roof')] });

  const inp = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontFamily: 'var(--font-b)', fontSize: 13, padding: '8px 10px', outline: 'none' };

  return (
    <div style={{
      background: client.closed ? 'rgba(61,184,122,0.06)' : 'var(--card)',
      border: `2px solid ${client.closed ? 'var(--green)' : 'var(--border)'}`,
      borderRadius: 12, marginBottom: 10, overflow: 'hidden', transition: 'all 0.2s'
    }}>
      {/* HEADER ROW — always visible */}
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: client.closed ? 'var(--green)' : client.cocSent ? 'var(--gold)' : 'var(--dim)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 20, fontWeight: 800, color: client.closed ? 'var(--green)' : 'var(--white)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {client.name || 'Unnamed Client'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
            {client.trades.map(t => t.type).join(' · ')}
            {totalContract > 0 && <span style={{ color: 'var(--text)', marginLeft: 10 }}>{fmt(totalContract)} contract</span>}
            {totalCommission > 0 && <span style={{ color: 'var(--green)', marginLeft: 8 }}>{client.splitCommission ? fmt(totalCommission * 0.5) + ' your split' : fmt(totalCommission) + ' commission'}</span>}
            {client.closed && <span style={{ color: 'var(--green)', marginLeft: 8, fontWeight: 700 }}>✓ CLOSED</span>}
            {client.cocSent && !client.closed && <span style={{ color: 'var(--gold)', marginLeft: 8 }}>COC Sent</span>}
          </div>
        </div>
        <div style={{ color: 'var(--dim)', fontSize: 18, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</div>
      </div>

      {/* EXPANDED CONTENT */}
      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>

          {/* Client name edit */}
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <input value={client.name} onChange={e => onUpdate({ ...client, name: e.target.value })}
              placeholder="Client Name" style={{ ...inp, fontSize: 16, fontWeight: 600, width: '100%', maxWidth: 360 }} />
          </div>

          {/* Trades */}
          {client.trades.map((trade, idx) => (
            <TradeRow key={trade.id} trade={trade}
              onChange={(field, val) => updateTrade(idx, field, val)}
              onRemove={() => removeTrade(idx)}
              canRemove={client.trades.length > 1} />
          ))}

          {/* Add trade button */}
          <button onClick={addTrade} style={{ width: '100%', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--gold)', fontFamily: 'var(--font-d)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', padding: '10px', cursor: 'pointer', marginBottom: 16 }}>
            + Add Another Trade
          </button>

          {/* Financials summary */}
          {totalContract > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>Financial Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 14 }}>
                {[
                  { label: 'Total Contract', value: fmt(totalContract), color: 'var(--white)' },
                  { label: 'Full Commission', value: fmt(totalCommission), color: client.splitCommission ? 'var(--dim)' : 'var(--green)' },
            ...(client.splitCommission ? [{ label: 'Your Split (50%)', value: fmt(totalCommission * 0.5), color: 'var(--green)' }] : []),
                  { label: 'Remaining to Collect', value: fmt(remaining), color: remaining > 0 ? 'var(--gold)' : 'var(--green)' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Out of pocket + insurance collected */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--dim)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Homeowner Out of Pocket ($)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--dim)', fontSize: 13 }}>$</span>
                    <input style={{ ...inp, paddingLeft: 22 }} type="number" value={client.outOfPocket}
                      onChange={e => onUpdate({ ...client, outOfPocket: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--dim)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Total Insurance Collected ($)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--dim)', fontSize: 13 }}>$</span>
                    <input style={{ ...inp, paddingLeft: 22 }} type="number" value={client.insuranceCollected}
                      onChange={e => onUpdate({ ...client, insuranceCollected: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
              </div>

              {(outOfPocket > 0 || insuranceCollected > 0) && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: remaining > 0 ? 'rgba(200,146,42,0.08)' : 'var(--green-bg)', border: `1px solid ${remaining > 0 ? 'rgba(200,146,42,0.3)' : 'rgba(61,184,122,0.3)'}`, borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--dim)' }}>Remaining: </span>
                  <strong style={{ color: remaining > 0 ? 'var(--gold)' : 'var(--green)', fontFamily: 'var(--font-d)', fontSize: 18 }}>{fmt(remaining)}</strong>
                  <span style={{ color: 'var(--dim)', fontSize: 11, marginLeft: 8 }}>(Contract {fmt(totalContract)} − OOP {fmt(outOfPocket)} − Insurance {fmt(insuranceCollected)})</span>
                </div>
              )}
            </div>
          )}

          {/* Split Commission */}
          <div style={{ background: client.splitCommission ? 'rgba(74,142,194,0.08)' : 'var(--surface)', border: '1px solid ' + (client.splitCommission ? 'rgba(74,142,194,0.3)' : 'var(--border)'), borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={client.splitCommission} onChange={e => onUpdate({ ...client, splitCommission: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: 'var(--blue)', cursor: 'pointer' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: client.splitCommission ? 'var(--blue)' : 'var(--text)', fontWeight: client.splitCommission ? 700 : 400 }}>Split Commission with Another Rep</div>
                <div style={{ fontSize: 11, color: 'var(--dim)' }}>Your cut becomes 50% of the total commission</div>
              </div>
              {client.splitCommission && totalCommission > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1 }}>Your Share</div>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{fmt(totalCommission * 0.5)}</div>
                </div>
              )}
            </label>
            {client.splitCommission && (
              <div style={{ marginTop: 10 }}>
                <input value={client.splitWith || ''} onChange={e => onUpdate({ ...client, splitWith: e.target.value })}
                  placeholder="Other rep's name" style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontFamily: 'var(--font-b)', fontSize: 13, padding: '8px 10px', outline: 'none', width: '100%', maxWidth: 280 }} />
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--dim)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Notes</label>
            <textarea value={client.notes} onChange={e => onUpdate({ ...client, notes: e.target.value })}
              placeholder="Follow-up notes, next steps, carrier info..." rows={3}
              style={{ ...inp, resize: 'vertical', width: '100%', lineHeight: 1.6 }} />
          </div>

          {/* Checkboxes + Delete */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: client.cocSent ? 'var(--gold)' : 'var(--text)' }}>
              <input type="checkbox" checked={client.cocSent} onChange={e => onUpdate({ ...client, cocSent: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: 'var(--gold)', cursor: 'pointer' }} />
              COC Sent to Carrier
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: client.closed ? 'var(--green)' : 'var(--text)', fontWeight: client.closed ? 700 : 400 }}>
              <input type="checkbox" checked={client.closed} onChange={e => onUpdate({ ...client, closed: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer' }} />
              {client.closed ? '✓ Closed' : 'Mark as Closed'}
            </label>
            <button onClick={() => { if (window.confirm('Delete ' + (client.name || 'this client') + '?')) onDelete(client.id); }}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--red)', borderRadius: 6, color: 'var(--red)', fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────
export default function App() {

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [saving, setSaving] = useState(false);

  // Load from Supabase
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await sb.from('rg_clients').select('*').order('created_at', { ascending: false });
      if (data) setClients(data.map(r => ({ ...r, trades: r.trades || [newTrade('Roof')], outOfPocket: r.out_of_pocket || '', insuranceCollected: r.insurance_collected || '', splitCommission: r.split_commission || false, splitWith: r.split_with || '' })));
      setLoading(false);
    })();
  }, []);

  // Debounced save to Supabase
  const saveClient = async (client) => {
    setSaving(true);
    const payload = {
      name: client.name, trades: client.trades,
      out_of_pocket: parseFloat(client.outOfPocket) || null,
      insurance_collected: parseFloat(client.insuranceCollected) || null,
      split_commission: client.splitCommission || false,
      split_with: client.splitWith || null,
      coc_sent: client.cocSent, closed: client.closed, notes: client.notes,
    };
    if (client.id) {
      await sb.from('rg_clients').update(payload).eq('id', client.id);
    } else {
      const { data } = await sb.from('rg_clients').insert([payload]).select();
      if (data?.[0]) {
        setClients(prev => prev.map(c => c === client ? { ...client, id: data[0].id } : c));
      }
    }
    setSaving(false);
  };

  const updateClient = (updated) => {
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (updated.id) saveClient(updated);
  };

  const addClient = async () => {
    const c = newClient();
    const { data, error } = await sb.from('rg_clients').insert([{
      name: '', trades: c.trades, out_of_pocket: null, insurance_collected: null,
      split_commission: false, split_with: null, coc_sent: false, closed: false, notes: ''
    }]).select();
    if (error) { alert('Error adding client: ' + error.message); return; }
    if (data?.[0]) {
      const newC = { ...c, id: data[0].id };
      setClients(prev => [newC, ...prev]);
    }
  };

  const deleteClient = async (id) => {
    await sb.from('rg_clients').delete().eq('id', id);
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const filtered = clients.filter(c => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'Open') return !c.closed;
    if (filter === 'Closed') return c.closed;
    if (filter === 'COC Pending') return c.cocSent && !c.closed;
    return true;
  });

  // Summary stats
  const totalContract = clients.reduce((s, c) => s + c.trades.reduce((ts, t) => ts + (parseFloat(t.contractPrice) || 0), 0), 0);
  const totalCommission = clients.reduce((s, c) => s + c.trades.reduce((ts, t) => ts + calcCommission(t), 0), 0);
  const closedCount = clients.filter(c => c.closed).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--white)' }}>
          Roof <span style={{ color: 'var(--gold)' }}>Guys</span> <span style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'var(--font-b)', fontWeight: 400, letterSpacing: 0 }}>Client Tracker</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saving && <span style={{ fontSize: 11, color: 'var(--dim)' }}>Saving...</span>}
          <button onClick={addClient} style={{ background: 'var(--gold)', border: 'none', color: '#000', fontFamily: 'var(--font-d)', fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, padding: '7px 20px', borderRadius: 8, cursor: 'pointer' }}>+ Add Client</button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>

        {/* STATS */}
        {(() => {
          const splitClients = clients.filter(c => c.splitCommission);
          const fullClients = clients.filter(c => !c.splitCommission);
          const fullContract = fullClients.reduce((s,c) => s + c.trades.reduce((ts,t) => ts + (parseFloat(t.contractPrice)||0), 0), 0);
          const fullCommission = fullClients.reduce((s,c) => s + c.trades.reduce((ts,t) => ts + calcCommission(t), 0), 0);
          const splitContract = splitClients.reduce((s,c) => s + c.trades.reduce((ts,t) => ts + (parseFloat(t.contractPrice)||0), 0), 0);
          const splitCommissionTotal = splitClients.reduce((s,c) => s + c.trades.reduce((ts,t) => ts + calcCommission(t), 0), 0);
          const splitYours = splitCommissionTotal * 0.5;
          return (
            <>
              {/* Full deal stats */}
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--dim)', fontWeight: 700, marginBottom: 8 }}>Full Deals</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Total Contract', value: fmtS(fullContract), color: 'var(--white)' },
                  { label: 'Total Commission', value: fmtS(fullCommission), color: 'var(--green)' },
                  { label: 'Active Clients', value: fullClients.filter(c => !c.closed).length, color: 'var(--gold)' },
                  { label: 'Closed', value: fullClients.filter(c => c.closed).length, color: 'var(--green)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 5 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Split deal stats — only show if any exist */}
              {splitClients.length > 0 && (
                <>
                  <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--blue)', fontWeight: 700, marginBottom: 8 }}>Split Deals</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Split Contract', value: fmtS(splitContract), color: 'var(--white)' },
                      { label: 'Full Commission', value: fmtS(splitCommissionTotal), color: 'var(--dim)' },
                      { label: 'Your Split Payout', value: fmtS(splitYours), color: 'var(--green)' },
                      { label: 'Split Clients', value: splitClients.length, color: 'var(--blue)' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--card)', border: '1px solid rgba(74,142,194,0.3)', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 5 }}>{s.label}</div>
                        <div style={{ fontFamily: 'var(--font-d)', fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Combined total bar */}
                  <div style={{ background: 'linear-gradient(135deg,rgba(61,184,122,0.1),rgba(61,184,122,0.03))', border: '1px solid rgba(61,184,122,0.25)', borderRadius: 10, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--green)', marginBottom: 3 }}>Total You Take Home</div>
                      <div style={{ fontFamily: 'var(--font-d)', fontSize: 32, fontWeight: 900, color: 'var(--green)' }}>{fmtS(fullCommission + splitYours)}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--dim)' }}>
                      {fmtS(fullCommission)} full deals + {fmtS(splitYours)} split deals
                    </div>
                  </div>
                </>
              )}
            </>
          );
        })()}

        {/* FILTERS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
            style={{ flex: 1, minWidth: 180, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--white)', fontSize: 13, padding: '8px 12px', outline: 'none' }} />
          {['All', 'Open', 'Closed', 'COC Pending'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? 'var(--gold)' : 'none', border: `1px solid ${filter === f ? 'var(--gold)' : 'var(--border)'}`, color: filter === f ? '#000' : 'var(--dim)', fontWeight: filter === f ? 700 : 400, fontSize: 12, padding: '7px 14px', borderRadius: 6, cursor: 'pointer' }}>{f}</button>
          ))}
        </div>

        {/* CLIENT LIST */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--dim)' }}>Loading clients...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--dim)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
            <div style={{ color: 'var(--white)', marginBottom: 16 }}>{clients.length === 0 ? 'No clients yet' : 'No clients match filter'}</div>
            {clients.length === 0 && <button onClick={addClient} style={{ background: 'var(--gold)', border: 'none', color: '#000', fontFamily: 'var(--font-d)', fontSize: 16, fontWeight: 900, textTransform: 'uppercase', padding: '10px 28px', borderRadius: 8, cursor: 'pointer' }}>Add First Client</button>}
          </div>
        ) : (
          filtered.map(client => (
            <ClientCard key={client.id} client={client}
              onUpdate={updateClient}
              onDelete={deleteClient} />
          ))
        )}
      </main>
    </div>
  );
}
