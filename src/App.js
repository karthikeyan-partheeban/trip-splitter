import { useState } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────
const MEMBER_COLORS = ["#C17D3C","#3C7DC1","#7C3CC1","#3CC17D","#C13C6A","#3CC1B8","#C1A03C","#6A3CC1"];

const DATASET_1_MEMBERS = [
  { id: "K", name: "Avery",  color: "#C17D3C", initials: "AV" },
  { id: "J", name: "Jordan", color: "#3C7DC1", initials: "JO" },
  { id: "S", name: "Sam",    color: "#7C3CC1", initials: "SA" },
  { id: "Y", name: "Riley",  color: "#3CC17D", initials: "RI" },
];

const DATASET_1_GROUPS = [
  { id:"g1", label:"Flight Tickets",      emoji:"\u2708\uFE0F", paidBy:"J", total:76621,    note:"Paid for three travelers",        shares:{K:25540.33,J:25540.33,S:25540.34,Y:0} },
  { id:"g2", label:"Solo Ticket",         emoji:"\uD83C\uDF9F\uFE0F", paidBy:"Y", total:24392,    note:"One person expense",              shares:{K:0,J:0,S:0,Y:24392} },
  { id:"g3", label:"Common Cash",         emoji:"\uD83D\uDCB5", paidBy:"J", total:34014.83, note:"Shared equally among all 4",     shares:{K:8503.71,J:8503.71,S:8503.71,Y:8503.70} },
  { id:"g4", label:"ATM Cash",            emoji:"\uD83C\uDFE7", paidBy:"Y", total:20826,    note:"Individual spend by person",      shares:{K:7480.74,J:4448.42,S:4448.42,Y:4448.42} },
  { id:"g5", label:"Souvenirs",           emoji:"\uD83D\uDED2", paidBy:"Y", total:6840,     note:"Per person souvenir spend",       shares:{K:3710.11,J:0,S:777.89,Y:2352} },
  { id:"g6", label:"Hotels (3 Nights)",   emoji:"\uD83C\uDFE8", paidBy:"K", total:28526.11, note:"Split equally",                  shares:{K:7131.53,J:7131.53,S:7131.53,Y:7131.52} },
  { id:"g7", label:"Shared Cash",         emoji:"\uD83D\uDCB0", paidBy:"K", total:39231,    note:"Split equally among all",         shares:{K:9807.75,J:9807.75,S:9807.75,Y:9807.75} },
];

const DATASET_1_EXISTING_DEBTS = [{ id:"d1", from:"J", to:"K", amount:40000 }];
const DATASET_1_TRIP_NAME = "Thailand Trip";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt      = n => "₹" + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtShort = n => "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits:0 });

