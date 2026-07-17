import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{c as t,i as n,l as r,n as i}from"./createLucideIcon-7BfLqZhV.js";import{t as a}from"./file-text-BYSsCPnu.js";import{t as o}from"./loader-circle-D1eZj5Kg.js";import{t as s}from"./printer-CpakSRS_.js";import{t as c}from"./receipt-CWPIxmt9.js";import{t as l}from"./search-Cj2cPL8K.js";import{n as u}from"./dist-BApXWikt.js";import{PageShell as d}from"./Dashboard-C0gAOMWj.js";import{n as f,t as p}from"./server.browser-CNGPb9po.js";import{t as m}from"./esm-Co9W1MAB.js";var h=e(r()),g=e(f()),_=e(p()),v=t(),y=e=>(e||``).replace(/[<>&]/g,e=>({"<":`&lt;`,">":`&gt;`,"&":`&amp;`})[e]);function b(e){if(!e)return`000000000001`;let t=String(e).replace(/\D/g,``).padStart(12,`0`).slice(-12);return t.length===12?t:t.padEnd(12,`0`)}function x(e,t=52){try{return _.renderToStaticMarkup((0,v.jsx)(m,{value:String(e),size:t,level:`M`}))}catch{return``}}var S={thermal:{label:`Thermal Print`,icon:c,bodyClass:`mode-thermal`,labelWmm:50,labelHmm:35,nameSize:`2.8mm`,priceSize:`3mm`},a4:{label:`A4 Print`,icon:a,bodyClass:`mode-a4`,labelWmm:`100%`,labelHmm:35,nameSize:`2.8mm`,priceSize:`3mm`}};function C(){let{t:e}=n(),[t,r]=(0,h.useState)([]),[a,c]=(0,h.useState)(!0),[f,p]=(0,h.useState)(``),[m,_]=(0,h.useState)([]),[C,w]=(0,h.useState)(`a4`);(0,h.useRef)(null),(0,h.useEffect)(()=>{(async()=>{c(!0);try{let e=await i.get(f?`/products?q=${encodeURIComponent(f)}`:`/products?limit=200`);r(e.data)}catch{u.error(e(`page.failed_to_load_products`))}finally{c(!1)}})()},[f]);let T=e=>{_(t=>t.find(t=>t.id===e)?t.filter(t=>t.id!==e):[...t,{id:e,copies:1}])},E=(e,t)=>{_(n=>n.map(n=>n.id===e?{...n,copies:Math.max(1,t||1)}:n))},D=n=>{if(!m.length){u.error(e(`page.select_least_one`));return}let r=S[n],i=0,a=``;if(m.forEach(e=>{let n=t.find(t=>t.id===e.id);if(!n)return;let r=y(n.name);y(n.unit||`pcs`);let o=n.barcode||b(n.sku),s=x(n.id,48);for(let t=0;t<e.copies;t++)i++,a+=`<div class="label-card">
          <div class="label-name">${r}</div>
          <div class="label-price">&#8377;${Number(n.price).toFixed(2)}</div>
          <div class="label-barcode-row">
            <div class="label-barcode-wrap"><svg id="b${i}"></svg><div class="label-barcode-num">${o}</div></div>
            ${s?`<div class="label-qr-wrap">${s}</div>`:``}
          </div>
        </div>`}),!i)return;let o=window.open(``,`_blank`);o.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Barcode Labels - ${r.label}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; }

.label-card {
  box-sizing: border-box;
  border: 0.3mm solid #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.label-name {
  font-weight: 700;
  color: #000;
  width: 100%;
  line-height: 1.15;
  word-break: break-word;
}
.label-price {
  font-weight: 700;
  color: #000;
}
.label-barcode-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5mm;
  width: 100%;
}
.label-barcode-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.label-barcode-wrap svg {
  max-width: 100%;
  display: block;
}
.label-barcode-num {
  font-family: 'Courier New', Courier, monospace;
  font-size: 8px;
  color: #000;
  text-align: center;
  margin-top: 1px;
  letter-spacing: 0.3px;
}
.label-qr-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

