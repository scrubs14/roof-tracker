import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CARRIERS, STATUSES, TRADES } from './Dashboard';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function JobForm({ job, onSave, onClose, onDelete }) {
  const isEdit = !!job?.id;
  const cleanJob = job ? {
    client_name: job.client_name || '',
    address: job.address || '',
    city: job.city || 'Clarksville',
    state: job.state || 'TN',
    job_type: job.job_type || 'Insurance',
    carrier: job.carrier || '',
    claim_number: job.claim_number || '',
    adjuster_name: job.adjuster_name || '',
    claim_status: job.claim_status || 'Pending',
    date_of_loss: job.date_of_loss || '',
    inspection_date: job.inspection_date || '',
    contract_date: job.contract_date || '',
    contract_amount: job.contract_amount || '',
    payout_amount: job.payout_amount || '',
    rcv_amount: job.rcv_amount || '',
    acv_amount: job.acv_amount || '',
    depreciation_held: job.depreciation_held || '',
    supplement_amount: job.supplement_amount || '',
    trades: job.trades || '',
    notes: job.notes || '',
    job_month: job.job_month || '',
    job_year: job.job_year || '2026',
    id: job.id
  } : null;

  const [form, setForm] = useState({
    client_name:'', address:'', city:'Clarksville', state:'TN',
    job_type:'Insurance', carrier:'', claim_number:'', adjuster_name:'',
    claim_status:'Pending', date_of_loss:'', inspection_date:'', contract_date:'',
    contract_amount:'', payout_amount:'', rcv_amount:'', acv_amount:'',
    depreciation_held:'', supplement_amount:'',
    trades:'', notes:'', job_month:'', job_year:'2026',
    ...(cleanJob || {})
  });
  const [saving, setSaving] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState(job?.trades ? job.trades.split(',').map(t=>t.trim()) : []);

  const payPct = form.contract_amount > 0 ? ((parseFloat(form.payout_amount)||0) / parseFloat(form.contract_amount) * 100).toFixed(1) : 0;

  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const toggleTrade = (t) => {
    setSelectedTrades(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t]);
  };

  useEffect(() => { set('trades', selectedTrades.join(', ')); }, [selectedTrades]);

  const save = async () => {
    if (!form.client_name) return alert('Client name required.');
    setSaving(true);
    const payload = {
      client_name: form.client_name,
      address: form.address,
      city: form.city,
      state: form.state,
      job_type: form.job_type,
      carrier: form.carrier,
      claim_number: form.claim_number,
      adjuster_name: form.adjuster_name,
      claim_status: form.claim_status,
      date_of_loss: form.date_of_loss || null,
      inspection_date: form.inspection_date || null,
      contract_date: form.contract_date || null,
      trades: form.trades,
      notes: form.notes,
      job_month: form.job_month,
      job_year: form.job_year,
      contract_amount: parseFloat(form.contract_amount) || null,
      payout_amount: parseFloat(form.payout_amount) || null,
      rcv_amount: parseFloat(form.rcv_amount) || null,
      acv_amount: parseFloat(form.acv_amount) || null,
      depreciation_held: parseFloat(form.depreciation_held) || null,
      supplement_amount: parseFloat(form.supplement_amount) || null,
    };
    if (isEdit) {
      await supabase.from('roof_jobs').update(payload).eq('id', job.id);
    } else {
      await supabase.from('roof_jobs').insert([payload]);
    }
    setSaving(false);
    onSave();
  };

  const del = async () => {
    if (!window.confirm('Delete this job permanently?')) return;
    await supabase.from('roof_jobs').delete().eq('id', job.id);
    onDelete();
  };

  const inp = { width:'100%', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, color:'var(--white)', fontSize:13, padding:'9px 12px', outline:'none' };
  const sel = { ...inp, WebkitAppearance:'none', cursor:'pointer' };
  const lbl = { fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--dim)', display:'block', marginBottom:5, fontWeight:500 };
  const fg = (children, span=1) => <div style={{ gridColumn:`span ${span}` }}>{children}</div>;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:20, overflowY:'auto' }}>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:680, padding:28, margin:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:22, fontWeight:800, textTransform:'uppercase', color:'var(--white)' }}>
            {isEdit ? 'Edit Job' : 'Add New Job'}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--dim)', fontSize:22, cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* Client Info */}
          <div style={{ gridColumn:'1/-1', fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--gold)', fontWeight:600, paddingBottom:6, borderBottom:'1px solid var(--border)' }}>Client Information</div>

          {fg(<><label style={lbl}>Client Name *</label><input style={inp} value={form.client_name} onChange={e=>set('client_name',e.target.value)} placeholder="Jane Smith" /></>)}
          {fg(<><label style={lbl}>Job Type</label><select style={sel} value={form.job_type} onChange={e=>set('job_type',e.target.value)}><option>Insurance</option><option>Retail</option></select></>)}
          {fg(<><label style={lbl}>Property Address</label><input style={inp} value={form.address} onChange={e=>set('address',e.target.value)} placeholder="123 Main St" /></>, 2)}
          {fg(<><label style={lbl}>City</label><input style={inp} value={form.city} onChange={e=>set('city',e.target.value)} /></>)}
          {fg(<><label style={lbl}>State</label><input style={inp} value={form.state} onChange={e=>set('state',e.target.value)} /></>)}

          {/* Insurance Info */}
          {form.job_type === 'Insurance' && <>
            <div style={{ gridColumn:'1/-1', fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--gold)', fontWeight:600, paddingBottom:6, borderBottom:'1px solid var(--border)', marginTop:8 }}>Insurance Details</div>
            {fg(<><label style={lbl}>Insurance Carrier</label><select style={sel} value={form.carrier} onChange={e=>set('carrier',e.target.value)}><option value="">Select carrier...</option>{CARRIERS.map(c=><option key={c}>{c}</option>)}</select></>)}
            {fg(<><label style={lbl}>Claim Status</label><select style={sel} value={form.claim_status} onChange={e=>set('claim_status',e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></>)}
            {fg(<><label style={lbl}>Claim Number</label><input style={inp} value={form.claim_number} onChange={e=>set('claim_number',e.target.value)} placeholder="CLM-2026-XXXXX" /></>)}
            {fg(<><label style={lbl}>Adjuster Name</label><input style={inp} value={form.adjuster_name} onChange={e=>set('adjuster_name',e.target.value)} placeholder="John Doe" /></>)}
            {fg(<><label style={lbl}>Date of Loss</label><input style={inp} type="date" value={form.date_of_loss} onChange={e=>set('date_of_loss',e.target.value)} /></>)}
            {fg(<><label style={lbl}>Inspection Date</label><input style={inp} type="date" value={form.inspection_date} onChange={e=>set('inspection_date',e.target.value)} /></>)}
          </>}

          {/* Financials */}
          <div style={{ gridColumn:'1/-1', fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--gold)', fontWeight:600, paddingBottom:6, borderBottom:'1px solid var(--border)', marginTop:8 }}>Financial Details</div>

          {fg(<><label style={lbl}>Contract Amount ($)</label><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--dim)' }}>$</span><input style={{ ...inp, paddingLeft:22 }} type="number" value={form.contract_amount} onChange={e=>set('contract_amount',e.target.value)} placeholder="0.00" /></div></>)}
          {fg(<><label style={lbl}>My Payout ($)</label><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--dim)' }}>$</span><input style={{ ...inp, paddingLeft:22 }} type="number" value={form.payout_amount} onChange={e=>set('payout_amount',e.target.value)} placeholder="0.00" /></div>{form.contract_amount && form.payout_amount ? <div style={{ fontSize:11, color:'var(--green)', marginTop:4 }}>→ {payPct}% of contract</div> : null}</>)}

          {form.job_type === 'Insurance' && <>
            {fg(<><label style={lbl}>RCV Amount ($)</label><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--dim)' }}>$</span><input style={{ ...inp, paddingLeft:22 }} type="number" value={form.rcv_amount} onChange={e=>set('rcv_amount',e.target.value)} placeholder="0.00" /></div></>)}
            {fg(<><label style={lbl}>ACV Amount ($)</label><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--dim)' }}>$</span><input style={{ ...inp, paddingLeft:22 }} type="number" value={form.acv_amount} onChange={e=>set('acv_amount',e.target.value)} placeholder="0.00" /></div></>)}
            {fg(<><label style={lbl}>Depreciation Held ($)</label><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--dim)' }}>$</span><input style={{ ...inp, paddingLeft:22 }} type="number" value={form.depreciation_held} onChange={e=>set('depreciation_held',e.target.value)} placeholder="0.00" /></div></>)}
            {fg(<><label style={lbl}>Supplement Amount ($)</label><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--dim)' }}>$</span><input style={{ ...inp, paddingLeft:22 }} type="number" value={form.supplement_amount} onChange={e=>set('supplement_amount',e.target.value)} placeholder="0.00" /></div></>)}
          </>}

          {/* Month/Year */}
          {fg(<><label style={lbl}>Job Month</label><select style={sel} value={form.job_month} onChange={e=>set('job_month',e.target.value)}><option value="">Select month...</option>{MONTHS.map(m=><option key={m}>{m}</option>)}</select></>)}
          {fg(<><label style={lbl}>Job Year</label><select style={sel} value={form.job_year} onChange={e=>set('job_year',e.target.value)}><option>2025</option><option>2026</option><option>2027</option></select></>)}

          {/* Trades */}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>Trades Approved / Performed</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {TRADES.map(t => (
                <button key={t} type="button" onClick={() => toggleTrade(t)} style={{
                  background: selectedTrades.includes(t) ? 'var(--gold-bg)' : 'var(--surface)',
                  border: `1px solid ${selectedTrades.includes(t) ? 'var(--gold)' : 'var(--border)'}`,
                  color: selectedTrades.includes(t) ? 'var(--gold)' : 'var(--dim)',
                  fontWeight: selectedTrades.includes(t) ? 700 : 400,
                  fontSize:12, padding:'6px 14px', borderRadius:20, cursor:'pointer', transition:'all 0.15s'
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          {fg(<><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight:80, resize:'vertical' }} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any additional details..." /></>, 2)}

        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10, marginTop:24 }}>
          <button onClick={save} disabled={saving} style={{ flex:1, background:'var(--gold)', border:'none', borderRadius:8, color:'#000', fontFamily:'var(--font-d)', fontSize:18, fontWeight:800, textTransform:'uppercase', letterSpacing:1, padding:12, cursor:'pointer', opacity:saving?0.6:1 }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Job'}
          </button>
          {isEdit && (
            <button onClick={del} style={{ background:'var(--red-bg)', border:'1px solid var(--red)', borderRadius:8, color:'var(--red)', fontSize:13, fontWeight:600, padding:'12px 18px', cursor:'pointer' }}>
              Delete
            </button>
          )}
          <button onClick={onClose} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, color:'var(--dim)', fontSize:13, padding:'12px 18px', cursor:'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
