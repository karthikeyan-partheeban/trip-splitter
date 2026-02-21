import { useState } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────
const MEMBER_COLORS = ["#C17D3C","#3C7DC1","#7C3CC1","#3CC17D","#C13C6A","#3CC1B8","#C1A03C","#6A3CC1"];

const INITIAL_MEMBERS = [
  { id: "K", name: "Karthikeyan", color: "#C17D3C", initials: "KA" },
  { id: "J", name: "Jalvin",      color: "#3C7DC1", initials: "JA" },
  { id: "S", name: "Sudhan",      color: "#7C3CC1", initials: "SU" },
  { id: "Y", name: "Yuvraj",      color: "#3CC17D", initials: "YU" },
];

const INITIAL_GROUPS = [
  { id:"g1", label:"Flight Tickets",         emoji:"✈️",  paidBy:"J", total:76621,    note:"Jalvin paid for Karthikeyan, Jalvin & Sudhan only", shares:{K:25540.33,J:25540.33,S:25540.34,Y:0} },
  { id:"g2", label:"Yuvraj's Ticket",         emoji:"🎟️",  paidBy:"Y", total:24392,    note:"Yuvraj bears this alone",                          shares:{K:0,J:0,S:0,Y:24392} },
  { id:"g3", label:"Common Cash",             emoji:"💵",  paidBy:"J", total:34014.83, note:"Shared equally among all 4",                       shares:{K:8503.71,J:8503.71,S:8503.71,Y:8503.70} },
  { id:"g4", label:"Yuvraj ATM Cash",         emoji:"🏧",  paidBy:"Y", total:20826,    note:"Each person's individual spend",                   shares:{K:7480.74,J:4448.42,S:4448.42,Y:4448.42} },
  { id:"g5", label:"Souvenirs (Yuvraj Card)", emoji:"🛍️",  paidBy:"Y", total:6840,     note:"Per person souvenir spend",                        shares:{K:3710.11,J:0,S:777.89,Y:2352} },
  { id:"g6", label:"Hotels (3 Nights)",       emoji:"🏨",  paidBy:"K", total:28526.11, note:"Karthikeyan paid, split equally",                  shares:{K:7131.53,J:7131.53,S:7131.53,Y:7131.52} },
  { id:"g7", label:"Karthikeyan Cash",        emoji:"💰",  paidBy:"K", total:39231,    note:"Karthikeyan's cash spend, split equally",          shares:{K:9807.75,J:9807.75,S:9807.75,Y:9807.75} },
];

const PRE_TRIP_DEBT = { from:"J", to:"K", amount:40000 };

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt      = n => "₹" + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtShort = n => "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits:0 });

