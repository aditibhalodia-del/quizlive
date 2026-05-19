import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ref, set, get, onValue } from "firebase/database";
import { db } from "./firebase";
import QRCode from "react-qr-code";

// ─── Config ───────────────────────────────────────────────────────────────────
const PRESENTER_PASS = "IMS@2026"; // change this to your own password

const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeHPLgy_QwLrnqcP7ahSi8bPZ06Z1Piag13Lc-u6bcAZ0tEkw/formResponse";
const E = {
  name:    "entry.729566544",
  centre:  "entry.237132336",
  batch:   "entry.1531118808",
  code:    "entry.1458800516",
  qNo:     "entry.728251279",
  answer:  "entry.657171429",
  correct: "entry.1969663177",
  points:  "entry.1393609004",
};

const CENTRES = [
  "IMS Ahmedabad","IMS Vadodara","IMS Surat","IMS Rajkot",
  "IMS Gandhinagar","IMS Anand","IMS Mehsana","Other",
];

const OPTS = ['A','B','C','D'];
const OC   = ['#6366f1','#f59e0b','#10b981','#ef4444'];
const MAX_PTS = 1000, MIN_PTS = 500;

// ─── Firebase helpers ─────────────────────────────────────────────────────────
const fg  = async k => { try { const s = await get(ref(db,k)); return s.exists() ? s.val() : null; } catch { return null; } };
const fs  = async (k,v) => { try { await set(ref(db,k), v); } catch(e) { console.error(e); } };

// ─── DB keys ─────────────────────────────────────────────────────────────────
const KS = c => `ql_sess_${c}`;
const KT = c => `ql_state_${c}`;
const KP = c => `ql_ppl_${c}`;
const KA = (c,q) => `ql_ans_${c}_${q}`;

// ─── Utils ────────────────────────────────────────────────────────────────────
const gc      = () => Math.random().toString(36).substring(2,8).toUpperCase();
const nq      = () => ({ text:'', opts:['','','',''], correct:0 });
const calcPts = (taken, tl) => Math.round(MIN_PTS + (MAX_PTS-MIN_PTS) * Math.max(0, 1-taken/tl));

