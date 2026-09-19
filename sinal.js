/* ═══════════════════════════════════════════════════════════════════════════
   ★ LIONHEART · FAROL DO FUNIL · 19/09/2026
   Medir a jornada do visitante: quem chegou, quem quis ver os planos, quem
   abriu a compra, quem escolheu um plano e quem desistiu antes de aceitar.

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

  /* de onde veio o clique — utm_source, ou o parâmetro curto ?de= */
  function campanha() {
    try {
      var p = new w.URLSearchParams(w.location.search);
      return p.get('utm_source') || p.get('de') || null;
    } catch (e) { return null; }
  }

  var VIS = null;

  /* LH_SINAL(evento, extras) — extras: {m: e-mail, pl: plano, c: ciclo} */
  function sinal(evento, extras) {
    try {
      if (!VIS) VIS = visitante();
      var corpo = {
        v: VIS,
        e: evento,
        p: (d.location.pathname || '/').slice(0, 120),
        k: campanha()
      };
      if (extras) {
        if (extras.m) corpo.m = extras.m;
        if (extras.pl) corpo.pl = extras.pl;
        if (extras.c) corpo.c = extras.c;
      }
      var txt = JSON.stringify(corpo);

      /* sendBeacon sobrevive ao clique que troca de página; o fetch é o reserva */
      if (w.navigator && w.navigator.sendBeacon) {
        var ok = w.navigator.sendBeacon(URL_SINAL,
          new Blob([txt], { type: 'application/json' }));
        if (ok) return;
      }
      if (w.fetch) {
        w.fetch(URL_SINAL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: txt,
          keepalive: true
        })['catch'](function () {});
      }
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
        var a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (href.indexOf('wa.me') >= 0) sinal('site:whatsapp');
        else if (href.indexOf('assinar') >= 0) sinal('site:ver_planos');
        else if (href.indexOf('materiais/') >= 0) sinal('site:material');
      } catch (e) {}
    }, true);
  } catch (e) {}
})(window, document);
