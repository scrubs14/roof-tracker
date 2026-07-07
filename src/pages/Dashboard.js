import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const COMPANIES = ['The Roof Guys', 'Provision Roofing'];
const CARRIERS = ['State Farm','Allstate','Farmers','Liberty Mutual','Nationwide','USAA','Travelers','Progressive','Tennessee Farmers','Farm Bureau','Kentucky Farm Bureau','Encompass','Erie','Auto-Owners','Other'];
const STATUSES = ['Approved','Denied','Pending','Supplement Pending','Partial Approval','Re-inspection','Paid - RCV','Paid - ACV'];
const TRADES = ['Roof','Gutters','Siding','Windows','Decking','Fencing','HVAC','Skylights','Fascia/Soffit','Other'];

function fmt(n) { return '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtS(n) { return '$'+Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0}); }
function pct(a,b) { return b > 0 ? ((a/b)*100).toFixed(1)+'%' : '—'; }

export default function Dashboard({ onAdd, onSelect }) {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [carrierFilter, setCarrierFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('roof_jobs').select('*').order('created_at', { ascending: false });
    if (data) setJobs(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const sub = supabase.channel('roof_jobs_ch')
      .on('postgres_changes', { event:'*', schema:'public', table:'roof_jobs' }, load)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [load]);

  // Filtered jobs
  const filtered = jobs.filter(j => {
    if (filter !== 'All' && j.job_type !== filter) return false;
    if (companyFilter !== 'All' && j.company !== companyFilter) return false;
    if (carrierFilter !== 'All' && j.carrier !== carrierFilter) return false;
    if (search && !`${j.client_name} ${j.address} ${j.claim_number}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a,b) => {
    if (sortBy === 'contract') return (b.contract_amount||0) - (a.contract_amount||0);
    if (sortBy === 'payout') return (b.payout_amount||0) - (a.payout_amount||0);
    if (sortBy === 'pct') return ((b.payout_amount/b.contract_amount)||0) - ((a.payout_amount/a.contract_amount)||0);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Analytics
  const insJobs = jobs.filter(j => j.job_type === 'Insurance');
  const retJobs = jobs.filter(j => j.job_type === 'Retail');
  const roofGuysJobs = jobs.filter(j => j.company === 'The Roof Guys');
  const now = new Date();
  const thisMonth = now.toLocaleString('en-US', { month:'long' });
  const thisYear = String(now.getFullYear());
  const thisMonthJobs = jobs.filter(j => j.job_month === thisMonth && j.job_year === thisYear);
  const totalContract = filtered.reduce((s,j) => s+(parseFloat(j.contract_amount)||0), 0);
  const totalPayout = filtered.reduce((s,j) => s+(parseFloat(j.payout_amount)||0), 0);
  const avgPct = filtered.filter(j=>j.contract_amount>0).length > 0
    ? filtered.filter(j=>j.contract_amount>0).reduce((s,j) => s+((j.payout_amount/j.contract_amount)*100),0) / filtered.filter(j=>j.contract_amount>0).length
    : 0;

  // Carrier analytics
  const carrierStats = {};
  insJobs.forEach(j => {
    if (!j.carrier) return;
    if (!carrierStats[j.carrier]) carrierStats[j.carrier] = { count:0, contract:0, payout:0, approved:0 };
    carrierStats[j.carrier].count++;
    carrierStats[j.carrier].contract += parseFloat(j.contract_amount)||0;
    carrierStats[j.carrier].payout += parseFloat(j.payout_amount)||0;
    if (j.claim_status === 'Approved' || j.claim_status?.includes('Paid')) carrierStats[j.carrier].approved++;
  });
  const carrierList = Object.entries(carrierStats).sort((a,b) => b[1].payout - a[1].payout);

  const STATUS_COLOR = {
    'Approved':'var(--green)','Paid - RCV':'var(--green)','Paid - ACV':'var(--blue)',
    'Denied':'var(--red)','Pending':'var(--gold)','Supplement Pending':'var(--purple)',
    'Partial Approval':'var(--gold)','Re-inspection':'var(--blue)'
  };

  const inp = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, color:'var(--white)', fontSize:13, padding:'8px 12px', outline:'none' };
  const sel = { ...inp, cursor:'pointer', WebkitAppearance:'none' };

  return (
    <div>
      {/* TOP STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:24 }}>
        {[
          { label:'Total Contract Value', value:fmtS(jobs.reduce((s,j)=>s+(parseFloat(j.contract_amount)||0),0)), color:'var(--white)', sub:`${jobs.length} total jobs` },
          { label:'Monthly Contract Value', value:fmtS(thisMonthJobs.reduce((s,j)=>s+(parseFloat(j.contract_amount)||0),0)), color:'var(--white)', sub:`${thisMonthJobs.length} jobs this month` },
          { label:'Total Payout to Me', value:fmtS(jobs.reduce((s,j)=>s+(parseFloat(j.payout_amount)||0),0)), color:'var(--green)', sub:'Net after splits' },
          { label:'Monthly Payout to Me', value:fmtS(thisMonthJobs.reduce((s,j)=>s+(parseFloat(j.payout_amount)||0),0)), color:'var(--green)', sub:'This month' },
          { label:'Avg Payout % (Roof Guys)', value:pct(roofGuysJobs.reduce((s,j)=>s+(parseFloat(j.payout_amount)||0),0), roofGuysJobs.reduce((s,j)=>s+(parseFloat(j.contract_amount)||0),0)), color:'var(--gold)', sub:`${roofGuysJobs.length} Roof Guys jobs` },
          { label:'Insurance Jobs', value:insJobs.length, color:'var(--blue)', sub:`${fmtS(insJobs.reduce((s,j)=>s+(parseFloat(j.contract_amount)||0),0))} contract` },
          { label:'Retail Jobs', value:retJobs.length, color:'var(--purple)', sub:`${fmtS(retJobs.reduce((s,j)=>s+(parseFloat(j.contract_amount)||0),0))} contract` },
          { label:'Approved Claims', value:insJobs.filter(j=>j.claim_status==='Approved'||j.claim_status?.includes('Paid')).length, color:'var(--green)', sub:`of ${insJobs.length} insurance jobs` },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 18px' }}>
            <div style={{ fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--dim)', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:30, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* COMPANY BREAKDOWN */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
        {COMPANIES.map(company => {
          const compJobs = jobs.filter(j => j.company === company);
          const compContract = compJobs.reduce((s,j) => s+(parseFloat(j.contract_amount)||0), 0);
          const compPayout = compJobs.reduce((s,j) => s+(parseFloat(j.payout_amount)||0), 0);
          const compPct = compContract > 0 ? (compPayout/compContract*100).toFixed(1) : 0;
          const isRG = company === 'The Roof Guys';
          return (
            <div key={company} style={{ background:'var(--card)', border:`1px solid ${isRG ? 'rgba(76,175,128,0.3)' : 'rgba(200,146,42,0.3)'}`, borderRadius:10, padding:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background: isRG ? 'var(--green)' : 'var(--gold)' }} />
                <div style={{ fontFamily:'var(--font-d)', fontSize:18, fontWeight:800, textTransform:'uppercase', color:'var(--white)' }}>{company}</div>
                <div style={{ marginLeft:'auto', fontSize:12, color:'var(--dim)' }}>{compJobs.length} jobs</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                <div><div style={{ fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--dim)', marginBottom:4 }}>Contract</div><div style={{ fontFamily:'var(--font-d)', fontSize:20, fontWeight:800, color:'var(--white)' }}>{fmtS(compContract)}</div></div>
                <div><div style={{ fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--dim)', marginBottom:4 }}>My Payout</div><div style={{ fontFamily:'var(--font-d)', fontSize:20, fontWeight:800, color:'var(--green)' }}>{fmtS(compPayout)}</div></div>
                <div><div style={{ fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--dim)', marginBottom:4 }}>Payout %</div><div style={{ fontFamily:'var(--font-d)', fontSize:20, fontWeight:800, color: compPct >= 35 ? 'var(--green)' : compPct >= 20 ? 'var(--gold)' : 'var(--dim)' }}>{compPct}%</div></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CARRIER ANALYTICS */}
      {carrierList.length > 0 && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--dim)', marginBottom:16, fontWeight:600 }}>Carrier Performance — Best to Worst Payout</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Carrier','Jobs','Approval Rate','Total Contract','Total Payout','Avg Payout %'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:10, letterSpacing:1, textTransform:'uppercase', color:'var(--dim)', fontWeight:500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carrierList.map(([carrier, s]) => {
                  const payoutPct = s.contract > 0 ? (s.payout/s.contract)*100 : 0;
                  const approvalRate = s.count > 0 ? (s.approved/s.count)*100 : 0;
                  return (
                    <tr key={carrier} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'var(--white)' }}>{carrier}</td>
                      <td style={{ padding:'10px 12px', fontSize:13, color:'var(--text)' }}>{s.count}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ fontSize:12, fontWeight:700, color: approvalRate >= 75 ? 'var(--green)' : approvalRate >= 50 ? 'var(--gold)' : 'var(--red)' }}>{approvalRate.toFixed(0)}%</span>
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:13, color:'var(--text)' }}>{fmtS(s.contract)}</td>
                      <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'var(--green)' }}>{fmtS(s.payout)}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'var(--muted)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${Math.min(payoutPct,100)}%`, background: payoutPct >= 30 ? 'var(--green)' : payoutPct >= 20 ? 'var(--gold)' : 'var(--red)', borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color: payoutPct >= 30 ? 'var(--green)' : payoutPct >= 20 ? 'var(--gold)' : 'var(--red)', width:40 }}>{payoutPct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FILTERS + TABLE */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <input style={{ ...inp, flex:1, minWidth:180 }} placeholder="Search client, address, claim #..." value={search} onChange={e=>setSearch(e.target.value)} />
        {['All','Insurance','Retail'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{ background: filter===f ? 'var(--gold)' : 'none', border:`1px solid ${filter===f ? 'var(--gold)' : 'var(--border)'}`, color: filter===f ? '#000' : 'var(--dim)', fontWeight: filter===f ? 700 : 400, fontSize:12, padding:'7px 16px', borderRadius:6, cursor:'pointer' }}>{f}</button>
        ))}
        <div style={{ width:1, height:24, background:'var(--border)' }} />
        {['All','The Roof Guys','Provision Roofing'].map(c => (
          <button key={c} onClick={()=>setCompanyFilter(c)} style={{ background: companyFilter===c ? 'var(--green)' : 'none', border:`1px solid ${companyFilter===c ? 'var(--green)' : 'var(--border)'}`, color: companyFilter===c ? '#000' : 'var(--dim)', fontWeight: companyFilter===c ? 700 : 400, fontSize:12, padding:'7px 16px', borderRadius:6, cursor:'pointer' }}>{c === 'All' ? 'All Companies' : c}</button>
        ))}
        <select style={{ ...sel, width:'auto' }} value={carrierFilter} onChange={e=>setCarrierFilter(e.target.value)}>
          <option value="All">All Carriers</option>
          {CARRIERS.map(c => <option key={c}>{c}</option>)}
        </select>
        <select style={{ ...sel, width:'auto' }} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="date">Sort: Newest</option>
          <option value="contract">Sort: Contract ↓</option>
          <option value="payout">Sort: Payout ↓</option>
          <option value="pct">Sort: Payout % ↓</option>
        </select>
        <button onClick={onAdd} style={{ background:'var(--gold)', border:'none', color:'#000', fontFamily:'var(--font-d)', fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:1, padding:'8px 20px', borderRadius:8, cursor:'pointer', whiteSpace:'nowrap' }}>+ Add Job</button>
      </div>

      {/* Filtered totals */}
      {(filter !== 'All' || carrierFilter !== 'All' || search) && (
        <div style={{ display:'flex', gap:16, marginBottom:12, padding:'10px 14px', background:'var(--card2)', borderRadius:8, fontSize:13 }}>
          <span style={{ color:'var(--dim)' }}>Filtered:</span>
          <span style={{ color:'var(--white)', fontWeight:600 }}>{filtered.length} jobs</span>
          <span>·</span>
          <span style={{ color:'var(--gold)', fontWeight:600 }}>{fmtS(totalContract)} contract</span>
          <span>·</span>
          <span style={{ color:'var(--green)', fontWeight:600 }}>{fmtS(totalPayout)} payout</span>
          <span>·</span>
          <span style={{ color:'var(--white)', fontWeight:600 }}>{avgPct.toFixed(1)}% avg</span>
        </div>
      )}

      {/* JOBS TABLE */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--dim)' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:16, color:'var(--white)', marginBottom:8 }}>No jobs yet</div>
            <button onClick={onAdd} style={{ background:'var(--gold)', border:'none', color:'#000', fontFamily:'var(--font-d)', fontSize:16, fontWeight:800, textTransform:'uppercase', padding:'10px 24px', borderRadius:8, cursor:'pointer', marginTop:8 }}>Add Your First Job</button>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
                  {['Client','Address','Company','Type','Carrier / Status','Claim #','Trades','Contract','Payout','Payout %',''].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:10, letterSpacing:1, textTransform:'uppercase', color:'var(--dim)', fontWeight:500, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(job => {
                  const payPct = job.contract_amount > 0 ? (job.payout_amount/job.contract_amount)*100 : 0;
                  const pctColor = payPct >= 35 ? 'var(--green)' : payPct >= 20 ? 'var(--gold)' : payPct > 0 ? 'var(--red)' : 'var(--dim)';
                  return (
                    <tr key={job.id} onClick={() => onSelect(job)} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background 0.1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'12px 14px', fontWeight:600, color:'var(--white)', whiteSpace:'nowrap' }}>{job.client_name}</td>
                      <td style={{ padding:'12px 14px', fontSize:12, color:'var(--dim)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{job.address}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:10, background: job.company==='The Roof Guys' ? 'rgba(76,175,128,0.15)' : 'rgba(200,146,42,0.15)', color: job.company==='The Roof Guys' ? 'var(--green)' : 'var(--gold)', whiteSpace:'nowrap' }}>{job.company || '—'}</span>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:10, background: job.job_type==='Insurance' ? 'rgba(74,142,194,0.15)' : 'rgba(155,127,168,0.15)', color: job.job_type==='Insurance' ? 'var(--blue)' : 'var(--purple)' }}>{job.job_type}</span>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ fontSize:12, color:'var(--text)' }}>{job.carrier || '—'}</div>
                        {job.claim_status && <span style={{ fontSize:10, fontWeight:700, color:STATUS_COLOR[job.claim_status]||'var(--dim)' }}>{job.claim_status}</span>}
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:12, color:'var(--dim)', fontFamily:'monospace' }}>{job.claim_number || '—'}</td>
                      <td style={{ padding:'12px 14px', fontSize:11, color:'var(--text)', maxWidth:140 }}>{job.trades ? job.trades.split(',').map(t => t.trim()).join(' · ') : '—'}</td>
                      <td style={{ padding:'12px 14px', fontSize:14, fontWeight:600, color:'var(--white)', whiteSpace:'nowrap' }}>{job.contract_amount ? fmt(job.contract_amount) : '—'}</td>
                      <td style={{ padding:'12px 14px', fontSize:14, fontWeight:700, color:'var(--green)', whiteSpace:'nowrap' }}>{job.payout_amount ? fmt(job.payout_amount) : '—'}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:40, height:5, background:'var(--muted)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${Math.min(payPct,100)}%`, background:pctColor, borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:pctColor }}>{payPct > 0 ? payPct.toFixed(1)+'%' : '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ fontSize:16, color:'var(--muted)' }}>›</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export { CARRIERS, STATUSES, TRADES, COMPANIES };
