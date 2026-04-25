import { useState, useRef, useCallback } from "react";
import Head from "next/head";

const FIELDS = ["employee_id","employee_name","pay_period_start","pay_period_end","regular_hours","overtime_hours","double_time_hours","holiday_hours","pto_hours","sick_hours","regular_rate","notes"];
const LABELS = { employee_id:"Employee ID", employee_name:"Employee Name", pay_period_start:"Period Start", pay_period_end:"Period End", regular_hours:"Reg Hrs", overtime_hours:"OT Hrs", double_time_hours:"DT Hrs", holiday_hours:"Holiday", pto_hours:"PTO", sick_hours:"Sick", regular_rate:"Pay Rate", notes:"Notes" };

const compressImage = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1400;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const out = canvas.toDataURL("image/jpeg", 0.82);
      resolve({ preview: out, data: out.split(",")[1], type: "image/jpeg" });
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

function Spin({ text }) {
  return <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
    <span style={{display:"inline-block",width:11,height:11,border:"2px solid rgba(255,255,255,0.25)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite"}} />
    {text}
  </span>;
}

export default function Home() {
  const [tab, setTab] = useState("image");
  const [img, setImg] = useState(null);
  const [preview, setPreview] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [over, setOver] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const fileRef = useRef();

  const onFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const c = await compressImage(file);
    setPreview(c.preview); setImg(c); setRecords([]); setError(null);
  }, []);

  const callAPI = async (type, payload) => {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data.result;
  };

  const setRows = (parsed) => {
    if (!Array.isArray(parsed)) throw new Error("Bad response format");
    setRecords(parsed.map((r, i) => ({ ...r, _id: i, _flag: Object.values(r).includes("REVIEW") })));
  };

  const extractImage = async () => {
    if (!img) return;
    setLoading(true); setError(null);
    try { setRows(await callAPI("image", { imageData: img.data, mediaType: img.type })); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const extractEmail = async () => {
    if (!emailBody.trim()) return;
    setLoading(true); setError(null);
    try { setRows(await callAPI("email_text", { from: emailFrom, subject: emailSubject, date: new Date().toLocaleDateString(), body: emailBody })); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const updateCell = (id, field, val) => setRecords(p => p.map(r => r._id === id ? { ...r, [field]: val, _flag: Object.entries({...r,[field]:val}).some(([k,v]) => !k.startsWith("_") && v==="REVIEW") } : r));

  const exportCSV = () => {
    const csv = [FIELDS.join(","), ...records.map(r => FIELDS.map(f => `"${(r[f]??"").toString().replace(/"/g,'""')}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `isolved_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const flags = records.filter(r => r._flag).length;
  const hasRows = records.length > 0;

  return (<>
    <Head>
      <title>Payroll Extractor — iSolved</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet" />
    </Head>
    <style global jsx>{`
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:#0d0f1a;color:#e0e2ed;font-family:'IBM Plex Mono',monospace;min-height:100vh}
      ::-webkit-scrollbar{width:5px;height:5px}
      ::-webkit-scrollbar-track{background:#12141f}
      ::-webkit-scrollbar-thumb{background:#2a2e42;border-radius:3px}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      .dz{border:1.5px dashed #252840;border-radius:4px;cursor:pointer;transition:all .2s;text-align:center;padding:32px 20px}
      .dz:hover,.dz.ov{border-color:#4f7cff;background:rgba(79,124,255,.04)}
      .btn{border:none;border-radius:3px;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:.08em;padding:9px 18px;transition:all .15s}
      .bp{background:#4f7cff;color:#fff}.bp:hover:not(:disabled){background:#3a6aff}.bp:disabled{opacity:.35;cursor:not-allowed}
      .bg{background:transparent;color:#5a5f7a;border:1.5px solid #252840}.bg:hover{border-color:#4f7cff;color:#4f7cff}
      .be{background:#111a11;color:#4caf50;border:1.5px solid #1a3a1a}.be:hover{border-color:#4caf50}
      .tab{padding:9px 20px;font-size:11px;font-weight:600;letter-spacing:.1em;cursor:pointer;border:none;background:transparent;color:#3a3f58;border-bottom:2px solid transparent;transition:all .15s;font-family:'IBM Plex Mono',monospace}
      .tab.on{color:#4f7cff;border-bottom-color:#4f7cff}
      .tab:hover:not(.on){color:#6a6f8a}
      .tag{display:inline-block;padding:2px 8px;border-radius:2px;font-size:10px;font-weight:600;letter-spacing:.1em}
      .tw{background:rgba(255,160,0,.12);color:#ffa000}
      .tok{background:rgba(76,175,80,.12);color:#4caf50}
      .tb{background:rgba(79,124,255,.12);color:#4f7cff}
      .ci{background:transparent;border:none;color:#e0e2ed;font-family:'IBM Plex Mono',monospace;font-size:11px;width:100%;outline:none}
      .ce{background:rgba(79,124,255,.12);border-radius:2px;padding:2px 4px}
      .rv td{background:rgba(255,160,0,.025)}
      .rvv{color:#ffa000;font-weight:600}
      .fade{animation:fade .3s ease}
      .pulse{animation:pulse 1.5s ease-in-out infinite}
      th{color:#3a3f58;font-size:10px;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid #181a28;padding:8px 11px;white-space:nowrap;text-align:left}
      td{font-size:11px;padding:7px 11px;border-bottom:1px solid #111320;vertical-align:middle;cursor:text}
      tr:hover td{background:rgba(255,255,255,.012)}
      .inp{background:#11131e;border:1.5px solid #1e2136;border-radius:3px;color:#e0e2ed;font-family:'IBM Plex Mono',monospace;font-size:12px;padding:9px 13px;outline:none;width:100%;transition:border-color .15s;resize:vertical}
      .inp:focus{border-color:#4f7cff}
    `}</style>

    {/* Header */}
    <div style={{borderBottom:"1px solid #181a28",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:"#4f7cff"}} />
        <span style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:600,fontSize:13,letterSpacing:".06em"}}>PAYROLL EXTRACTOR</span>
        <span style={{color:"#252840",fontSize:11}}> // iSolved Import</span>
      </div>
      {hasRows && <div style={{display:"flex",gap:8}}>
        <span className="tag tb">{records.length} RECORDS</span>
        {flags > 0 ? <span className="tag tw">{flags} REVIEW</span> : <span className="tag tok">ALL CLEAR</span>}
      </div>}
    </div>

    {/* Tabs */}
    <div style={{borderBottom:"1px solid #181a28",padding:"0 24px",display:"flex"}}>
      <button className={`tab ${tab==="image"?"on":""}`} onClick={() => { setTab("image"); setRecords([]); setError(null); }}>⊕ IMAGE / FILE</button>
      <button className={`tab ${tab==="email"?"on":""}`} onClick={() => { setTab("email"); setRecords([]); setError(null); }}>✉ OUTLOOK EMAIL</button>
    </div>

    <div style={{padding:"22px 24px",maxWidth:1400,margin:"0 auto"}}>

      {/* IMAGE TAB */}
      {tab === "image" && (<>
        <div style={{display:"grid",gridTemplateColumns:preview?"260px 1fr":"1fr",gap:16,marginBottom:20}}>
          <div className={`dz ${over?"ov":""}`} style={{minHeight:150}}
            onDragOver={e => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e => onFile(e.target.files[0])} />
            {preview
              ? <img src={preview} alt="" style={{maxHeight:120,maxWidth:"100%",objectFit:"contain",borderRadius:3}} />
              : <div style={{color:"#2e3248"}}>
                  <div style={{fontSize:24,marginBottom:10}}>⊕</div>
                  <div style={{fontSize:11,lineHeight:1.9}}>Drop image or click to upload<br/><span style={{color:"#1e2135",fontSize:10}}>Handwritten · Screenshot · Photo</span></div>
                </div>}
          </div>
          {preview && <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#11131e",border:"1px solid #181a28",borderRadius:4,padding:"14px 16px",flex:1}}>
              <div style={{color:"#2e3248",fontSize:10,letterSpacing:".12em",marginBottom:10}}>FIELDS TO EXTRACT</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {FIELDS.filter(f=>f!=="notes").map(f=><span key={f} style={{background:"#181a28",border:"1px solid #252840",borderRadius:2,padding:"2px 7px",fontSize:10,color:"#4a4f6a"}}>{LABELS[f]}</span>)}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn bp" onClick={extractImage} disabled={loading} style={{flex:1}}>{loading ? <Spin text="EXTRACTING..." /> : "EXTRACT PAYROLL DATA"}</button>
              <button className="btn bg" onClick={() => { setImg(null); setPreview(null); setRecords([]); setError(null); }}>CLEAR</button>
              {hasRows && <button className="btn be" onClick={exportCSV}>↓ CSV</button>}
            </div>
          </div>}
        </div>
      </>)}

      {/* EMAIL TAB */}
      {tab === "email" && (<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div>
            <div style={{color:"#3a3f58",fontSize:10,letterSpacing:".12em",marginBottom:6}}>FROM</div>
            <input className="inp" value={emailFrom} onChange={e=>setEmailFrom(e.target.value)} placeholder="client@company.com" />
          </div>
          <div>
            <div style={{color:"#3a3f58",fontSize:10,letterSpacing:".12em",marginBottom:6}}>SUBJECT</div>
            <input className="inp" value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} placeholder="Payroll hours for period ending..." />
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{color:"#3a3f58",fontSize:10,letterSpacing:".12em",marginBottom:6}}>EMAIL BODY — paste the email content here</div>
          <textarea className="inp" value={emailBody} onChange={e=>setEmailBody(e.target.value)} placeholder="Paste the full email body here..." style={{minHeight:180}} />
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bp" onClick={extractEmail} disabled={loading||!emailBody.trim()} style={{flex:1}}>{loading ? <Spin text="EXTRACTING..." /> : "EXTRACT FROM EMAIL"}</button>
          <button className="btn bg" onClick={() => { setEmailBody(""); setEmailFrom(""); setEmailSubject(""); setRecords([]); setError(null); }}>CLEAR</button>
          {hasRows && <button className="btn be" onClick={exportCSV}>↓ CSV</button>}
        </div>
        <div style={{marginTop:10,fontSize:10,color:"#3a3f58"}}>TIP: Open the email in Outlook → select all text → paste here</div>
      </>)}

      {/* Error */}
      {error && <div style={{marginTop:16,fontSize:11,color:"#ef5350",background:"rgba(244,67,54,.07)",border:"1px solid rgba(244,67,54,.2)",borderRadius:4,padding:"10px 14px"}}>⚠ {error}</div>}

      {/* Loading */}
      {loading && <div style={{display:"flex",alignItems:"center",gap:10,padding:"40px 0",color:"#3a3f58"}}>
        <div style={{width:13,height:13,border:"2px solid #252840",borderTopColor:"#4f7cff",borderRadius:"50%",animation:"spin 1s linear infinite"}} />
        <span className="pulse" style={{fontSize:11,letterSpacing:".12em"}}>ANALYZING · EXTRACTING PAYROLL DATA...</span>
      </div>}

      {/* Results */}
      {hasRows && !loading && <div className="fade" style={{marginTop:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:10,color:"#3a3f58",letterSpacing:".1em"}}>CLICK ANY CELL TO EDIT · VERIFY BEFORE EXPORT</div>
          <div style={{display:"flex",gap:8}}>
            {flags > 0 && <span className="tag tw">{flags} NEED REVIEW</span>}
            <button className="btn be" onClick={exportCSV}>↓ EXPORT iSOLVED CSV</button>
          </div>
        </div>
        <div style={{overflowX:"auto",border:"1px solid #181a28",borderRadius:4,background:"#0b0d17"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
            <thead>
              <tr style={{background:"#0f111c"}}>
                <th style={{width:26,textAlign:"center"}}>#</th>
                {FIELDS.map(f=><th key={f}>{LABELS[f]}</th>)}
              </tr>
            </thead>
            <tbody>
              {records.map((row,idx)=>(
                <tr key={row._id} className={row._flag?"rv":""}>
                  <td style={{color:"#252840",fontSize:10,textAlign:"center"}}>{idx+1}</td>
                  {FIELDS.map(field=>{
                    const val = row[field]??"";
                    const isEd = editing?.r===row._id && editing?.f===field;
                    return <td key={field} onClick={()=>setEditing({r:row._id,f:field})}>
                      {isEd
                        ? <input autoFocus className="ci ce" value={val} onChange={e=>updateCell(row._id,field,e.target.value)} onBlur={()=>setEditing(null)} onKeyDown={e=>e.key==="Enter"&&setEditing(null)} />
                        : <span className={val==="REVIEW"?"rvv":""} style={{color:val===""?"#1e2135":undefined}}>{val===""?"—":val.toString()}</span>}
                    </td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {flags > 0 && <div style={{marginTop:10,fontSize:11,color:"#4a4f6a"}}><span style={{color:"#ffa000"}}>▲</span> {flags} record{flags>1?"s":""} flagged REVIEW — verify before exporting.</div>}
      </div>}

    </div>
  </>);
}
