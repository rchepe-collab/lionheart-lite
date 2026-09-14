const fs=require('fs'), {JSDOM}=require('jsdom');
const CAT={ok:true,materiais:[{slug:'calendario-transicao',titulo:'Calendário da Transição',
  subtitulo:'2026 a 2033, ano a ano',resumo:'O que muda em cada ano.',tipo:'ebook',paginas:'leitura de 8 min'}]};
let enviado=null, aberto=null;
const dom=new JSDOM(fs.readFileSync('/home/claude/lite/index.html','utf8'),
 {runScripts:'dangerously',url:'https://lionheartintelligence.com.br/',pretendToBeVisual:true,
  beforeParse(w){
    w.fetch=(u,o)=>{ u=String(u);
      if(u.includes('materiais?o=catalogo')) return Promise.resolve({json:()=>Promise.resolve(CAT)});
      if(u.includes('materiais?o=baixar')){ enviado=JSON.parse(o.body);
        return Promise.resolve({json:()=>Promise.resolve({ok:true,arquivo:'materiais/calendario-transicao.html'})}); }
      return Promise.resolve({json:()=>Promise.resolve({ok:false})}); };
    w.open=(u)=>{ aberto=u; return null; };
    w.localStorage.setItem=function(){}; 
  }});
setTimeout(()=>{
 const d=dom.window.document; let mau=false;
 const L=(k,v)=>console.log('  '+k.padEnd(36,'.')+' '+v);
 const ex=(k,v)=>{L(k,v); if(v!==true) mau=true;};
 console.log('--- PROVA: materiais ---');
 ex('seção existe', !!d.getElementById('materiais'));
 ex('no menu', [...d.querySelectorAll('.menu a')].some(a=>a.getAttribute('href')==='#materiais'));
 const cards=[...d.querySelectorAll('.mt-card')];
 ex('um material na grade', cards.length===1);
 ex('capa desenhada em SVG', !!cards[0].querySelector('svg.mt-capa'));
 ex('endereço do arquivo NÃO está no HTML', !d.body.innerHTML.includes('calendario-transicao.html'));
 cards[0].dispatchEvent(new dom.window.Event('click'));
 const fu=d.getElementById('mt-fundo');
 ex('janela abriu', fu.getAttribute('data-aberto')==='1');
 ex('botão começa travado', d.getElementById('mt-ok').disabled===true);
 d.getElementById('mt-email').value='contador@escritorio.com.br';
 d.getElementById('mt-email').dispatchEvent(new dom.window.Event('input'));
 ex('ainda travado sem consentimento', d.getElementById('mt-ok').disabled===true);
 d.getElementById('mt-consent').checked=true;
 d.getElementById('mt-consent').dispatchEvent(new dom.window.Event('change'));
 ex('destrava com e-mail + consentimento', d.getElementById('mt-ok').disabled===false);
 ex('telefone segue vazio (opcional)', d.getElementById('mt-tel').value==='');
 d.getElementById('mt-ok').dispatchEvent(new dom.window.Event('click'));
 setTimeout(()=>{
   ex('enviou o e-mail', enviado && enviado.email==='contador@escritorio.com.br');
   ex('enviou consentimento', enviado && enviado.consentiu===true);
   ex('enviou o texto aceito', enviado && /Concordo em receber/.test(enviado.texto||''));
   ex('telefone vai nulo', enviado && enviado.telefone===null);
   ex('abriu o material', aberto==='materiais/calendario-transicao.html');
   ex('janela fechou', fu.getAttribute('data-aberto')==='0');
   console.log(mau?'RESULTADO: FALHOU':'RESULTADO: tudo aprovado');
   process.exitCode=mau?1:0;
 },60);
},600);