async function postToSheet({ name, centre, batch, code, qNo, answer, correct, points }) {
  const body = new URLSearchParams({
    [E.name]:name, [E.centre]:centre, [E.batch]:batch,
    [E.code]:code, [E.qNo]:String(qNo), [E.answer]:answer,
    [E.correct]:correct, [E.points]:String(points),
  });
  try { await fetch(FORM_URL, { method:"POST", mode:"no-cors", body }); }
  catch(e) { console.warn("Sheet post failed", e); }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{--bg:#0d1117;--bg2:#161b22;--bg3:#21262d;--bdr:#30363d;--txt:#e6edf3;--mut:#8b949e;--dim:#484f58;--amber:#f59e0b;--green:#10b981;--red:#ef4444;}
body{background:var(--bg);color:var(--txt);font-family:'DM Sans',sans-serif;min-height:100vh;}
h1,h2,h3,h4{font-family:'Outfit',sans-serif;}
.card{background:var(--bg2);border:1px solid var(--bdr);border-radius:16px;padding:20px;}
.inp{width:100%;background:var(--bg);border:1.5px solid var(--bdr);border-radius:10px;color:var(--txt);padding:12px 16px;font-size:15px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .15s;}
.inp:focus{border-color:var(--amber);}
.sel{width:100%;background:var(--bg);border:1.5px solid var(--bdr);border-radius:10px;color:var(--txt);padding:12px 16px;font-size:15px;font-family:'DM Sans',sans-serif;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;}
.sel:focus{border-color:var(--amber);}
.btn{font-family:'Outfit',sans-serif;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
.btn:disabled{opacity:.38;cursor:not-allowed;pointer-events:none;}
.bg{background:var(--amber);color:#0a0a0a;}.bg:hover{background:#fbbf24;}
.bd{background:var(--bg3);color:var(--txt);border:1px solid var(--bdr);}.bd:hover{background:var(--bdr);}
.opt{width:100%;padding:14px 18px;border-radius:14px;border:2px solid var(--bdr);background:var(--bg2);color:var(--txt);font-size:15px;font-family:'DM Sans',sans-serif;font-weight:600;cursor:pointer;text-align:left;transition:all .15s;display:flex;align-items:center;gap:14px;}
.opt:hover:not([disabled]){border-color:var(--amber);background:#f59e0b0d;}
.badge{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:15px;flex-shrink:0;}
.code{font-family:'Outfit',sans-serif;font-size:52px;font-weight:900;letter-spacing:10px;color:var(--amber);}
.lbl{font-size:11px;color:var(--mut);font-weight:700;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:8px;font-family:'Outfit',sans-serif;}
.pulse{animation:pulse 2s ease-in-out infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.fi{animation:fi .32s ease;}
@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.center{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
.row{display:flex;gap:10px;flex-wrap:wrap;}
.overlay{position:fixed;inset:0;background:#00000088;display:flex;align-items:center;justify-content:center;z-index:100;padding:24px;}
.sel-wrap{position:relative;}
.sel-wrap::after{content:'▾';position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--mut);pointer-events:none;}
.timer-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;}
.timer-num{position:absolute;font-family:'Outfit',sans-serif;font-weight:900;}
.gdot{width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block;margin-right:6px;animation:pulse 2s infinite;}
`;

// ─── Timer ────────────────────────────────────────────────────────────────────
function Timer({ startTime, timeLimit, onExpire, size=80 }) {
  const [rem, setRem] = useState(timeLimit);
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
    const id = setInterval(() => {
      const r = Math.max(0, timeLimit - (Date.now()-startTime)/1000);
      setRem(r);
      if (r <= 0 && !fired.current) { fired.current = true; onExpire?.(); }
    }, 100);
    return () => clearInterval(id);
  }, [startTime, timeLimit]);
  const pct = rem/timeLimit, R = (size-8)/2, C = 2*Math.PI*R;
  const col = pct>0.5?'var(--green)':pct>0.25?'var(--amber)':'var(--red)';
  return (
    <div className="timer-wrap" style={{width:size,height:size}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="var(--bg3)" strokeWidth={6}/>
        <circle cx={size/2} cy={size/2} r={R} fill="none" stroke={col} strokeWidth={6}
          strokeDasharray={C} strokeDashoffset={C*(1-pct)} strokeLinecap="round"
          style={{transition:'stroke-dashoffset .1s linear,stroke .3s'}}/>
      </svg>
      <span className="timer-num" style={{color:col,fontSize:size*0.28}}>{Math.ceil(rem)}</span>
    </div>
  );
}

// ─── QR Code ─────────────────────────────────────────────────────────────────
function QRImg({ url, size=180 }) {
  if (!url) return <div style={{width:size,height:size,background:'#f0f0e8',borderRadius:12}}/>;
  return (
    <div style={{background:'#f0f0e8',padding:8,borderRadius:12,display:'inline-block'}}>
      <QRCode value={url} size={size} fgColor="#0d1117" bgColor="#f0f0e8"/>
    </div>
  );
}

// ─── Password modal ───────────────────────────────────────────────────────────
function PassModal({ onSuccess, onClose }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const check = () => pw === PRESENTER_PASS ? onSuccess() : (setErr(true), setPw(''));
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card fi" style={{width:'100%',maxWidth:360}} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontWeight:900,fontSize:20,marginBottom:6}}>Presenter Access</h3>
        <p style={{color:'var(--mut)',fontSize:14,marginBottom:20}}>Enter the presenter password</p>
        <label className="lbl">Password</label>
        <input className="inp" type="password" value={pw}
          onChange={e=>{setPw(e.target.value);setErr(false);}}
          placeholder="••••••••" style={{marginBottom:err?8:16}}
          onKeyDown={e=>e.key==='Enter'&&check()} autoFocus/>
        {err && <p style={{color:'var(--red)',fontSize:13,marginBottom:14}}>Incorrect password.</p>}
        <div className="row">
          <button className="btn bd" onClick={onClose} style={{flex:1,padding:'12px'}}>Cancel</button>
          <button className="btn bg" onClick={check} disabled={!pw} style={{flex:2,padding:'12px',fontSize:15}}>Enter →</button>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]           = useState(null);
  const [showPass, setShowPass]   = useState(false);
  const [initialCode, setInitialCode] = useState('');

  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  // Read URL params — QR scan lands here with ?code=XXX&mode=student
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get('code');
    const m = p.get('mode');
    if (c) setInitialCode(c.toUpperCase());
    if (m === 'student') setMode('s');
  }, []);

  if (mode === 'p') return <Presenter onBack={() => setMode(null)}/>;
  if (mode === 's') return <Student   onBack={() => setMode(null)} initialCode={initialCode}/>;

  return (
    <>
      <div className="center fi" style={{gap:40,textAlign:'center'}}>
        <div>
          <p style={{fontFamily:'Outfit',fontWeight:700,fontSize:11,letterSpacing:3,color:'var(--amber)',textTransform:'uppercase',marginBottom:12}}>IMS Gujarat · Live Quiz</p>
          <h1 style={{fontSize:48,fontWeight:900,marginBottom:8,lineHeight:1.1}}>QuizLive</h1>
          <p style={{color:'var(--mut)',fontSize:16}}>Real-time MCQ · answers stream live to Google Sheets</p>
        </div>
        <div className="row" style={{justifyContent:'center'}}>
          <button className="btn bg" onClick={() => setShowPass(true)} style={{fontSize:17,padding:'18px 36px',borderRadius:14}}>🎯 I'm the Presenter</button>
          <button className="btn bd" onClick={() => setMode('s')}      style={{fontSize:17,padding:'18px 36px',borderRadius:14}}>📱 I'm a Student</button>
        </div>
        <p style={{color:'var(--dim)',fontSize:12}}>Share this URL with students · they tap "I'm a Student"</p>
      </div>
      {showPass && <PassModal onSuccess={() => { setShowPass(false); setMode('p'); }} onClose={() => setShowPass(false)}/>}
    </>
  );
}

// ─── PRESENTER ────────────────────────────────────────────────────────────────
function Presenter({ onBack }) {
  const [pg, setPg]           = useState('create');
  const [title, setTitle]     = useState('');
  const [qs, setQs]           = useState([nq()]);
  const [tl, setTl]           = useState(30);
  const [code, setCode]       = useState('');
  const [students, setStudents] = useState({});
  const [st, setSt]           = useState(null);
  const [ans, setAns]         = useState({});
  const [revealed, setRevealed] = useState(false);
  const revFired = useRef(false);

  const updQ = (i,f,v) => setQs(p => { const n=[...p]; n[i]={...n[i],[f]:v}; return n; });
  const updO = (qi,oi,v) => setQs(p => { const n=[...p]; const o=[...n[qi].opts]; o[oi]=v; n[qi]={...n[qi],opts:o}; return n; });
  const valid = title.trim() && qs.length>0 && qs.every(q=>q.text.trim()&&q.opts.every(o=>o.trim()));

  // ── Real-time: watch students joining (lobby) ──
  useEffect(() => {
    if (!code || pg !== 'lobby') return;
    const unsub = onValue(ref(db, KP(code)), snap => {
      if (snap.exists()) setStudents(snap.val());
    });
    return () => unsub();
  }, [code, pg]);

  // ── Real-time: watch answers (live) ──
  useEffect(() => {
    if (!code || pg !== 'live' || !st) return;
    const qi = st.activeQ;
    const unsub = onValue(ref(db, KA(code,qi)), snap => {
      if (snap.exists()) setAns(prev => ({ ...prev, [qi]: snap.val() }));
    });
    return () => unsub();
  }, [code, pg, st?.activeQ]);

  async function goLive() {
    const c = gc(); setCode(c);
    await fs(KS(c), { title, questions:qs, timeLimit:tl });
    await fs(KT(c), { phase:'lobby', activeQ:-1, startTime:null, timeLimit:tl });
    await fs(KP(c), {});
    setPg('lobby');
  }

  async function startQuiz() {
    const s = { phase:'question', activeQ:0, startTime:Date.now(), timeLimit:tl };
    await fs(KT(code), s);
    setSt(s); setRevealed(false); revFired.current=false; setPg('live');
  }

  async function doReveal() {
    if (revFired.current) return; revFired.current = true;
    const s = { phase:'revealed', activeQ:st.activeQ, startTime:st.startTime, timeLimit:tl };
    await fs(KT(code), s); setSt(s); setRevealed(true);
    // Snapshot final answers
    const a = await fg(KA(code, st.activeQ));
    if (a) setAns(prev => ({ ...prev, [st.activeQ]: a }));
  }

  async function next() {
    const ni = st.activeQ + 1;
    if (ni >= qs.length) {
      await fs(KT(code), { phase:'done', activeQ:-1, startTime:null, timeLimit:tl });
      setPg('done');
    } else {
      const s = { phase:'question', activeQ:ni, startTime:Date.now(), timeLimit:tl };
      await fs(KT(code), s); setSt(s); setRevealed(false); revFired.current=false;
    }
  }

  async function endQuiz() {
    await fs(KT(code), { phase:'done', activeQ:-1, startTime:null, timeLimit:tl });
    setPg('done');
  }

  const calcScore = name => qs.reduce((acc,q,i) => {
    const r = (ans[i]||{})[name];
    if (!r || r.ans!==q.correct) return acc;
    return acc + calcPts((r.ts-(ans[i]._st||r.ts))/1000, tl);
  }, 0);

  const scores = () => Object.keys(students)
    .map(n => ({ name:n, ...students[n], score:calcScore(n) }))
    .sort((a,b) => b.score-a.score);

  const buildRows = () => Object.keys(students).map(name => {
    const info = students[name]||{}; let sc=0;
    const ac = qs.map((_,i) => { const r=(ans[i]||{})[name]; return r!==undefined?OPTS[r.ans]:'-'; });
    const tc = qs.map((_,i) => { const r=(ans[i]||{})[name]; if(!r)return'-'; return ((r.ts-(ans[i]._st||r.ts))/1000).toFixed(1)+'s'; });
    const cc = qs.map((q,i) => { const r=(ans[i]||{})[name]; if(!r)return'-'; const ok=r.ans===q.correct; if(ok)sc+=calcPts((r.ts-(ans[i]._st||r.ts))/1000,tl); return ok?'Yes':'No'; });
    return [name, info.centre||'-', info.batch||'-', ...ac, ...tc, ...cc, sc];
  });

  function exportCSV() {
    const hdr = ['Name','Centre','Batch',...qs.map((_,i)=>`Q${i+1} Answer`),...qs.map((_,i)=>`Q${i+1} Time`),...qs.map((_,i)=>`Q${i+1} Correct`),'Total Score'];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[hdr,...buildRows()].map(r=>r.join(',')).join('\n')], {type:'text/csv'}));
    a.download = `quiz_${code}.csv`; a.click();
  }

  function copyTSV() {
    const hdr = ['Name','Centre','Batch',...qs.map((_,i)=>`Q${i+1} Answer`),...qs.map((_,i)=>`Q${i+1} Time`),...qs.map((_,i)=>`Q${i+1} Correct`),'Total Score'];
    navigator.clipboard.writeText([hdr,...buildRows()].map(r=>r.join('\t')).join('\n'))
      .then(()=>alert('Copied! Open Google Sheets → Ctrl+V'));
  }

  // ── CREATE ──
  if (pg==='create') return (
    <div className="fi" style={{maxWidth:680,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',alignItems:'center',gap:14,paddingTop:24,marginBottom:28}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--mut)',cursor:'pointer',fontSize:22}}>←</button>
        <h1 style={{fontSize:26,fontWeight:900}}>Build Your Quiz</h1>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--green)',fontFamily:'Outfit',fontWeight:700}}><span className="gdot"/>Live → Google Sheets</span>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <label className="lbl">Quiz Title</label>
        <input className="inp" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. RC Tone Identification – Batch 2701"/>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <label className="lbl" style={{margin:0}}>Time Per Question</label>
          <span style={{fontFamily:'Outfit',fontWeight:900,color:'var(--amber)',fontSize:22}}>{tl}s</span>
        </div>
        <input type="range" min={10} max={60} step={5} value={tl} onChange={e=>setTl(+e.target.value)}
          style={{width:'100%',accentColor:'var(--amber)',cursor:'pointer',marginBottom:8}}/>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
          <span style={{fontSize:11,color:'var(--dim)'}}>10s</span>
          <span style={{fontSize:11,color:'var(--dim)',textAlign:'center'}}>Fast = up to 1000 pts · Slow = 500 pts min · Wrong = 0</span>
          <span style={{fontSize:11,color:'var(--dim)'}}>60s</span>
        </div>
      </div>
      {qs.map((q,qi) => (
        <div key={qi} className="card fi" style={{marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontFamily:'Outfit',fontWeight:900,color:'var(--amber)',fontSize:15}}>Q{qi+1}</span>
            {qs.length>1 && <button onClick={()=>setQs(p=>p.filter((_,j)=>j!==qi))} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:13,fontFamily:'Outfit',fontWeight:700}}>Remove</button>}
          </div>
          <input className="inp" value={q.text} onChange={e=>updQ(qi,'text',e.target.value)} placeholder="Type your question here..." style={{marginBottom:14}}/>
          {q.opts.map((opt,oi) => (
            <div key={oi} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <input type="radio" name={`c${qi}`} checked={q.correct===oi} onChange={()=>updQ(qi,'correct',oi)}
                style={{accentColor:'var(--green)',cursor:'pointer',width:16,height:16,flexShrink:0}}/>
              <div className="badge" style={{background:OC[oi]+'28',color:OC[oi]}}>{OPTS[oi]}</div>
              <input className="inp" value={opt} onChange={e=>updO(qi,oi,e.target.value)} placeholder={`Option ${OPTS[oi]}`} style={{marginBottom:0}}/>
            </div>
          ))}
          <p style={{fontSize:11,color:'var(--dim)',marginTop:4}}>Radio = correct answer</p>
        </div>
      ))}
      <div className="row" style={{marginTop:8}}>
        <button className="btn bd" onClick={()=>setQs(p=>[...p,nq()])} style={{flex:1,padding:'13px',fontSize:15}}>+ Add Question</button>
        <button className="btn bg" onClick={goLive} disabled={!valid} style={{flex:2,padding:'13px',fontSize:16}}>🚀 Go Live</button>
      </div>
    </div>
  );

  // ── LOBBY ──
  if (pg==='lobby') {
    const sl = Object.keys(students);
    const joinUrl = `${window.location.origin}${window.location.pathname}?code=${code}&mode=student`;
    return (
      <div className="fi" style={{maxWidth:700,margin:'0 auto',padding:'32px 20px',minHeight:'100vh'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:32,alignItems:'start',marginBottom:32}}>
          <div>
            <p style={{color:'var(--mut)',fontSize:13,fontFamily:'Outfit',fontWeight:700,marginBottom:10,letterSpacing:1}}>STUDENTS: scan QR or open the site and enter code</p>
            <div className="code">{code}</div>
            <p style={{color:'var(--mut)',marginTop:10,fontSize:14}}>QR scan → directly opens the quiz, code pre-filled ✨</p>
            <div style={{marginTop:14,padding:'10px 16px',background:'#10b98115',border:'1px solid var(--green)',borderRadius:10,display:'flex',alignItems:'center',gap:10}}>
              <span className="gdot"/>
              <span style={{fontSize:13,color:'var(--green)',fontFamily:'Outfit',fontWeight:700}}>Answers stream live to Google Sheets on reveal</span>
            </div>
          </div>
          <div style={{textAlign:'center'}}>
            <QRImg url={joinUrl} size={170}/>
            <p style={{color:'var(--dim)',fontSize:11,marginTop:8}}>Scan → opens quiz</p>
          </div>
        </div>
        <div className="card" style={{marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontWeight:700,fontSize:16}}>Students Joined</h3>
            <span style={{background:'#f59e0b20',color:'var(--amber)',padding:'3px 14px',borderRadius:20,fontFamily:'Outfit',fontWeight:700,fontSize:14}}>{sl.length}</span>
          </div>
          {sl.length===0
            ? <p style={{color:'var(--dim)',padding:'16px 0',textAlign:'center'}} className="pulse">Waiting for students to join...</p>
            : <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                  <thead><tr style={{borderBottom:'1px solid var(--bg3)'}}>
                    {['Name','Centre','Batch'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',color:'var(--mut)',fontFamily:'Outfit',fontWeight:700,fontSize:11,letterSpacing:1}}>{h.toUpperCase()}</th>)}
                  </tr></thead>
                  <tbody>{sl.map(n => { const info=students[n]||{}; return (
                    <tr key={n} style={{borderBottom:'1px solid var(--bg3)'}}>
                      <td style={{padding:'8px 12px',fontWeight:600}}>{n}</td>
                      <td style={{padding:'8px 12px',color:'var(--mut)'}}>{info.centre||'-'}</td>
                      <td style={{padding:'8px 12px',color:'var(--mut)'}}>{info.batch||'-'}</td>
                    </tr>
                  );})}</tbody>
                </table>
              </div>
          }
        </div>
        <button className="btn bg" onClick={startQuiz} disabled={sl.length===0} style={{width:'100%',fontSize:17,padding:'16px'}}>
          ▶ Start Quiz ({sl.length} joined)
        </button>
      </div>
    );
  }

  // ── LIVE ──
  if (pg==='live' && st) {
    const q    = qs[st.activeQ];
    const qa   = ans[st.activeQ]||{};
    const totalS = Object.keys(students).length;
    const resp   = Object.keys(qa).filter(k=>k!=='_st').length;
    const chart  = OPTS.map((o,i) => ({ name:o, count:Object.values(qa).filter(a=>a&&typeof a.ans==='number'&&a.ans===i).length, color:OC[i] }));
    return (
      <div className="fi" style={{maxWidth:800,margin:'0 auto',padding:'24px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',paddingTop:24,marginBottom:20,gap:16,flexWrap:'wrap'}}>
          <div>
            <p style={{color:'var(--mut)',fontSize:12,fontFamily:'Outfit',fontWeight:700,marginBottom:4,letterSpacing:1}}>{title.toUpperCase()}</p>
            <h2 style={{fontSize:22,fontWeight:900}}>Q{st.activeQ+1} <span style={{color:'var(--dim)',fontSize:16,fontWeight:400}}>/ {qs.length}</span></h2>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            {!revealed && st.startTime && <Timer startTime={st.startTime} timeLimit={tl} onExpire={doReveal} size={72}/>}
            <span style={{background:revealed?'#10b98118':'#f59e0b18',color:revealed?'var(--green)':'var(--amber)',padding:'7px 18px',borderRadius:20,fontFamily:'Outfit',fontWeight:700,fontSize:14}}>
              {revealed ? '✓ Revealed · Sending to Sheets…' : `${resp}/${totalS} answered`}
            </span>
          </div>
        </div>
        <div className="card" style={{marginBottom:16}}>
          <p style={{fontSize:20,fontWeight:600,lineHeight:1.55,marginBottom:18}}>{q.text}</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {q.opts.map((opt,i) => (
              <div key={i} style={{padding:'12px 16px',borderRadius:12,display:'flex',alignItems:'center',gap:12,
                background:revealed&&i===q.correct?'#10b98110':'var(--bg)',
                border:`1.5px solid ${revealed&&i===q.correct?'var(--green)':'var(--bdr)'}`}}>
                <div className="badge" style={{background:OC[i]+'28',color:OC[i]}}>{OPTS[i]}</div>
                <span style={{fontSize:14}}>{opt}</span>
                {revealed&&i===q.correct&&<span style={{marginLeft:'auto',color:'var(--green)',fontSize:18}}>✓</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{marginBottom:16}}>
          <p style={{fontFamily:'Outfit',fontWeight:700,fontSize:12,color:'var(--mut)',marginBottom:14,letterSpacing:1}}>LIVE RESPONSES</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chart} margin={{top:0,bottom:0,left:-20,right:10}}>
              <XAxis dataKey="name" tick={{fill:'#8b949e',fontFamily:'Outfit',fontWeight:700,fontSize:14}}/>
              <YAxis tick={{fill:'#8b949e',fontSize:12}} allowDecimals={false}/>
              <Tooltip contentStyle={{background:'#161b22',border:'1px solid #30363d',borderRadius:8}} cursor={{fill:'#ffffff06'}}/>
              <Bar dataKey="count" radius={[6,6,0,0]}>{chart.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="row">
          {!revealed
            ? <button className="btn bg" onClick={doReveal} style={{flex:1,fontSize:16,padding:'14px'}}>Reveal Answer</button>
            : <>
                <button className="btn bd" onClick={endQuiz} style={{flex:1,padding:'14px'}}>End Quiz</button>
                <button className="btn bg" onClick={next}    style={{flex:2,fontSize:16,padding:'14px'}}>
                  {st.activeQ+1>=qs.length ? 'Finish & See Results →' : 'Next Question →'}
                </button>
              </>
          }
        </div>
      </div>
    );
  }

  // ── DONE ──
  if (pg==='done') {
    const sc     = scores();
    const medals = ['🥇','🥈','🥉'];
    return (
      <div className="fi" style={{maxWidth:620,margin:'0 auto',padding:'24px 20px'}}>
        <div style={{textAlign:'center',paddingTop:40,marginBottom:32}}>
          <div style={{fontSize:56,marginBottom:12}}>🏆</div>
          <h1 style={{fontSize:30,fontWeight:900}}>Quiz Complete!</h1>
          <p style={{color:'var(--mut)',marginTop:6,fontSize:14}}>{title} · {code}</p>
          <div style={{marginTop:12,padding:'8px 20px',background:'#10b98115',border:'1px solid var(--green)',borderRadius:10,display:'inline-flex',alignItems:'center',gap:8}}>
            <span className="gdot"/>
            <span style={{fontSize:13,color:'var(--green)',fontFamily:'Outfit',fontWeight:700}}>All answers sent to Google Sheets</span>
          </div>
        </div>
        <div className="card" style={{marginBottom:16}}>
          <h3 style={{fontWeight:700,marginBottom:16,fontSize:16}}>Leaderboard</h3>
          {sc.length===0 && <p style={{color:'var(--dim)',textAlign:'center',padding:'12px 0'}}>No responses recorded</p>}
          {sc.map((s,i) => (
            <div key={s.name} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<sc.length-1?'1px solid var(--bg3)':'none'}}>
              <span style={{fontSize:20,width:28,textAlign:'center'}}>{medals[i]||`${i+1}`}</span>
              <div style={{flex:1}}>
                <span style={{fontWeight:600}}>{s.name}</span>
                {(s.centre||s.batch) && <span style={{color:'var(--dim)',fontSize:12,marginLeft:8}}>{[s.centre,s.batch].filter(Boolean).join(' · ')}</span>}
              </div>
              <span style={{fontFamily:'Outfit',fontWeight:900,color:'var(--amber)',fontSize:17}}>{s.score.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
        <div className="row" style={{marginBottom:10}}>
          <button className="btn bd" onClick={copyTSV}   style={{flex:1,padding:'13px',fontSize:15}}>📋 Copy for Sheets</button>
          <button className="btn bg" onClick={exportCSV} style={{flex:1,padding:'13px',fontSize:15}}>⬇ Download CSV</button>
        </div>
        <p style={{textAlign:'center',color:'var(--dim)',fontSize:12}}>Sheets already has live data · CSV for a local backup</p>
      </div>
    );
  }
  return null;
}

// ─── STUDENT ──────────────────────────────────────────────────────────────────
function Student({ onBack, initialCode='' }) {
  const [joined, setJoined]   = useState(false);
  const [code, setCode]       = useState(initialCode);
  const [name, setName]       = useState('');
  const [centre, setCentre]   = useState('');
  const [batch, setBatch]     = useState('');
  const [sess, setSess]       = useState(null);
  const [qst, setQst]         = useState(null);
  const [err, setErr]         = useState('');
  const myRef    = useRef({});
  const [, tick] = useState(0);
  const cRef     = useRef('');
  const nRef     = useRef('');
  const centreRef= useRef('');
  const batchRef = useRef('');
  const ansTs    = useRef({});
  const submitted= useRef({});
  const sessRef  = useRef(null);

  // ── Real-time: listen to quiz state ──
  useEffect(() => {
    if (!joined) return;
    const unsub = onValue(ref(db, KT(cRef.current)), snap => {
      if (snap.exists()) { setQst(snap.val()); tick(n=>n+1); }
    });
    return () => unsub();
  }, [joined]);

  // ── Post to Google Sheet when question revealed ──
  useEffect(() => {
    if (!joined || !qst || qst.phase!=='revealed') return;
    const qi = qst.activeQ;
    if (submitted.current[qi]) return;
    submitted.current[qi] = true;
    const q = sessRef.current?.questions[qi];
    if (!q) return;
    const myAns  = myRef.current[qi];
    const correct= myAns!==undefined && myAns===q.correct;
    const taken  = (ansTs.current[qi]&&qst.startTime) ? (ansTs.current[qi]-qst.startTime)/1000 : (qst.timeLimit||30);
    const points = correct ? calcPts(Math.max(0,taken), qst.timeLimit||30) : 0;
    postToSheet({ name:nRef.current, centre:centreRef.current, batch:batchRef.current,
      code:cRef.current, qNo:qi+1,
      answer:myAns!==undefined?OPTS[myAns]:'-', correct:correct?'Yes':'No', points });
  }, [qst?.phase, qst?.activeQ, joined]);

  async function join() {
    setErr('');
    const c = code.trim().toUpperCase();
    const s = await fg(KS(c));
    if (!s) { setErr('Session not found. Check the code.'); return; }
    const t = await fg(KT(c));
    if (!t || t.phase==='done') { setErr('This session has already ended.'); return; }
    const nm = name.trim();
    const ppl = await fg(KP(c)) || {};
    ppl[nm] = { ts:Date.now(), centre:centre||'-', batch:batch.trim()||'-' };
    await fs(KP(c), ppl);
    setSess(s); sessRef.current=s; setQst(t);
    cRef.current=c; nRef.current=nm;
    centreRef.current=centre||'-'; batchRef.current=batch.trim()||'-';
    setJoined(true);
  }

  async function submit(i) {
    const qi = qst.activeQ;
    if (myRef.current[qi]!==undefined) return;
    const now = Date.now();
    const ex  = await fg(KA(cRef.current, qi)) || {};
    ex[nRef.current] = { ans:i, ts:now };
    ex._st = qst.startTime;
    await fs(KA(cRef.current, qi), ex);
    myRef.current = { ...myRef.current, [qi]:i };
    ansTs.current[qi] = now;
    tick(n=>n+1);
  }

  function step() {
    if (!joined)  return 'join';
    if (!qst || qst.phase==='lobby') return 'wait';
    if (qst.phase==='done')     return 'done';
    if (qst.phase==='revealed') return 'revealed';
    if (qst.phase==='question') return myRef.current[qst.activeQ]!==undefined ? 'answered' : 'question';
    return 'wait';
  }

  const pg  = step();
  const q   = sess && qst && qst.activeQ>=0 ? sess.questions[qst.activeQ] : null;
  const myA = qst && q ? myRef.current[qst.activeQ] : undefined;
  const tl  = qst?.timeLimit || sess?.timeLimit || 30;

  if (pg==='join') return (
    <div className="center fi" style={{padding:24}}>
      <button onClick={onBack} style={{alignSelf:'flex-start',background:'none',border:'none',color:'var(--mut)',cursor:'pointer',fontSize:20,marginBottom:20}}>← Back</button>
      <div style={{width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:52,marginBottom:10}}>📱</div>
          <h2 style={{fontSize:26,fontWeight:900,marginBottom:6}}>Join Quiz</h2>
          <p style={{color:'var(--mut)',fontSize:14}}>Enter your details to join</p>
        </div>
        <div className="card" style={{display:'flex',flexDirection:'column',gap:16}}>
          <div>
            <label className="lbl">Session Code</label>
            <input className="inp" value={code} onChange={e=>setCode(e.target.value.toUpperCase().slice(0,6))}
              placeholder="XXXXXX" style={{fontSize:28,fontFamily:'Outfit',fontWeight:900,letterSpacing:8,textAlign:'center'}}/>
          </div>
          <div>
            <label className="lbl">Your Name</label>
            <input className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Rahul Sharma"/>
          </div>
          <div>
            <label className="lbl">Centre</label>
            <div className="sel-wrap">
              <select className="sel" value={centre} onChange={e=>setCentre(e.target.value)}>
                <option value="">— Select your IMS Centre —</option>
                {CENTRES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="lbl">Batch Number</label>
            <input className="inp" value={batch} onChange={e=>setBatch(e.target.value)} placeholder="e.g. 2701"
              onKeyDown={e=>e.key==='Enter'&&code.trim()&&name.trim()&&centre&&join()}/>
          </div>
          {err && <p style={{color:'var(--red)',fontSize:13}}>{err}</p>}
          <button className="btn bg" onClick={join} disabled={!code.trim()||!name.trim()||!centre}
            style={{width:'100%',padding:'14px',fontSize:16}}>Join →</button>
        </div>
      </div>
    </div>
  );

  if (pg==='wait') return (
    <div className="center fi" style={{gap:20,textAlign:'center'}}>
      <div style={{fontSize:52}} className="pulse">⏳</div>
      <h2 style={{fontSize:24,fontWeight:900}}>You're in, {nRef.current}!</h2>
      <p style={{color:'var(--mut)'}}>{sess?.title}</p>
      <p style={{color:'var(--dim)',fontSize:13}}>Faster correct answers score more ⚡</p>
      <p style={{color:'var(--dim)',fontSize:14}} className="pulse">Waiting for presenter to start...</p>
    </div>
  );

  if (pg==='question' && q) return (
    <div className="fi" style={{maxWidth:480,margin:'0 auto',padding:'24px 20px',minHeight:'100vh',display:'flex',flexDirection:'column',justifyContent:'center'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <p style={{fontSize:12,color:'var(--amber)',fontFamily:'Outfit',fontWeight:700,letterSpacing:1}}>Q{qst.activeQ+1} OF {sess.questions.length}</p>
        {qst.startTime && <Timer startTime={qst.startTime} timeLimit={tl} size={64}/>}
      </div>
      <p style={{fontSize:20,fontWeight:600,lineHeight:1.55,marginBottom:24}}>{q.text}</p>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {q.opts.map((opt,i) => (
          <button key={i} className="opt" onClick={()=>submit(i)}>
            <div className="badge" style={{background:OC[i]+'28',color:OC[i]}}>{OPTS[i]}</div>{opt}
          </button>
        ))}
      </div>
      <p style={{textAlign:'center',color:'var(--dim)',fontSize:12,marginTop:16}}>Answer fast for more points ⚡</p>
    </div>
  );

  if (pg==='answered' && q) return (
    <div className="center fi" style={{gap:20,textAlign:'center'}}>
      {qst.startTime && <Timer startTime={qst.startTime} timeLimit={tl} size={80}/>}
      <h2 style={{fontSize:24,fontWeight:900}}>Locked in!</h2>
      {myA!==undefined && (
        <div className="card" style={{width:'100%',maxWidth:360}}>
          <p style={{color:'var(--mut)',marginBottom:10,fontSize:13}}>Your answer:</p>
          <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'center'}}>
            <div className="badge" style={{background:OC[myA]+'28',color:OC[myA],width:40,height:40,fontSize:17}}>{OPTS[myA]}</div>
            <span style={{fontWeight:600}}>{q.opts[myA]}</span>
          </div>
        </div>
      )}
      <p style={{color:'var(--dim)',fontSize:14}} className="pulse">Waiting for answer reveal...</p>
    </div>
  );

  if (pg==='revealed' && q) {
    const correct = myA!==undefined && myA===q.correct;
    const taken   = (ansTs.current[qst.activeQ]&&qst.startTime) ? (ansTs.current[qst.activeQ]-qst.startTime)/1000 : null;
    const pts     = correct && taken!==null ? calcPts(Math.max(0,taken), tl) : 0;
    return (
      <div className="center fi" style={{gap:20,textAlign:'center',padding:24}}>
        <div style={{fontSize:64}}>{myA===undefined?'😶':correct?'🎉':'😅'}</div>
        <h2 style={{fontSize:32,fontWeight:900,color:myA===undefined?'var(--mut)':correct?'var(--green)':'var(--red)'}}>
          {myA===undefined ? "Didn't answer" : correct ? 'Correct!' : 'Not quite!'}
        </h2>
        {correct && (
          <div style={{background:'#10b98118',border:'1px solid var(--green)',borderRadius:12,padding:'10px 28px',textAlign:'center'}}>
            <div style={{fontFamily:'Outfit',fontWeight:900,color:'var(--green)',fontSize:28}}>+{pts} pts</div>
            {taken!==null && <div style={{color:'var(--green)',fontSize:13,opacity:.8}}>Answered in {taken.toFixed(1)}s</div>}
          </div>
        )}
        <div className="card" style={{width:'100%',maxWidth:380}}>
          <p style={{color:'var(--mut)',marginBottom:10,fontSize:13}}>Correct Answer:</p>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div className="badge" style={{background:OC[q.correct]+'28',color:OC[q.correct],width:40,height:40,fontSize:17}}>{OPTS[q.correct]}</div>
            <span style={{fontWeight:600}}>{q.opts[q.correct]}</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,color:'var(--dim)',fontSize:12}}>
          <span className="gdot"/>Saved to Google Sheets
        </div>
        <p style={{color:'var(--dim)',fontSize:14}} className="pulse">Next question coming up...</p>
      </div>
    );
  }

  if (pg==='done') {
    const total   = sess?.questions.length||0;
    const correct = sess ? sess.questions.filter((_,i)=>myRef.current[i]===sess.questions[i].correct).length : 0;
    return (
      <div className="center fi" style={{gap:20,textAlign:'center',padding:24}}>
        <div style={{fontSize:64}}>🏁</div>
        <h2 style={{fontSize:32,fontWeight:900}}>Quiz Done!</h2>
        <div className="card" style={{width:'100%',maxWidth:360}}>
          <p style={{color:'var(--mut)',marginBottom:16,fontSize:13}}>Your Results</p>
          <div style={{display:'flex',justifyContent:'space-around'}}>
            <div><div style={{fontSize:40,fontFamily:'Outfit',fontWeight:900,color:'var(--green)'}}>{correct}</div><div style={{fontSize:13,color:'var(--mut)'}}>Correct</div></div>
            <div style={{width:1,background:'var(--bdr)'}}/>
            <div><div style={{fontSize:40,fontFamily:'Outfit',fontWeight:900,color:'var(--red)'}}>{total-correct}</div><div style={{fontSize:13,color:'var(--mut)'}}>Wrong</div></div>
          </div>
          <div style={{marginTop:16,display:'flex',alignItems:'center',justifyContent:'center',gap:6,color:'var(--green)',fontSize:13}}>
            <span className="gdot"/>Your answers are in Google Sheets
          </div>
        </div>
        <p style={{color:'var(--mut)'}}>Great effort, {nRef.current}! 💪</p>
      </div>
    );
  }
  return null;
}
