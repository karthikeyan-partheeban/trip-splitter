import { useState } from "react";
import { Analytics } from '@vercel/analytics/react';

// ─── DATA ────────────────────────────────────────────────────────────────────
const MEMBER_COLORS = ["#C17D3C","#3C7DC1","#7C3CC1","#3CC17D","#C13C6A","#3CC1B8","#C1A03C","#6A3CC1"];

const COMMON_CURRENCIES = [
  { code:"INR", name:"Indian Rupee",      symbol:"₹"  },
  { code:"USD", name:"US Dollar",         symbol:"$"  },
  { code:"EUR", name:"Euro",              symbol:"€"  },
  { code:"GBP", name:"British Pound",     symbol:"£"  },
  { code:"JPY", name:"Japanese Yen",      symbol:"¥"  },
  { code:"THB", name:"Thai Baht",         symbol:"฿"  },
  { code:"SGD", name:"Singapore Dollar",  symbol:"S$" },
  { code:"AUD", name:"Australian Dollar", symbol:"A$" },
  { code:"CAD", name:"Canadian Dollar",   symbol:"C$" },
  { code:"CHF", name:"Swiss Franc",       symbol:"Fr" },
  { code:"AED", name:"UAE Dirham",        symbol:"د.إ"},
  { code:"MYR", name:"Malaysian Ringgit", symbol:"RM" },
];

const DEFAULT_CURRENCIES = [
  { code:"INR", name:"Indian Rupee", symbol:"₹", rate:1, isBase:true },
];

const DATASET_1_MEMBERS = [
  { id: "K", name: "Avery",  color: "#C17D3C", initials: "AV" },
  { id: "J", name: "Jordan", color: "#3C7DC1", initials: "JO" },
  { id: "S", name: "Sam",    color: "#7C3CC1", initials: "SA" },
  { id: "Y", name: "Riley",  color: "#3CC17D", initials: "RI" },
];

const DATASET_1_GROUPS = [
  { id:"g1", label:"Flight Tickets",      emoji:"\u2708\uFE0F", paidBy:"J", total:76621,    currency:"INR", note:"Paid for three travelers",        shares:{K:25540.33,J:25540.33,S:25540.34,Y:0} },
  { id:"g2", label:"Solo Ticket",         emoji:"\uD83C\uDF9F\uFE0F", paidBy:"Y", total:24392,    currency:"INR", note:"One person expense",              shares:{K:0,J:0,S:0,Y:24392} },
  { id:"g3", label:"Common Cash",         emoji:"\uD83D\uDCB5", paidBy:"J", total:34014.83, currency:"INR", note:"Shared equally among all 4",     shares:{K:8503.71,J:8503.71,S:8503.71,Y:8503.70} },
  { id:"g4", label:"ATM Cash",            emoji:"\uD83C\uDFE7", paidBy:"Y", total:20826,    currency:"INR", note:"Individual spend by person",      shares:{K:7480.74,J:4448.42,S:4448.42,Y:4448.42} },
  { id:"g5", label:"Souvenirs",           emoji:"\uD83D\uDED2", paidBy:"Y", total:6840,     currency:"INR", note:"Per person souvenir spend",       shares:{K:3710.11,J:0,S:777.89,Y:2352} },
  { id:"g6", label:"Hotels (3 Nights)",   emoji:"\uD83C\uDFE8", paidBy:"K", total:28526.11, currency:"INR", note:"Split equally",                  shares:{K:7131.53,J:7131.53,S:7131.53,Y:7131.52} },
  { id:"g7", label:"Shared Cash",         emoji:"\uD83D\uDCB0", paidBy:"K", total:39231,    currency:"INR", note:"Split equally among all",         shares:{K:9807.75,J:9807.75,S:9807.75,Y:9807.75} },
];

const DATASET_1_EXISTING_DEBTS = [{ id:"d1", from:"J", to:"K", amount:40000 }];
const DATASET_1_TRIP_NAME = "Thailand Trip";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt      = (n, symbol="₹") => symbol + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtShort = (n, symbol="₹") => symbol + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits:0 });

