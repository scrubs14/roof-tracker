import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CARRIERS, STATUSES, TRADES, BUCKETS, PITCH_PRICES, GUTTER_PRICES, SIDING_PRICE, DECK_PRICE, targetPrice } from './Dashboard';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const PITCH_OPTIONS = Object.keys(PITCH_PRICES);
const GUTTER_OPTIONS = Object.keys(GUTTER_PRICES);

function fmt(n) { return '$' + Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }

export default function JobForm({ job, onSave, onClose, onDelete }) {
  const isEdit = !!job?.id;
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    client_name:'', address:'', city:'Clarksville', state:'TN',
    bucket:'The Roof Guys', job_type:'Insurance',
    carrier:'', adjuster_name:'', claim_number:'', claim_status:'Lead',
    date_of_loss:'', inspection_date:'',
    pitch_type:'Low 1 Story', roof_sq:'', gutter_type:'5"', gutter_lf:'',
    siding_sq:'', deck_boards:'',
    contract_amount:'', op_pct:'5',
    rcv_amount:'', acv_amount:'', depreciation_held:'', supplement_amount:'',
    trades:'', notes:'', job_month:'', job_year:'2026',
    ...(job || {})
  });
  const [selectedTrades, setSelectedTrades] = useState(job?.trades ? job.trades.split(',').map(t=>t.trim()) : []);

  useEffect(() => { setF(prev=>({...prev,trades:selectedTrades.join(', ')})); }, [selectedTrades]);

  const set = (k,v) => setF(prev=>({...prev,[k]:v}));

  // Auto-calc payout
  const roofSq = parseFloat(f.roof_sq)||0;
  const gutterLF = parseFloat(f.gutter_lf)||0;
  const sidingSq = parseFloat(f.siding_sq)||0;
  const deckBoards = parseFloat(f.deck_boards)||0;
  const contract = parseFloat(f.contract_amount)||0;
  const op = parseFloat(f.op_pct)||5;

  const roofBuild = roofSq * (PITCH_PRICES[f.pitch_type]||244.96);
  const gutterBuild = gutterLF * (GUTTER_PRICES[f.gutter_type]||6);
  const sidingBuild = sidingSq * SIDING_PRICE;
  const deckBuild = deckBoards * DECK_PRICE;
  const totalBuild = roofBuild + gutterBuild + sidingBuild + deckBuild;
  const opDeduct = contract * (op/100);
  const gross = contract - totalBuild - opDeduct;
  const yourPayout = gross * 0.5;
  const payoutPct = contract > 0 ? (yourPayout/contract*100) : 0;

  // Target price for 23.4%
  const target234 = roofSq > 0 ? targetPrice(roofSq, f.pitch_type, op) : 0;

  const save = async () => {
    if (!f.client_name) { alert('Client name required'); return; }
    setSaving(true);
    const payload = {
      client_name:f.client_name, address:f.address, city:f.city, state:f.state,
      bucket:f.bucket, job_type:f.job_type, company:f.bucket,
      carrier:f.carrier, adjuster_name:f.adjuster_name,
      claim_status:f.claim_status, date_of_loss:f.date_of_loss||null,
      inspection_date:f.inspection_date||null,
      pitch_type:f.pitch_type, roof_sq:parseFloat(f.roof_sq)||null,
      gutter_type:f.gutter_type, gutter_lf:parseFloat(f.gutter_lf)||null,
      siding_sq:parseFloat(f.siding_sq)||null, deck_boards:parseFloat(f.deck_boards)||null,
      contract_amount:parseFloat(f.contract_amount)||null,
      payout_amount:contract>0?yourPayout:null, op_pct:op,
      rcv_amount:parseFloat(f.rcv_amount)||null, acv_amount:parseFloat(f.acv_amount)||null,
      depreciation_held:parseFloat(f.depreciation_held)||null,
      supplement_amount:parseFloat(f.supplement_amount)||null,
      trades:f.trades, notes:f.notes, job_month:f.job_month, job_year:f.job_year,
    };
    // Only include claim_number if not empty
    if (f.claim_number) payload.claim_number = f.claim_number;
    
    let err;
    if (isEdit) { const r = await supabase.from('roof_jobs').update(payload).eq('id',job.id); err=r.error; }
    else { const r = await supabase.from('roof_jobs').insert([payload]); err=r.error; }
    if (err) { alert('Save error: '+err.message); setSaving(false); return; }
    setSaving(false);
    onSave();
  };

  const del = async () => {
    if (!window.confirm('Delete this job?')) return;
    await supabase.from('roof_jobs').delete().eq('id',job.id);
    onDelete();
  };

  const inp = { width:'100%', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, color:'var(--white)', fontFamily:'var(--font-b)', fontSize:13, padding:'9px 11px', outline:'none' };
  const sel = { ...inp, cursor:'pointer', WebkitAppearance:'none' };
  const lbl = { fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--dim)', display:'block', marginBottom:5, fontWeight:500 };
  const sec = { fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--gold)', fontWeight:700, gridColumn:'1/-1', paddingTop:12, borderTop:'1px solid var(--border)', marginTop:4 };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:20, overflowY:'auto' }}>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:720, padding:28, margin:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:22, fontWeight:800, textTransform:'uppercase', color:'var(--white)' }}>{isEdit?'Edit Job':'Add New Job'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--dim)', fontSize:22, cursor:'pointer' }}>✕</button>
        </div>

        {/* LIVE PAYOUT PREVIEW */}
        {contract > 0 && (
          <div style={{ background:'linear-gradient(135deg,rgba(61,184,122,0.1),rgba(61,184,122,0.03))', border:'1px solid rgba(61,184,122,0.25)', borderRadius:10, padding:'14px 20px', marginBottom:20, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12 }}>
            <div><div style={{ fontSize:9, letterSpacing:2, textTransform:'uppercase', color:'var(--green)', marginBottom:3 }}>Your Payout</div><div style={{ fontFamily:'var(--font-d)', fontSize:26, fontWeight:800, color:'var(--green)' }}>{fmt(yourPayout)}</div></div>
            <div><div style={{ fontSize:9, letterSpacing:2, textTransform:'uppercase', color:'var(--dim)', marginBottom:3 }}>Payout %</div><div style={{ fontFamily:'var(--font-d)', fontSize:26, fontWeight:800, color:payoutPct>=23.4?'var(--green)':payoutPct>=15?'var(--gold)':'var(--red)' }}>{payoutPct.toFixed(1)}%</div></div>
            <div><div style={{ fontSize:9, letterSpacing:2, textTransform:'uppercase', color:'var(--dim)', marginBottom:3 }}>Build Cost</div><div style={{ fontFamily:'var(--font-d)', fontSize:22, fontWeight:700, color:'var(--red)' }}>{fmt(totalBuild)}</div></div>
            <div><div style={{ fontSize:9, letterSpacing:2, textTransform:'uppercase', color:'var(--dim)', marginBottom:3 }}>O&P ({op}%)</div><div style={{ fontFamily:'var(--font-d)', fontSize:22, fontWeight:700, color:'var(--red)' }}>{fmt(opDeduct)}</div></div>
          </div>
        )}
        {/* Target price hint */}
        {target234 > 0 && (
          <div style={{ background:'rgba(200,146,42,0.08)', border:'1px solid rgba(200,146,42,0.2)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'var(--gold)' }}>
            💡 To hit 23.4% payout on {roofSq} squares: charge at least <strong>{fmt(target234)}</strong>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

          {/* Client Info */}
          <div style={sec}>Client Information</div>
          <div><label style={lbl}>Client Name *</label><input style={inp} value={f.client_name} onChange={e=>set('client_name',e.target.value)} placeholder="Jane Smith" /></div>
          <div><label style={lbl}>Bucket</label>
            <select style={sel} value={f.bucket} onChange={e=>set('bucket',e.target.value)}>
              {BUCKETS.map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl}>Property Address</label><input style={inp} value={f.address} onChange={e=>set('address',e.target.value)} placeholder="123 Main St" /></div>
          <div><label style={lbl}>City</label><input style={inp} value={f.city} onChange={e=>set('city',e.target.value)} /></div>
          <div><label style={lbl}>State</label><input style={inp} value={f.state} onChange={e=>set('state',e.target.value)} /></div>

          {/* Job Details */}
          <div style={sec}>Job Details</div>
          <div><label style={lbl}>Job Type</label>
            <select style={sel} value={f.job_type} onChange={e=>set('job_type',e.target.value)}>
              <option>Insurance</option><option>Retail</option>
            </select>
          </div>
          <div><label style={lbl}>Status</label>
            <select style={sel} value={f.claim_status} onChange={e=>set('claim_status',e.target.value)}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          {f.job_type === 'Insurance' && <>
            <div><label style={lbl}>Insurance Carrier</label>
              <select style={sel} value={f.carrier} onChange={e=>set('carrier',e.target.value)}>
                <option value="">Select carrier...</option>
                {CARRIERS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Adjuster Name</label><input style={inp} value={f.adjuster_name} onChange={e=>set('adjuster_name',e.target.value)} placeholder="John Doe" /></div>
            <div><label style={lbl}>Date of Loss</label><input style={inp} type="date" value={f.date_of_loss} onChange={e=>set('date_of_loss',e.target.value)} /></div>
            <div><label style={lbl}>Inspection Date</label><input style={inp} type="date" value={f.inspection_date} onChange={e=>set('inspection_date',e.target.value)} /></div>
          </>}

          {/* Scope */}
          <div style={sec}>Scope of Work (auto-calculates payout)</div>
          <div><label style={lbl}>O&P %</label>
            <select style={sel} value={f.op_pct} onChange={e=>set('op_pct',e.target.value)}>
              <option value="5">5% — Self-Gen Lead</option>
              <option value="15">15% — Roof Guys / Provision Lead</option>
            </select>
          </div>
          <div><label style={lbl}>Contract Amount ($)</label>
            <div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--dim)' }}>$</span>
            <input style={{ ...inp, paddingLeft:22 }} type="number" value={f.contract_amount} onChange={e=>set('contract_amount',e.target.value)} placeholder="0.00" /></div>
          </div>

          {/* Roof */}
          <div><label style={lbl}>Roof Pitch / Type</label>
            <select style={sel} value={f.pitch_type} onChange={e=>set('pitch_type',e.target.value)}>
              {PITCH_OPTIONS.map(p=><option key={p}>{p} (${PITCH_PRICES[p].toFixed(2)}/sq)</option>)}
            </select>
          </div>
          <div><label style={lbl}>Roof Squares</label>
            <input style={inp} type="number" value={f.roof_sq} onChange={e=>set('roof_sq',e.target.value)} placeholder="28" />
            {roofSq>0&&<div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>Build cost: {fmt(roofBuild)}</div>}
          </div>

          {/* Gutters */}
          <div><label style={lbl}>Gutter Type</label>
            <select style={sel} value={f.gutter_type} onChange={e=>set('gutter_type',e.target.value)}>
              {GUTTER_OPTIONS.map(g=><option key={g}>{g} (${GUTTER_PRICES[g]}/LF)</option>)}
            </select>
          </div>
          <div><label style={lbl}>Gutter Linear Feet</label>
            <input style={inp} type="number" value={f.gutter_lf} onChange={e=>set('gutter_lf',e.target.value)} placeholder="0" />
            {gutterLF>0&&<div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>Build cost: {fmt(gutterBuild)}</div>}
          </div>

          {/* Siding + Decking */}
          <div><label style={lbl}>Siding Squares</label>
            <input style={inp} type="number" value={f.siding_sq} onChange={e=>set('siding_sq',e.target.value)} placeholder="0" />
            {sidingSq>0&&<div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>Build cost: {fmt(sidingBuild)} ($300/sq)</div>}
          </div>
          <div><label style={lbl}>Re-Decking Boards</label>
            <input style={inp} type="number" value={f.deck_boards} onChange={e=>set('deck_boards',e.target.value)} placeholder="0" />
            {deckBoards>0&&<div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>Build cost: {fmt(deckBuild)} ($16/board)</div>}
          </div>

          {/* Insurance financials */}
          {f.job_type==='Insurance' && <>
            <div style={sec}>Insurance Financials</div>
            <div><label style={lbl}>RCV Amount ($)</label><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--dim)' }}>$</span><input style={{ ...inp, paddingLeft:22 }} type="number" value={f.rcv_amount} onChange={e=>set('rcv_amount',e.target.value)} placeholder="0.00" /></div></div>
            <div><label style={lbl}>ACV Amount ($)</label><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--dim)' }}>$</span><input style={{ ...inp, paddingLeft:22 }} type="number" value={f.acv_amount} onChange={e=>set('acv_amount',e.target.value)} placeholder="0.00" /></div></div>
            <div><label style={lbl}>Depreciation Held ($)</label><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--dim)' }}>$</span><input style={{ ...inp, paddingLeft:22 }} type="number" value={f.depreciation_held} onChange={e=>set('depreciation_held',e.target.value)} placeholder="0.00" /></div></div>
            <div><label style={lbl}>Supplement Amount ($)</label><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--dim)' }}>$</span><input style={{ ...inp, paddingLeft:22 }} type="number" value={f.supplement_amount} onChange={e=>set('supplement_amount',e.target.value)} placeholder="0.00" /></div></div>
          </>}

          {/* Trades */}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>Trades</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {TRADES.map(t=>(
                <button key={t} type="button" onClick={()=>setSelectedTrades(prev=>prev.includes(t)?prev.filter(x=>x!==t):[...prev,t])} style={{ background:selectedTrades.includes(t)?'var(--gold-bg)':'var(--surface)', border:`1px solid ${selectedTrades.includes(t)?'var(--gold)':'var(--border)'}`, color:selectedTrades.includes(t)?'var(--gold)':'var(--dim)', fontSize:12, padding:'5px 12px', borderRadius:20, cursor:'pointer' }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Month/Year */}
          <div><label style={lbl}>Job Month</label>
            <select style={sel} value={f.job_month} onChange={e=>set('job_month',e.target.value)}>
              <option value="">Select month...</option>
              {MONTHS.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Job Year</label>
            <select style={sel} value={f.job_year} onChange={e=>set('job_year',e.target.value)}>
              {['2024','2025','2026','2027'].map(y=><option key={y}>{y}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, minHeight:80, resize:'vertical' }} value={f.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any additional details, follow-up notes, next steps..." />
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={save} disabled={saving} style={{ flex:1, background:'var(--gold)', border:'none', borderRadius:8, color:'#000', fontFamily:'var(--font-d)', fontSize:18, fontWeight:800, textTransform:'uppercase', letterSpacing:1, padding:12, cursor:'pointer', opacity:saving?0.6:1 }}>
            {saving?'Saving...':isEdit?'Save Changes':'Add Job'}
          </button>
          {isEdit && <button onClick={del} style={{ background:'var(--red-bg)', border:'1px solid var(--red)', borderRadius:8, color:'var(--red)', fontSize:13, fontWeight:600, padding:'12px 18px', cursor:'pointer' }}>Delete</button>}
          <button onClick={onClose} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, color:'var(--dim)', fontSize:13, padding:'12px 18px', cursor:'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
