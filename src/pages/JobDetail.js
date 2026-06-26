import React from 'react';

function fmt(n) { return n ? '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'; }

const STATUS_COLOR = {
  'Approved':'var(--green)','Paid - RCV':'var(--green)','Paid - ACV':'var(--blue)',
  'Denied':'var(--red)','Pending':'var(--gold)','Supplement Pending':'var(--purple)',
  'Partial Approval':'var(--gold)','Re-inspection':'var(--blue)'
};

export default function JobDetail({ job, onEdit, onClose }) {
  const payPct = job.contract_amount > 0 ? ((parseFloat(job.payout_amount)||0) / parseFloat(job.contract_amount) * 100) : 0;
  const pctColor = payPct >= 35 ? 'var(--green)' : payPct >= 20 ? 'var(--gold)' : 'var(--red)';

  const Row = ({ label, value, color }) => value ? (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:12, color:'var(--dim)' }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:500, color:color||'var(--white)', textAlign:'right', maxWidth:'60%' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:20, overflowY:'auto' }}>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:560, padding:28, margin:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:24, fontWeight:800, textTransform:'uppercase', color:'var(--white)' }}>{job.client_name}</div>
            <div style={{ fontSize:13, color:'var(--dim)', marginTop:4 }}>{job.address}{job.city ? `, ${job.city}` : ''}{job.state ? ` ${job.state}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--dim)', fontSize:22, cursor:'pointer' }}>✕</button>
        </div>

        {/* Type + Status badges */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20, background: job.job_type==='Insurance' ? 'rgba(74,142,194,0.15)' : 'rgba(155,127,168,0.15)', color: job.job_type==='Insurance' ? 'var(--blue)' : 'var(--purple)' }}>{job.job_type}</span>
          {job.claim_status && <span style={{ fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20, background:`${STATUS_COLOR[job.claim_status]}20`, color:STATUS_COLOR[job.claim_status]||'var(--dim)' }}>{job.claim_status}</span>}
          {job.trades && job.trades.split(',').map(t => <span key={t} style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:'var(--muted)', color:'var(--dim)' }}>{t.trim()}</span>)}
        </div>

        {/* Payout hero */}
        <div style={{ background:'linear-gradient(135deg,rgba(76,175,128,0.1),rgba(76,175,128,0.04))', border:'1px solid rgba(76,175,128,0.2)', borderRadius:10, padding:'16px 20px', marginBottom:20, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, textAlign:'center' }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--dim)', marginBottom:4 }}>Contract</div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:22, fontWeight:800, color:'var(--white)' }}>{fmt(job.contract_amount)}</div>
          </div>
          <div>
            <div style={{ fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--dim)', marginBottom:4 }}>My Payout</div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:22, fontWeight:800, color:'var(--green)' }}>{fmt(job.payout_amount)}</div>
          </div>
          <div>
            <div style={{ fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--dim)', marginBottom:4 }}>Payout %</div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:22, fontWeight:800, color:pctColor }}>{payPct > 0 ? payPct.toFixed(1)+'%' : '—'}</div>
          </div>
        </div>

        {/* Details */}
        <div style={{ marginBottom:16 }}>
          <Row label="Carrier" value={job.carrier} />
          <Row label="Claim Number" value={job.claim_number} />
          <Row label="Adjuster" value={job.adjuster_name} />
          <Row label="Date of Loss" value={job.date_of_loss} />
          <Row label="Inspection Date" value={job.inspection_date} />
          <Row label="RCV Amount" value={fmt(job.rcv_amount)} color="var(--gold)" />
          <Row label="ACV Amount" value={fmt(job.acv_amount)} color="var(--blue)" />
          <Row label="Depreciation Held" value={fmt(job.depreciation_held)} color="var(--red)" />
          <Row label="Supplement Amount" value={fmt(job.supplement_amount)} color="var(--purple)" />
          <Row label="Job Period" value={job.job_month && job.job_year ? `${job.job_month} ${job.job_year}` : null} />
        </div>

        {job.notes && (
          <div style={{ background:'var(--surface)', borderRadius:8, padding:'12px 14px', marginBottom:16 }}>
            <div style={{ fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--dim)', marginBottom:6 }}>Notes</div>
            <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.6 }}>{job.notes}</div>
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => onEdit(job)} style={{ flex:1, background:'var(--gold)', border:'none', borderRadius:8, color:'#000', fontFamily:'var(--font-d)', fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:1, padding:11, cursor:'pointer' }}>Edit Job</button>
          <button onClick={onClose} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, color:'var(--dim)', fontSize:13, padding:'11px 18px', cursor:'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
