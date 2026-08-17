/* =========================================================
   LAMIC — script compartilhado (sem dependências)
   ========================================================= */
(function () {
  "use strict";

  var reduzido = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* ---------- preloader "Lamic . . . carregando" ---------- */
  (function () {
    var tela = document.getElementById("carregando");
    if (!tela) { document.body.classList.remove("carregando"); return; }
    var iniciou = Date.now();
    var MIN = reduzido ? 0 : 650;   // tempo minimo visivel, evita "flash"
    var MAX = 5000;                 // seguranca: nunca travar na tela
    var feito = false;

    function libera() {
      if (feito) return;
      feito = true;
      tela.classList.add("sumiu");
      document.body.classList.remove("carregando");
      document.body.classList.add("pronto");
      setTimeout(function () {
        if (tela.parentNode) tela.parentNode.removeChild(tela);
      }, 700);
    }
    function agenda() {
      var falta = Math.max(0, MIN - (Date.now() - iniciou));
      setTimeout(libera, falta);
    }
    if (document.readyState === "complete") agenda();
    else window.addEventListener("load", agenda);
    setTimeout(libera, MAX);
  })();

  /* ---------- menu mobile ---------- */
  var btnMenu = document.getElementById("btnMenu");
  var rail = document.getElementById("rail");
  if (btnMenu && rail) {
    btnMenu.addEventListener("click", function () {
      var aberto = rail.classList.toggle("aberto");
      btnMenu.setAttribute("aria-expanded", aberto ? "true" : "false");
      btnMenu.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    });
    rail.addEventListener("click", function (e) {
      if (e.target.closest("nav a")) {
        rail.classList.remove("aberto");
        btnMenu.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- carrossel do hero ---------- */
  var slides = [].slice.call(document.querySelectorAll(".slide"));
  var dots = document.getElementById("dots");
  if (slides.length && dots) {
    var i = 0, timer = null, bolinhas;

    slides.forEach(function (_, n) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", "Ir para o slide " + (n + 1));
      b.addEventListener("click", function () { ir(n); reinicia(); });
      dots.appendChild(b);
    });
    bolinhas = [].slice.call(dots.children);

    function ir(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.toggle("on", k === i);
        s.setAttribute("aria-hidden", k === i ? "false" : "true");
      });
      bolinhas.forEach(function (b, k) {
        b.classList.toggle("on", k === i);
        b.setAttribute("aria-selected", k === i ? "true" : "false");
      });
    }
    function reinicia() {
      if (reduzido) return;
      clearInterval(timer);
      timer = setInterval(function () { ir(i + 1); }, 6500);
    }
    var ant = document.getElementById("ant"), prox = document.getElementById("prox");
    if (ant) ant.addEventListener("click", function () { ir(i - 1); reinicia(); });
    if (prox) prox.addEventListener("click", function () { ir(i + 1); reinicia(); });
    document.addEventListener("keydown", function (e) {
      if (e.target.matches("input,textarea,select")) return;
      if (e.key === "ArrowLeft") { ir(i - 1); reinicia(); }
      if (e.key === "ArrowRight") { ir(i + 1); reinicia(); }
    });
    var hero = document.querySelector(".hero");
    if (hero) {
      hero.addEventListener("mouseenter", function () { clearInterval(timer); });
      hero.addEventListener("mouseleave", reinicia);
    }
    ir(0); reinicia();
  }

  /* ---------- menu acompanha a seção (scrollspy) ---------- */
  var linksMenu = [].slice.call(document.querySelectorAll(".rail nav a[data-spy], .rail nav a[href^='#']"));
  var alvos = linksMenu
    .map(function (a) {
      var id = a.getAttribute("data-spy");
      if (!id) {
        var h = a.getAttribute("href") || "";
        id = h.indexOf("#") === 0 ? h.slice(1) : null;
      }
      return id ? { link: a, el: document.getElementById(id) } : null;
    })
    .filter(function (o) { return o && o.el; });

  if (alvos.length && "IntersectionObserver" in window) {
    var atual = null;
    function marca(link) {
      if (atual === link) return;
      atual = link;
      linksMenu.forEach(function (a) { a.classList.remove("on"); });
      if (link) link.classList.add("on");
    }
    var visiveis = {};
    var obs = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { visiveis[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
      var melhor = null, melhorVal = 0;
      alvos.forEach(function (o) {
        var v = visiveis[o.el.id] || 0;
        if (v > melhorVal) { melhorVal = v; melhor = o.link; }
      });
      if (melhor) marca(melhor);
    }, { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.01, 0.25, 0.5, 1] });
    alvos.forEach(function (o) { obs.observe(o.el); });
  }

  /* ---------- voltar ao topo ---------- */
  var subir = document.getElementById("subir");
  if (subir) {
    var mostraSubir = function () {
      subir.classList.toggle("ver", window.scrollY > 420);
    };
    window.addEventListener("scroll", mostraSubir, { passive: true });
    mostraSubir();
    subir.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduzido ? "auto" : "smooth" });
      var m = document.querySelector(".rail .marca");
      if (m) m.focus({ preventScroll: true });
    });
  }

  /* ---------- robozinho / assistente ---------- */
  var bot = document.getElementById("bot");
  var painel = document.getElementById("botPainel");
  if (bot && painel) {
    var fecharBot = painel.querySelector(".fechar");
    function abre(v) {
      painel.classList.toggle("ver", v);
      bot.setAttribute("aria-expanded", v ? "true" : "false");
      if (v) {
        var p = painel.querySelector("#liviaFrame, .livia-alt a, .fechar");
        if (p) { try { p.focus(); } catch (err) {} }
      }
    }
    bot.addEventListener("click", function () { abre(!painel.classList.contains("ver")); });
    if (fecharBot) fecharBot.addEventListener("click", function () { abre(false); bot.focus(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && painel.classList.contains("ver")) { abre(false); bot.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (!painel.classList.contains("ver")) return;
      if (!painel.contains(e.target) && !bot.contains(e.target)) abre(false);
    });
  }

  /* ---------- acordeões genéricos (vacinas / exames) ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".vac>button, .exame>button");
    if (!b) return;
    var cx = b.parentElement;
    var aberto = cx.classList.toggle("aberto");
    b.setAttribute("aria-expanded", aberto ? "true" : "false");
  });

  /* ---------- busca de exames ---------- */
  function semAcento(s) {
    return (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }
  window.lamicSemAcento = semAcento;

  // distância de edição limitada (tolera erro de digitação)
  function proximo(alvo, termo) {
    if (Math.abs(alvo.length - termo.length) > 2) return false;
    var m = alvo.length, n = termo.length, ant = [], atu = [], j, k;
    for (j = 0; j <= n; j++) ant[j] = j;
    for (j = 1; j <= m; j++) {
      atu[0] = j;
      for (k = 1; k <= n; k++) {
        atu[k] = Math.min(ant[k] + 1, atu[k - 1] + 1, ant[k - 1] + (alvo[j - 1] === termo[k - 1] ? 0 : 1));
      }
      for (k = 0; k <= n; k++) ant[k] = atu[k];
    }
    return ant[n] <= (termo.length <= 5 ? 1 : 2);
  }

  var campo = document.getElementById("buscaExame");
  var lista = document.getElementById("listaExames");
  if (campo && lista && window.EXAMES) {
    var base = window.EXAMES.map(function (e) {
      return {
        d: e,
        bn: semAcento(e.n),
        bm: semAcento(e.m),
        bs: semAcento(e.s),
        letra: semAcento(e.n).charAt(0).toUpperCase()
      };
    }).sort(function (a, b) { return a.bn < b.bn ? -1 : 1; });

    var LOTE = 60;
    var filtrados = base, mostrando = 0, letraAtiva = "";
    var contador = document.getElementById("contador");
    var maisBtn = document.getElementById("maisExames");
    var limpar = document.getElementById("limparBusca");
    var alfa = document.getElementById("alfabeto");

    function esc(s) {
      return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function cartao(o) {
      var e = o.d;
      var li = document.createElement("li");
      li.className = "exame";
      li.innerHTML =
        '<button type="button" aria-expanded="false">' +
          '<span class="nome">' + esc(e.n) + "</span>" +
          (e.m ? '<span class="mn">' + esc(e.m) + "</span>" : "") +
          '<span class="mais" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M6 1v10M1 6h10"/></svg></span>' +
        "</button>" +
        '<div class="detalhe">' +
          '<h4>Preparo e orienta\u00e7\u00f5es</h4>' +
          (e.i ? "<p>" + esc(e.i) + "</p>"
               : '<p class="vazio">Preparo n\u00e3o informado no cadastro. Confirme no WhatsApp da unidade antes de comparecer.</p>') +
          (e.s ? '<h4>Tamb\u00e9m conhecido como</h4><p>' + esc(e.s) + "</p>" : "") +
        "</div>";
      return li;
    }

    function pinta(zerar) {
      if (zerar) { lista.innerHTML = ""; mostrando = 0; }
      var fim = Math.min(mostrando + LOTE, filtrados.length);
      var frag = document.createDocumentFragment();
      for (var k = mostrando; k < fim; k++) frag.appendChild(cartao(filtrados[k]));
      lista.appendChild(frag);
      mostrando = fim;
      if (maisBtn) {
        maisBtn.style.display = mostrando < filtrados.length ? "" : "none";
        maisBtn.textContent = "Ver mais " + Math.min(LOTE, filtrados.length - mostrando) + " exames";
      }
      var vazio = document.getElementById("semRes");
      if (vazio) vazio.style.display = filtrados.length ? "none" : "";
      if (contador) {
        contador.innerHTML =
          "<span>Mostrando <b>" + mostrando + "</b> de <b>" + filtrados.length + "</b> exames</span>" +
          "<span>Cat\u00e1logo completo: " + base.length + " exames</span>";
      }
    }

    function filtra() {
      var t = semAcento(campo.value);
      filtrados = base.filter(function (o) {
        if (letraAtiva && o.letra !== letraAtiva) return false;
        if (!t) return true;
        if (o.bn.indexOf(t) >= 0 || o.bm.indexOf(t) >= 0 || o.bs.indexOf(t) >= 0) return true;
        if (t.length >= 4) {
          return o.bn.split(/[^a-z0-9]+/).some(function (p) { return p && proximo(p, t); });
        }
        return false;
      });
      pinta(true);
    }

    var espera = null;
    campo.addEventListener("input", function () {
      clearTimeout(espera);
      espera = setTimeout(filtra, 120);
    });
    if (limpar) limpar.addEventListener("click", function () { campo.value = ""; letraAtiva = ""; if (alfa) [].slice.call(alfa.children).forEach(function (b) { b.classList.remove("on"); }); filtra(); campo.focus(); });
    if (maisBtn) maisBtn.addEventListener("click", function () { pinta(false); });

    if (alfa) {
      var letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
      var todas = document.createElement("button");
      todas.type = "button"; todas.textContent = "Todos"; todas.className = "on";
      alfa.appendChild(todas);
      letras.forEach(function (L) {
        if (!base.some(function (o) { return o.letra === L; })) return;
        var b = document.createElement("button");
        b.type = "button"; b.textContent = L;
        alfa.appendChild(b);
      });
      alfa.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        [].slice.call(alfa.children).forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        letraAtiva = b.textContent === "Todos" ? "" : b.textContent;
        filtra();
      });
    }

    // busca vinda da home via ?q=
    var q = new URLSearchParams(location.search).get("q");
    if (q) campo.value = q;
    filtra();
  }

  /* ---------- busca da home envia para exames.html ---------- */
  var formHome = document.getElementById("buscaHome");
  if (formHome) {
    formHome.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = formHome.querySelector("input").value.trim();
      location.href = "exames.html" + (v ? "?q=" + encodeURIComponent(v) : "");
    });
  }

  /* ---------- formulários sem back-end ---------- */
  [].slice.call(document.querySelectorAll("form[data-sem-backend]")).forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var aviso = f.querySelector(".retorno");
      if (aviso) {
        aviso.textContent = "Este formul\u00e1rio ainda n\u00e3o est\u00e1 conectado a um back-end. Enquanto isso, fale com a gente pelo WhatsApp (88) 9.8834-0130.";
        aviso.style.display = "block";
      }
    });
  });
})();

