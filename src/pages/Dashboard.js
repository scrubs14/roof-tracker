import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const CARRIERS = ['State Farm','Allstate','Farmers','Liberty Mutual','Nationwide','USAA','Travelers','Progressive','Tennessee Farmers','Farm Bureau','Kentucky Farm Bureau','Encompass','Erie','Auto-Owners','Other'];
export const STATUSES = ['Lead','Inspection Done','Claim Filed','Approved','Denied','Supplement Pending','Supplement Approved','Job Scheduled','In Progress','Complete','Invoiced','Paid - ACV','Paid - RCV'];
export const TRADES = ['Roof','Gutters','Siding','Windows','Decking','Fencing','HVAC','Skylights','Fascia/Soffit','Other'];
export const COMPANIES = ['The Roof Guys','Provision Roofing'];
export const BUCKETS = ['The Roof Guys','Provision Roofing','Gutters','Non-Roof'];

// Pricing constants
const PITCH_PRICES = { 'Low 1 Story': 244.96, 'Low 2 Story': 250.29, 'High 1 Story': 255.63, 'High 2 Story': 260.96, 'Metal': 330.00 };
const GUTTER_PRICES = { '5"': 6, '6"': 7, 'Downspout 5"': 6, 'Downspout 6"': 7 };
const SIDING_PRICE = 300;
const DECK_PRICE = 16;

function fmt(n) { return '$' + Number(n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
function fmtS(n) { const v = Number(n||0); return (v<0?'-$':'$') + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits:0 }); }
function pct(a,b) { return b>0 ? ((a/b)*100).toFixed(1)+'%' : '—'; }

// Auto-calculate payout from job data
function calcPayout(job) {
  const op = parseFloat(job.op_pct) || 5;
  let totalBuild = 0;
  let totalContract = parseFloat(job.contract_amount) || 0;
  if (job.roof_sq && job.pitch_type) totalBuild += (parseFloat(job.roof_sq)||0) * (PITCH_PRICES[job.pitch_type]||244.96);
  if (job.gutter_lf && job.gutter_type) totalBuild += (parseFloat(job.gutter_lf)||0) * (GUTTER_PRICES[job.gutter_type]||6);
  if (job.siding_sq) totalBuild += (parseFloat(job.siding_sq)||0) * SIDING_PRICE;
  if (job.deck_boards) totalBuild += (parseFloat(job.deck_boards)||0) * DECK_PRICE;
  const opDeduct = totalContract * (op/100);
  const gross = totalContract - totalBuild - opDeduct;
  return gross * 0.5;
}

// Target price for 23.4% payout on roof
function targetPrice(sq, pitchType, op) {
  const buildPerSq = PITCH_PRICES[pitchType] || 244.96;
  const build = sq * buildPerSq;
  const opRate = (op||5)/100;
  // yourCut/contract = 0.234 → (contract - build - contract*op)*0.5/contract = 0.234
  // (1 - build/contract - op)*0.5 = 0.234
  // contract = build / (1 - op - 0.468)
  return build / (1 - opRate - 0.468);
}