function makeInitials(name) {
  const w = name.trim().split(/\s+/);
  return w.length >= 2 ? (w[0][0]+w[1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
}

function cloneData(data){
  return JSON.parse(JSON.stringify(data));
}

function computeBalances(members, groups, existingDebts=[], currencies=[]) {
  const toBase = (amount, code) => {
    if (!code || !currencies.length) return amount;
    const c = currencies.find(x => x.code === code);
    if (!c || c.isBase) return amount;
    return amount * c.rate;
  };
  const paid={}, owed={};
  members.forEach(m => { paid[m.id]=0; owed[m.id]=0; });
  groups.forEach(g => {
    if (paid[g.paidBy] !== undefined) paid[g.paidBy] += toBase(g.total, g.currency);
    members.forEach(m => { owed[m.id] += toBase(g.shares[m.id]||0, g.currency); });
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
function MemberBar({member,value,max,textColor="#2C2C2C",valueColor="#1A1A1A",trackColor="#F0EDE8",symbol="₹"}){
  const pct=max>0?Math.min(100,Math.abs(value)/max*100):0;
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
      <Avatar member={member} size={26}/>
      <div style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{fontSize:11,fontWeight:600,color:textColor}}>{member.name}</span>
          <span style={{fontSize:11,fontWeight:700,color:valueColor}}>{fmtShort(value,symbol)}</span>
        </div>
        <div style={{height:4,background:trackColor,borderRadius:2,overflow:"hidden"}}>
          <div style={{width:pct+"%",height:"100%",background:member.color,borderRadius:2,transition:"width 0.4s ease"}}/>
        </div>
      </div>
    </div>
  );
}

// ─── GROUP CARD ──────────────────────────────────────────────────────────────
function GroupCard({group,members,currencies=DEFAULT_CURRENCIES,onEdit,onDelete,isDark=false}){
  const [expanded,setExpanded]=useState(false);
  const payer=members.find(m=>m.id===group.paidBy);
  const totalShares=Object.values(group.shares).reduce((a,b)=>a+b,0);

  const baseCur  = currencies.find(c=>c.isBase) || {code:"INR",symbol:"₹",rate:1,isBase:true};
  const groupCur = currencies.find(c=>c.code===group.currency) || baseCur;
  const isConverted = !groupCur.isBase;
  const toBase = amt => isConverted ? amt * groupCur.rate : amt;
  const fmtBase = n => fmt(n, baseCur.symbol);
  const fmtGroup = n => fmt(n, groupCur.symbol);
  const diff = Math.abs(toBase(group.total) - toBase(totalShares));

  const card   = isDark?"#1F1F1F":"#FFF";
  const cardBdr= isDark?"1px solid #3A3A3A":"1px solid #E8E4DE";
  const expBg  = isDark?"#252525":"#FAFAFA";
  const rowBdr = isDark?"1px solid #3A3A3A":"1px solid #EDE8E0";
  const txt    = isDark?"#EAEAEA":"#1A1A1A";
  const muted  = isDark?"#BEBEBE":"#666";
  const inpBdr = isDark?"1px solid #444":"1px solid #BBB";
  const inpBg  = isDark?"#1A1A1A":"#FFF";

  return(
    <div style={{background:card,border:cardBdr,borderRadius:8,marginBottom:6,overflow:"hidden"}}>
      <div onClick={()=>setExpanded(e=>!e)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:18}}>{group.emoji}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:txt}}>{group.label}</div>
          <div style={{fontSize:11,color:muted,marginTop:1}}>
            Paid by <span style={{color:payer?.color,fontWeight:600}}>{payer?.name}</span>
            {group.note&&<span style={{color:isDark?"#888":"#999"}}> · {group.note}</span>}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:14,fontWeight:800,color:txt}}>{fmtBase(toBase(group.total))}</div>
          {isConverted&&<div style={{fontSize:10,color:muted,marginTop:1}}>{fmtGroup(group.total)} {groupCur.code}</div>}
          {diff>0.5&&<div style={{fontSize:10,color:"#E07020",fontWeight:600}}>⚠ Δ {fmtBase(diff)}</div>}
        </div>
        <span style={{fontSize:14,color:"#888",marginLeft:4,transition:"transform 0.2s",transform:expanded?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
      </div>

      {expanded&&(
        <div style={{borderTop:cardBdr,padding:"10px 14px 12px",background:expBg}}>
          <div style={{marginBottom:10,borderRadius:7,overflow:"hidden",border:rowBdr}}>
            {members.map((m,idx)=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:idx%2===0?(isDark?"#222222":"#F8F7F6"):(isDark?"#2A2A2A":"#FFFFFF"),borderBottom:idx<members.length-1?(isDark?"1px solid #303030":"1px solid #EFEFED"):"none"}}>
                <Avatar member={m} size={22}/>
                <span style={{flex:1,fontSize:12,fontWeight:600,color:txt}}>{m.name}</span>
                <span style={{fontSize:13,fontWeight:700,color:(group.shares[m.id]||0)>0?txt:isDark?"#555":"#BBB"}}>
                  {(group.shares[m.id]||0)>0?fmtBase(toBase(group.shares[m.id])):"—"}
                </span>
                {isConverted&&(group.shares[m.id]||0)>0&&(
                  <span style={{fontSize:10,color:muted,marginLeft:2}}>{fmtGroup(group.shares[m.id])}</span>
                )}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onEdit(group)} style={{flex:1,padding:"6px 12px",borderRadius:6,border:inpBdr,background:inpBg,fontSize:12,fontWeight:600,color:isDark?"#EAEAEA":"#444",cursor:"pointer"}}>Edit</button>
            <button onClick={()=>onDelete(group.id)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #FCC",background:"#FFF8F8",fontSize:12,fontWeight:600,color:"#C44",cursor:"pointer"}}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADD GROUP MODAL ──────────────────────────────────────────────────────────
function AddGroupModal({members,currencies=DEFAULT_CURRENCIES,initialGroup=null,onAdd,onClose}){
  const isEdit = !!initialGroup;
  const baseCur = currencies.find(c=>c.isBase) || currencies[0] || {code:"INR",symbol:"₹"};
  const [form,setForm]=useState(isEdit ? {
    label:     initialGroup.label,
    emoji:     initialGroup.emoji,
    paidBy:    initialGroup.paidBy,
    total:     String(initialGroup.total),
    note:      initialGroup.note||"",
    currency:  initialGroup.currency||baseCur.code,
    splitMode: "custom",
    sharedAmount: String(initialGroup.total),
    personal:  {...initialGroup.shares},
  } : {
    label:"",emoji:"💳",paidBy:members[0]?.id||"",total:"",note:"",
    currency:baseCur.code,
    splitMode:"equal",
    sharedAmount:"",
    personal:Object.fromEntries(members.map(m=>[m.id,0])),
  });

  const selectedCur = currencies.find(c=>c.code===form.currency) || baseCur;
  const fmtSel = n => fmt(n, selectedCur.symbol);

  const total        = parseFloat(form.total)||0;
  const sharedAmt    = parseFloat(form.sharedAmount)||0;
  const personalSum  = Object.values(form.personal).reduce((a,b)=>a+b,0);

  function computeShares(){
    if(form.splitMode==="equal"){
      const per=+(total/members.length).toFixed(2);
      return Object.fromEntries(members.map(m=>[m.id,per]));
    }
    if(form.splitMode==="mixed"){
      const equalPer=+(sharedAmt/members.length).toFixed(2);
      return Object.fromEntries(members.map(m=>[m.id,equalPer+(form.personal[m.id]||0)]));
    }
    return {...form.personal};
  }

  const finalShares  = computeShares();
  const sharesSum    = Object.values(finalShares).reduce((a,b)=>a+b,0);
  const balanced     = total>0 && Math.abs(total-sharesSum)<=0.5;

  function handleTotal(val){
    setForm(f=>({...f, total:val, sharedAmount:val}));
  }

  function handleSharedAmount(val){
    setForm(f=>({...f, sharedAmount:val}));
  }

  const mixedPersonalSlack = total - sharedAmt - personalSum;

  function submit(){
    if(!form.label||!form.total) return;
    onAdd({
      id: isEdit ? initialGroup.id : "g"+Date.now(),
      label:form.label, emoji:form.emoji,
      paidBy:form.paidBy, total, currency:form.currency, note:form.note,
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
      <div style={{background:"#FFF",borderRadius:14,padding:24,width:460,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:800,fontFamily:"'Nunito',sans-serif"}}>{isEdit?"Edit Expense Group":"Add Expense Group"}</h3>
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

        {/* Total + Currency + Paid by */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,marginBottom:12}}>
          <div>
            <label style={labelStyle}>Total ({selectedCur.symbol})</label>
            <input type="number" placeholder="0" value={form.total}
              onChange={e=>handleTotal(e.target.value)} style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Currency</label>
            <select
              value={form.currency}
              onChange={e=>setForm(f=>({...f,currency:e.target.value}))}
              style={{...inputStyle,width:"auto",minWidth:64,paddingRight:4}}
            >
              {currencies.map(c=>(
                <option key={c.code} value={c.code}>{c.code}{c.isBase?" ★":""}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Paid by</label>
            <select value={form.paidBy} onChange={e=>setForm({...form,paidBy:e.target.value})} style={inputStyle}>
              {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        {/* Conversion hint */}
        {!selectedCur.isBase&&total>0&&(
          <div style={{marginBottom:12,padding:"6px 10px",background:"#F0F6FF",borderRadius:7,border:"1px solid #C8DCEE",fontSize:11,color:"#3C7DC1"}}>
            {fmtSel(total)} {selectedCur.code} ≈ {fmt(total*selectedCur.rate, baseCur.symbol)} {baseCur.code} · all details shown in {baseCur.code}
          </div>
        )}

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
                <span style={{fontSize:12,fontWeight:700,color:"#2A8C4A"}}>{fmtSel(total/members.length)}</span>
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
                    = {fmtSel(sharedAmt/members.length)} each
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
                    Remaining: {fmtSel(total-sharedAmt)}
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
                        shared {fmtSel(sharedAmt/members.length)}
                        {(form.personal[m.id]||0)>0&&<span style={{color:"#C17D3C"}}> + personal {fmtSel(form.personal[m.id])}</span>}
                      </div>
                    )}
                  </div>
                  <input type="number" placeholder="0"
                    value={form.personal[m.id]||""}
                    onChange={e=>setForm(f=>({...f,personal:{...f.personal,[m.id]:parseFloat(e.target.value)||0}}))}
                    style={{width:90,padding:"5px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:13,textAlign:"right",fontWeight:600}}/>
                </div>
              ))}
              {total>0&&sharedAmt>0&&Math.abs(mixedPersonalSlack)>0.5&&(
                <div style={{fontSize:11,color:"#E07020",fontWeight:600,marginTop:4,padding:"6px 8px",background:"#FFF8F0",borderRadius:6}}>
                  ⚠ Personal amounts sum to {fmtSel(personalSum)} — expected {fmtSel(total-sharedAmt)} · diff {fmtSel(mixedPersonalSlack)}
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
                    <span style={{fontSize:13,fontWeight:800,color:"#1A1A1A"}}>{fmtSel(finalShares[m.id]||0)}</span>
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
              <label style={labelStyle}>Amount per person ({selectedCur.symbol})</label>
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
                ⚠ Shares sum {fmtSel(sharesSum)} · diff {fmtSel(total-sharesSum)}
              </div>
            )}
            {total>0&&balanced&&(
              <div style={{fontSize:11,color:"#2A8C4A",fontWeight:600,marginTop:4,padding:"6px 8px",background:"#F0FAF3",borderRadius:6}}>✓ Balanced</div>
            )}
          </div>
        )}

        <button onClick={submit} style={{width:"100%",padding:"10px",borderRadius:8,border:"none",
          background:form.label&&form.total?"#2C2C2C":"#AAA",color:"#FFF",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          {isEdit?"Save Changes":"Add Group"}
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
  const [pendingRemove,setPendingRemove]=useState(null);

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
      <div style={{background:"#FFF",borderRadius:14,padding:24,width:400,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",position:"relative"}}>
        {pendingRemove&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.32)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>
            <div style={{background:"#FFF",borderRadius:10,padding:"20px 22px",width:260,boxShadow:"0 8px 28px rgba(0,0,0,0.18)"}}>
              <div style={{fontSize:13,fontWeight:800,color:"#1A1A1A",marginBottom:6}}>Remove person?</div>
              <div style={{fontSize:12,color:"#666",lineHeight:1.6,marginBottom:16}}>
                All expense data attributed to <strong style={{color:"#1A1A1A"}}>{people.find(p=>p.id===pendingRemove)?.name||"this person"}</strong> will be lost.
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>setPendingRemove(null)} style={{padding:"6px 14px",borderRadius:7,border:"1px solid #CCC",background:"#FFF",fontSize:12,fontWeight:600,color:"#444",cursor:"pointer"}}>Cancel</button>
                <button onClick={()=>{removePerson(pendingRemove);setPendingRemove(null);}} style={{padding:"6px 14px",borderRadius:7,border:"none",background:"#C44",color:"#FFF",fontSize:12,fontWeight:700,cursor:"pointer"}}>Remove</button>
              </div>
            </div>
          </div>
        )}
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
                <button onClick={()=>setPendingRemove(m.id)} style={{border:"none",background:"#FEE",borderRadius:"50%",width:22,height:22,cursor:"pointer",color:"#C44",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:0}}>×</button>
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

// ─── EXISTING DEBTS MODAL ─────────────────────────────────────────────────────
function ExistingDebtsModal({members,debts,baseCurrencySymbol="₹",onSave,onClose}){
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
          Add debts like "A owes B". These will be included in final settlement (amounts in base currency).
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
              <label style={{fontSize:10,color:"#666",fontWeight:600,display:"block",marginBottom:3}}>Amount ({baseCurrencySymbol})</label>
              <input type="number" value={row.amount} onChange={e=>updateRow(row.id,{amount:e.target.value})} style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #BBB",fontSize:12,boxSizing:"border-box"}}/>
            </div>
            <button onClick={()=>removeRow(row.id)} title={`Remove debt ${idx+1}`} style={{width:26,height:26,border:"none",borderRadius:"50%",background:"#FEE",color:"#C44",cursor:"pointer",fontSize:14,lineHeight:1,padding:0}}>×</button>
          </div>
        ))}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:2,marginBottom:14}}>
          <button onClick={addRow} style={{padding:"6px 12px",borderRadius:7,border:"1px solid #E8E4DE",background:"#FFF",color:"#333",fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Add debt</button>
          <div style={{fontSize:12,color:"#444",fontWeight:700}}>Total debt: {fmt(total, baseCurrencySymbol)}</div>
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

// ─── CURRENCY MODAL ───────────────────────────────────────────────────────────
function CurrencyModal({currencies,groups,onSave,onClose,isDark=false}){
  const [list,setList]=useState(cloneData(currencies));
  const [addCode,setAddCode]=useState("");
  const [addRate,setAddRate]=useState("");

  const base = list.find(c=>c.isBase) || list[0];
  const usedCodes = new Set(groups.map(g=>g.currency).filter(Boolean));
  const availableCommon = COMMON_CURRENCIES.filter(c=>!list.find(l=>l.code===c.code));

  function setBase(code){
    setList(l=>l.map(c=>({...c,isBase:c.code===code,rate:c.code===code?1:c.rate})));
  }
  function updateRate(code,rate){
    setList(l=>l.map(c=>c.code===code?{...c,rate:parseFloat(rate)||0}:c));
  }
  function removeCurrency(code){
    setList(l=>l.filter(c=>c.code!==code));
  }
  function addCurrency(){
    if(!addCode||!addRate) return;
    if(list.find(c=>c.code===addCode)) return;
    const common=COMMON_CURRENCIES.find(c=>c.code===addCode);
    const rate=parseFloat(addRate)||1;
    if(common){
      setList(l=>[...l,{...common,rate,isBase:false}]);
    } else {
      setList(l=>[...l,{code:addCode,name:addCode,symbol:addCode,rate,isBase:false}]);
    }
    setAddCode(""); setAddRate("");
  }

  const card  = isDark?"#1F1F1F":"#FFF";
  const rowBg = isDark?"#252525":"#F9F6F1";
  const rowBdr= isDark?"1px solid #3A3A3A":"1px solid #E8E4DE";
  const txt   = isDark?"#EAEAEA":"#1A1A1A";
  const muted = isDark?"#BEBEBE":"#666";
  const inpBdr= isDark?"1px solid #444":"1px solid #BBB";
  const inpBg = isDark?"#1A1A1A":"#FFF";

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:card,borderRadius:14,padding:24,width:480,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:800,fontFamily:"'Nunito',sans-serif",color:txt}}>Currencies</h3>
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:18,cursor:"pointer",color:muted,lineHeight:1}}>✕</button>
        </div>
        <div style={{fontSize:11,color:muted,marginBottom:16,lineHeight:1.5}}>
          Set a base currency and add foreign currencies with exchange rates. All expense details are displayed in the base currency.
        </div>

        {/* Currency list */}
        {list.map(c=>(
          <div key={c.code} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,
            background:c.isBase?(isDark?"#1A2A1A":"#F0FAF3"):rowBg,
            border:c.isBase?(isDark?"1px solid #3A6040":"1px solid #B8E0C0"):rowBdr,
            marginBottom:8}}>
            <div style={{width:38,height:38,borderRadius:8,
              background:c.isBase?"#2A8C4A18":"#3C7DC118",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:17,fontWeight:800,color:c.isBase?"#2A8C4A":"#3C7DC1"}}>{c.symbol}</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:c.isBase?0:4}}>
                <span style={{fontSize:13,fontWeight:700,color:txt}}>{c.code}</span>
                <span style={{fontSize:11,color:muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                {c.isBase&&<span style={{fontSize:9,fontWeight:700,color:"#2A8C4A",background:"#E8F7ED",border:"1px solid #B8E0C0",borderRadius:999,padding:"1px 7px",flexShrink:0}}>BASE</span>}
              </div>
              {!c.isBase&&(
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:10,color:muted,whiteSpace:"nowrap"}}>1 {c.code} =</span>
                  <input
                    type="number"
                    value={c.rate}
                    onChange={e=>updateRate(c.code,e.target.value)}
                    style={{width:84,padding:"3px 7px",borderRadius:5,border:inpBdr,fontSize:12,fontWeight:700,background:inpBg,color:txt,textAlign:"right"}}
                  />
                  <span style={{fontSize:10,color:muted,whiteSpace:"nowrap"}}>{base?.symbol} {base?.code}</span>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              {!c.isBase&&(
                <button onClick={()=>setBase(c.code)} style={{padding:"4px 8px",borderRadius:6,border:"1px solid #3C7DC155",background:"#F0F6FF",color:"#3C7DC1",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                  Set Base
                </button>
              )}
              {!c.isBase&&(
                <button
                  onClick={()=>removeCurrency(c.code)}
                  disabled={usedCodes.has(c.code)}
                  title={usedCodes.has(c.code)?"Used in groups — remove those groups first":"Remove"}
                  style={{width:26,height:26,border:"none",borderRadius:"50%",
                    background:usedCodes.has(c.code)?"#EEE":"#FEE",
                    color:usedCodes.has(c.code)?"#AAA":"#C44",
                    cursor:usedCodes.has(c.code)?"not-allowed":"pointer",
                    fontSize:14,lineHeight:1,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}
                >×</button>
              )}
            </div>
          </div>
        ))}

        {/* Add currency */}
        <div style={{marginTop:14,padding:"14px",borderRadius:8,background:isDark?"#181818":rowBg,border:rowBdr}}>
          <div style={{fontSize:10,color:muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Add Currency</div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <div style={{flex:1}}>
              <label style={{fontSize:10,color:muted,fontWeight:600,display:"block",marginBottom:3}}>Currency</label>
              <select
                value={addCode}
                onChange={e=>setAddCode(e.target.value)}
                style={{width:"100%",padding:"6px 8px",borderRadius:6,border:inpBdr,fontSize:12,boxSizing:"border-box",background:inpBg,color:txt}}
              >
                <option value="">Select…</option>
                {availableCommon.map(c=>(
                  <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>
                ))}
              </select>
            </div>
            <div style={{width:110}}>
              <label style={{fontSize:10,color:muted,fontWeight:600,display:"block",marginBottom:3}}>
                1 {addCode||"CCY"} = {base?.symbol}
              </label>
              <input
                type="number"
                placeholder="rate"
                value={addRate}
                onChange={e=>setAddRate(e.target.value)}
                style={{width:"100%",padding:"6px 8px",borderRadius:6,border:inpBdr,fontSize:12,boxSizing:"border-box",background:inpBg,color:txt}}
              />
            </div>
            <button
              onClick={addCurrency}
              disabled={!addCode||!addRate}
              style={{padding:"6px 14px",borderRadius:6,border:"none",
                background:addCode&&addRate?"#2C2C2C":"#BBB",
                color:"#FFF",fontSize:12,fontWeight:700,
                cursor:addCode&&addRate?"pointer":"not-allowed",
                flexShrink:0,height:32,marginBottom:1}}
            >Add</button>
          </div>
        </div>

        <button onClick={()=>onSave(list)} style={{width:"100%",padding:"10px",borderRadius:8,border:"none",background:"#2C2C2C",color:"#FFF",fontSize:13,fontWeight:700,cursor:"pointer",marginTop:16}}>
          Save Currencies
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function TripSplitter(){
  const [tripName,setTripName]         = useState(DATASET_1_TRIP_NAME);
  const [members,setMembers]           = useState(cloneData(DATASET_1_MEMBERS));
  const [groups,setGroups]             = useState(cloneData(DATASET_1_GROUPS));
  const [existingDebts,setExistingDebts] = useState(cloneData(DATASET_1_EXISTING_DEBTS));
  const [currencies,setCurrencies]     = useState(cloneData(DEFAULT_CURRENCIES));
  const [showAdd,setShowAdd]           = useState(false);
  const [editGroup,setEditGroup]       = useState(null);
  const [showSettings,setShowSettings] = useState(false);
  const [showExistingDebts,setShowExistingDebts] = useState(false);
  const [showCurrencies,setShowCurrencies] = useState(false);
  const [themeMode,setThemeMode]       = useState("light");
  const [showReset,setShowReset]       = useState(false);
  const [history,setHistory]           = useState([{tripName:DATASET_1_TRIP_NAME,members:cloneData(DATASET_1_MEMBERS),groups:cloneData(DATASET_1_GROUPS),existingDebts:cloneData(DATASET_1_EXISTING_DEBTS),currencies:cloneData(DEFAULT_CURRENCIES)}]);
  const [historyIdx,setHistoryIdx]     = useState(0);

  const baseCurrency = currencies.find(c=>c.isBase) || currencies[0] || {code:"INR",symbol:"₹",rate:1,isBase:true};
  const fmtBase      = n => fmt(n, baseCurrency.symbol);
  const fmtBaseShort = n => fmtShort(n, baseCurrency.symbol);

  const toBase = (amount, code) => {
    if (!code || !currencies.length) return amount;
    const c = currencies.find(x=>x.code===code);
    if (!c || c.isBase) return amount;
    return amount * c.rate;
  };

  const balances   = computeBalances(members,groups,existingDebts,currencies);
  const grandTotal = groups.reduce((s,g)=>s+toBase(g.total,g.currency),0);
  const totalSettlement = balances.transactions.reduce((s,t)=>s+t.amount,0);
  const hasPeople  = members.some(m=>(m.name||"").trim().length>0);
  const visibleMembers = hasPeople ? members.filter(m=>(m.name||"").trim().length>0) : [];
  const maxSpend   = Math.max(...(visibleMembers.length?visibleMembers.map(m=>balances.owed[m.id]):[1]),1);
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

  function pushHistory(snap){
    const next = [...history.slice(0, historyIdx+1), snap].slice(-50);
    setHistory(next);
    setHistoryIdx(next.length-1);
  }
  function undo(){
    if(historyIdx<=0) return;
    const snap=history[historyIdx-1];
    setHistoryIdx(historyIdx-1);
    setTripName(snap.tripName); setMembers(snap.members); setGroups(snap.groups);
    setExistingDebts(snap.existingDebts); setCurrencies(snap.currencies||cloneData(DEFAULT_CURRENCIES));
  }
  function redo(){
    if(historyIdx>=history.length-1) return;
    const snap=history[historyIdx+1];
    setHistoryIdx(historyIdx+1);
    setTripName(snap.tripName); setMembers(snap.members); setGroups(snap.groups);
    setExistingDebts(snap.existingDebts); setCurrencies(snap.currencies||cloneData(DEFAULT_CURRENCIES));
  }

  function updateGroup(u){
    const g2=groups.map(g=>g.id===u.id?u:g);
    setGroups(g2); pushHistory({tripName,members,groups:g2,existingDebts,currencies});
  }
  function deleteGroup(id){
    const g2=groups.filter(g=>g.id!==id);
    setGroups(g2); pushHistory({tripName,members,groups:g2,existingDebts,currencies});
  }
  function addGroup(g){
    const g2=[...groups,g];
    setGroups(g2); pushHistory({tripName,members,groups:g2,existingDebts,currencies});
  }
  function loadDataset1(){
    const snap={tripName:DATASET_1_TRIP_NAME,members:cloneData(DATASET_1_MEMBERS),groups:cloneData(DATASET_1_GROUPS),existingDebts:cloneData(DATASET_1_EXISTING_DEBTS),currencies:cloneData(DEFAULT_CURRENCIES)};
    setTripName(snap.tripName); setMembers(snap.members); setGroups(snap.groups);
    setExistingDebts(snap.existingDebts); setCurrencies(snap.currencies);
    pushHistory(snap);
  }
  function resetAllData(){
    const emptyMembers=DATASET_1_MEMBERS.map(m=>({...m,name:"",initials:"--"}));
    const snap={tripName:"New Trip",members:emptyMembers,groups:[],existingDebts:[],currencies:cloneData(DEFAULT_CURRENCIES)};
    setTripName(snap.tripName); setMembers(snap.members); setGroups(snap.groups);
    setExistingDebts(snap.existingDebts); setCurrencies(snap.currencies);
    setHistory([snap]); setHistoryIdx(0); setShowReset(false);
  }
  function saveSettings(name,people){
    setTripName(name); setMembers(people);
    const validIds=new Set(people.map(p=>p.id));
    const newDebts=existingDebts.filter(d=>validIds.has(d.from)&&validIds.has(d.to)&&d.from!==d.to&&d.amount>0);
    setExistingDebts(newDebts);
    pushHistory({tripName:name,members:people,groups,existingDebts:newDebts,currencies});
    setShowSettings(false);
  }
  function handleSaveDebts(newDebts){
    setExistingDebts(newDebts);
    pushHistory({tripName,members,groups,existingDebts:newDebts,currencies});
  }
  function handleSaveCurrencies(newCurrencies){
    setCurrencies(newCurrencies);
    pushHistory({tripName,members,groups,existingDebts,currencies:newCurrencies});
    setShowCurrencies(false);
  }

  function handlePrint(){
    const sym = baseCurrency.symbol;
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
    const rows=groups.map(g=>{const p=members.find(m=>m.id===g.paidBy);const gCur=currencies.find(c=>c.code===g.currency)||baseCurrency;const gTotal=toBase(g.total,g.currency);return`<tr><td>${g.emoji} ${g.label}${!gCur.isBase?` <small style="color:#888">(${g.total}${gCur.symbol})</small>`:""}</td><td>${p?.name}</td>${members.map(m=>`<td style="text-align:right">${(g.shares[m.id]||0)>0?fmt(toBase(g.shares[m.id],g.currency),sym):"—"}</td>`).join("")}<td style="text-align:right;font-weight:700">${fmt(gTotal,sym)}</td></tr>`;}).join("");
    const balRow=`<tr class="tot"><td colspan="2">TOTAL OWED</td>${members.map(m=>`<td style="text-align:right">${fmt(balances.owed[m.id],sym)}</td>`).join("")}<td style="text-align:right">${fmt(grandTotal,sym)}</td></tr>`;
    const txns=balances.transactions.map(t=>{const f=members.find(m=>m.id===t.from);const to=members.find(m=>m.id===t.to);return`<div class="txn"><span>${f?.name} → ${to?.name}</span><span style="font-weight:700">${fmt(t.amount,sym)}</span></div>`;}).join("");
    const html=`<!DOCTYPE html><html><head><title>${tripName}</title>${style}</head><body>
      <h1>✈️ ${tripName}</h1>
      <div class="sub">Generated ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})} · Grand Total ${fmt(grandTotal,sym)} (${baseCurrency.code})</div>
      <div class="sec">Expense Breakdown</div>
      <table><thead><tr><th>Group</th><th>Paid By</th>${members.map(m=>`<th>${m.name}</th>`).join("")}<th>Total (${baseCurrency.code})</th></tr></thead>
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
        .dark-mode .col2 [style*='border:"1px solid #E8E4DE"'],
        .dark-mode .col3 [style*='border:"1px solid #E8E4DE"'],
        .dark-mode .col2 [style*='borderBottom:"1px solid #E8E4DE"'],
        .dark-mode .col2 [style*='borderRight:"1px solid #E8E4DE"']{border-color:#3A3A3A!important}
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
      <div style={{background:theme.topBg,borderBottom:isDark?"none":`1px solid #DCD6CC`,boxShadow:isDark?"none":"0 8px 18px rgba(0,0,0,0.12)",padding:"0 20px",height:62,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:200}}>
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
          {/* Members */}
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
          {/* Currency button */}
          <button
            onClick={()=>setShowCurrencies(true)}
            title="Manage currencies"
            style={{marginLeft:4,display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:999,border:`1px solid ${theme.topChipBorder}`,background:theme.topChipBg,color:theme.topText,cursor:"pointer",flexShrink:0}}
          >
            <span style={{fontSize:13,fontWeight:800,lineHeight:1}}>{baseCurrency.symbol}</span>
            <span style={{fontSize:11,fontWeight:700,color:theme.topText}}>{baseCurrency.code}</span>
            {currencies.length>1&&<span style={{fontSize:9,fontWeight:600,color:theme.topMuted,background:theme.topChipBorder,borderRadius:999,padding:"1px 5px"}}>+{currencies.length-1}</span>}
          </button>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",gap:3}}>
            <button onClick={undo} disabled={historyIdx<=0} title="Undo" style={{padding:"5px 9px",borderRadius:7,border:`1px solid ${theme.topChipBorder}`,background:theme.topChipBg,color:historyIdx<=0?theme.topMuted:theme.topText,fontSize:13,cursor:historyIdx<=0?"not-allowed":"pointer",opacity:historyIdx<=0?0.4:1}}>↩</button>
            <button onClick={redo} disabled={historyIdx>=history.length-1} title="Redo" style={{padding:"5px 9px",borderRadius:7,border:`1px solid ${theme.topChipBorder}`,background:theme.topChipBg,color:historyIdx>=history.length-1?theme.topMuted:theme.topText,fontSize:13,cursor:historyIdx>=history.length-1?"not-allowed":"pointer",opacity:historyIdx>=history.length-1?0.4:1}}>↪</button>
          </div>
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
      <div style={{display:"flex",height:"calc(100vh - 66px)",overflow:"hidden",paddingTop:0}}>

        {/* COL 1: Groups - 50% */}
        <div style={{position:"relative",zIndex:3,width:"50%",marginRight:-8,display:"flex",flexDirection:"column",background:theme.panelBg,boxShadow:isDark?"4px 0 12px rgba(0,0,0,0.3)":"4px 0 12px rgba(0,0,0,0.10)"}}>
          <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${theme.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,fontWeight:800,color:theme.text,display:"flex",alignItems:"center",gap:8}}>
                <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:20,height:20,borderRadius:4,background:isDark?"#2C2C2C":"#EDEDEB",border:isDark?"1px solid #3A3A3A":"1px solid #D8D4CE",fontSize:11,fontWeight:800,color:isDark?"#888":"#777",flexShrink:0}}>∑</span>
                Expense Groups
              </div>
              <div style={{fontSize:11,color:theme.muted,marginTop:1}}>{groups.length} groups · click to expand</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowExistingDebts(true)} style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${theme.border}`,background:theme.panelBg,color:theme.text,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Existing Debts
              </button>
              <button onClick={()=>hasPeople?setShowAdd(true):setShowSettings(true)} style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${theme.border}`,background:theme.panelBg,color:theme.text,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {hasPeople?"+ Add group":"+ Add People"}
              </button>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
            {groups.length===0&&(
              <div style={{background:isDark?"linear-gradient(145deg,#242424,#1D1D1D)":"linear-gradient(145deg,#FFFFFF,#F4EFE7)",border:`1px solid ${theme.border}`,borderRadius:12,padding:"14px 14px",marginBottom:10,boxShadow:isDark?"inset 0 1px 0 rgba(255,255,255,0.03)":"0 10px 24px rgba(0,0,0,0.06)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:16}}>✨</span>
                  <div style={{fontSize:13,fontWeight:800,color:theme.text}}>{hasPeople?"No expense groups yet":"Let's set up your trip"}</div>
                </div>
                <div style={{fontSize:11,color:theme.muted,lineHeight:1.55}}>
                  {hasPeople
                    ? "Add your first expense group to start tracking shared costs and settlements."
                    : "Start by adding people, then add expense groups and debts. Or load sample data to get started quickly."}
                </div>
                <div style={{display:"flex",gap:8,marginTop:11}}>
                  <button onClick={()=>hasPeople?setShowAdd(true):setShowSettings(true)} style={{padding:"8px 12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#D08A47,#B66E2A)",color:"#FFF",fontSize:12,fontWeight:800,cursor:"pointer",boxShadow:"0 8px 18px rgba(176,108,37,0.28)"}}>
                    {hasPeople?"+ Add group":"+ Add People"}
                  </button>
                  <button onClick={loadDataset1} style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${theme.border}`,background:isDark?"#2C2C2C":"#F7F3EB",color:theme.text,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    Load sample data
                  </button>
                </div>
              </div>
            )}
            {groups.map(g=>(
              <GroupCard key={g.id} group={g} members={members} currencies={currencies} onEdit={setEditGroup} onDelete={deleteGroup} isDark={isDark}/>
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
                      <span style={{fontWeight:700,color:theme.text}}>{fmtBase(d.amount)}</span>
                    </div>
                  ))}
                  <div style={{fontSize:12,fontWeight:800,color:theme.text,marginTop:4}}>
                    Total: {fmtBase(existingDebts.reduce((s,d)=>s+(d.amount||0),0))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* COL 2: Settlement — 25% */}
        <div className="col2" style={{order:3,position:"relative",zIndex:1,width:"25%",display:"flex",flexDirection:"column",background:isDark?"#1F1F1F":"#FFF"}}>
          <div style={{padding:"14px 16px 10px 24px",borderBottom:`1px solid ${theme.border}`}}>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,fontWeight:800,color:theme.text,display:"flex",alignItems:"center",gap:8}}>
              <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:20,height:20,borderRadius:4,background:isDark?"#2C2C2C":"#EDEDEB",border:isDark?"1px solid #3A3A3A":"1px solid #D8D4CE",fontSize:10,fontWeight:800,color:isDark?"#888":"#777",flexShrink:0}}>⇄</span>
              Balances
            </div>
            <div style={{fontSize:11,color:theme.muted,marginTop:1}}>Recommended settlement transfers</div>
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"14px 16px 14px 24px"}}>
            {!hasAnyData?(
              <div style={{background:theme.panelBg,border:`1px dashed ${theme.border}`,borderRadius:8,padding:"12px 12px"}}>
                <div style={{fontSize:12,fontWeight:700,color:theme.text,marginBottom:4}}>No balances yet</div>
                <div style={{fontSize:11,color:theme.muted,lineHeight:1.5}}>
                  Add people, then create expense groups and optional existing debts to see live balances and settlement transfers.
                </div>
              </div>
            ):(
              <>
                {balances.transactions.map((t,i)=>{
                  const f=members.find(m=>m.id===t.from), to=members.find(m=>m.id===t.to);
                  const pct = totalSettlement>0 ? (t.amount/totalSettlement)*100 : 0;
                  return(
                    <div key={i} style={{marginBottom:9,padding:"10px 12px",borderRadius:10,background:isDark?"#252525":"#FFFFFF",border:`1px solid ${theme.border}`,boxShadow:isDark?"inset 0 1px 0 rgba(255,255,255,0.03)":"0 6px 14px rgba(0,0,0,0.05)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:10,fontWeight:700,color:theme.muted,letterSpacing:0.4,textTransform:"uppercase"}}>Transfer #{i+1}</span>
                        <span style={{fontSize:10,fontWeight:700,color:theme.muted}}>{pct.toFixed(1)}% of total</span>
                      </div>
                      <div style={{fontSize:12,fontWeight:600,color:theme.text,marginBottom:8}}>
                        {f?.name.split(" ")[0]} → {to?.name.split(" ")[0]}
                      </div>
                      <div style={{fontSize:16,fontWeight:800,color:"#C17D3C",textAlign:"right"}}>{fmtBase(t.amount)}</div>
                    </div>
                  );
                })}
                <div style={{marginTop:6,padding:"10px 11px",borderRadius:10,background:isDark?"#242424":"#FFFFFF",border:`1px solid ${theme.border}`}}>
                  <div style={{fontSize:11,color:theme.muted,marginBottom:3}}>All {visibleMembers.length} members settle with <strong style={{color:theme.text}}>{balances.transactions.length}</strong> transfer{balances.transactions.length!==1?"s":""}</div>
                  <div style={{fontSize:12,fontWeight:700,color:theme.text}}>Total settlement: {fmtBase(totalSettlement)}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* COL 3: Trip overview — 25% */}
        <div className="col3" style={{order:2,position:"relative",zIndex:2,width:"25%",marginRight:-8,display:"flex",flexDirection:"column",background:isDark?theme.panelBg:"#FFF",boxShadow:isDark?"4px 0 10px rgba(0,0,0,0.25)":"4px 0 10px rgba(0,0,0,0.08)"}}>
          <div style={{padding:"14px 16px 10px 24px",borderBottom:`1px solid ${theme.border}`}}>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,fontWeight:800,color:theme.text,display:"flex",alignItems:"center",gap:8}}>
              <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:20,height:20,borderRadius:4,background:isDark?"#2C2C2C":"#EDEDEB",border:isDark?"1px solid #3A3A3A":"1px solid #D8D4CE",fontSize:11,fontWeight:800,color:isDark?"#888":"#777",flexShrink:0}}>◉</span>
              Overview
            </div>
            <div style={{fontSize:11,color:theme.muted,marginTop:1}}>Spend per person · {baseCurrency.code}</div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 16px 14px 24px"}}>
            {!hasPeople&&(
              <div style={{marginBottom:12,padding:"12px 14px",borderRadius:8,background:theme.panelBg,border:`1px dashed ${theme.border}`}}>
                <div style={{fontSize:12,fontWeight:700,color:theme.text,marginBottom:4}}>Overview is empty</div>
                <div style={{fontSize:11,color:theme.muted,lineHeight:1.5}}>Add people first to unlock per-person share and net settlement insights.</div>
              </div>
            )}
            {hasPeople&&!hasAnyData&&(
              <div style={{marginBottom:12,padding:"12px 14px",borderRadius:8,background:theme.panelBg,border:`1px dashed ${theme.border}`}}>
                <div style={{fontSize:12,fontWeight:700,color:theme.text,marginBottom:4}}>Overview is empty</div>
                <div style={{fontSize:11,color:theme.muted,lineHeight:1.5}}>Add your first expense group to populate totals, per-person share, and net settlement cards here.</div>
              </div>
            )}

            {/* Grand total */}
            <div style={{marginBottom:18,padding:"12px 14px",borderRadius:8,background:theme.accentBg,border:`1px solid ${theme.accentBorder}`}}>
              <div style={{fontSize:10,color:theme.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Grand total · {baseCurrency.code}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                <span style={{fontFamily:"'Nunito',sans-serif",fontSize:22,fontWeight:800,color:theme.text,lineHeight:1}}>{fmtBase(grandTotal)}</span>
              </div>
              <div style={{fontSize:11,color:theme.muted,marginTop:4}}>{groups.length} expense groups · {visibleMembers.length} people</div>
              {currencies.length>1&&(
                <div style={{fontSize:10,color:theme.muted,marginTop:3}}>
                  {currencies.filter(c=>!c.isBase).map(c=>`1 ${c.code} = ${c.rate} ${baseCurrency.code}`).join(" · ")}
                </div>
              )}
            </div>

            {/* Share bars */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:600,color:theme.muted,letterSpacing:0.5,marginBottom:10,textTransform:"uppercase"}}>Each person's share</div>
              {visibleMembers.map(m=><MemberBar key={m.id} member={m} value={balances.owed[m.id]} max={maxSpend} textColor={theme.text} valueColor={theme.text} trackColor={isDark?"#3A3A3A":"#F0EDE8"} symbol={baseCurrency.symbol}/>)}
            </div>

            {/* Net settlement rows */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:theme.muted,letterSpacing:0.5,marginBottom:8,textTransform:"uppercase"}}>Net settlement status</div>
              {visibleMembers.map(m=>{
                const paid=balances.paid[m.id], owed=balances.owed[m.id], net=paid-owed;
                const isPos=net>0.01, isNeg=net<-0.01;
                return(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,padding:"8px 10px",borderRadius:8,background:theme.panelBg,border:`1px solid ${theme.border}`}}>
                    <Avatar member={m} size={24}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:600,color:theme.text}}>{m.name.split(" ")[0]}</div>
                      <div style={{fontSize:10,color:isPos?"#2A7A40":isNeg?"#B83010":theme.muted}}>{isPos?"receives":isNeg?"pays":"settled"}</div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:isPos?"#2A7A40":isNeg?"#B83010":theme.muted}}>
                      {isPos?"+":isNeg?"-":""}{fmtBaseShort(Math.abs(net))}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {showAdd&&<AddGroupModal members={members} currencies={currencies} onAdd={addGroup} onClose={()=>setShowAdd(false)}/>}
      {editGroup&&<AddGroupModal members={members} currencies={currencies} initialGroup={editGroup} onAdd={g=>{updateGroup(g);setEditGroup(null);}} onClose={()=>setEditGroup(null)}/>}
      {showSettings&&<TripSettingsModal tripName={tripName} members={members} onSave={saveSettings} onClose={()=>setShowSettings(false)}/>}
      {showExistingDebts&&<ExistingDebtsModal members={members} debts={existingDebts} baseCurrencySymbol={baseCurrency.symbol} onSave={handleSaveDebts} onClose={()=>setShowExistingDebts(false)}/>}
      {showCurrencies&&<CurrencyModal currencies={currencies} groups={groups} onSave={handleSaveCurrencies} onClose={()=>setShowCurrencies(false)} isDark={isDark}/>}
      {showReset&&<ResetDataModal onClose={()=>setShowReset(false)} onConfirm={resetAllData}/>}
      <Analytics />
    </div>
  );
}