/* ===== efeitos de scroll ===== */
(function () {
  "use strict";
  var reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- 1. barra de progresso da leitura --- */
  if (!reduz) {
    var barra = document.createElement("div");
    barra.className = "progresso";
    document.body.appendChild(barra);
    var atualizaBarra = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.pageYOffset / h) * 100 : 0;
      barra.style.width = Math.min(100, Math.max(0, p)) + "%";
    };
    window.addEventListener("scroll", atualizaBarra, { passive: true });
    window.addEventListener("resize", atualizaBarra);
    atualizaBarra();
  }

  /* --- 2. entrada dos blocos conforme o scroll --- */
  var alvos = [];
  var marca = function (sel, tipo) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
      if (el.hasAttribute("data-anim")) return;
      if (el.closest("#carregando") || el.closest(".rail") || el.closest(".topo")) return;
      el.setAttribute("data-anim", tipo || "");
      alvos.push(el);
    });
  };
  marca(".sec .cab", "");
  marca(".servicos .card", "");
  marca(".faixa .nums div", "");
  marca(".missao .painel", "esq");
  marca(".missao .txt, .missao .duas > *", "dir");
  marca(".logos > *", "zoom");
  marca(".credito div", "");
  marca(".form-sec form, .mapa-largo", "");
  marca(".bloco, .estat, .destaque-cx, .cta", "");
  marca(".grade-un .un, .grade-planos .plano, .vac, .acordeao > *", "");
  marca(".busca form", "zoom");

  if (reduz) {
    alvos.forEach(function (el) { el.classList.add("vis"); });
  } else if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var irmaos = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
        el.style.transitionDelay = Math.min(irmaos, 5) * 70 + "ms";
        el.classList.add("vis");
        obs.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    alvos.forEach(function (el) { obs.observe(el); });
  } else {
    alvos.forEach(function (el) { el.classList.add("vis"); });
  }

  /* --- 3. parallax discreto do hero + presenca do menu --- */
  var hero = document.querySelector(".hero");
  var txt = document.querySelector(".hero-txt");
  var tick = false;
  var quadro = function () {
    var y = window.pageYOffset;
    document.body.classList.toggle("rolou", y > 40);
    if (!reduz && hero && window.innerWidth > 960) {
      var lim = hero.offsetHeight || 1;
      var r = Math.min(1, y / lim);
      Array.prototype.forEach.call(hero.querySelectorAll(".slide.on .ph img"), function (im) {
        im.style.transform = "translate3d(0," + (r * 42).toFixed(1) + "px,0) scale(" + (1 + r * 0.05).toFixed(3) + ")";
      });
      if (txt) {
        txt.style.transform = "translate(-50%,calc(-50% + " + (r * 26).toFixed(1) + "px))";
        txt.style.opacity = String(Math.max(0, 1 - r * 1.15));
      }
    }
    tick = false;
  };
  window.addEventListener("scroll", function () {
    if (tick) return;
    tick = true;
    window.requestAnimationFrame(quadro);
  }, { passive: true });
  quadro();

  /* --- 4. numeros que contam ao aparecer --- */
  var nums = document.querySelectorAll(".faixa .nums b, .estat b");
  var conta = function (el) {
    var alvo = el.textContent.trim();
    var m = alvo.replace(/\./g, "").match(/^(\d+)(\D*)$/);
    if (!m) return;
    var fim = parseInt(m[1], 10);
    var sufixo = m[2] || "";
    if (!fim || fim > 100000) return;
    var ini = null;
    var dur = 1100;
    var passo = function (t) {
      if (ini === null) ini = t;
      var p = Math.min(1, (t - ini) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(fim * e).toLocaleString("pt-BR") + sufixo;
      if (p < 1) window.requestAnimationFrame(passo);
      else el.textContent = alvo;
    };
    window.requestAnimationFrame(passo);
  };
  if (!reduz && nums.length && "IntersectionObserver" in window) {
    var obs2 = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        conta(e.target);
        obs2.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(nums, function (el) { obs2.observe(el); });
  }
})();