body.mode-thermal { background: #fff; }
body.mode-thermal #sheet { display: flex; flex-direction: column; gap: 2mm; align-items: center; padding: 2mm 0; }
body.mode-thermal .label-card { width: 50mm; height: 35mm; padding: 1.5mm 2mm; }
body.mode-thermal .label-name  { font-size: 2.8mm; margin-bottom: 1mm; }
body.mode-thermal .label-price { font-size: 3mm; margin-bottom: 1mm; }
body.mode-thermal .label-qr-wrap svg { width: 8mm; display: block; }

body.mode-a4 { background: #fff; }
body.mode-a4 #sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; padding: 5mm; }
body.mode-a4 .label-card { width: 100%; height: 35mm; padding: 1.5mm 2.5mm; }
body.mode-a4 .label-name  { font-size: 2.8mm; margin-bottom: 1mm; }
body.mode-a4 .label-price { font-size: 3mm; margin-bottom: 1mm; }
body.mode-a4 .label-qr-wrap svg { width: 8mm; display: block; }

@media print {
  body.mode-thermal @page { size: 50mm 35mm; margin: 0; }
  body.mode-thermal #sheet { padding: 0; gap: 0; }
  body.mode-thermal .label-card { border: none; page-break-after: always; width: 50mm; height: 35mm; padding: 1.5mm 2mm; }
  body.mode-a4 @page { size: A4; margin: 8mm; }
  body.mode-a4 #sheet { padding: 0; }
  body.mode-a4 .label-card { border: 0.2mm solid #000; padding: 1.5mm 2.5mm; }
}
</style>
</head>
<body class="${r.bodyClass}">
<div id="sheet">${a}</div>
</body>
</html>`),o.document.close();let s=0;m.forEach(e=>{let n=t.find(t=>t.id===e.id);if(!n)return;let r=n.barcode||b(n.sku);for(let t=0;t<e.copies;t++){s++;let e=o.document.getElementById(`b${s}`);if(e)try{(0,g.default)(e,r,{format:`CODE128`,lineColor:`#000000`,background:`#ffffff`,width:1.5,height:32,margin:2,displayValue:!1})}catch{}}}),setTimeout(()=>{try{o.print()}catch{}},300)};return(0,v.jsx)(d,{title:e(`page.barcode_labels`),subtitle:`${m.length} ${e(`page.products_selected`)}`,right:(0,v.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,v.jsx)(`div`,{className:`flex bg-zinc-100 rounded-lg p-0.5`,children:Object.entries(S).map(([e,t])=>{let n=t.icon;return(0,v.jsxs)(`button`,{onClick:()=>w(e),className:`h-9 px-3 rounded-md text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${C===e?`bg-white text-zinc-900 shadow-sm`:`text-zinc-500 hover:text-zinc-700`}`,children:[(0,v.jsx)(n,{className:`w-3.5 h-3.5`}),` `,t.label]},e)})}),(0,v.jsxs)(`button`,{onClick:()=>D(C),disabled:!m.length,className:`h-10 px-5 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 hover:bg-[#cc0000] transition-colors`,children:[(0,v.jsx)(s,{className:`w-4 h-4`}),` `,e(`page.print_labels`)]})]}),children:(0,v.jsxs)(`div`,{className:`p-6 overflow-y-auto h-full`,children:[(0,v.jsx)(`div`,{className:`flex gap-3 mb-4 items-center flex-wrap`,children:(0,v.jsxs)(`div`,{className:`relative flex-1 max-w-md`,children:[(0,v.jsx)(l,{className:`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400`}),(0,v.jsx)(`input`,{className:`w-full h-11 border-2 border-zinc-300 rounded-lg pl-10 pr-4 text-sm focus:outline-none focus:border-[#E60000]`,placeholder:e(`page.search_products`),value:f,onChange:e=>p(e.target.value)})]})}),a?(0,v.jsxs)(`div`,{className:`flex items-center justify-center py-16 text-zinc-500`,children:[(0,v.jsx)(o,{className:`w-6 h-6 animate-spin mr-2`}),` `,e(`page.loading_products`)]}):(0,v.jsx)(`div`,{className:`bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm`,children:(0,v.jsxs)(`table`,{className:`w-full`,children:[(0,v.jsx)(`thead`,{children:(0,v.jsxs)(`tr`,{className:`bg-zinc-50 border-b border-zinc-200`,children:[(0,v.jsx)(`th`,{className:`p-3 w-10`}),(0,v.jsx)(`th`,{className:`p-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500`,children:e(`page.product_cap`)}),(0,v.jsx)(`th`,{className:`p-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500`,children:e(`page.barcode`)}),(0,v.jsx)(`th`,{className:`p-3 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500`,children:e(`page.price`)}),(0,v.jsx)(`th`,{className:`p-3 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-500 w-28`,children:e(`page.copies`)})]})}),(0,v.jsx)(`tbody`,{children:t.map(e=>{let t=m.find(t=>t.id===e.id);return(0,v.jsxs)(`tr`,{className:`border-t border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer ${t?`bg-red-50`:``}`,onClick:()=>T(e.id),children:[(0,v.jsx)(`td`,{className:`p-3 text-center`,children:(0,v.jsx)(`div`,{className:`w-5 h-5 rounded border-2 flex items-center justify-center ${t?`border-[#E60000] bg-[#E60000]`:`border-zinc-300`}`,children:t&&(0,v.jsx)(`span`,{className:`text-white text-xs font-bold`,children:`✓`})})}),(0,v.jsx)(`td`,{className:`p-3 font-medium text-sm`,children:e.name}),(0,v.jsx)(`td`,{className:`p-3 font-mono text-xs text-zinc-500`,children:e.barcode||e.sku}),(0,v.jsxs)(`td`,{className:`p-3 font-mono text-right font-bold`,children:[`₹`,Number(e.price).toFixed(2)]}),(0,v.jsx)(`td`,{className:`p-3 text-center`,onClick:e=>e.stopPropagation(),children:(0,v.jsx)(`input`,{type:`number`,min:1,max:999,value:t?t.copies:1,onChange:t=>E(e.id,parseInt(t.target.value)||1),className:`w-16 h-8 border border-zinc-300 rounded text-center text-sm font-mono focus:outline-none focus:border-[#E60000]`})})]},e.id)})})]})})]})})}export{C as default};