export default function Dashboard({ onAdd, onSelect }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bucket, setBucket] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.from('roof_jobs').select('*').order('created_at', { ascending: false });
    if (err) { setError('Load error: ' + err.message); setLoading(false); return; }
    setJobs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const sub = supabase.channel('rj').on('postgres_changes', { event:'*', schema:'public', table:'roof_jobs' }, load).subscribe();
    return () => supabase.removeChannel(sub);
  }, [load]);

  // Bucket logic
  function getBucket(job) {
    const b = job.bucket || job.company || '';
    if (b === 'Gutters') return 'Gutters';
    if (b === 'Non-Roof') return 'Non-Roof';
    if (b === 'Provision Roofing') return 'Provision Roofing';
    return 'The Roof Guys';
  }

  const filtered = jobs.filter(j => {
    if (bucket !== 'All' && getBucket(j) !== bucket) return false;
    if (search && !`${j.client_name} ${j.address} ${j.claim_number||''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a,b) => {
    if (sortBy === 'contract') return (b.contract_amount||0)-(a.contract_amount||0);
    if (sortBy === 'payout') return (calcPayout(b))-(calcPayout(a));
    return new Date(b.created_at)-new Date(a.created_at);
  });

  // Stats per bucket
  function bucketStats(bucketName) {
    const bJobs = jobs.filter(j => getBucket(j) === bucketName);
    const totalC = bJobs.reduce((s,j)=>s+(parseFloat(j.contract_amount)||0),0);
    const totalP = bJobs.reduce((s,j)=>s+calcPayout(j),0);
    return { count: bJobs.length, contract: totalC, payout: totalP };
  }

  const allContract = jobs.reduce((s,j)=>s+(parseFloat(j.contract_amount)||0),0);
  const allPayout = jobs.reduce((s,j)=>s+calcPayout(j),0);

  const now = new Date();
  const thisMonth = now.toLocaleString('en-US',{month:'long'});
  const thisYear = String(now.getFullYear());
  const monthJobs = jobs.filter(j=>j.job_month===thisMonth&&j.job_year===thisYear);
  const monthContract = monthJobs.reduce((s,j)=>s+(parseFloat(j.contract_amount)||0),0);
  const monthPayout = monthJobs.reduce((s,j)=>s+calcPayout(j),0);

  const inp = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, color:'var(--white)', fontSize:13, padding:'8px 12px', outline:'none' };

  const STATUS_COLOR = {
    'Lead':'var(--dim)','Inspection Done':'var(--blue)','Claim Filed':'var(--blue)',
    'Approved':'var(--green)','Denied':'var(--red)','Supplement Pending':'var(--purple)',
    'Supplement Approved':'var(--green)','Job Scheduled':'var(--gold)','In Progress':'var(--gold)',
    'Complete':'var(--green)','Invoiced':'var(--gold)','Paid - ACV':'var(--green)','Paid - RCV':'var(--green)'
  };

  return (
    <div style={{ maxWidth:1400, margin:'0 auto', padding:20 }}>

      {error && <div style={{ background:'var(--red-bg)', border:'1px solid var(--red)', borderRadius:8, padding:12, marginBottom:16, color:'var(--red)', fontSize:13 }}>⚠️ {error} <button onClick={load} style={{ marginLeft:10, background:'none', border:'1px solid var(--red)', borderRadius:5, color:'var(--red)', cursor:'pointer', padding:'2px 8px', fontSize:12 }}>Retry</button></div>}

      {/* TOP STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Contract', value:fmtS(allContract), color:'var(--white)', sub:`${jobs.length} total jobs` },
          { label:'Total Payout', value:fmtS(allPayout), color:'var(--green)', sub:pct(allPayout,allContract)+' of contract' },
          { label:'This Month Contract', value:fmtS(monthContract), color:'var(--white)', sub:`${monthJobs.length} jobs` },
          { label:'This Month Payout', value:fmtS(monthPayout), color:'var(--green)', sub:pct(monthPayout,monthContract)+' of contract' },
          { label:'Approved Claims', value:jobs.filter(j=>['Approved','Supplement Approved','Job Scheduled','In Progress','Complete','Invoiced','Paid - ACV','Paid - RCV'].includes(j.claim_status)).length, color:'var(--green)', sub:`of ${jobs.filter(j=>j.job_type==='Insurance').length} insurance` },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--dim)', marginBottom:5 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:26, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* BUCKET BREAKDOWN */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {BUCKETS.map(b => {
          const st = bucketStats(b);
          const colors = { 'The Roof Guys':'var(--green)', 'Provision Roofing':'var(--gold)', 'Gutters':'var(--blue)', 'Non-Roof':'var(--purple)' };
          const c = colors[b];
          return (
            <div key={b} onClick={()=>setBucket(bucket===b?'All':b)} style={{ background: bucket===b ? `${c}15` : 'var(--card)', border:`2px solid ${bucket===b?c:'var(--border)'}`, borderRadius:10, padding:'14px 16px', cursor:'pointer', transition:'all 0.15s' }}>
              <div style={{ fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:c, marginBottom:6, fontWeight:700 }}>{b}</div>
              <div style={{ fontFamily:'var(--font-d)', fontSize:22, fontWeight:800, color:'var(--white)', marginBottom:2 }}>{fmtS(st.contract)}</div>
              <div style={{ fontSize:12, color:'var(--green)' }}>{fmtS(st.payout)} payout</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{st.count} jobs · {pct(st.payout,st.contract)}</div>
            </div>
          );
        })}
      </div>

      {/* FILTERS */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <input style={{ ...inp, flex:1, minWidth:200 }} placeholder="Search client, address..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select style={inp} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="date">Newest First</option>
          <option value="contract">Contract ↓</option>
          <option value="payout">Payout ↓</option>
        </select>
        <button onClick={()=>setBucket('All')} style={{ background:bucket==='All'?'var(--gold)':'none', border:`1px solid ${bucket==='All'?'var(--gold)':'var(--border)'}`, color:bucket==='All'?'#000':'var(--dim)', fontSize:12, padding:'7px 14px', borderRadius:6, cursor:'pointer' }}>All</button>
        <button onClick={onAdd} style={{ background:'var(--gold)', border:'none', color:'#000', fontFamily:'var(--font-d)', fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:1, padding:'8px 20px', borderRadius:8, cursor:'pointer' }}>+ Add Job</button>
      </div>

      {/* JOBS TABLE */}
      {loading ? (
        <div style={{ textAlign:'center', padding:48, color:'var(--dim)' }}>Loading jobs...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:48, color:'var(--dim)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:14, color:'var(--white)', marginBottom:8 }}>{jobs.length === 0 ? 'No jobs yet' : 'No jobs match filter'}</div>
          {jobs.length === 0 && <button onClick={onAdd} style={{ background:'var(--gold)', border:'none', color:'#000', fontFamily:'var(--font-d)', fontSize:16, fontWeight:800, textTransform:'uppercase', padding:'10px 24px', borderRadius:8, cursor:'pointer' }}>Add Your First Job</button>}
        </div>
      ) : (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
                  {['Client','Bucket','Status','Roof Sq','Contract','Auto-Payout','Payout %','Address',''].map(h=>(
                    <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:10, letterSpacing:1, textTransform:'uppercase', color:'var(--dim)', fontWeight:500, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(job=>{
                  const payout = calcPayout(job);
                  const contract = parseFloat(job.contract_amount)||0;
                  const payPct = contract>0?(payout/contract*100):0;
                  const bkt = getBucket(job);
                  const bColors = { 'The Roof Guys':'var(--green)', 'Provision Roofing':'var(--gold)', 'Gutters':'var(--blue)', 'Non-Roof':'var(--purple)' };
                  return (
                    <tr key={job.id} onClick={()=>onSelect(job)} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 14px', fontWeight:600, color:'var(--white)', whiteSpace:'nowrap' }}>{job.client_name}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:10, background:`${bColors[bkt]}20`, color:bColors[bkt], whiteSpace:'nowrap' }}>{bkt}</span>
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        {job.claim_status && <span style={{ fontSize:11, fontWeight:600, color:STATUS_COLOR[job.claim_status]||'var(--dim)' }}>{job.claim_status}</span>}
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:13, color:'var(--text)' }}>{job.roof_sq ? job.roof_sq+' sq' : '—'}</td>
                      <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600, color:'var(--white)', whiteSpace:'nowrap' }}>{contract>0?fmt(contract):'—'}</td>
                      <td style={{ padding:'11px 14px', fontSize:14, fontWeight:700, color:payout>=0?'var(--green)':'var(--red)', whiteSpace:'nowrap' }}>{contract>0?fmt(payout):'—'}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:12, fontWeight:700, color:payPct>=23?'var(--green)':payPct>=15?'var(--gold)':payPct>0?'var(--red)':'var(--dim)' }}>{payPct>0?payPct.toFixed(1)+'%':'—'}</span>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--dim)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{job.address}</td>
                      <td style={{ padding:'11px 14px', color:'var(--dim)' }}>›</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export { PITCH_PRICES, GUTTER_PRICES, SIDING_PRICE, DECK_PRICE, calcPayout, targetPrice };