function makeInitials(name) {
  const w = name.trim().split(/\s+/);
  return w.length >= 2 ? (w[0][0]+w[1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
}

function computeBalances(members, groups, preTrip) {
  const paid={}, owed={};
  members.forEach(m => { paid[m.id]=0; owed[m.id]=0; });
  groups.forEach(g => {
    if (paid[g.paidBy] !== undefined) paid[g.paidBy] += g.total;
    members.forEach(m => { owed[m.id] += (g.shares[m.id]||0); });
  });
  const tripNet={};
  members.forEach(m => { tripNet[m.id] = paid[m.id]-owed[m.id]; });
  const finalNet={...tripNet};
  if (finalNet[preTrip.to]   !== undefined) finalNet[preTrip.to]   += preTrip.amount;
  if (finalNet[preTrip.from] !== undefined) finalNet[preTrip.from] -= preTrip.amount;

  const transactions=[];
  const debtors  = members.filter(m=>finalNet[m.id]<-0.01).map(m=>({id:m.id,amt:-finalNet[m.id]})).sort((a,b)=>b.amt-a.amt);
  const creditors= members.filter(m=>finalNet[m.id]> 0.01).map(m=>({id:m.id,amt: finalNet[m.id]})).sort((a,b)=>b.amt-a.amt);
  let di=0,ci=0;
  while(di<debtors.length && ci<creditors.length){
    const pay=Math.min(debtors[di].amt,creditors[ci].amt);
    if(pay>0.01) transactions.push({from:debtors[di].id,to:creditors[ci].id,amount:pay});
    debtors[di].amt-=pay; creditors[ci].amt-=pay;
    if(debtors[di].amt<0.01) di++;
    if(creditors[ci].amt<0.01) ci++;
  }
  return {paid,owed,tripNet,finalNet,transactions};
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────
function Avatar({member,size=28}){
  return(
    <span style={{width:size,height:size,borderRadius:"50%",background:member.color+"22",border:`1.5px solid ${member.color}55`,color:member.color,fontSize:size*0.36,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",flexShrink:0}}>
      {member.initials}
    </span>
  );
}

// ─── MEMBER BAR ──────────────────────────────────────────────────────────────
function MemberBar({member,value,max}){
  const pct=max>0?Math.min(100,Math.abs(value)/max*100):0;
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
      <Avatar member={member} size={26}/>
      <div style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{fontSize:11,fontWeight:600,color:"#2C2C2C"}}>{member.name}</span>
          <span style={{fontSize:11,fontWeight:700,color:"#1A1A1A"}}>{fmtShort(value)}</span>
        </div>
        <div style={{height:4,background:"#F0EDE8",borderRadius:2,overflow:"hidden"}}>
          <div style={{width:pct+"%",height:"100%",background:member.color,borderRadius:2,transition:"width 0.4s ease"}}/>
        </div>
      </div>
    </div>
  );
}

// ─── GROUP CARD ──────────────────────────────────────────────────────────────
function GroupCard({group,members,onUpdate,onDelete}){
  const [expanded,setExpanded]=useState(false);
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(null);
  const payer=members.find(m=>m.id===group.paidBy);
  const totalShares=Object.values(group.shares).reduce((a,b)=>a+b,0);
  const diff=Math.abs(group.total-totalShares);

  function startEdit(){ setDraft(JSON.parse(JSON.stringify(group))); setEditing(true); }
  function saveEdit(){ onUpdate(draft); setEditing(false); }
  function cancelEdit(){ setEditing(false); setDraft(null); }
  function splitEqual(d){ const per=d.total/members.length; return {...d,shares:Object.fromEntries(members.map(m=>[m.id,per]))}; }

  return(
    <div style={{background:"#FFF",border:"1px solid #E8E4DE",borderRadius:8,marginBottom:6,overflow:"hidden"}}>
      <div onClick={()=>!editing&&setExpanded(e=>!e)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:18}}>{group.emoji}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1A1A1A"}}>{group.label}</div>
          <div style={{fontSize:11,color:"#888",marginTop:1}}>
            Paid by <span style={{color:payer?.color,fontWeight:600}}>{payer?.name}</span>
            {group.note&&<span style={{color:"#BBB"}}> · {group.note}</span>}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1A1A1A"}}>{fmt(group.total)}</div>
          {diff>0.5&&<div style={{fontSize:10,color:"#E07020",fontWeight:600}}>⚠ Δ {fmt(diff)}</div>}
        </div>
        <span style={{fontSize:14,color:"#AAA",marginLeft:4,transition:"transform 0.2s",transform:expanded?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
      </div>

      {expanded&&!editing&&(
        <div style={{borderTop:"1px solid #E8E4DE",padding:"10px 14px 12px",background:"#FAFAFA"}}>
          <div style={{marginBottom:10}}>
            {members.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,padding:"6px 10px",borderRadius:7,background:(group.shares[m.id]||0)>0?m.color+"0D":"#F9F6F1",border:`1px solid ${(group.shares[m.id]||0)>0?m.color+"25":"#EDE8E0"}`}}>
                <Avatar member={m} size={22}/>
                <span style={{flex:1,fontSize:12,fontWeight:600,color:"#333"}}>{m.name}</span>
                <span style={{fontSize:13,fontWeight:700,color:(group.shares[m.id]||0)>0?m.color:"#CCC"}}>
                  {(group.shares[m.id]||0)>0?fmt(group.shares[m.id]):"—"}
                </span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={startEdit} style={{flex:1,padding:"6px 12px",borderRadius:6,border:"1px solid #DDD",background:"#FFF",fontSize:12,fontWeight:600,color:"#555",cursor:"pointer"}}>Edit</button>
            <button onClick={()=>onDelete(group.id)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #FCC",background:"#FFF8F8",fontSize:12,fontWeight:600,color:"#C44",cursor:"pointer"}}>Delete</button>
          </div>
        </div>
      )}

      {expanded&&editing&&draft&&(
        <div style={{borderTop:"1px solid #E8E4DE",padding:"12px 14px 14px",background:"#FAFAFA"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div>
              <label style={{fontSize:10,color:"#888",fontWeight:600,display:"block",marginBottom:3}}>LABEL</label>
              <input value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #DDD",fontSize:12,boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#888",fontWeight:600,display:"block",marginBottom:3}}>TOTAL (₹)</label>
              <input type="number" value={draft.total} onChange={e=>setDraft({...draft,total:parseFloat(e.target.value)||0})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #DDD",fontSize:12,boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#888",fontWeight:600,display:"block",marginBottom:3}}>PAID BY</label>
              <select value={draft.paidBy} onChange={e=>setDraft({...draft,paidBy:e.target.value})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #DDD",fontSize:12,boxSizing:"border-box"}}>
                {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:"#888",fontWeight:600,display:"block",marginBottom:3}}>NOTE</label>
              <input value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #DDD",fontSize:12,boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <label style={{fontSize:10,color:"#888",fontWeight:600}}>SHARES (₹)</label>
              <button onClick={()=>setDraft(splitEqual(draft))} style={{fontSize:10,padding:"3px 8px",borderRadius:5,border:"1px solid #DDD",background:"#FFF",cursor:"pointer",color:"#555",fontWeight:600}}>Split equally</button>
            </div>
            {members.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,padding:"6px 10px",borderRadius:7,background:"#F9F6F1",border:"1px solid #EDE8E0"}}>
                <Avatar member={m} size={22}/>
                <span style={{fontSize:12,fontWeight:600,color:"#333",flex:1}}>{m.name}</span>
                <input type="number" value={draft.shares[m.id]??0} onChange={e=>setDraft({...draft,shares:{...draft.shares,[m.id]:parseFloat(e.target.value)||0}})} style={{width:90,padding:"4px 8px",borderRadius:5,border:"1px solid #DDD",fontSize:12,textAlign:"right"}}/>
              </div>
            ))}
            {Math.abs(draft.total-Object.values(draft.shares).reduce((a,b)=>a+b,0))>0.5&&(
              <div style={{fontSize:11,color:"#E07020",marginTop:4,fontWeight:600}}>⚠ Shares sum to {fmt(Object.values(draft.shares).reduce((a,b)=>a+b,0))} — total is {fmt(draft.total)}</div>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={saveEdit} style={{flex:1,padding:"7px 12px",borderRadius:6,border:"none",background:"#2C2C2C",color:"#FFF",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save changes</button>
            <button onClick={cancelEdit} style={{padding:"7px 12px",borderRadius:6,border:"1px solid #DDD",background:"#FFF",fontSize:12,fontWeight:600,color:"#888",cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADD GROUP MODAL ──────────────────────────────────────────────────────────
// Split modes:
//   "equal"   — entire amount split equally, no inputs needed
//   "mixed"   — shared portion split equally + personal amounts per person
//   "custom"  — each person's share entered manually
function AddGroupModal({members,onAdd,onClose}){
  const [form,setForm]=useState({
    label:"",emoji:"💳",paidBy:members[0]?.id||"",total:"",note:"",
    splitMode:"equal",          // "equal" | "mixed" | "custom"
    sharedAmount:"",            // used in mixed mode — the equally-split portion
    personal:Object.fromEntries(members.map(m=>[m.id,0])),  // per-person top-ups
  });

  const total        = parseFloat(form.total)||0;
  const sharedAmt    = parseFloat(form.sharedAmount)||0;
  const personalSum  = Object.values(form.personal).reduce((a,b)=>a+b,0);

  // Compute final shares from current mode
  function computeShares(){
    if(form.splitMode==="equal"){
      const per=+(total/members.length).toFixed(2);
      return Object.fromEntries(members.map(m=>[m.id,per]));
    }
    if(form.splitMode==="mixed"){
      const equalPer=+(sharedAmt/members.length).toFixed(2);
      return Object.fromEntries(members.map(m=>[m.id,equalPer+(form.personal[m.id]||0)]));
    }
    // custom
    return {...form.personal};
  }

  const finalShares  = computeShares();
  const sharesSum    = Object.values(finalShares).reduce((a,b)=>a+b,0);
  const balanced     = total>0 && Math.abs(total-sharesSum)<=0.5;

  // When total changes, refresh sharedAmount default for mixed mode
  function handleTotal(val){
    setForm(f=>({...f, total:val, sharedAmount:val}));
  }

  function handleSharedAmount(val){
    setForm(f=>({...f, sharedAmount:val}));
  }

  // Validate mixed: shared + personal must equal total
  const mixedPersonalSlack = total - sharedAmt - personalSum;

  function submit(){
    if(!form.label||!form.total) return;
    onAdd({
      id:"g"+Date.now(), label:form.label, emoji:form.emoji,
      paidBy:form.paidBy, total, note:form.note,
      shares:finalShares,
    });
    onClose();
  }

  const MODES=[
    {id:"equal",  label:"Split equally",       desc:"Whole amount divided equally among everyone"},
    {id:"mixed",  label:"Shared + personal",   desc:"Part shared equally, rest entered per person"},
    {id:"custom", label:"Custom per person",   desc:"Enter each person's share manually"},
  ];

  const inputStyle={padding:"6px 8px",borderRadius:6,border:"1px solid #DDD",fontSize:12,boxSizing:"border-box",width:"100%"};
  const labelStyle={fontSize:10,color:"#888",fontWeight:600,display:"block",marginBottom:3,letterSpacing:0.3,textTransform:"uppercase"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#FFF",borderRadius:14,padding:24,width:440,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:800,fontFamily:"'Nunito',sans-serif"}}>Add Expense Group</h3>
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:18,cursor:"pointer",color:"#999",lineHeight:1}}>✕</button>
        </div>

        {/* Icon + Label */}
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <div style={{flexShrink:0}}>
            <label style={labelStyle}>Icon</label>
            <input value={form.emoji} onChange={e=>setForm({...form,emoji:e.target.value})}
              style={{...inputStyle,width:52,fontSize:20,textAlign:"center",padding:"6px"}}/>
          </div>
          <div style={{flex:1}}>
            <label style={labelStyle}>Label</label>
            <input placeholder="e.g. Restaurant dinner" value={form.label}
              onChange={e=>setForm({...form,label:e.target.value})} style={inputStyle}/>
          </div>
        </div>

        {/* Total + Paid by */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <div>
            <label style={labelStyle}>Total (₹)</label>
            <input type="number" placeholder="0" value={form.total}
              onChange={e=>handleTotal(e.target.value)} style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Paid by</label>
            <select value={form.paidBy} onChange={e=>setForm({...form,paidBy:e.target.value})} style={inputStyle}>
              {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        {/* Note */}
        <div style={{marginBottom:16}}>
          <label style={labelStyle}>Note (optional)</label>
          <input value={form.note} onChange={e=>setForm({...form,note:e.target.value})}
            placeholder="e.g. Dinner at night market" style={inputStyle}/>
        </div>

        {/* ── Split mode selector ─────────────────────────────────────────── */}
        <div style={{marginBottom:16}}>
          <label style={labelStyle}>How to split</label>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {MODES.map(mode=>(
              <label key={mode.id} onClick={()=>setForm(f=>({...f,splitMode:mode.id}))}
                style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",borderRadius:8,cursor:"pointer",
                  background:form.splitMode===mode.id?"#F0F6FF":"#F9F6F1",
                  border:`1.5px solid ${form.splitMode===mode.id?"#3C7DC1":"#E8E4DE"}`}}>
                <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${form.splitMode===mode.id?"#3C7DC1":"#CCC"}`,
                  background:form.splitMode===mode.id?"#3C7DC1":"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                  {form.splitMode===mode.id&&<div style={{width:6,height:6,borderRadius:"50%",background:"#FFF"}}/>}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#1A1A1A"}}>{mode.label}</div>
                  <div style={{fontSize:11,color:"#888",marginTop:1}}>{mode.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── EQUAL mode: just show preview ──────────────────────────────── */}
        {form.splitMode==="equal"&&total>0&&(
          <div style={{marginBottom:16,padding:"10px 12px",background:"#F0F9F3",borderRadius:8,border:"1px solid #B8E0C0"}}>
            <div style={{fontSize:11,color:"#2A8C4A",fontWeight:600,marginBottom:6}}>Each person pays equally</div>
            {members.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <Avatar member={m} size={20}/>
                <span style={{flex:1,fontSize:12,color:"#333"}}>{m.name}</span>
                <span style={{fontSize:12,fontWeight:700,color:"#2A8C4A"}}>{fmt(total/members.length)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── MIXED mode ─────────────────────────────────────────────────── */}
        {form.splitMode==="mixed"&&(
          <div style={{marginBottom:16}}>
            {/* Shared amount input */}
            <div style={{padding:"12px",background:"#F0F6FF",borderRadius:8,border:"1px solid #C8DCEE",marginBottom:10}}>
              <label style={{...labelStyle,color:"#3C7DC1"}}>Shared portion (split equally)</label>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="number" placeholder="e.g. 800" value={form.sharedAmount}
                  onChange={e=>handleSharedAmount(e.target.value)}
                  style={{...inputStyle,fontWeight:700,fontSize:14}}/>
                {sharedAmt>0&&(
                  <span style={{fontSize:11,color:"#3C7DC1",fontWeight:600,whiteSpace:"nowrap"}}>
                    = {fmt(sharedAmt/members.length)} each
                  </span>
                )}
              </div>
              {total>0&&sharedAmt>total&&(
                <div style={{fontSize:11,color:"#E07020",marginTop:4,fontWeight:600}}>⚠ Shared amount exceeds total</div>
              )}
            </div>

            {/* Personal amounts */}
            <div style={{padding:"12px",background:"#FFF8F0",borderRadius:8,border:"1px solid #F0D8C0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <label style={{...labelStyle,color:"#C17D3C",margin:0}}>Personal top-up per person</label>
                {total>0&&sharedAmt<=total&&(
                  <span style={{fontSize:10,color:"#C17D3C",fontWeight:600}}>
                    Remaining: {fmt(total-sharedAmt)}
                  </span>
                )}
              </div>
              {members.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7,padding:"7px 10px",borderRadius:7,background:"#FFFAF6",border:"1px solid #EDE0D4"}}>
                  <Avatar member={m} size={24}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#222"}}>{m.name}</div>
                    {sharedAmt>0&&(
                      <div style={{fontSize:10,color:"#AAA"}}>
                        shared {fmt(sharedAmt/members.length)}
                        {(form.personal[m.id]||0)>0&&<span style={{color:"#C17D3C"}}> + personal {fmt(form.personal[m.id])}</span>}
                      </div>
                    )}
                  </div>
                  <input type="number" placeholder="0"
                    value={form.personal[m.id]||""}
                    onChange={e=>setForm(f=>({...f,personal:{...f.personal,[m.id]:parseFloat(e.target.value)||0}}))}
                    style={{width:90,padding:"5px 8px",borderRadius:6,border:"1px solid #DDD",fontSize:13,textAlign:"right",fontWeight:600}}/>
                </div>
              ))}
              {/* Personal slack check */}
              {total>0&&sharedAmt>0&&Math.abs(mixedPersonalSlack)>0.5&&(
                <div style={{fontSize:11,color:"#E07020",fontWeight:600,marginTop:4,padding:"6px 8px",background:"#FFF8F0",borderRadius:6}}>
                  ⚠ Personal amounts sum to {fmt(personalSum)} — expected {fmt(total-sharedAmt)} · diff {fmt(mixedPersonalSlack)}
                </div>
              )}
              {total>0&&sharedAmt>0&&Math.abs(mixedPersonalSlack)<=0.5&&(
                <div style={{fontSize:11,color:"#2A8C4A",fontWeight:600,marginTop:4,padding:"6px 8px",background:"#F0FAF3",borderRadius:6}}>✓ Balanced</div>
              )}
            </div>

            {/* Final shares preview */}
            {total>0&&sharedAmt>0&&(
              <div style={{marginTop:8,padding:"10px 12px",background:"#F5F3F0",borderRadius:8,border:"1px solid #E8E4DE"}}>
                <div style={{fontSize:10,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Final total per person</div>
                {members.map(m=>(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <Avatar member={m} size={20}/>
                    <span style={{flex:1,fontSize:12,color:"#333"}}>{m.name}</span>
                    <span style={{fontSize:13,fontWeight:800,color:"#1A1A1A"}}>{fmt(finalShares[m.id]||0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CUSTOM mode ────────────────────────────────────────────────── */}
        {form.splitMode==="custom"&&(
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <label style={labelStyle}>Amount per person</label>
              <button onClick={()=>setForm(f=>({...f,personal:Object.fromEntries(members.map(m=>[m.id,+(total/members.length).toFixed(2)]))}))}
                style={{fontSize:10,padding:"3px 10px",borderRadius:5,border:"1px solid #DDD",background:"#F9F6F1",cursor:"pointer",fontWeight:600,color:"#555"}}>
                Split equally
              </button>
            </div>
            {members.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"8px 10px",borderRadius:8,background:"#F9F6F1",border:"1px solid #EDE8E0"}}>
                <Avatar member={m} size={28}/>
                <span style={{flex:1,fontSize:12,fontWeight:600,color:"#222"}}>{m.name}</span>
                <input type="number" placeholder="0"
                  value={form.personal[m.id]||""}
                  onChange={e=>setForm(f=>({...f,personal:{...f.personal,[m.id]:parseFloat(e.target.value)||0}}))}
                  style={{width:100,padding:"5px 8px",borderRadius:6,border:"1px solid #DDD",fontSize:13,textAlign:"right",fontWeight:600}}/>
              </div>
            ))}
            {total>0&&!balanced&&(
              <div style={{fontSize:11,color:"#E07020",fontWeight:600,marginTop:4,padding:"6px 8px",background:"#FFF8F0",borderRadius:6}}>
                ⚠ Shares sum {fmt(sharesSum)} · diff {fmt(total-sharesSum)}
              </div>
            )}
            {total>0&&balanced&&(
              <div style={{fontSize:11,color:"#2A8C4A",fontWeight:600,marginTop:4,padding:"6px 8px",background:"#F0FAF3",borderRadius:6}}>✓ Balanced</div>
            )}
          </div>
        )}

        <button onClick={submit} style={{width:"100%",padding:"10px",borderRadius:8,border:"none",
          background:form.label&&form.total?"#2C2C2C":"#CCC",color:"#FFF",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          Add Group
        </button>
      </div>
    </div>
  );
}

// ─── TRIP SETTINGS MODAL ─────────────────────────────────────────────────────
function TripSettingsModal({tripName,members,onSave,onClose}){
  const [name,setName]=useState(tripName);
  const [people,setPeople]=useState(members.map(m=>({...m})));
  const [newName,setNewName]=useState("");

  function addPerson(){
    if(!newName.trim()) return;
    const id="M"+Date.now();
    const color=MEMBER_COLORS[people.length % MEMBER_COLORS.length];
    setPeople(p=>[...p,{id,name:newName.trim(),color,initials:makeInitials(newName.trim())}]);
    setNewName("");
  }
  function removePerson(id){ setPeople(p=>p.filter(m=>m.id!==id)); }
  function updatePersonName(id,val){
    setPeople(p=>p.map(m=>m.id===id?{...m,name:val,initials:makeInitials(val||"?")}:m));
  }
  function handleKey(e){ if(e.key==="Enter") addPerson(); }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#FFF",borderRadius:14,padding:24,width:400,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:800,fontFamily:"'Nunito',sans-serif"}}>Trip Settings</h3>
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:18,cursor:"pointer",color:"#999"}}>✕</button>
        </div>

        {/* Trip name */}
        <div style={{marginBottom:22}}>
          <label style={{fontSize:10,color:"#888",fontWeight:700,display:"block",marginBottom:5,letterSpacing:0.5,textTransform:"uppercase"}}>Trip Name</label>
          <input
            value={name} onChange={e=>setName(e.target.value)}
            placeholder="e.g. Thailand 2025"
            style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #DDD",fontSize:14,fontWeight:600,boxSizing:"border-box",fontFamily:"'Nunito',sans-serif"}}
          />
        </div>

        {/* People */}
        <div style={{marginBottom:20}}>
          <label style={{fontSize:10,color:"#888",fontWeight:700,display:"block",marginBottom:8,letterSpacing:0.5,textTransform:"uppercase"}}>People on the trip ({people.length})</label>
          {people.map(m=>(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"8px 10px",borderRadius:8,background:"#F9F6F1",border:"1px solid #EDE8E0"}}>
              <Avatar member={m} size={30}/>
              <input
                value={m.name} onChange={e=>updatePersonName(m.id,e.target.value)}
                style={{flex:1,border:"none",background:"transparent",fontSize:13,fontWeight:600,color:"#222",outline:"none",padding:0}}
              />
              {people.length>2&&(
                <button onClick={()=>removePerson(m.id)} style={{border:"none",background:"#FEE",borderRadius:"50%",width:22,height:22,cursor:"pointer",color:"#C44",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:0}}>×</button>
              )}
            </div>
          ))}

          {/* Add new person row */}
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <input
              value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={handleKey}
              placeholder="Add a person..."
              style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1px dashed #CCC",fontSize:12,boxSizing:"border-box",background:"#FAFAFA"}}
            />
            <button onClick={addPerson} style={{padding:"8px 14px",borderRadius:8,border:"none",background:"#2C2C2C",color:"#FFF",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>
              + Add
            </button>
          </div>
        </div>

        <button onClick={()=>onSave(name,people)} style={{width:"100%",padding:"10px",borderRadius:8,border:"none",background:"#2C2C2C",color:"#FFF",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          Save Settings
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function TripSplitter(){
  const [tripName,setTripName]         = useState("Thailand 2025");
  const [members,setMembers]           = useState(INITIAL_MEMBERS);
  const [groups,setGroups]             = useState(INITIAL_GROUPS);
  const [preTrip]                      = useState(PRE_TRIP_DEBT);
  const [settleMode,setSettleMode]     = useState("live");
  const [showAdd,setShowAdd]           = useState(false);
  const [showSettings,setShowSettings] = useState(false);

  const balances   = computeBalances(members,groups,preTrip);
  const grandTotal = groups.reduce((s,g)=>s+g.total,0);
  const maxSpend   = Math.max(...members.map(m=>balances.owed[m.id]),1);

  function updateGroup(u){ setGroups(gs=>gs.map(g=>g.id===u.id?u:g)); }
  function deleteGroup(id){ setGroups(gs=>gs.filter(g=>g.id!==id)); }
  function addGroup(g){ setGroups(gs=>[...gs,g]); }
  function saveSettings(name,people){ setTripName(name); setMembers(people); setShowSettings(false); }

  function handlePrint(){
    const style=`<style>
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=Inter:wght@400;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',sans-serif;background:#FFFCF8;color:#1A1A1A;padding:32px;font-size:13px}
      h1{font-family:'Nunito',sans-serif;font-size:26px;margin-bottom:4px}
      .sub{font-size:12px;color:#888;margin-bottom:28px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{background:#2C2C2C;color:#FFF;padding:8px 12px;font-size:11px;text-align:left}
      td{padding:8px 12px;border-bottom:1px solid #EDE8E0}
      .sec{font-size:10px;font-weight:700;letter-spacing:1px;color:#888;text-transform:uppercase;margin:20px 0 8px}
      .tot td{font-weight:700;background:#F5F2EC}
      .txn{display:flex;justify-content:space-between;padding:8px 12px;background:#F9F6F0;border-radius:6px;margin-bottom:6px}
    </style>`;
    const rows=groups.map(g=>{const p=members.find(m=>m.id===g.paidBy);return`<tr><td>${g.emoji} ${g.label}</td><td>${p?.name}</td>${members.map(m=>`<td style="text-align:right">${(g.shares[m.id]||0)>0?fmt(g.shares[m.id]):"—"}</td>`).join("")}<td style="text-align:right;font-weight:700">${fmt(g.total)}</td></tr>`;}).join("");
    const balRow=`<tr class="tot"><td colspan="2">TOTAL OWED</td>${members.map(m=>`<td style="text-align:right">${fmt(balances.owed[m.id])}</td>`).join("")}<td style="text-align:right">${fmt(grandTotal)}</td></tr>`;
    const txns=balances.transactions.map(t=>{const f=members.find(m=>m.id===t.from);const to=members.find(m=>m.id===t.to);return`<div class="txn"><span>${f?.name} → ${to?.name}</span><span style="font-weight:700">${fmt(t.amount)}</span></div>`;}).join("");
    const html=`<!DOCTYPE html><html><head><title>${tripName}</title>${style}</head><body>
      <h1>✈️ ${tripName}</h1>
      <div class="sub">Generated ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})} · Grand Total ${fmt(grandTotal)}</div>
      <div class="sec">Expense Breakdown</div>
      <table><thead><tr><th>Group</th><th>Paid By</th>${members.map(m=>`<th>${m.name}</th>`).join("")}<th>Total</th></tr></thead>
      <tbody>${rows}${balRow}</tbody></table>
      <div class="sec">Final Settlement</div>${txns}
    </body></html>`;
    const win=window.open("","_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(()=>win.print(),500);
  }

  return(
    <div style={{minHeight:"100vh",background:"#F7F5F1",fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#D4CFC6;border-radius:4px}
        button:hover{opacity:0.85}
        input:focus,select:focus{outline:2px solid #C17D3C40;border-color:#C17D3C!important}
      `}</style>

      {/* ── TOP BAR ──────────────────────────────────────────────────────────── */}
      <div style={{background:"#FFF",borderBottom:"1px solid #E8E4DE",padding:"0 20px",height:50,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>

        {/* Left: logo · trip name chip · member avatars */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>✈️</span>
          <span style={{fontFamily:"'Nunito',sans-serif",fontSize:16,color:"#1A1A1A",fontWeight:800,letterSpacing:-0.3}}>TripSplit</span>
          <div style={{width:1,height:16,background:"#E8E4DE"}}/>

          {/* Trip name chip */}
          <button onClick={()=>setShowSettings(true)} style={{display:"flex",alignItems:"center",gap:5,background:"#F7F5F1",border:"1px solid #E8E4DE",borderRadius:7,padding:"3px 10px",cursor:"pointer"}}>
            <span style={{fontSize:12,fontWeight:600,color:"#444"}}>{tripName}</span>
            <span style={{fontSize:10,color:"#BBB"}}>✎</span>
          </button>

          {/* Member avatar strip */}
          <div style={{display:"flex",alignItems:"center"}}>
            {members.map((m,i)=>(
              <div key={m.id} title={m.name} style={{marginLeft:i===0?4:-6,cursor:"default"}}>
                <Avatar member={m} size={24}/>
              </div>
            ))}
            <button onClick={()=>setShowSettings(true)} title="Add / manage people"
              style={{marginLeft:4,width:24,height:24,borderRadius:"50%",border:"1.5px dashed #CCC",background:"transparent",color:"#BBB",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1}}>
              +
            </button>
          </div>
        </div>

        {/* Right: export only */}
        <button onClick={handlePrint} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #E8E4DE",background:"#F7F5F1",color:"#555",fontSize:11,fontWeight:600,cursor:"pointer"}}>
          Export PDF
        </button>
      </div>

      {/* ── THREE COLUMNS ──────────────────────────────────────────────────────── */}
      <div style={{display:"flex",height:"calc(100vh - 54px)",overflow:"hidden"}}>

        {/* COL 1: Groups — 50% */}
        <div style={{width:"50%",borderRight:"1px solid #E8E4DE",display:"flex",flexDirection:"column",background:"#F7F5F1"}}>
          <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #E8E4DE",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,fontWeight:800,color:"#1A1A1A"}}>Expense Groups</div>
              <div style={{fontSize:11,color:"#999",marginTop:1}}>{groups.length} groups · click to expand & edit inline</div>
            </div>
            <button onClick={()=>setShowAdd(true)} style={{padding:"5px 12px",borderRadius:7,border:"1px solid #E8E4DE",background:"#FFF",color:"#333",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              + Add group
            </button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
            {groups.map(g=>(
              <GroupCard key={g.id} group={g} members={members} onUpdate={updateGroup} onDelete={deleteGroup}/>
            ))}
            {/* Pre-trip debt static card */}
            <div style={{background:"#FFF",border:"1px solid #E8E4DE",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:18}}>🔁</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:"#555"}}>Pre-trip Debt</div>
                <div style={{fontSize:11,color:"#AAA"}}>
                  {members.find(m=>m.id===preTrip.from)?.name} owes {members.find(m=>m.id===preTrip.to)?.name}
                </div>
              </div>
              <div style={{fontSize:13,fontWeight:800,color:"#888"}}>{fmt(preTrip.amount)}</div>
            </div>
          </div>
        </div>

        {/* COL 2: Settlement — 25% (swapped) */}
        <div style={{width:"25%",borderRight:"1px solid #E8E4DE",display:"flex",flexDirection:"column",background:"#F7F5F1"}}>
          {/* Column header with toggle inside */}
          <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #E8E4DE",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,fontWeight:800,color:"#1A1A1A"}}>Balances</div>
              <div style={{fontSize:11,color:"#999",marginTop:1}}>{settleMode==="live"?"Trip positions":"Who pays whom"}</div>
            </div>
            {/* Toggle lives here now */}
            <div style={{display:"flex",background:"#EEEBE6",borderRadius:7,padding:2}}>
              {["live","settle"].map(mode=>(
                <button key={mode} onClick={()=>setSettleMode(mode)} style={{
                  padding:"3px 10px",borderRadius:5,border:"none",cursor:"pointer",
                  fontSize:10,fontWeight:600,
                  background:settleMode===mode?"#FFF":"transparent",
                  color:settleMode===mode?"#1A1A1A":"#999",
                  transition:"all 0.15s",boxShadow:settleMode===mode?"0 1px 2px rgba(0,0,0,0.08)":"none"
                }}>{mode==="live"?"Live":"Settle"}</button>
              ))}
            </div>
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
            {settleMode==="live"?(
              <>
                {members.map(m=>{
                  const net=balances.tripNet[m.id];
                  const isPos=net>0.01, isNeg=net<-0.01;
                  return(
                    <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,padding:"9px 11px",borderRadius:8,background:"#FFF",border:"1px solid #E8E4DE"}}>
                      <Avatar member={m} size={24}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:600,color:"#222"}}>{m.name.split(" ")[0]}</div>
                        <div style={{fontSize:10,color:"#AAA",marginTop:1}}>{isPos?"overpaid":isNeg?"underpaid":"even"}</div>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:isPos?"#2A7A40":isNeg?"#B83010":"#999"}}>
                        {isPos?"+":isNeg?"-":""}{fmtShort(Math.abs(net))}
                      </span>
                    </div>
                  );
                })}
                {/* Pre-trip debt note */}
                <div style={{marginTop:10,padding:"9px 11px",borderRadius:8,background:"#FFF",border:"1px solid #E8E4DE"}}>
                  <div style={{fontSize:10,color:"#AAA",fontWeight:600,marginBottom:3,textTransform:"uppercase",letterSpacing:0.4}}>Pre-trip debt</div>
                  <div style={{fontSize:12,color:"#555"}}>
                    <span style={{fontWeight:700,color:members.find(m=>m.id===preTrip.from)?.color}}>{members.find(m=>m.id===preTrip.from)?.name}</span>
                    <span style={{color:"#999"}}> owes </span>
                    <span style={{fontWeight:700,color:members.find(m=>m.id===preTrip.to)?.color}}>{members.find(m=>m.id===preTrip.to)?.name}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:"#444",marginTop:3}}>{fmt(preTrip.amount)}</div>
                </div>
              </>
            ):(
              <>
                {balances.transactions.map((t,i)=>{
                  const f=members.find(m=>m.id===t.from), to=members.find(m=>m.id===t.to);
                  return(
                    <div key={i} style={{marginBottom:8,padding:"10px 12px",borderRadius:8,background:"#FFF",border:"1px solid #E8E4DE"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        <span style={{fontSize:10,fontWeight:700,color:"#999",width:16}}>#{i+1}</span>
                        <Avatar member={f} size={20}/>
                        <span style={{fontSize:11,color:"#CCC",marginLeft:1}}>→</span>
                        <Avatar member={to} size={20}/>
                        <span style={{fontSize:11,color:"#555",marginLeft:2}}>{f?.name.split(" ")[0]} → {to?.name.split(" ")[0]}</span>
                      </div>
                      <div style={{fontSize:16,fontWeight:700,color:"#1A1A1A",textAlign:"right"}}>{fmt(t.amount)}</div>
                    </div>
                  );
                })}
                <div style={{marginTop:4,padding:"9px 11px",borderRadius:8,background:"#FFF",border:"1px solid #E8E4DE"}}>
                  <div style={{fontSize:11,color:"#888"}}>All {members.length} members settle with <strong>{balances.transactions.length}</strong> transfer{balances.transactions.length!==1?"s":""}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* COL 3: Trip overview — 25% (swapped) */}
        <div style={{width:"25%",display:"flex",flexDirection:"column",background:"#F7F5F1"}}>
          <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #E8E4DE"}}>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,fontWeight:800,color:"#1A1A1A"}}>Overview</div>
            <div style={{fontSize:11,color:"#999",marginTop:1}}>Spend per person</div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>

            {/* Grand total — subtle, readable */}
            <div style={{marginBottom:18,padding:"12px 14px",borderRadius:8,background:"#FFF",border:"1px solid #E8E4DE"}}>
              <div style={{fontSize:10,color:"#AAA",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Grand total</div>
              <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                <span style={{fontFamily:"'Nunito',sans-serif",fontSize:22,fontWeight:800,color:"#1A1A1A",lineHeight:1}}>{fmt(grandTotal)}</span>
              </div>
              <div style={{fontSize:11,color:"#AAA",marginTop:4}}>{groups.length} expense groups · {members.length} people</div>
            </div>

            {/* Share bars */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:600,color:"#AAA",letterSpacing:0.5,marginBottom:10,textTransform:"uppercase"}}>Each person's share</div>
              {members.map(m=><MemberBar key={m.id} member={m} value={balances.owed[m.id]} max={maxSpend}/>)}
            </div>

            {/* Paid vs owed rows */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:"#AAA",letterSpacing:0.5,marginBottom:8,textTransform:"uppercase"}}>Paid vs owed</div>
              {members.map(m=>{
                const paid=balances.paid[m.id], owed=balances.owed[m.id], net=paid-owed;
                const isPos=net>0.01, isNeg=net<-0.01;
                return(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,padding:"8px 10px",borderRadius:8,background:"#FFF",border:"1px solid #E8E4DE"}}>
                    <Avatar member={m} size={24}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:600,color:"#222"}}>{m.name.split(" ")[0]}</div>
                      <div style={{fontSize:10,color:"#AAA"}}>paid {fmtShort(paid)}</div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:isPos?"#2A7A40":isNeg?"#B83010":"#999"}}>
                      {isPos?"+":isNeg?"-":""}{fmtShort(Math.abs(net))}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {showAdd&&<AddGroupModal members={members} onAdd={addGroup} onClose={()=>setShowAdd(false)}/>}
      {showSettings&&<TripSettingsModal tripName={tripName} members={members} onSave={saveSettings} onClose={()=>setShowSettings(false)}/>}
    </div>
  );
}
