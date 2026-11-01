/* ---------- drawing (units = metres) ---------- */
const rad = d => d*Math.PI/180;
function geo(a){
  const L=a.len, S=a.span/2, w=a.dia, prop=a.lay.startsWith("prop");
  const fh=a.fh||w*1.06;
  const rear = a.lay==="rear2"||a.lay==="tri727";
  const wp = a.wp || (rear?.42:.38);
  const cr = a.cr || a.span*(prop?.15:.2);
  const ct = cr*(prop?.45:.3);
  const yLE = wp*L, t=Math.tan(rad(a.sw));
  const hs = (a.tt?.36:.35)*a.span, hc=cr*.42;
  const gc = Math.max(.9, a.h*.09);
  const fb = (a.tt?.17:prop?.12:.13)*L;
  const el = prop?3.2:Math.min(7.2,Math.max(2.6,L*.1));
  return {L,S,w,fh,prop,rear,yLE,t,cr,ct,hs,hc,gc,fb,el,ed:a.ed||1.5,pd:a.pd||0};
}
function wingLE(G,x){ return G.yLE + (x-G.w/2)*G.t; }
function enginePos(a,G){
  const st = {wing2:[.34],wing4:[.4,.68],prop2:[.25],prop4:[.28,.53]}[a.lay]||[];
  return st.map(f=>f*G.S);
}
function topSVG(a,cls,G){
  G=G||geo(a); const {L,S,w,yLE,t,cr,ct,hs,hc}=G; let o="";
  const n = G.prop? w*1.3 : w*1.8, t0=L*.78;
  const body = `M0 0 C${w*.36} 0 ${w/2} ${n*.45} ${w/2} ${n} L${w/2} ${t0} L${w*.13} ${L} L${-w*.13} ${L} L${-w/2} ${t0} L${-w/2} ${n} C${-w/2} ${n*.45} ${-w*.36} 0 0 0Z`;
  if(a.lay==="concorde"){
    const r=w/2;
    for(const s of [1,-1]) o+=`<path class="${cls}" d="M${s*r} ${.3*L} Q${s*S*.55} ${.5*L} ${s*S} ${.84*L} L${s*S} ${.93*L} L${s*r} ${.95*L}Z"/>`;
    if(cls==="body") for(const s of [1,-1]) for(const k of [1.4,3.0]) o+=`<rect class="thin" x="${s*(r+k)-.7}" y="${.72*L}" width="1.4" height="${.22*L}"/>`;
    return o+`<path class="${cls}" d="${body}"/>`;
  }
  // wings
  for(const s of [1,-1]){
    const tipLE=wingLE(G,S);
    o+=`<path class="${cls}" d="M${s*w/2} ${yLE} L${s*S} ${tipLE} L${s*S} ${tipLE+ct} L${s*w/2} ${yLE+cr}Z"/>`;
    if(a.fold && cls==="body"){ const fx=a.fold/2, fl=wingLE(G,fx), fct=cr-(cr-ct)*((fx-w/2)/(S-w/2)); o+=`<line class="thin" x1="${s*fx}" y1="${fl}" x2="${s*fx}" y2="${fl+fct}" stroke-dasharray="1 1"/>`; }
  }
  // tailplane
  const hy=L-hc-1.0, ht=t*1.05;
  for(const s of [1,-1]) o+=`<path class="${cls}" d="M${s*w*.12} ${hy} L${s*hs/2} ${hy+(hs/2)*ht} L${s*hs/2} ${hy+(hs/2)*ht+hc*.45} L${s*w*.12} ${hy+hc}Z"/>`;
  o+=`<path class="${cls}" d="${body}"/>`;
  if(cls!=="body") return o;
  // engines
  const {ed,el}=G;
  enginePos(a,G).forEach(ex=>{
    const le=wingLE(G,ex);
    for(const s of [1,-1]){
      if(G.prop){ o+=`<rect class="body" x="${s*ex-ed/2}" y="${le-1.2}" width="${ed}" height="${el}" rx=".5"/><line class="thin" x1="${s*ex-G.pd/2}" y1="${le-1.4}" x2="${s*ex+G.pd/2}" y2="${le-1.4}"/>`; }
      else o+=`<rect class="body" x="${s*ex-ed/2}" y="${le-el*.6}" width="${ed}" height="${el}" rx="${ed*.35}"/>`;
    }
  });
  if(a.lay==="tric"){ o+=`<rect class="body" x="${-ed/2}" y="${L-G.fb*.95}" width="${ed}" height="${el}" rx="${ed*.35}"/>`; }
  if(G.rear){ const y0=L*.68; for(const s of [1,-1]) o+=`<rect class="body" x="${s*(w/2+ed/2+.25)-ed/2}" y="${y0}" width="${ed}" height="${el*.95}" rx="${ed*.35}"/>`; }
  if(a.lay==="tri727"){ o+=`<ellipse class="body" cx="0" cy="${L*.7}" rx="${ed*.45}" ry="${ed*.6}"/>`; }
  if(a.lay==="buried4"){ for(const s of [1,-1]) for(const k of [.55,1.5]) o+=`<ellipse class="thin" cx="${s*(w/2+k)}" cy="${wingLE(G,w/2+k)+.2}" rx=".45" ry=".3"/>`; }
  if(a.trifin){ const hy2=hy+(hs/2)*ht; for(const s of [1,-1]) o+=`<rect class="body" x="${s*hs/2-.15}" y="${hy2-1}" width=".3" height="${hc*.45+1.6}"/>`; }
  return o;
}
function drawTop(a,ghost){
  const G=geo(a); let o="";
  for(let gx=-40; gx<=40; gx+=10) o+=`<line class="gridm" x1="${gx}" x2="${gx}" y1="-3" y2="83"/>`;
  for(let gy=0; gy<=80; gy+=10) o+=`<line class="gridm" x1="-42" x2="42" y1="${gy}" y2="${gy}"/>`;
  if(ghost) o+=topSVG(ghost,"ghost");
  o+=topSVG(a,"body",G);
  // span dimension
  const tipEnd = a.lay==="concorde"? .93*G.L : wingLE(G,G.S)+G.ct;
  const dy = Math.min(81.6, Math.max(G.L, tipEnd)+2.2);
  o+=`<path class="dim" d="M${-G.S} ${dy-1}v2M${G.S} ${dy-1}v2M${-G.S} ${dy}H${G.S}"/>`;
  o+=`<text class="dimt" x="0" y="${dy-1.2}">${a.span.toFixed(1)} m span</text>`;
  // scale bar
  o+=`<path class="dim" d="M-41 -1.2h10M-41 -2v1.6M-31 -2v1.6"/><text class="scal" x="-30" y="-0.9">10 m</text>`;
  document.getElementById("vTop").innerHTML=o;
}
function sideSVG(a,outline="body"){
  const G=geo(a), {L,fh,gc,fb,ed,el,yLE,cr}=G, H=a.h; const Y=v=>-v;
  const detail=outline==="body"?"thin":outline, prop=outline==="body"?"prop":outline;
  let o="";
  if(outline==="body"){
    for(let gx=0; gx<=80; gx+=10) o+=`<line class="gridm" x1="${gx}" x2="${gx}" y1="-26" y2="0"/>`;
    o+=`<line class="ground" x1="-2" x2="82" y1="0" y2="0"/>`;
  }
  const bot=gc, top=gc+fh, n=G.prop? G.w*1.3 : G.w*1.8;
  // fin
  const x0=L-fb, x1=L-.3, x3=Math.min(L+1.2, x1+(H-top)*.3), x2=x3-fb*.42;
  o+=`<path class="${outline}" d="M${x0} ${Y(top-.1)} L${x2} ${Y(H)} L${x3} ${Y(H)} L${x1} ${Y(top-.4)}Z"/>`;
  // horizontal tail
  if(a.lay!=="concorde"){
    if(a.tt) o+=`<rect class="${outline}" x="${x2-G.hc*.55}" y="${Y(H)}" width="${G.hc+1}" height=".55"/>`;
    else o+=`<rect class="${outline}" x="${L-G.hc-1.4}" y="${Y(top-fh*.3)}" width="${G.hc+.8}" height=".5"/>`;
  }
  // fuselage
  let body=`M0 ${Y(bot+fh*.42)} Q0 ${Y(top)} ${n} ${Y(top)} L${L*.86} ${Y(top)} L${L} ${Y(top-fh*.12)} L${L*.97} ${Y(top-fh*.3)} L${L*.78} ${Y(bot)} L${n*.7} ${Y(bot)} Q0 ${Y(bot)} 0 ${Y(bot+fh*.42)}Z`;
  if(a.lay==="concorde") body=`M-1.5 ${Y(bot+fh*.35)} Q${n*.6} ${Y(top)} ${n*1.6} ${Y(top)} L${L*.9} ${Y(top)} L${L} ${Y(top-fh*.2)} L${L*.95} ${Y(bot+fh*.2)} L${n} ${Y(bot)} Q0 ${Y(bot+fh*.05)} -1.5 ${Y(bot+fh*.35)}Z`;
  o+=`<path class="${outline}" d="${body}"/>`;
  if(a.hump){ const hx=L*a.hump; o+=`<path class="${outline}" d="M${n*.55} ${Y(top-.3)} Q${n*.9} ${Y(top+1.9)} ${n*1.6} ${Y(top+1.9)} L${hx} ${Y(top+1.9)} Q${hx+3} ${Y(top+1.9)} ${hx+5} ${Y(top-.1)}Z"/>`; }
  // wing root
  if(a.lay==="concorde") o+=`<path class="${detail}" d="M${.3*L} ${Y(bot+.4)} L${.95*L} ${Y(bot+.3)}"/>`;
  else o+=`<path class="${outline}" d="M${yLE} ${Y(bot+.45)} L${yLE+cr} ${Y(bot+.25)} L${yLE+cr} ${Y(bot+.65)} Z"/>`;
  // engines
  if(a.lay==="concorde") o+=`<rect class="${outline}" x="${.72*L}" y="${Y(bot+.1)}" width="${.22*L}" height="1.3"/>`;
  enginePos(a,G).slice(0,1).forEach(ex=>{
    const le=wingLE(G,ex);
    if(G.prop){ o+=`<rect class="${outline}" x="${le-1.2}" y="${Y(bot+.9)}" width="${el}" height="${ed*.9}" rx=".4"/><line class="${detail}" x1="${le-1.4}" x2="${le-1.4}" y1="${Y(bot+.45+G.pd/2)}" y2="${Y(Math.max(.25,bot+.45-G.pd/2))}"/>`; }
    else { const cy=Math.max(ed/2+.35, bot+.1-ed*.35); o+=`<rect class="${outline}" x="${le-el*.6}" y="${Y(cy+ed/2)}" width="${el}" height="${ed}" rx="${ed*.4}"/>`; }
  });
  if(G.rear){ o+=`<rect class="${outline}" x="${L*.68}" y="${Y(top-fh*.1+ed/2)}" width="${el*.95}" height="${ed}" rx="${ed*.4}"/>`; }
  if(a.lay==="tri727"){ o+=`<path class="${outline}" d="M${L*.68} ${Y(top)} Q${L*.7} ${Y(top+ed*.8)} ${L*.75} ${Y(top+ed*.8)} L${L-fb*.6} ${Y(top+ed*.6)} L${L-fb*.5} ${Y(top)}Z"/>`; }
  if(a.lay==="tric"){
    if(a.sduct) o+=`<path class="${outline}" d="M${L-fb*1.05} ${Y(top)} Q${L-fb} ${Y(top+ed*.75)} ${L-fb*.8} ${Y(top+ed*.75)} L${L-fb*.4} ${Y(top+ed*.4)} L${L-fb*.3} ${Y(top)}Z"/><rect class="${outline}" x="${L-1.2}" y="${Y(top-fh*.05)}" width="1.6" height="${fh*.35}" rx=".4"/>`;
    else o+=`<rect class="${outline}" x="${L-fb*.95}" y="${Y(top+.5+ed)}" width="${el+1}" height="${ed}" rx="${ed*.4}"/>`;
  }
  if(a.lay==="buried4") o+=`<ellipse class="${detail}" cx="${yLE+.4}" cy="${Y(bot+.6)}" rx=".5" ry=".35"/>`;
  // gear
  const gx1=n*.9, gx2=(a.lay==="concorde"? .55*L : yLE+cr*.65);
  o+=`<path class="${detail}" d="M${gx1} ${Y(bot)}V${Y(.45)}M${gx2} ${Y(bot)}V${Y(.55)}"/><circle class="${detail}" cx="${gx1}" cy="-0.4" r=".4"/><circle class="${detail}" cx="${gx2}" cy="-0.55" r=".55"/>`;
  if(outline==="body"){
    const dy=Y(Math.min(25.4,H+1.6));
    o+=`<path class="dim" d="M0 ${dy-.8}v1.6M${L} ${dy-.8}v1.6M0 ${dy}H${L}"/><text class="dimt" x="${L/2}" y="${dy-1.1}">${a.len.toFixed(1)} m long</text>`;
  }
  return o;
}
function drawSide(a,ghost){ document.getElementById("vSide").innerHTML=(ghost?sideSVG(ghost,"ghost"):"")+sideSVG(a); }
function frontSVG(a,outline="body"){
  const G=geo(a), {S,w,fh,gc,ed,hs}=G, H=a.h; const Y=v=>-v;
  const detail=outline==="body"?"thin":outline;
  let o="";
  if(outline==="body"){
    for(let gx=-40; gx<=40; gx+=10) o+=`<line class="gridm" x1="${gx}" x2="${gx}" y1="-26" y2="0"/>`;
    o+=`<line class="ground" x1="-42" x2="42" y1="0" y2="0"/>`;
  }
  const top=gc+fh, dih = a.lay==="concorde"?0:(G.prop?5:a.tt?3:6);
  const wy = x => gc+.35+(Math.abs(x)-w/2)*Math.tan(rad(dih));
  // fin(s)
  o+=`<rect class="${outline}" x="-.3" y="${Y(H)}" width=".6" height="${H-top+.2}"/>`;
  // tailplane
  if(a.lay!=="concorde"){
    const ty = a.tt? H : top-fh*.3;
    o+=`<path class="${outline}" d="M${-hs/2} ${Y(ty+(a.tt?0:hs/2*.07))} L0 ${Y(ty)} L${hs/2} ${Y(ty+(a.tt?0:hs/2*.07))} L${hs/2} ${Y(ty+(a.tt?0:hs/2*.07)-.35)} L0 ${Y(ty-.35)} L${-hs/2} ${Y(ty+(a.tt?0:hs/2*.07)-.35)}Z"/>`;
    if(a.trifin) for(const s of [1,-1]) o+=`<rect class="${outline}" x="${s*hs/2-.25}" y="${Y(top+1.8)}" width=".5" height="3.6"/>`;
  }
  // wings
  o+=`<path class="${outline}" d="M${-S} ${Y(wy(S))} L0 ${Y(wy(w/2))} L${S} ${Y(wy(S))} L${S} ${Y(wy(S)-.4)} L0 ${Y(wy(w/2)-.5)} L${-S} ${Y(wy(S)-.4)}Z"/>`;
  // fuselage
  o+=`<ellipse class="${outline}" cx="0" cy="${Y(gc+fh/2)}" rx="${w/2}" ry="${fh/2}"/>`;
  // engines
  enginePos(a,G).forEach(ex=>{ for(const s of [1,-1]){
    const cy=Math.max(ed/2+.35, wy(ex)-ed*.55);
    o+=`<circle class="${outline}" cx="${s*ex}" cy="${Y(G.prop?wy(ex)-.1:cy)}" r="${ed/2}"/>`;
    if(G.prop) o+=`<circle class="${detail}" cx="${s*ex}" cy="${Y(wy(ex)-.1)}" r="${G.pd/2}"/>`;
  }});
  if(a.lay==="concorde") for(const s of [1,-1]) o+=`<rect class="${outline}" x="${s>0?w/2+.6:-(w/2+.6)-3.2}" y="${Y(gc+.3)}" width="3.2" height="1.3"/>`;
  if(G.rear) for(const s of [1,-1]) o+=`<circle class="${outline}" cx="${s*(w/2+ed/2+.25)}" cy="${Y(top-fh*.1)}" r="${ed/2}"/>`;
  if(a.lay==="tri727") o+=`<ellipse class="${outline}" cx="0" cy="${Y(top+ed*.45)}" rx="${ed*.45}" ry="${ed*.4}"/>`;
  if(a.lay==="tric") o+=`<circle class="${outline}" cx="0" cy="${Y(a.sduct? top+ed*.45 : top+.5+ed/2)}" r="${ed/2*(a.sduct?.85:1)}"/>`;
  // gear
  const mg = Math.max(w*.6, (enginePos(a,G)[0]||w)*.55);
  o+=`<path class="${detail}" d="M${-mg} ${Y(gc+.3)}V${Y(.5)}M${mg} ${Y(gc+.3)}V${Y(.5)}M0 ${Y(gc)}V${Y(.4)}"/>`;
  if(outline==="body"){
    const hx=Math.min(41, S+1.2);
    o+=`<path class="dim" d="M${hx-.8} 0h1.6M${hx-.8} ${Y(H)}h1.6M${hx} 0V${Y(H)}"/><text class="dimt" x="${Math.min(hx,36)}" y="${Y(H)-.6}" text-anchor="end">${a.h.toFixed(1)} m high</text>`;
  }
  return o;
}
function drawFront(a,ghost){ document.getElementById("vFront").innerHTML=(ghost?frontSVG(ghost,"ghost"):"")+frontSVG(a); }

