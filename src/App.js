import React, { useState } from 'react';
import './index.css';
import Dashboard from './pages/Dashboard';
import JobForm from './pages/JobForm';
import JobDetail from './pages/JobDetail';

export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('roof_tracker_auth'));
  const [pass, setPass] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [detailJob, setDetailJob] = useState(null);
  const [refresh, setRefresh] = useState(0);

  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:40, width:'100%', maxWidth:360 }}>
        <div style={{ fontFamily:'var(--font-d)', fontSize:28, fontWeight:800, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
          Roof <span style={{ color:'var(--gold)' }}>Jobs</span> Tracker
        </div>
        <div style={{ fontSize:11, letterSpacing:2, color:'var(--dim)', marginBottom:28 }}>THE ROOF GUYS · PRIVATE</div>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(pass==='RoofGuys2026'?(sessionStorage.setItem('roof_tracker_auth','true'),setAuthed(true)):alert('Wrong password'))}
          placeholder="Password" style={{ width:'100%', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, color:'var(--white)', fontSize:15, padding:'11px 14px', outline:'none', marginBottom:14 }} />
        <button onClick={()=>pass==='RoofGuys2026'?(sessionStorage.setItem('roof_tracker_auth','true'),setAuthed(true)):alert('Wrong password')}
          style={{ width:'100%', background:'var(--gold)', border:'none', borderRadius:8, color:'#000', fontFamily:'var(--font-d)', fontSize:18, fontWeight:800, textTransform:'uppercase', letterSpacing:1, padding:12, cursor:'pointer' }}>
          Enter
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--black)' }}>
      <header style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 24px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ fontFamily:'var(--font-d)', fontSize:22, fontWeight:800, textTransform:'uppercase', letterSpacing:1 }}>
          Roof <span style={{ color:'var(--gold)' }}>Jobs</span> Tracker
          <span style={{ fontSize:12, color:'var(--dim)', fontFamily:'var(--font-b)', fontWeight:400, marginLeft:12, letterSpacing:0 }}>The Roof Guys · OmniBuild Group</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{setEditJob(null);setShowForm(true);}} style={{ background:'var(--gold)', border:'none', color:'#000', fontFamily:'var(--font-d)', fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:1, padding:'7px 20px', borderRadius:8, cursor:'pointer' }}>+ Add Job</button>
          <button onClick={()=>{sessionStorage.removeItem('roof_tracker_auth');setAuthed(false);}} style={{ background:'none', border:'1px solid var(--border)', color:'var(--dim)', fontSize:11, padding:'7px 12px', borderRadius:6, cursor:'pointer' }}>Lock</button>
        </div>
      </header>

      <main style={{ maxWidth:1400, margin:'0 auto', padding:20 }}>
        <Dashboard key={refresh} onAdd={()=>{setEditJob(null);setShowForm(true);}} onSelect={j=>{setDetailJob(j);}} />
      </main>

      {showForm && (
        <JobForm
          job={editJob}
          onSave={()=>{setShowForm(false);setEditJob(null);setDetailJob(null);setRefresh(r=>r+1);}}
          onClose={()=>{setShowForm(false);setEditJob(null);}}
          onDelete={()=>{setShowForm(false);setEditJob(null);setDetailJob(null);setRefresh(r=>r+1);}}
        />
      )}

      {detailJob && !showForm && (
        <JobDetail
          job={detailJob}
          onEdit={j=>{setEditJob(j);setDetailJob(null);setShowForm(true);}}
          onClose={()=>setDetailJob(null)}
        />
      )}
    </div>
  );
}
