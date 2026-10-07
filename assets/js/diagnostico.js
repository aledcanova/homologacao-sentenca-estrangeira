// Diagnóstico interativo (homologação de decisão estrangeira). As respostas ficam no navegador até a pessoa decidir enviar o caso.
(function () {
  'use strict';

  var SN = ['sim', 'nao'];
  var Q = {
    tipo: { s: 'A decisão', h: 'Escolha a que melhor descreve o seu caso.', t: 'Que decisão estrangeira você quer fazer valer no Brasil?', o: [
      ['divorcio', 'Divórcio'],
      ['familia', 'Guarda, pensão ou adoção, sem divórcio'],
      ['civel', 'Outra decisão judicial (cobrança, contrato, indenização)'],
      ['arbitral', 'Sentença arbitral'] ] },
    orgao: { s: 'A decisão', h: 'Em alguns países o divórcio é feito em cartório, prefeitura ou perante notário.', w: function (a) { return a.tipo !== 'arbitral'; }, t: 'Quem proferiu a decisão?', o: [
      ['juiz', 'Um juiz ou tribunal'],
      ['adm', 'Autoridade administrativa, cartório ou notário'],
      ['ns', 'Não sei'] ] },
    definitiva: { s: 'A decisão', h: 'Ou seja: não cabe mais recurso e ela já produz efeitos no país onde foi proferida.', t: 'A decisão é definitiva no país de origem?', o: [
      ['sim', 'Sim'], ['nao', 'Não, o processo ainda está em andamento'], ['ns', 'Não sei'] ] },
    consensual: { s: 'O que foi decidido', h: 'Consensual é quando os dois pediram ou concordaram com o divórcio no processo.', w: function (a) { return a.tipo === 'divorcio'; }, t: 'O divórcio foi consensual?', o: [
      ['sim', 'Sim'], ['nao', 'Não'], ['ns', 'Não sei'] ] },
    filhos: { s: 'O que foi decidido', w: function (a) { return a.tipo === 'divorcio'; }, t: 'A decisão trata de guarda ou visitas de filhos?', o: [['sim', 'Sim'], ['nao', 'Não']] },
    alim: { s: 'O que foi decidido', h: 'Para filhos ou para um dos cônjuges.', w: function (a) { return a.tipo === 'divorcio'; }, t: 'A decisão fixa pensão alimentícia?', o: [['sim', 'Sim'], ['nao', 'Não']] },
    part: { s: 'O que foi decidido', w: function (a) { return a.tipo === 'divorcio'; }, t: 'A decisão trata de partilha de bens?', o: [['sim', 'Sim'], ['nao', 'Não']] },
    imovel: { s: 'O que foi decidido', w: function (a) { return a.part === 'sim'; }, t: 'A partilha inclui imóvel situado no Brasil?', o: [['sim', 'Sim'], ['nao', 'Não']] },
    ptipo: { s: 'O que foi decidido', w: function (a) { return a.imovel === 'sim'; }, t: 'Como a partilha desse imóvel foi definida?', o: [
      ['acordo', 'Por acordo entre nós, confirmado na decisão'],
      ['imposta', 'Foi decidida pelo juiz, sem acordo'] ] },
    registro: { s: 'Situação no Brasil', h: 'Em cartório brasileiro ou por transcrição do registro consular.', w: function (a) { return a.tipo === 'divorcio'; }, t: 'O casamento está registrado no Brasil?', o: [
      ['sim', 'Sim'], ['nao', 'Não, nunca foi registrado no Brasil'], ['ns', 'Não sei'] ] },
    decbr: { s: 'Situação no Brasil', w: function (a) { return a.filhos === 'sim' || a.alim === 'sim' || a.tipo === 'familia'; }, t: 'Já existe decisão da Justiça brasileira sobre a guarda ou a pensão das mesmas pessoas?', o: [
      ['nao', 'Não'], ['sim', 'Sim'], ['ns', 'Não sei'] ] },
    objetivo: { s: 'Situação no Brasil', t: 'O que você precisa resolver no Brasil?', o: [
      ['casar', 'Casar novamente'],
      ['imovel', 'Vender ou regularizar um imóvel'],
      ['inventario', 'Herança ou inventário'],
      ['documentos', 'Atualizar documentos e estado civil'],
      ['cobrar', 'Cobrar valores ou fazer cumprir a decisão'],
      ['outro', 'Outro motivo'] ] },
    citado: { s: 'A outra parte', w: function (a) { return !(a.tipo === 'divorcio' && a.consensual === 'sim'); }, t: 'No processo estrangeiro, a outra parte foi chamada a se defender?', o: [
      ['sim', 'Sim, e participou do processo'],
      ['revelia', 'Foi chamada, mas não respondeu'],
      ['nao', 'Não foi chamada'],
      ['ns', 'Não sei'] ] },
    anuencia: { s: 'A outra parte', h: 'Não é obrigatória, mas dispensa a citação e encurta o processo.', w: function (a) { return !cartorio(a); }, t: 'A outra parte assinaria uma declaração de concordância com a homologação?', o: [
      ['sim', 'Sim'], ['talvez', 'Talvez'], ['nao', 'Não'] ] },
    onde: { s: 'A outra parte', w: function (a) { return !!a.anuencia && a.anuencia !== 'sim'; }, t: 'Onde a outra parte mora hoje?', o: [
      ['brasil', 'No Brasil'], ['exterior', 'No exterior, e sei o endereço'], ['desconhecido', 'Não sei onde mora'] ] }
  };
  // Divórcio consensual simples: dispensa homologação (CPC, art. 961, § 5º)
  function cartorio(a) { return a.tipo === 'divorcio' && a.consensual === 'sim' && a.filhos === 'nao' && a.alim === 'nao' && a.part === 'nao'; }
  var SECS = ['A decisão', 'O que foi decidido', 'Situação no Brasil', 'A outra parte'];
  var COMPLETO = { HDE: 1, HDE_PENDENCIAS: 1 };   // resultados que liberam a homologação completa
  var ORDER = ['tipo', 'orgao', 'definitiva', 'consensual', 'filhos', 'alim', 'part', 'imovel', 'ptipo', 'registro', 'decbr', 'objetivo', 'citado', 'anuencia', 'onde'];

  var stage = document.getElementById('wz-stage');
  if (!stage) return;
  var CFG = window.SITE_CONFIG || {};
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var a = {};          // respostas
  var current = null;  // chave da pergunta na tela
  var result = null;

  var $ = function (id) { return document.getElementById(id); };
  var top = $('wz-top'), bar = $('wz-progress'), count = $('wz-count');
  var pResult = $('wz-result'), pEnvio = $('wz-envio'), pProposta = $('wz-proposta'), pContrato = $('wz-contrato'), pPag = $('wz-pagamento'), pFalar = $('wz-falar');

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function list(items, ordered) {
    var l = document.createElement(ordered ? 'ol' : 'ul');
    items.forEach(function (t) { l.appendChild(el('li', t)); });
    return l;
  }
  function label(k, v) {
    var r = '';
    Q[k].o.forEach(function (o) { if (o[0] === v) r = o[1]; });
    return r;
  }
  function visible() { return ORDER.filter(function (k) { return !Q[k].w || Q[k].w(a); }); }
  function prune() {   // descarta respostas de perguntas que deixaram de se aplicar
    var vis = visible();
    Object.keys(a).forEach(function (k) { if (vis.indexOf(k) < 0) delete a[k]; });
  }
  function nextKey() {
    var vis = visible();
    for (var i = 0; i < vis.length; i++) if (!a[vis[i]]) return vis[i];
    return null;
  }

  // Troca de painel com transição suave
  function swap(show, focusEl) {
    var panes = [stage, pResult, pEnvio, pProposta, pContrato, pPag, pFalar];
    panes.forEach(function (p) { if (p !== show) { p.hidden = true; p.classList.remove('in'); } });
    show.hidden = false;
    if (show !== stage) {
      show.classList.remove('in');
      void show.offsetWidth;
      show.classList.add('in');
    }
    top.hidden = show !== stage;
    if (focusEl) focusEl.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  function renderQuestion(k, back) {
    current = k;
    var q = Q[k], vis = visible(), idx = vis.indexOf(k);
    bar.value = Math.round((idx / vis.length) * 100);
    count.textContent = 'Etapa ' + (SECS.indexOf(q.s) + 1) + ' de ' + SECS.length;

    var step = el('div', null, 'wz-step');
    step.appendChild(el('p', q.s, 'wz-section'));
    var h = el('h2', q.t, 'wz-q'); h.id = 'wz-q'; h.tabIndex = -1;
    step.appendChild(h);
    if (q.h) step.appendChild(el('p', q.h, 'wz-help'));
    var opts = el('div', null, 'wz-opts');
    opts.setAttribute('role', 'group'); opts.setAttribute('aria-labelledby', 'wz-q');
    q.o.forEach(function (o) {
      if (q.f && !q.f(a, o[0])) return;
      var b = el('button', o[1], 'wz-opt');
      b.type = 'button';
      b.setAttribute('aria-pressed', a[k] === o[0] ? 'true' : 'false');
      b.addEventListener('click', function () { answer(k, o[0], b); });
      opts.appendChild(b);
    });
    step.appendChild(opts);
    var nav = el('div', null, 'wz-nav');
    if (idx > 0) {
      var v = el('button', '← Voltar', 'btn link'); v.type = 'button';
      v.addEventListener('click', function () { goBack(); });
      nav.appendChild(v);
    } else nav.appendChild(el('span'));
    step.appendChild(nav);
    if (idx === 0) step.appendChild(el('p', 'Nada do que você responder é enviado ou gravado nesta etapa. O envio só acontece no fim, se você quiser.', 'wz-priv'));

    var old = stage.firstChild;
    function enter() {
      stage.textContent = '';
      stage.appendChild(step);
      void step.offsetWidth;
      step.classList.add('in');
      h.focus({ preventScroll: true });
    }
    if (old && !reduce) { old.classList.add('out'); setTimeout(enter, 200); } else enter();
    if (stage.hidden) swap(stage, null);
  }

  var busy = false;
  function answer(k, v, btn) {
    if (busy) return;
    busy = true;
    a[k] = v;
    prune();
    Array.prototype.forEach.call(stage.querySelectorAll('.wz-opt'), function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    setTimeout(function () {
      busy = false;
      var n = nextKey();
      if (n) renderQuestion(n); else showResult();
    }, reduce ? 0 : 260);
  }
  function goBack() {
    var vis = visible(), idx = vis.indexOf(current);
    if (idx > 0) renderQuestion(vis[idx - 1], true);
  }

  // Classificação. Devolve {pill, cod, titulo, texto, atencao[], docs[], etapas[]}
  // Base: CPC, arts. 23, 960 a 965; Regimento Interno do STJ, arts. 216-A e seguintes; Provimento CNJ 149/2023, arts. 463 a 467.
  function classify(a) {
    var at = [];
    var div = a.tipo === 'divorcio';
    var DOCS = [
      'Cópia integral da decisão estrangeira, emitida pelo tribunal, e do acordo que ela tenha aprovado',
      'Documento do tribunal estrangeiro que comprove que a decisão é definitiva',
      'Apostila da Convenção da Haia sobre esses documentos, feita no país de origem (ou legalização consular, se o país não aderiu)',
      'Tradução juramentada para o português, feita no Brasil',
      'Certidão de casamento brasileira atualizada, quando se tratar de divórcio',
      'Documento de identidade e CPF',
      'Declaração de concordância da outra parte, se ela aceitar assinar; caso contrário, o endereço dela'
    ];
    var ETAPAS = [
      'Análise da decisão e dos documentos por advogado',
      'Apostila no país de origem e tradução juramentada no Brasil',
      'Pedido eletrônico ao Superior Tribunal de Justiça',
      'Citação da outra parte, quando não houver declaração de concordância',
      'Manifestação do Ministério Público Federal e decisão do tribunal',
      'Carta de sentença e averbação no cartório de registro civil'
    ];

    if (a.orgao === 'adm') at.push('A decisão não foi proferida por juiz. Decisões não judiciais podem ser homologadas quando, pela lei brasileira, teriam natureza jurisdicional. É preciso examinar o ato.');
    if (a.orgao === 'ns') at.push('Confirmar que autoridade proferiu a decisão.');
    if (a.definitiva === 'ns') at.push('Confirmar, por documento do tribunal estrangeiro, que a decisão é definitiva e já produz efeitos no país de origem.');
    if (a.consensual === 'ns') at.push('Verificar se o divórcio foi consensual. Se foi, e a decisão não tratar de mais nada, a averbação pode ser feita direto no cartório.');
    if (a.registro === 'nao') at.push('O casamento não está registrado no Brasil. Pode ser necessário registrá-lo antes da averbação do divórcio.');
    if (a.registro === 'ns') at.push('Verificar se o casamento tem registro em cartório brasileiro ou transcrição consular.');
    if (a.ptipo === 'acordo') at.push('Há imóvel no Brasil partilhado por acordo. O Superior Tribunal de Justiça tem admitido a homologação quando a decisão estrangeira apenas confirma o acordo das partes.');
    if (a.ptipo === 'imposta') at.push('A partilha de imóvel situado no Brasil foi decidida sem acordo. A lei reserva essa matéria à Justiça brasileira; essa parte da decisão pode não ser homologada e exigir medida própria no Brasil.');
    if (a.decbr === 'sim') at.push('Já existe decisão brasileira sobre guarda ou pensão. O Superior Tribunal de Justiça não homologa a parte da decisão estrangeira que trata do mesmo assunto.');
    if (a.decbr === 'ns') at.push('Verificar se há processo de guarda ou de alimentos em andamento ou julgado no Brasil.');
    if (a.filhos === 'sim' || a.alim === 'sim' || a.tipo === 'familia') at.push('Cláusulas sobre guarda, visitas e pensão são examinadas à luz da ordem pública e do interesse da criança, e podem ser revistas depois no Brasil.');
    if (a.citado === 'revelia') at.push('A outra parte não respondeu ao processo estrangeiro. Será preciso demonstrar que ela foi regularmente chamada e que a revelia foi reconhecida conforme a lei local.');
    if (a.citado === 'ns') at.push('Verificar, nos autos do processo estrangeiro, se a outra parte foi regularmente chamada a se defender.');
    if (a.anuencia === 'sim') at.push('Com a declaração de concordância da outra parte, a citação é dispensada.');
    if (a.anuencia === 'talvez') at.push('Se a outra parte assinar a declaração de concordância, a citação é dispensada; se não assinar, o tribunal manda citá-la.');
    if (a.onde === 'brasil') at.push('Sem a concordância, a outra parte é citada no Brasil por ordem do tribunal.');
    if (a.onde === 'exterior') at.push('Sem a concordância, a outra parte é citada no exterior por carta rogatória, que precisa ser traduzida e costuma alongar o processo.');
    if (a.onde === 'desconhecido') at.push('O endereço da outra parte é desconhecido. Será preciso demonstrar as tentativas de localização para que o tribunal defina a forma de citação.');

    if (a.definitiva === 'nao') {
      return { pill: 'warn', cod: 'NAO_DEFINITIVA', titulo: 'É preciso aguardar a decisão se tornar definitiva',
        texto: 'Você informou que o processo estrangeiro ainda está em andamento. A homologação exige que a decisão seja eficaz no país em que foi proferida. Em regra, o pedido só pode ser apresentado depois de encerrado o processo no exterior.',
        atencao: ['Enquanto isso, vale reunir os documentos e verificar como obter, no tribunal estrangeiro, a prova de que a decisão se tornou definitiva.'],
        docs: DOCS, etapas: ['Encerramento do processo no exterior', 'Depois, análise da homologação'] };
    }
    if (cartorio(a)) {
      return { pill: 'ok', cod: 'CARTORIO', titulo: 'Pelo que você informou, não é preciso homologar no STJ',
        texto: 'A sentença estrangeira de divórcio consensual que trata apenas da dissolução do casamento produz efeitos no Brasil sem homologação. A averbação é feita diretamente no cartório de registro civil em que o casamento está registrado, e não exige advogado.',
        atencao: at,
        docs: ['Cópia integral da sentença estrangeira de divórcio', 'Prova de que ela é definitiva', 'Apostila da Convenção da Haia (ou legalização consular)', 'Tradução juramentada para o português', 'Certidão de casamento brasileira'],
        etapas: ['Obter a sentença e a prova de que é definitiva', 'Apostilar no país de origem', 'Traduzir com tradutor juramentado no Brasil', 'Apresentar ao cartório de registro civil onde o casamento está registrado'] };
    }
    if (a.citado === 'nao') {
      return { pill: 'warn', cod: 'SEM_CITACAO', titulo: 'Há um requisito da homologação que precisa ser examinado antes',
        texto: 'Você informou que a outra parte não foi chamada a se defender no processo estrangeiro. A lei brasileira exige, para a homologação, que tenha havido citação regular, ainda que a parte não tenha respondido. É preciso examinar os autos para saber se esse requisito pode ser demonstrado.',
        atencao: at, docs: DOCS, etapas: ['Exame dos autos do processo estrangeiro', 'Definição da viabilidade da homologação'] };
    }
    if (a.tipo === 'arbitral') {
      return { pill: 'warn', cod: 'ARBITRAL', titulo: 'Sentença arbitral estrangeira: homologação no STJ, com requisitos próprios',
        texto: 'A sentença arbitral estrangeira também precisa ser homologada pelo Superior Tribunal de Justiça para ser executada no Brasil. Os requisitos são os da Lei de Arbitragem e da Convenção de Nova York, e o exame começa pela convenção de arbitragem e pela sentença.',
        atencao: at,
        docs: ['Sentença arbitral, original ou cópia certificada', 'Convenção de arbitragem (cláusula compromissória ou compromisso)', 'Traduções juramentadas', 'Dados da parte contrária no Brasil'],
        etapas: ['Análise da sentença e da convenção de arbitragem', 'Pedido de homologação ao STJ', 'Citação e eventual contestação', 'Decisão e, depois, execução na Justiça Federal'] };
    }
    if (!div) {
      return { pill: 'warn', cod: 'HDE_OUTRA', titulo: 'A decisão precisa ser homologada no STJ para valer no Brasil',
        texto: 'Decisões estrangeiras só produzem efeitos no Brasil depois de homologadas pelo Superior Tribunal de Justiça. Como não se trata de divórcio, o alcance do pedido e os documentos precisam ser definidos caso a caso.',
        atencao: at, docs: DOCS, etapas: ETAPAS };
    }
    var serios = a.ptipo === 'imposta' || a.decbr === 'sim' || a.orgao === 'adm' || a.citado === 'revelia' || a.consensual === 'ns';
    if (serios) {
      return { pill: 'warn', cod: 'HDE_PENDENCIAS', titulo: 'Seu caso precisa de homologação no STJ, com pontos a esclarecer antes',
        texto: 'Como a decisão vai além da simples dissolução consensual do casamento, ela precisa ser homologada pelo Superior Tribunal de Justiça. Pelas suas respostas, existem pontos que podem limitar o alcance da homologação e precisam de análise documental.',
        atencao: at, docs: DOCS, etapas: ETAPAS };
    }
    return { pill: 'ok', cod: 'HDE', titulo: 'Seu caso precisa de homologação no STJ',
      texto: 'Como a decisão vai além da simples dissolução consensual do casamento, ela só produz efeitos no Brasil depois de homologada pelo Superior Tribunal de Justiça. Pelas suas respostas, estão presentes os elementos normalmente exigidos. A confirmação depende do exame dos documentos.',
      atencao: at, docs: DOCS, etapas: ETAPAS };
  }

  function showResult() {
    result = classify(a);
    bar.value = 100;
    var vd = $('verdict');
    vd.className = 'verdict ' + result.pill;
    $('verdict-title').textContent = result.titulo;
    $('verdict-text').textContent = result.texto;
    var m = $('mapa'); m.textContent = '';
    if (result.atencao.length) { m.appendChild(el('h3', 'Pontos de atenção')); m.appendChild(list(result.atencao)); }
    m.appendChild(el('h3', 'Documentos normalmente relevantes')); m.appendChild(list(result.docs));
    m.appendChild(el('h3', 'Etapas gerais')); m.appendChild(list(result.etapas, true));
    var cart = result.cod === 'CARTORIO';
    $('next-text').textContent = cart
      ? 'Você não precisa de advogado para essa averbação. Se ainda assim quiser que um advogado confira os documentos antes de ir ao cartório, envie seus dados e veja a proposta da consulta.'
      : 'Envie seus dados e os documentos que tiver. Em seguida você vê a proposta de honorários e pode contratar pelo próprio site, ou falar com o advogado.';
    $('abrir-envio').textContent = cart ? 'Quero a conferência por advogado' : 'Iniciar a homologação';
    swap(pResult, $('verdict-title'));
  }

  $('refazer').addEventListener('click', function () { a = {}; result = null; renderQuestion(ORDER[0]); swap(stage, null); });
  $('imprimir').addEventListener('click', function () { window.print(); });
  $('abrir-envio').addEventListener('click', function () { swap(pEnvio, $('envio-title')); });
  $('voltar-resultado').addEventListener('click', function () { swap(pResult, $('verdict-title')); });

  // ---------- Passo 1: dados e documentos ----------
  var form = $('caso');
  var MAX = 8 * 1024 * 1024;
  var caso = null;   // {protocolo, nome, email} depois do envio
  function setErr(input, errId, bad, msg) {
    var e = $(errId);
    if (msg) e.textContent = msg;
    e.hidden = !bad;
    if (input) input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    return bad;
  }
  function validate() {
    var first = null;
    function chk(id, errId, bad, msg) { if (setErr($(id), errId, bad, msg) && !first) first = $(id); }
    chk('f-nome', 'e-nome', $('f-nome').value.trim().split(/\s+/).length < 2);
    chk('f-email', 'e-email', !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('f-email').value.trim()));
    chk('f-pdec', 'e-pdec', $('f-pdec').value.trim().length < 2);
    chk('f-pres', 'e-pres', $('f-pres').value.trim().length < 2);
    var total = 0, tipoRuim = false;
    ['f-sentenca', 'f-definitiva', 'f-casamento'].forEach(function (id) {
      var f = $(id).files && $(id).files[0];
      if (f) { total += f.size; if (!/\.(pdf|jpe?g|png|heic)$/i.test(f.name)) tipoRuim = true; }
    });
    var arqMsg = tipoRuim ? 'Envie apenas arquivos PDF, JPG, PNG ou HEIC.' : 'Os arquivos somam mais de 8 MB. Remova algum; o restante pode ser enviado depois, por e-mail.';
    if (setErr(null, 'e-arq', tipoRuim || total > MAX, arqMsg) && !first) first = $('f-sentenca');
    chk('f-c1', 'e-c1', !$('f-c1').checked);
    chk('f-c2', 'e-c2', !$('f-c2').checked);
    return first;
  }
  function protocolo() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    var r = '', abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var buf = new Uint8Array(5);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < 5; i++) r += abc[buf[i] % abc.length];
    return 'HD-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + r;
  }
  function setProt(p) {
    Array.prototype.forEach.call(document.querySelectorAll('.prot'), function (e) { e.textContent = p; });
  }
  function paraJson(fd) {   // campos de texto + arquivos em base64, no formato esperado por backend/Code.gs
    var campos = {}, arqs = [];
    fd.forEach(function (v, k) { if (typeof v === 'string') campos[k] = v; else if (v && v.size) arqs.push([k, v]); });
    return Promise.all(arqs.map(function (a) {
      return new Promise(function (res, rej) {
        var r = new FileReader();
        r.onload = function () { res({ campo: a[0], nome: a[1].name, tipo: a[1].type, dados: String(r.result).split(',')[1] }); };
        r.onerror = rej;
        r.readAsDataURL(a[1]);
      });
    })).then(function (arquivos) { return JSON.stringify({ form: campos['form-name'], campos: campos, arquivos: arquivos }); });
  }
  function post(fd, btn, rotulo, errBox, ok) {
    errBox.hidden = true;
    btn.disabled = true; btn.textContent = 'Enviando…';
    var envio = CFG.endpoint
      ? paraJson(fd).then(function (corpo) {
          // text/plain evita a pré-verificação CORS, que o Apps Script não responde
          return fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: corpo });
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(function (j) { if (!j || !j.ok) throw new Error((j && j.erro) || 'recusado'); })
      : fetch('/', { method: 'POST', body: fd }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); });
    envio.then(function () {
      ok();
    }).catch(function () {
      errBox.textContent = 'Não foi possível enviar agora. Verifique a conexão e tente de novo. Se o problema continuar, escreva para ' + (CFG.email || 'o e-mail da página de contato') + '.';
      errBox.hidden = false;
    }).then(function () { btn.disabled = false; btn.textContent = rotulo; });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var bad = validate();
    if (bad) { bad.focus(); return; }
    var prot = caso ? caso.protocolo : protocolo();
    $('f-protocolo').value = prot;
    $('f-codigo').value = result ? result.cod : '';
    $('f-resultado').value = result ? result.titulo : '';
    $('f-respostas').value = visible().map(function (k) { return Q[k].t + ' ' + label(k, a[k]); }).join('\n');
    $('f-json').value = JSON.stringify(a);
    $('f-pontos').value = JSON.stringify(result ? result.atencao : []);
    var fd = new FormData(form);
    ['arquivo_sentenca', 'arquivo_definitiva', 'arquivo_casamento'].forEach(function (n) {
      var f = fd.get(n);
      if (f && typeof f === 'object' && !f.size) fd.delete(n);   // não envia campo de arquivo vazio
    });
    post(fd, $('enviar'), 'Enviar e ver a proposta', $('e-envio'), function () {
      caso = { protocolo: prot, nome: $('f-nome').value.trim(), email: $('f-email').value.trim() };
      setProt(prot);
      // O contrato de homologação completa é o do divórcio: só é oferecido quando o diagnóstico aponta essa via
      var completo = !!result && !!COMPLETO[result.cod];
      $('offer-procedimento').hidden = !completo;
      $('nota-so-analise').hidden = completo || result.cod === 'CARTORIO';
      $('nota-cartorio').hidden = result.cod !== 'CARTORIO';
      swap(pProposta, $('proposta-title'));
    });
  });

  // ---------- Passo 2: proposta ----------
  var PROD = {
    analise: { nome: 'Consulta de viabilidade', total: CFG.preco_analise, agora: CFG.preco_analise, link: CFG.link_cartao_analise, ct: 'ct-analise' },
    procedimento: { nome: 'Homologação completa', total: CFG.preco_procedimento, agora: Math.round(CFG.preco_procedimento * CFG.entrada_procedimento_pct) / 100, link: CFG.link_cartao_procedimento, ct: 'ct-procedimento' }
  };
  var produto = null;
  function brl(v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); }

  Array.prototype.forEach.call(pProposta.querySelectorAll('[data-produto]'), function (b) {
    b.addEventListener('click', function () {
      produto = b.getAttribute('data-produto');
      var p = PROD[produto];
      $('ct-analise').hidden = produto !== 'analise';
      $('ct-procedimento').hidden = produto !== 'procedimento';
      $('k-resumo').textContent = brl(p.total) + (p.agora !== p.total ? ' (entrada de ' + brl(p.agora) + ' agora)' : '');
      $('k-aceite').checked = false;
      swap(pContrato, $('contrato-title'));
    });
  });
  $('voltar-proposta').addEventListener('click', function () { swap(pProposta, $('proposta-title')); });
  $('abrir-falar').addEventListener('click', function () {
    var assunto = encodeURIComponent('Protocolo ' + caso.protocolo + ' - falar com o advogado');
    $('falar-email').href = 'mailto:' + CFG.email + '?subject=' + assunto;
    if (CFG.whatsapp_e164) {
      var w = $('falar-whats');
      w.href = 'https://wa.me/' + CFG.whatsapp_e164.replace(/\D/g, '') + '?text=' + encodeURIComponent('Protocolo ' + caso.protocolo);
      w.hidden = false;
    }
    swap(pFalar, $('falar-title'));
  });
  $('falar-voltar').addEventListener('click', function () { swap(pProposta, $('proposta-title')); });

  // ---------- Passo 3: contrato e aceite ----------
  function cpfOk(v) {
    var c = v.replace(/\D/g, '');
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    function dv(n) { var s = 0; for (var i = 0; i < n; i++) s += +c[i] * (n + 1 - i); var r = (s * 10) % 11; return r === 10 ? 0 : r; }
    return dv(9) === +c[9] && dv(10) === +c[10];
  }
  $('k-semcpf').addEventListener('change', function () {
    var s = this.checked;
    $('l-cpf').textContent = s ? 'Número do passaporte' : 'CPF do contratante';
    $('e-cpf').textContent = s ? 'Informe o número do passaporte.' : 'Informe um CPF válido.';
    $('k-cpf').value = ''; $('k-cpf').maxLength = s ? 20 : 14; $('k-cpf').setAttribute('inputmode', s ? 'text' : 'numeric');
  });
  $('k-cpf').addEventListener('input', function () {
    if ($('k-semcpf').checked) return;
    var c = this.value.replace(/\D/g, '').slice(0, 11);
    this.value = c.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  });
  var kform = $('contratacao');
  kform.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var first = null;
    function chk(id, errId, bad) { if (setErr($(id), errId, bad) && !first) first = $(id); }
    var semCpf = $('k-semcpf').checked;
    chk('k-cpf', 'e-cpf', semCpf ? $('k-cpf').value.trim().length < 5 : !cpfOk($('k-cpf').value));
    $('k-doctipo').value = semCpf ? 'passaporte' : 'cpf';
    chk('k-end', 'e-end', $('k-end').value.trim().length < 10);
    chk('k-aceite', 'e-aceite', !$('k-aceite').checked);
    if (first) { first.focus(); return; }
    var p = PROD[produto];
    $('k-protocolo').value = caso.protocolo;
    $('k-produto').value = produto;
    $('k-total').value = p.total;
    $('k-agora').value = p.agora;
    $('k-versao').value = CFG.versao_contrato || '';
    $('k-nome').value = caso.nome;
    $('k-email').value = caso.email;
    $('k-quando').value = new Date().toISOString();
    post(new FormData(kform), $('contratar'), 'Aceitar e ir para o pagamento', $('e-contratar'), function () { showPagamento(p); });
  });

  // ---------- Pagamento ----------
  function ascii(s, max) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, max);
  }
  function crc16(s) {
    var crc = 0xFFFF;
    for (var i = 0; i < s.length; i++) {
      crc ^= s.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return ('0000' + crc.toString(16).toUpperCase()).slice(-4);
  }
  function pixCode(valor, txid) {   // BR Code estático (padrão EMV do Banco Central)
    function f(id, v) { return id + ('0' + v.length).slice(-2) + v; }
    var s = f('00', '01') + f('26', f('00', 'br.gov.bcb.pix') + f('01', CFG.pix_chave)) + f('52', '0000') + f('53', '986') +
      f('54', Number(valor).toFixed(2)) + f('58', 'BR') + f('59', ascii(CFG.pix_nome, 25)) + f('60', ascii(CFG.pix_cidade, 15)) +
      f('62', f('05', txid)) + '6304';
    return s + crc16(s);
  }

  function showPagamento(p) {
    $('pag-produto').textContent = p.nome;
    $('pag-valor').textContent = brl(p.agora);
    var temPix = !!(CFG.pix_chave && CFG.pix_nome), temCartao = !!p.link;
    if (temPix) $('pix-code').value = pixCode(p.agora, caso.protocolo.replace(/[^A-Za-z0-9]/g, '').slice(0, 25));
    $('pag-pix').hidden = !temPix;
    if (temCartao) $('cartao-link').href = p.link;
    $('pag-cartao').hidden = !temCartao;
    $('pag-email').hidden = temPix || temCartao;
    var passos = produto === 'analise'
      ? [['Confirmação', 'Você recebe por e-mail a confirmação do pagamento e a cópia do contrato.'],
         ['Documentos', 'Se faltou a decisão estrangeira ou a certidão de casamento, envie em resposta a esse e-mail.'],
         ['Orientação', 'Você recebe a orientação inicial por e-mail.']]
      : [['Confirmação', 'Você recebe por e-mail a confirmação do pagamento e a cópia do contrato.'],
         ['Revisão do caso', 'O advogado revisa o caso e confirma a contratação. Se não confirmar, o valor pago é devolvido integralmente.'],
         ['Início', 'Confirmado, você recebe a procuração para assinar e a lista do que falta para o pedido ao STJ.']];
    var ol = $('pag-passos'); ol.textContent = '';
    passos.forEach(function (x) { var li = el('li'); li.appendChild(el('strong', x[0])); li.appendChild(document.createTextNode(x[1])); ol.appendChild(li); });
    swap(pPag, $('pag-title'));
  }
  $('pix-copiar').addEventListener('click', function () {
    var b = this, t = $('pix-code');
    function ok() { b.textContent = 'Código copiado'; setTimeout(function () { b.textContent = 'Copiar código Pix'; }, 2500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(ok, function () { t.select(); });
    else { t.select(); document.execCommand('copy'); ok(); }
  });

  renderQuestion(ORDER[0]);
})();
