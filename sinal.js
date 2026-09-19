/* ═══════════════════════════════════════════════════════════════════════════
   ★ LIONHEART · FAROL DO FUNIL · 19/09/2026 (v2)
   Medir a jornada do visitante: quem chegou, de onde veio, quem quis ver os
   planos, quem pediu demonstração, quem abriu a compra, quem escolheu um plano
   e quem desistiu antes de aceitar.

   PRIVACIDADE POR DESENHO (LGPD):
   · o visitante é um número ALEATÓRIO gerado no próprio navegador e guardado
     ali. Não vem de IP, não vem de característica do aparelho, não permite
     reconhecer a mesma pessoa em outro navegador nem descobrir quem ela é;
   · nenhum IP e nenhuma impressão digital sai daqui;
   · o e-mail só é enviado quando a própria pessoa o digitou na página — e aí
     ela já sabe que está se identificando;
   · quem estiver com o navegador em modo anônimo ou com armazenamento
     bloqueado vira um visitante novo a cada visita, e está tudo bem: ninguém
     é perseguido para ser contado.

   REGRA QUE VALE MAIS QUE O CÓDIGO: MEDIR NUNCA DERRUBA A PÁGINA.
   Tudo aqui está dentro de try/catch, a chamada é sem espera e ninguém olha a
   resposta. Se o servidor estiver fora, se o navegador for velho, se o
   localStorage estiver bloqueado — a página funciona igual. Contador que não
   consegue assinar porque o contador de visitas caiu é o pior dos mundos.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (w, d) {
  'use strict';

  var URL_SINAL = 'https://dilrjxsbcejcgprajayo.supabase.co/functions/v1/sinal';
  var CHAVE = 'lh_v';
  var CHAVE_CAMP = 'lh_camp';

  /* id aleatório do navegador — 16 caracteres, sem relação com a pessoa */
  function visitante() {
    try {
      var v = w.localStorage.getItem(CHAVE);
      if (v) return v;
      var b = new Uint8Array(8);
      if (w.crypto && w.crypto.getRandomValues) w.crypto.getRandomValues(b);
      else for (var i = 0; i < 8; i++) b[i] = Math.floor(Math.random() * 256);
      v = Array.prototype.map.call(b, function (x) {
        return ('0' + x.toString(16)).slice(-2);
      }).join('');
      w.localStorage.setItem(CHAVE, v);
      return v;
    } catch (e) {
      /* modo anônimo ou armazenamento bloqueado: conta como visita nova */
      return 'anon' + Math.random().toString(16).slice(2, 14);
    }
  }

  /* ── de onde veio: PRIMEIRO TOQUE, guardado no navegador ────────────────
     A pessoa chega em /?de=linkedin, navega para /assinar.html (que não tem
     parâmetro nenhum) e compra ali. Se a origem fosse lida da URL atual, o
     crédito se perderia exatamente no momento que importa — a venda.
     Por isso: grava na primeira visita e NUNCA sobrescreve. É a mesma regra
     que o banco aplica do outro lado, primeiro toque vence; se as duas pontas
     não usarem a mesma regra, o funil mede uma coisa e o dinheiro outra. */
  function daUrl() {
    try {
      var p = new w.URLSearchParams(w.location.search);
      var k = p.get('utm_source') || p.get('de');
      return k ? String(k).slice(0, 60) : null;
    } catch (e) { return null; }
  }

  function campanha() {
    var nova = daUrl();
    try {
      var guardada = w.localStorage.getItem(CHAVE_CAMP);
      if (guardada) return guardada;                 /* primeiro toque vence */
      if (nova) { w.localStorage.setItem(CHAVE_CAMP, nova); return nova; }
      return null;
    } catch (e) {
      /* sem localStorage: degrada para a URL atual, que é melhor que nada */
      return nova;
    }
  }

  var VIS = null;
  var CAMP = null;
  try { CAMP = campanha(); } catch (e) { CAMP = null; }
  /* as páginas leem daqui para mandar a origem junto do cadastro e da compra */
  w.LH_CAMPANHA = CAMP;

  /* ── o envio ────────────────────────────────────────────────────────────
     fetch com keepalive é o CAMINHO PRINCIPAL; sendBeacon é a reserva.

     A ordem aqui é uma correção, não gosto: sendBeacon devolve true quando o
     navegador ENFILEIRA o pedido, não quando o servidor recebe. Como ele
     sempre enfileira, o 'if (ok) return' fazia o fetch de reserva ser código
     morto — justamente na situação para a qual foi escrito. Foi assim que a
     falha de CORS de 19/09 produziu silêncio absoluto em vez de cair no plano
     B. keepalive sobrevive à troca de página igual ao beacon, e ao contrário
     dele deixa o erro aparecer. NÃO INVERTER ESTA ORDEM. */
  var TEM_KEEPALIVE = (function () {
    try { return !!w.Request && 'keepalive' in new w.Request('/'); } catch (e) { return false; }
  })();

  function porFetch(txt) {
    w.fetch(URL_SINAL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: txt,
      keepalive: true
    })['catch'](function () {});
  }

  function enviar(txt) {
    try {
      if (w.fetch && TEM_KEEPALIVE) { porFetch(txt); return; }
      /* reserva: navegador sem keepalive */
      if (w.navigator && w.navigator.sendBeacon) {
        w.navigator.sendBeacon(URL_SINAL, new Blob([txt], { type: 'application/json' }));
        return;
      }
      if (w.fetch) porFetch(txt);
    } catch (e) { /* silêncio: é um farol, não uma API */ }
  }

  /* LH_SINAL(evento, extras) — extras: {m: e-mail, pl: plano, c: ciclo} */
  function sinal(evento, extras) {
    try {
      if (!VIS) VIS = visitante();
      var corpo = {
        v: VIS,
        e: evento,
        p: (d.location.pathname || '/').slice(0, 120),
        k: CAMP
      };
      if (extras) {
        if (extras.m) corpo.m = extras.m;
        if (extras.pl) corpo.pl = extras.pl;
        if (extras.c) corpo.c = extras.c;
      }
      enviar(JSON.stringify(corpo));
    } catch (e) { /* silêncio: é um farol, não uma API */ }
  }

  w.LH_SINAL = sinal;

  /* ── o que cada página registra sozinha ───────────────────────────────── */
  try {
    var pag = (d.location.pathname || '/').toLowerCase();
    var naCompra = pag.indexOf('assinar') >= 0;

    sinal(naCompra ? 'assinar:abriu' : 'site:visita');

    /* cliques que valem: só os que dizem intenção */
    d.addEventListener('click', function (ev) {
      try {
        var alvo = ev.target;
        if (!alvo || !alvo.closest) return;
        /* o botão de demonstração é achado por ATRIBUTO, não por href: todo
           link de zap da página tem o mesmo endereço, e contar os dois como
           'site:whatsapp' mistura "quero uma demo" com "tenho uma dúvida" —
           apaga justamente a intenção que vale dinheiro. */
        if (alvo.closest('[data-lh="demo"]')) { sinal('site:demonstracao'); return; }
        var a = alvo.closest('a');
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (href.indexOf('wa.me') >= 0) sinal('site:whatsapp');
        else if (href.indexOf('assinar') >= 0) sinal('site:ver_planos');
        else if (href.indexOf('materiais/') >= 0) sinal('site:material');
      } catch (e) {}
    }, true);

    /* ★ e-mail digitado na página de compra.
       UMA VEZ POR PÁGINA e no blur, nunca a cada tecla: farol que escuta
       tecla é registrador de teclas, que é exatamente o que este arquivo
       promete não ser. E só com o campo válido — meio e-mail não é intenção.
       A pessoa digitou por vontade própria num campo rotulado "e-mail de
       acesso", então é coleta consentida pelo contexto. */
    if (naCompra) {
      var campo = d.getElementById('email');
      if (campo) {
        var jaContou = false;
        campo.addEventListener('blur', function () {
          try {
            if (jaContou) return;
            var em = (campo.value || '').trim();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return;
            jaContou = true;
            sinal('assinar:digitou_email', { m: em.toLowerCase() });
          } catch (e) {}
        });
      }
    }
  } catch (e) {}
})(window, document);