function makeInitials(name) {
  const w = name.trim().split(/\s+/);
  return w.length >= 2 ? (w[0][0]+w[1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
}

function cloneData(data){
  return JSON.parse(JSON.stringify(data));
}

function computeBalances(members, groups, existingDebts=[]) {
  const paid={}, owed={};
  members.forEach(m => { paid[m.id]=0; owed[m.id]=0; });
  groups.forEach(g => {
    if (paid[g.paidBy] !== undefined) paid[g.paidBy] += g.total;
    members.forEach(m => { owed[m.id] += (g.shares[m.id]||0); });
  });
  const tripNet={};
  members.forEach(m => { tripNet[m.id] = paid[m.id]-owed[m.id]; });
  const finalNet={...tripNet};
  existingDebts.forEach(d => {
    if (!d || d.from===d.to || !d.amount || d.amount<=0) return;
    if (finalNet[d.to]   !== undefined) finalNet[d.to]   += d.amount;
    if (finalNet[d.from] !== undefined) finalNet[d.from] -= d.amount;
  });

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
function MemberBar({member,value,max,textColor="#2C2C2C",valueColor="#1A1A1A",trackColor="#F0EDE8"}){
  const pct=max>0?Math.min(100,Math.abs(value)/max*100):0;
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
      <Avatar member={member} size={26}/>
      <div style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{fontSize:11,fontWeight:600,color:textColor}}>{member.name}</span>
          <span style={{fontSize:11,fontWeight:700,color:valueColor}}>{fmtShort(value)}</span>
        </div>
        <div style={{height:4,background:trackColor,borderRadius:2,overflow:"hidden"}}>
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
          <div style={{fontSize:11,color:"#666",marginTop:1}}>
            Paid by <span style={{color:payer?.color,fontWeight:600}}>{payer?.name}</span>
            {group.note&&<span style={{color:"#999"}}> · {group.note}</span>}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1A1A1A"}}>{fmt(group.total)}</div>
          {diff>0.5&&<div style={{fontSize:10,color:"#E07020",fontWeight:600}}>⚠ Δ {fmt(diff)}</div>}
        </div>
        <span style={{fontSize:14,color:"#888",marginLeft:4,transition:"transform 0.2s",transform:expanded?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
      </div>

      {expanded&&!editing&&(
        <div style={{borderTop:"1px solid #E8E4DE",padding:"10px 14px 12px",background:"#FAFAFA"}}>
          <div style={{marginBottom:10}}>
            {members.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,padding:"6px 10px",borderRadius:7,background:(group.shares[m.id]||0)>0?m.color+"0D":"#F9F6F1",border:`1px solid ${(group.shares[m.id]||0)>0?m.color+"25":"#EDE8E0"}`}}>
                <Avatar member={m} size={22}/>
                <span style={{flex:1,fontSize:12,fontWeight:600,color:"#333"}}>{m.name}</span>
                <span style={{fontSize:13,fontWeight:700,color:(group.shares[m.id]||0)>0?m.color:"#AAA"}}>
                  {(group.shares[m.id]||0)>0?fmt(group.shares[m.id]):"—"}
                </span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={startEdit} style={{flex:1,padding:"6px 12px",borderRadius:6,border:"1px solid #BBB",background:"#FFF",fontSize:12,fontWeight:600,color:"#444",cursor:"pointer"}}>Edit</button>
            <button onClick={()=>onDelete(group.id)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #FCC",background:"#FFF8F8",fontSize:12,fontWeight:600,color:"#C44",cursor:"pointer"}}>Delete</button>
          </div>
        </div>
      )}

      {expanded&&editing&&draft&&(
        <div style={{borderTop:"1px solid #E8E4DE",padding:"12px 14px 14px",background:"#FAFAFA"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div>
              <label style={{fontSize:10,color:"#666",fontWeight:600,display:"block",marginBottom:3}}>LABEL</label>
              <input value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:12,boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#666",fontWeight:600,display:"block",marginBottom:3}}>TOTAL (₹)</label>
              <input type="number" value={draft.total} onChange={e=>setDraft({...draft,total:parseFloat(e.target.value)||0})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:12,boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#666",fontWeight:600,display:"block",marginBottom:3}}>PAID BY</label>
              <select value={draft.paidBy} onChange={e=>setDraft({...draft,paidBy:e.target.value})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:12,boxSizing:"border-box"}}>
                {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:"#666",fontWeight:600,display:"block",marginBottom:3}}>NOTE</label>
              <input value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:12,boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <label style={{fontSize:10,color:"#666",fontWeight:600}}>SHARES (₹)</label>
              <button onClick={()=>setDraft(splitEqual(draft))} style={{fontSize:10,padding:"3px 8px",borderRadius:5,border:"1px solid #BBB",background:"#FFF",cursor:"pointer",color:"#444",fontWeight:600}}>Split equally</button>
            </div>
            {members.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,padding:"6px 10px",borderRadius:7,background:"#F9F6F1",border:"1px solid #EDE8E0"}}>
                <Avatar member={m} size={22}/>
                <span style={{fontSize:12,fontWeight:600,color:"#333",flex:1}}>{m.name}</span>
                <input type="number" value={draft.shares[m.id]??0} onChange={e=>setDraft({...draft,shares:{...draft.shares,[m.id]:parseFloat(e.target.value)||0}})} style={{width:90,padding:"4px 8px",borderRadius:5,border:"1px solid #BBB",fontSize:12,textAlign:"right"}}/>
              </div>
            ))}
            {Math.abs(draft.total-Object.values(draft.shares).reduce((a,b)=>a+b,0))>0.5&&(
              <div style={{fontSize:11,color:"#E07020",marginTop:4,fontWeight:600}}>⚠ Shares sum to {fmt(Object.values(draft.shares).reduce((a,b)=>a+b,0))} — total is {fmt(draft.total)}</div>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={saveEdit} style={{flex:1,padding:"7px 12px",borderRadius:6,border:"none",background:"#2C2C2C",color:"#FFF",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save changes</button>
            <button onClick={cancelEdit} style={{padding:"7px 12px",borderRadius:6,border:"1px solid #BBB",background:"#FFF",fontSize:12,fontWeight:600,color:"#666",cursor:"pointer"}}>Cancel</button>
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

  const inputStyle={padding:"6px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:12,boxSizing:"border-box",width:"100%"};
  const labelStyle={fontSize:10,color:"#666",fontWeight:600,display:"block",marginBottom:3,letterSpacing:0.3,textTransform:"uppercase"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#FFF",borderRadius:14,padding:24,width:440,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:800,fontFamily:"'Nunito',sans-serif"}}>Add Expense Group</h3>
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:18,cursor:"pointer",color:"#777",lineHeight:1}}>✕</button>
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
                <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${form.splitMode===mode.id?"#3C7DC1":"#AAA"}`,
                  background:form.splitMode===mode.id?"#3C7DC1":"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                  {form.splitMode===mode.id&&<div style={{width:6,height:6,borderRadius:"50%",background:"#FFF"}}/>}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#1A1A1A"}}>{mode.label}</div>
                  <div style={{fontSize:11,color:"#666",marginTop:1}}>{mode.desc}</div>
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
                      <div style={{fontSize:10,color:"#888"}}>
                        shared {fmt(sharedAmt/members.length)}
                        {(form.personal[m.id]||0)>0&&<span style={{color:"#C17D3C"}}> + personal {fmt(form.personal[m.id])}</span>}
                      </div>
                    )}
                  </div>
                  <input type="number" placeholder="0"
                    value={form.personal[m.id]||""}
                    onChange={e=>setForm(f=>({...f,personal:{...f.personal,[m.id]:parseFloat(e.target.value)||0}}))}
                    style={{width:90,padding:"5px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:13,textAlign:"right",fontWeight:600}}/>
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
                <div style={{fontSize:10,color:"#666",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Final total per person</div>
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
                style={{fontSize:10,padding:"3px 10px",borderRadius:5,border:"1px solid #BBB",background:"#F9F6F1",cursor:"pointer",fontWeight:600,color:"#444"}}>
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
                  style={{width:100,padding:"5px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:13,textAlign:"right",fontWeight:600}}/>
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
          background:form.label&&form.total?"#2C2C2C":"#AAA",color:"#FFF",fontSize:13,fontWeight:700,cursor:"pointer"}}>
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
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:18,cursor:"pointer",color:"#777"}}>✕</button>
        </div>

        {/* Trip name */}
        <div style={{marginBottom:22}}>
          <label style={{fontSize:10,color:"#666",fontWeight:700,display:"block",marginBottom:5,letterSpacing:0.5,textTransform:"uppercase"}}>Trip Name</label>
          <input
            value={name} onChange={e=>setName(e.target.value)}
            placeholder="e.g. Thailand 2025"
            style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #BBB",fontSize:14,fontWeight:600,boxSizing:"border-box",fontFamily:"'Nunito',sans-serif"}}
          />
        </div>

        {/* People */}
        <div style={{marginBottom:20}}>
          <label style={{fontSize:10,color:"#666",fontWeight:700,display:"block",marginBottom:8,letterSpacing:0.5,textTransform:"uppercase"}}>People on the trip ({people.length})</label>
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
              style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1px dashed #AAA",fontSize:12,boxSizing:"border-box",background:"#FAFAFA"}}
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
function ExistingDebtsModal({members,debts,onSave,onClose}){
  const [rows,setRows]=useState(
    debts.length
      ? debts.map(d=>({id:d.id||("d"+Date.now()+Math.random()),from:d.from,to:d.to,amount:d.amount}))
      : [{id:"d"+Date.now(),from:members[0]?.id||"",to:members[1]?.id||members[0]?.id||"",amount:0}]
  );

  function addRow(){
    setRows(r=>[...r,{
      id:"d"+Date.now()+Math.random(),
      from:members[0]?.id||"",
      to:members[1]?.id||members[0]?.id||"",
      amount:0
    }]);
  }
  function updateRow(id,patch){
    setRows(r=>r.map(row=>row.id===id?{...row,...patch}:row));
  }
  function removeRow(id){
    setRows(r=>r.filter(row=>row.id!==id));
  }
  function save(){
    const cleaned = rows
      .map(r=>({...r,amount:parseFloat(r.amount)||0}))
      .filter(r=>r.from && r.to && r.from!==r.to && r.amount>0.01);
    onSave(cleaned);
    onClose();
  }

  const total = rows.reduce((s,r)=>s+(parseFloat(r.amount)||0),0);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#FFF",borderRadius:14,padding:24,width:520,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:800,fontFamily:"'Nunito',sans-serif"}}>Existing Debts</h3>
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:18,cursor:"pointer",color:"#777"}}>✕</button>
        </div>
        <div style={{fontSize:11,color:"#666",marginBottom:10}}>
          Add debts like "A owes B". These will be included in final settlement.
        </div>

        {rows.map((row,idx)=>(
          <div key={row.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,alignItems:"end",marginBottom:8,padding:"10px 10px",borderRadius:8,background:"#F9F6F1",border:"1px solid #E8E4DE"}}>
            <div>
              <label style={{fontSize:10,color:"#666",fontWeight:600,display:"block",marginBottom:3}}>From</label>
              <select value={row.from} onChange={e=>updateRow(row.id,{from:e.target.value})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:12,boxSizing:"border-box"}}>
                {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:"#666",fontWeight:600,display:"block",marginBottom:3}}>To</label>
              <select value={row.to} onChange={e=>updateRow(row.id,{to:e.target.value})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:12,boxSizing:"border-box"}}>
                {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:"#666",fontWeight:600,display:"block",marginBottom:3}}>Amount (₹)</label>
              <input type="number" value={row.amount} onChange={e=>updateRow(row.id,{amount:e.target.value})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:12,boxSizing:"border-box"}}/>
            </div>
            <button onClick={()=>removeRow(row.id)} title={`Remove debt ${idx+1}`} style={{width:26,height:26,border:"none",borderRadius:"50%",background:"#FEE",color:"#C44",cursor:"pointer",fontSize:14,lineHeight:1,padding:0}}>×</button>
          </div>
        ))}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:2,marginBottom:14}}>
          <button onClick={addRow} style={{padding:"6px 12px",borderRadius:7,border:"1px solid #E8E4DE",background:"#FFF",color:"#333",fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Add debt</button>
          <div style={{fontSize:12,color:"#444",fontWeight:700}}>Total debt: {fmt(total)}</div>
        </div>

        <button onClick={save} style={{width:"100%",padding:"10px",borderRadius:8,border:"none",background:"#2C2C2C",color:"#FFF",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          Save Existing Debts
        </button>
      </div>
    </div>
  );
}

function ResetDataModal({onClose,onConfirm}){
  const [consent,setConsent]=useState(false);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#FFF",borderRadius:14,padding:22,width:440,maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:800,fontFamily:"'Nunito',sans-serif"}}>Reset Data</h3>
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:18,cursor:"pointer",color:"#777"}}>✕</button>
        </div>
        <div style={{fontSize:13,color:"#444",lineHeight:1.5,background:"#FFF8F0",border:"1px solid #F0D8C0",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
          This action will permanently clear your current trip details, groups, balances, and existing debts.
          <br/>
          You can still load sample data anytime from the empty-state card in Expense Groups.
        </div>
        <label style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:12,color:"#444",marginBottom:14,cursor:"pointer"}}>
          <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} style={{marginTop:2}}/>
          <span>I consent and understand that all current changes will be lost.</span>
        </label>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"8px 12px",borderRadius:7,border:"1px solid #BBB",background:"#FFF",fontSize:12,fontWeight:600,color:"#444",cursor:"pointer"}}>Cancel</button>
          <button disabled={!consent} onClick={onConfirm} style={{padding:"8px 12px",borderRadius:7,border:"none",background:consent?"#B83010":"#AAA",color:"#FFF",fontSize:12,fontWeight:700,cursor:consent?"pointer":"not-allowed"}}>Proceed Reset</button>
        </div>
      </div>
    </div>
  );
}

export default function TripSplitter(){
  const [tripName,setTripName]         = useState(DATASET_1_TRIP_NAME);
  const [members,setMembers]           = useState(cloneData(DATASET_1_MEMBERS));
  const [groups,setGroups]             = useState(cloneData(DATASET_1_GROUPS));
  const [existingDebts,setExistingDebts] = useState(cloneData(DATASET_1_EXISTING_DEBTS));
  const [settleMode,setSettleMode]     = useState("live");
  const [showAdd,setShowAdd]           = useState(false);
  const [showSettings,setShowSettings] = useState(false);
  const [showExistingDebts,setShowExistingDebts] = useState(false);
  const [themeMode,setThemeMode]       = useState("light");
  const [showReset,setShowReset]       = useState(false);

  const balances   = computeBalances(members,groups,existingDebts);
  const grandTotal = groups.reduce((s,g)=>s+g.total,0);
  const maxSpend   = Math.max(...members.map(m=>balances.owed[m.id]),1);
  const isDark     = themeMode==="dark";
  const hasAnyData = groups.length>0 || existingDebts.length>0;

  const theme = isDark
    ? {
        appBg:"#151515", panelBg:"#1F1F1F", softBg:"#252525", topBg:"#000000",
        text:"#EAEAEA", muted:"#BEBEBE", border:"#3A3A3A", accentBg:"#2F2A20", accentBorder:"#5B4A33",
        topText:"#F4F7FB", topMuted:"#AFC3D8", topChipBg:"#13263B", topChipBorder:"#284666"
      }
    : {
        appBg:"#F7F5F1", panelBg:"#FFF", softBg:"#F7F5F1", topBg:"#000000",
        text:"#1A1A1A", muted:"#777", border:"#E8E4DE", accentBg:"#F2E8DA", accentBorder:"#DDCFBA",
        topText:"#F4F7FB", topMuted:"#AFC3D8", topChipBg:"#1A3148", topChipBorder:"#355574"
      };

  function updateGroup(u){ setGroups(gs=>gs.map(g=>g.id===u.id?u:g)); }
  function deleteGroup(id){ setGroups(gs=>gs.filter(g=>g.id!==id)); }
  function addGroup(g){ setGroups(gs=>[...gs,g]); }
  function loadDataset1(){
    setTripName(DATASET_1_TRIP_NAME);
    setMembers(cloneData(DATASET_1_MEMBERS));
    setGroups(cloneData(DATASET_1_GROUPS));
    setExistingDebts(cloneData(DATASET_1_EXISTING_DEBTS));
  }
  function resetAllData(){
    setTripName("New Trip");
    setMembers(DATASET_1_MEMBERS.map(m=>({...m,name:"",initials:"--"})));
    setGroups([]);
    setExistingDebts([]);
    setShowReset(false);
  }
  function saveSettings(name,people){
    setTripName(name);
    setMembers(people);
    const validIds = new Set(people.map(p=>p.id));
    setExistingDebts(ds=>ds.filter(d=>validIds.has(d.from) && validIds.has(d.to) && d.from!==d.to && d.amount>0));
    setShowSettings(false);
  }

  function handlePrint(){
    const style=`<style>
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=Inter:wght@400;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',sans-serif;background:#FFFCF8;color:#1A1A1A;padding:32px;font-size:13px}
      h1{font-family:'Nunito',sans-serif;font-size:26px;margin-bottom:4px}
      .sub{font-size:12px;color:#666;margin-bottom:28px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{background:#2C2C2C;color:#FFF;padding:8px 12px;font-size:11px;text-align:left}
      td{padding:8px 12px;border-bottom:1px solid #EDE8E0}
      .sec{font-size:10px;font-weight:700;letter-spacing:1px;color:#666;text-transform:uppercase;margin:20px 0 8px}
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
    <div className={isDark?"dark-mode":""} style={{minHeight:"100vh",background:theme.appBg,color:theme.text,fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#D4CFC6;border-radius:4px}
        button:hover{opacity:0.85}
        input:focus,select:focus{outline:2px solid #C17D3C40;border-color:#C17D3C!important}
        .dark-mode .col2{background:#252525!important}
        .dark-mode .col2 [style*="background:#FFF"],
        .dark-mode .col3 [style*="background:#FFF"]{background:#1F1F1F!important}
        .dark-mode .col2 [style*="border:\"1px solid #E8E4DE\""],
        .dark-mode .col3 [style*="border:\"1px solid #E8E4DE\""],
        .dark-mode .col2 [style*="borderBottom:\"1px solid #E8E4DE\""],
        .dark-mode .col2 [style*="borderRight:\"1px solid #E8E4DE\""]{border-color:#3A3A3A!important}
        .dark-mode .col2 [style*="color:#1A1A1A"],
        .dark-mode .col2 [style*="color:#222"],
        .dark-mode .col2 [style*="color:#444"],
        .dark-mode .col3 [style*="color:#1A1A1A"],
        .dark-mode .col3 [style*="color:#222"],
        .dark-mode .col3 [style*="color:#444"]{color:#EAEAEA!important}
        .dark-mode .col2 [style*="color:#666"],
        .dark-mode .col2 [style*="color:#777"],
        .dark-mode .col2 [style*="color:#888"],
        .dark-mode .col2 [style*="color:#999"],
        .dark-mode .col2 [style*="color:#AAA"],
        .dark-mode .col3 [style*="color:#666"],
        .dark-mode .col3 [style*="color:#777"],
        .dark-mode .col3 [style*="color:#888"],
        .dark-mode .col3 [style*="color:#999"]{color:#BEBEBE!important}
      `}</style>

      {/* ── TOP BAR ──────────────────────────────────────────────────────────── */}
      {/* Header */}
      <div style={{background:theme.topBg,borderBottom:`1px solid ${theme.topChipBorder}`,boxShadow:"0 10px 28px rgba(0,0,0,0.21)",padding:"0 20px",height:62,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:14,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:9,paddingRight:8,borderRight:`1px solid ${theme.topChipBorder}`}}>
            <div style={{width:24,height:24,borderRadius:8,background:"radial-gradient(circle at 30% 30%, #8ED1FF 0%, #3B82F6 58%, #173964 100%)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.24)"}}>
              <span style={{fontSize:13,filter:"drop-shadow(0 1px 1px rgba(0,0,0,0.35))"}}>✈</span>
            </div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:20,fontWeight:800,color:theme.topText,lineHeight:1}}>Trip Expense Planner</div>
          </div>
          <button onClick={()=>setShowSettings(true)} style={{background:theme.topChipBg,border:`1px solid ${theme.topChipBorder}`,borderRadius:999,padding:"7px 12px",display:"flex",alignItems:"center",gap:7,cursor:"pointer",color:theme.topText,minWidth:0}}>
            <span style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:140}}>{tripName}</span>
            <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",color:theme.topMuted}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.3 18.5 6.5L17.5 5.5C16.7 4.7 15.3 4.7 14.5 5.5L4 16V20Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          </button>
          <div style={{display:"flex",alignItems:"center",marginLeft:2}}>
            {members.map((m,idx)=>(
              <span key={m.id} style={{marginLeft:idx===0?0:-7}}>
                <Avatar member={m} size={26}/>
              </span>
            ))}
            <button onClick={()=>setShowSettings(true)} title="Trip settings" style={{marginLeft:7,width:26,height:26,borderRadius:"50%",border:`1px dashed ${theme.topMuted}`,background:"transparent",color:theme.topMuted,fontSize:14,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",padding:0}}>
              +
            </button>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setThemeMode(m=>m==="light"?"dark":"light")} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 10px",borderRadius:999,border:`1px solid ${theme.topChipBorder}`,background:theme.topChipBg,color:theme.topText,fontSize:11,fontWeight:700,cursor:"pointer"}}>
            <span style={{fontSize:10,color:theme.topMuted}}>{isDark?"Dark":"Light"}</span>
            <span style={{width:34,height:18,borderRadius:999,background:isDark?"#4B3626":"#D6D0C6",position:"relative",display:"inline-block"}}>
              <span style={{position:"absolute",top:2,left:isDark?18:2,width:14,height:14,borderRadius:"50%",background:isDark?"#E1B07A":"#FFF",boxShadow:"0 1px 2px rgba(0,0,0,0.25)",transition:"left 0.2s ease"}}/>
            </span>
          </button>
          <button onClick={handlePrint} style={{padding:"6px 12px",borderRadius:999,border:`1px solid ${theme.topChipBorder}`,background:theme.topChipBg,color:theme.topText,fontSize:11,fontWeight:600,cursor:"pointer"}}>
            Export PDF
          </button>
          <button onClick={()=>setShowReset(true)} style={{padding:"6px 12px",borderRadius:999,border:`1px solid #7A2B2B`,background:isDark?"#3B1818":"#5A1F1F",color:"#FFD9D4",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            Reset
          </button>
        </div>
        </div>
      
      {/* ── THREE COLUMNS ──────────────────────────────────────────────────────── */}
      <div style={{display:"flex",height:"calc(100vh - 66px)",overflow:"hidden",paddingTop:4}}>

                {/* COL 1: Groups - 50% */}
        <div style={{width:"50%",borderRight:`1px solid ${theme.border}`,display:"flex",flexDirection:"column",background:theme.panelBg}}>
          <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${theme.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,fontWeight:800,color:theme.text}}>Expense Groups</div>
              <div style={{fontSize:11,color:theme.muted,marginTop:1}}>{groups.length} groups - click to expand and edit inline</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowExistingDebts(true)} style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${theme.border}`,background:theme.panelBg,color:theme.text,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Existing Debts
              </button>
              <button onClick={()=>setShowAdd(true)} style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${theme.border}`,background:theme.panelBg,color:theme.text,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                + Add group
              </button>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
            {groups.length===0&&(
              <div style={{background:theme.panelBg,border:`1px dashed ${theme.border}`,borderRadius:8,padding:"12px 14px",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:theme.text,marginBottom:4}}>No expense groups yet</div>
                <div style={{fontSize:11,color:theme.muted,lineHeight:1.5}}>
                  Start by adding people in settings, then click <strong>+ Add group</strong> to add expenses and split amounts.
                </div>
                <button onClick={loadDataset1} style={{marginTop:10,padding:"7px 12px",borderRadius:7,border:`1px solid ${theme.border}`,background:theme.softBg,color:theme.text,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  Load sample data
                </button>
              </div>
            )}
            {groups.map(g=>(
              <GroupCard key={g.id} group={g} members={members} onUpdate={updateGroup} onDelete={deleteGroup}/>
            ))}
            <div style={{background:theme.panelBg,border:`1px solid ${theme.border}`,borderRadius:8,padding:"10px 14px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:700,color:theme.text}}>Existing Debts</div>
                <div style={{fontSize:11,color:theme.muted,fontWeight:700}}>{existingDebts.length} item{existingDebts.length===1?"":"s"}</div>
              </div>
              {existingDebts.length===0?(
                <div style={{fontSize:11,color:theme.muted,lineHeight:1.5}}>
                  Add prior debts using the <strong>Existing Debts</strong> button above. These are included in final settlement.
                </div>
              ):(
                <>
                  {existingDebts.map(d=>(
                    <div key={d.id} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11,marginBottom:4,color:theme.muted}}>
                      <span>{members.find(m=>m.id===d.from)?.name||d.from} owes {members.find(m=>m.id===d.to)?.name||d.to}</span>
                      <span style={{fontWeight:700,color:theme.text}}>{fmt(d.amount)}</span>
                    </div>
                  ))}
                  <div style={{fontSize:12,fontWeight:800,color:theme.text,marginTop:4}}>
                    Total: {fmt(existingDebts.reduce((s,d)=>s+(d.amount||0),0))}
                  </div>
                </>
              )}
            </div>
          </div>
        

        </div>

        {/* COL 2: Settlement — 25% (swapped) */}
        <div className="col2" style={{width:"25%",borderRight:`1px solid ${theme.border}`,display:"flex",flexDirection:"column",background:theme.softBg}}>
          {/* Column header with toggle inside */}
          <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${theme.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,fontWeight:800,color:theme.text}}>Balances</div>
              <div style={{fontSize:11,color:theme.muted,marginTop:1}}>{settleMode==="live"?"Live overpaid/underpaid status":"Recommended settlement transfers"}</div>
            </div>
            {/* Toggle lives here now */}
            <div style={{display:"flex",background:isDark?"#303030":"#EEEBE6",borderRadius:7,padding:2}}>
              {["live","settle"].map(mode=>(
                <button key={mode} onClick={()=>setSettleMode(mode)} style={{
                  padding:"3px 10px",borderRadius:5,border:"none",cursor:"pointer",
                  fontSize:10,fontWeight:600,
                  background:settleMode===mode?(isDark?"#4A4A4A":"#FFF"):"transparent",
                  color:settleMode===mode?theme.text:theme.muted,
                  transition:"all 0.15s",boxShadow:settleMode===mode?"0 1px 2px rgba(0,0,0,0.08)":"none"
                }}>{mode==="live"?"Live":"Settle"}</button>
              ))}
            </div>
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
            {!hasAnyData?(
              <div style={{background:theme.panelBg,border:`1px dashed ${theme.border}`,borderRadius:8,padding:"12px 12px"}}>
                <div style={{fontSize:12,fontWeight:700,color:theme.text,marginBottom:4}}>No balances yet</div>
                <div style={{fontSize:11,color:theme.muted,lineHeight:1.5}}>
                  Add people, then create expense groups and optional existing debts to see live balances and settlement transfers.
                </div>
              </div>
            ):settleMode==="live"?(
              <>
                {members.map(m=>{
                  const net=balances.tripNet[m.id];
                  const isPos=net>0.01, isNeg=net<-0.01;
                  return(
                    <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,padding:"9px 11px",borderRadius:8,background:theme.panelBg,border:`1px solid ${theme.border}`}}>
                      <Avatar member={m} size={24}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:600,color:theme.text}}>{m.name.split(" ")[0]}</div>
                        <div style={{fontSize:10,color:theme.muted,marginTop:1}}>{isPos?"overpaid":isNeg?"underpaid":"even"}</div>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:isPos?"#2A7A40":isNeg?"#B83010":theme.muted}}>
                        {isPos?"+":isNeg?"-":""}{fmtShort(Math.abs(net))}
                      </span>
                    </div>
                  );
                })}
                {existingDebts.length>0&&(
                  <div style={{marginTop:10,padding:"9px 11px",borderRadius:8,background:theme.panelBg,border:`1px solid ${theme.border}`}}>
                    <div style={{fontSize:10,color:theme.muted,fontWeight:600,marginBottom:3,textTransform:"uppercase",letterSpacing:0.4}}>Existing debt (sample)</div>
                    <div style={{fontSize:12,color:theme.text}}>
                      <span style={{fontWeight:700,color:members.find(m=>m.id===existingDebts[0]?.from)?.color}}>{members.find(m=>m.id===existingDebts[0]?.from)?.name}</span>
                      <span style={{color:theme.muted}}> owes </span>
                      <span style={{fontWeight:700,color:members.find(m=>m.id===existingDebts[0]?.to)?.color}}>{members.find(m=>m.id===existingDebts[0]?.to)?.name}</span>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:theme.text,marginTop:3}}>{fmt((existingDebts[0]?.amount||0))}</div>
                  </div>
                )}
              </>
            ):(
              <>
                {balances.transactions.map((t,i)=>{
                  const f=members.find(m=>m.id===t.from), to=members.find(m=>m.id===t.to);
                  return(
                    <div key={i} style={{marginBottom:8,padding:"10px 12px",borderRadius:8,background:theme.panelBg,border:`1px solid ${theme.border}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        <span style={{fontSize:10,fontWeight:700,color:theme.muted,width:16}}>#{i+1}</span>
                        <Avatar member={f} size={20}/>
                        <span style={{fontSize:11,color:"#AAA",marginLeft:1}}>→</span>
                        <Avatar member={to} size={20}/>
                        <span style={{fontSize:11,color:"#444",marginLeft:2}}>{f?.name.split(" ")[0]} → {to?.name.split(" ")[0]}</span>
                      </div>
                      <div style={{fontSize:16,fontWeight:700,color:theme.text,textAlign:"right"}}>{fmt(t.amount)}</div>
                    </div>
                  );
                })}
                <div style={{marginTop:4,padding:"9px 11px",borderRadius:8,background:theme.panelBg,border:`1px solid ${theme.border}`}}>
                  <div style={{fontSize:11,color:theme.muted}}>All {members.length} members settle with <strong style={{color:theme.text}}>{balances.transactions.length}</strong> transfer{balances.transactions.length!==1?"s":""}</div>
                </div>
              </>
            )}
          </div>
        

        </div>

        {/* COL 3: Trip overview — 25% (swapped) */}
        <div className="col3" style={{width:"25%",display:"flex",flexDirection:"column",background:theme.softBg}}>
          <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${theme.border}`}}>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,fontWeight:800,color:theme.text}}>Overview</div>
            <div style={{fontSize:11,color:theme.muted,marginTop:1}}>Spend per person</div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
            {!hasAnyData&&(
              <div style={{marginBottom:12,padding:"12px 14px",borderRadius:8,background:theme.panelBg,border:`1px dashed ${theme.border}`}}>
                <div style={{fontSize:12,fontWeight:700,color:theme.text,marginBottom:4}}>Overview is empty</div>
                <div style={{fontSize:11,color:theme.muted,lineHeight:1.5}}>Add your first expense group to populate totals, per-person share, and paid-vs-owed cards here.</div>
              </div>
            )}

            {/* Grand total — subtle, readable */}
            <div style={{marginBottom:18,padding:"12px 14px",borderRadius:8,background:theme.accentBg,border:`1px solid ${theme.accentBorder}`}}>
              <div style={{fontSize:10,color:theme.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Grand total</div>
              <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                <span style={{fontFamily:"'Nunito',sans-serif",fontSize:22,fontWeight:800,color:theme.text,lineHeight:1}}>{fmt(grandTotal)}</span>
              </div>
              <div style={{fontSize:11,color:theme.muted,marginTop:4}}>{groups.length} expense groups · {members.length} people</div>
            </div>

            {/* Share bars */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:600,color:theme.muted,letterSpacing:0.5,marginBottom:10,textTransform:"uppercase"}}>Each person's share</div>
              {members.map(m=><MemberBar key={m.id} member={m} value={balances.owed[m.id]} max={maxSpend} textColor={theme.text} valueColor={theme.text} trackColor={isDark?"#3A3A3A":"#F0EDE8"}/>) }
            </div>

            {/* Paid vs owed rows */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:theme.muted,letterSpacing:0.5,marginBottom:8,textTransform:"uppercase"}}>Paid vs owed</div>
              {members.map(m=>{
                const paid=balances.paid[m.id], owed=balances.owed[m.id], net=paid-owed;
                const isPos=net>0.01, isNeg=net<-0.01;
                return(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,padding:"8px 10px",borderRadius:8,background:theme.panelBg,border:`1px solid ${theme.border}`}}>
                    <Avatar member={m} size={24}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:600,color:theme.text}}>{m.name.split(" ")[0]}</div>
                      <div style={{fontSize:10,color:theme.muted}}>paid {fmtShort(paid)}</div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:isPos?"#2A7A40":isNeg?"#B83010":theme.muted}}>
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
      {showExistingDebts&&<ExistingDebtsModal members={members} debts={existingDebts} onSave={setExistingDebts} onClose={()=>setShowExistingDebts(false)}/>}
      {showReset&&<ResetDataModal onClose={()=>setShowReset(false)} onConfirm={resetAllData}/>}
    </div>
  );
}





