/* ===== chat da Livia ===== */
(function () {
  "use strict";
  var bot = document.getElementById("bot");
  var painel = document.getElementById("botPainel");
  var frame = document.getElementById("liviaFrame");
  if (!bot || !painel || !frame) return;

  var aviso = document.getElementById("liviaCarregando");
  var alterna = document.getElementById("liviaAlt");
  var iniciado = false;
  var relogio = null;

  var mostraAlternativa = function () {
    if (aviso) aviso.classList.add("sumiu");
    if (alterna) alterna.classList.add("ver");
  };

  /* carrega o chat somente quando a pessoa abre o painel:
     nao pesa no carregamento da pagina e nao cria cookie antes do consentimento */
  var iniciaChat = function () {
    if (iniciado) return;
    iniciado = true;
    var url = frame.getAttribute("data-src");
    if (!url) { mostraAlternativa(); return; }
    frame.addEventListener("load", function () {
      if (relogio) window.clearTimeout(relogio);
      frame.classList.add("ok");
      if (aviso) aviso.classList.add("sumiu");
    });
    frame.addEventListener("error", mostraAlternativa);
    frame.src = url;
    /* se a plataforma nao permitir embutir (X-Frame-Options / CSP),
       oferecemos o link para abrir em outra aba */
    relogio = window.setTimeout(function () {
      if (!frame.classList.contains("ok")) mostraAlternativa();
    }, 6000);
  };

  var observa = function () {
    if (painel.classList.contains("ver")) iniciaChat();
  };
  bot.addEventListener("click", function () { window.setTimeout(observa, 30); });
  if (window.MutationObserver) {
    new window.MutationObserver(observa).observe(painel, {
      attributes: true, attributeFilter: ["class"]
    });
  }
  observa(); /* se o painel ja abrir aberto, carrega na hora */
})();
