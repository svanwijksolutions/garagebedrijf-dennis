/* ==========================================================================
   Garagebedrijf Dennis, demo-ontwerp
   Header/footer inladen, mobiel menu, taalswitcher, tellers en beweging.
   ========================================================================== */
(function () {
  'use strict';

  var SUPPORTED = ['nl', 'en'];
  var STORAGE_LANG = 'gd-lang';
  var STORAGE_COOKIE = 'gd-notice';
  var dictionaries = {};
  var currentLang = 'nl';

  /* ---------- opstarten ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function boot() {
    loadPartials().then(function () {
      initNavState();
      initMenu();
      initHeaderScroll();
      initMagnetic();
      initCounters();
      initReveal();
      initCookieNotice();
      initYear();
      return initLanguage();
    })['catch'](function (err) {
      /* Zelfs als een onderdeel faalt blijft de pagina volledig leesbaar. */
      if (window.console && console.warn) console.warn(err);
    });
  }

  function loadPartials() {
    return Promise.all([
      inject('header-placeholder', 'components/header.html'),
      inject('footer-placeholder', 'components/footer.html')
    ]);
  }

  function inject(id, url) {
    var host = document.getElementById(id);
    if (!host) return Promise.resolve();
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Kon ' + url + ' niet laden');
        return res.text();
      })
      .then(function (html) {
        host.innerHTML = html;
      });
  }

  /* ---------- actieve navigatie ---------- */
  function initNavState() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    var links = document.querySelectorAll('.nav-links a[data-nav="' + page + '"]');
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute('aria-current', 'page');
    }
  }

  /* ---------- mobiel menu ---------- */
  function initMenu() {
    var toggle = document.querySelector('.menu-toggle');
    var menu = document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    var links = menu.querySelectorAll('a');

    function openMenu() {
      menu.classList.add('open');
      document.body.classList.add('menu-open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      menu.classList.remove('open');
      document.body.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      if (menu.classList.contains('open')) closeMenu();
      else openMenu();
    });

    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', closeMenu);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeMenu();
        closeLangMenu();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768 && menu.classList.contains('open')) closeMenu();
    });
  }

  /* ---------- header verdicht bij scrollen ---------- */
  function initHeaderScroll() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var ticking = false;

    function update() {
      if (window.scrollY > 24) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });

    update();
  }

  /* ---------- subtiel magnetisch knop-effect ---------- */
  function initMagnetic() {
    if (!window.matchMedia) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var buttons = document.querySelectorAll('.btn');
    for (var i = 0; i < buttons.length; i++) {
      attachMagnet(buttons[i]);
    }

    function attachMagnet(el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = 'translate(' + (dx * 6).toFixed(2) + 'px,' + (dy * 4).toFixed(2) + 'px) scale(1.025)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    }
  }

  /* ---------- tellers ---------- */
  function initCounters() {
    var nodes = document.querySelectorAll('[data-count]');
    if (!nodes.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    for (var i = 0; i < nodes.length; i++) {
      run(nodes[i], i * 120);
    }

    function run(node, delay) {
      var target = parseInt(node.getAttribute('data-count'), 10);
      if (isNaN(target)) return;
      if (reduce) {
        node.textContent = String(target);
        return;
      }
      node.textContent = '0';
      window.setTimeout(function () {
        var start = null;
        var duration = 1300;
        function step(ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          node.textContent = String(Math.round(target * eased));
          if (p < 1) window.requestAnimationFrame(step);
          else node.textContent = String(target);
        }
        window.requestAnimationFrame(step);
      }, delay);
    }
  }

  /* ---------- veilig scroll-reveal (content blijft altijd zichtbaar) ---------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof window.IntersectionObserver !== 'function') return;

    document.body.classList.add('js-motion');

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    for (var i = 0; i < items.length; i++) {
      observer.observe(items[i]);
    }

    /* Vangnet: na 3,5 seconde is alles hoe dan ook zichtbaar. */
    window.setTimeout(function () {
      var rest = document.querySelectorAll('.reveal:not(.in-view)');
      for (var j = 0; j < rest.length; j++) {
        rest[j].classList.add('in-view');
      }
    }, 3500);
  }

  /* ---------- cookiemelding ---------- */
  function initCookieNotice() {
    var box = document.getElementById('cookie-notice');
    var accept = document.getElementById('cookie-accept');
    if (!box || !accept) return;

    if (safeGet(STORAGE_COOKIE) === 'ok') return;

    box.hidden = false;
    window.setTimeout(function () {
      box.classList.add('show');
    }, 900);

    accept.addEventListener('click', function () {
      box.classList.remove('show');
      safeSet(STORAGE_COOKIE, 'ok');
      window.setTimeout(function () {
        box.hidden = true;
      }, 500);
    });
  }

  function initYear() {
    var el = document.getElementById('footer-year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- taalswitcher ---------- */
  function initLanguage() {
    var stored = safeGet(STORAGE_LANG);
    var browser = (navigator.language || 'nl').slice(0, 2).toLowerCase();
    var lang = SUPPORTED.indexOf(stored) > -1 ? stored : (SUPPORTED.indexOf(browser) > -1 ? browser : 'nl');

    bindLangControls();
    return setLanguage(lang, false);
  }

  function bindLangControls() {
    var toggle = document.getElementById('lang-toggle');
    var menu = document.getElementById('lang-menu');

    if (toggle && menu) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        if (menu.classList.contains('open')) closeLangMenu();
        else {
          menu.classList.add('open');
          toggle.setAttribute('aria-expanded', 'true');
        }
      });

      document.addEventListener('click', function (e) {
        if (!menu.contains(e.target) && e.target !== toggle) closeLangMenu();
      });
    }

    var buttons = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        closeLangMenu();
        setLanguage(this.getAttribute('data-lang'), true);
      });
    }
  }

  function closeLangMenu() {
    var toggle = document.getElementById('lang-toggle');
    var menu = document.getElementById('lang-menu');
    if (menu) menu.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function setLanguage(lang, remember) {
    if (SUPPORTED.indexOf(lang) === -1) lang = 'nl';
    return loadDictionary(lang).then(function (dict) {
      currentLang = lang;
      document.documentElement.setAttribute('lang', lang);
      if (remember) safeSet(STORAGE_LANG, lang);
      applyTranslations(dict);
      markLanguage(lang);
    });
  }

  function loadDictionary(lang) {
    if (dictionaries[lang]) return Promise.resolve(dictionaries[lang]);
    return fetch('i18n/' + lang + '.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Taalbestand ' + lang + ' niet gevonden');
        return res.json();
      })
      .then(function (json) {
        dictionaries[lang] = json;
        return json;
      });
  }

  function applyTranslations(dict) {
    each('[data-i18n]', function (el) {
      var v = dict[el.getAttribute('data-i18n')];
      if (typeof v === 'string') el.textContent = v;
    });
    each('[data-i18n-html]', function (el) {
      var v = dict[el.getAttribute('data-i18n-html')];
      if (typeof v === 'string') el.innerHTML = v;
    });
    each('[data-i18n-aria]', function (el) {
      var v = dict[el.getAttribute('data-i18n-aria')];
      if (typeof v === 'string') el.setAttribute('aria-label', v);
    });
    each('[data-i18n-content]', function (el) {
      var v = dict[el.getAttribute('data-i18n-content')];
      if (typeof v === 'string') el.setAttribute('content', v);
    });
    each('[data-i18n-title]', function (el) {
      var v = dict[el.getAttribute('data-i18n-title')];
      if (typeof v === 'string') el.setAttribute('title', v);
    });
  }

  function markLanguage(lang) {
    var label = document.getElementById('lang-current');
    if (label) label.textContent = lang.toUpperCase();

    var use = document.getElementById('lang-flag-use');
    if (use) use.setAttribute('href', '#flag-' + lang);

    each('[data-lang]', function (el) {
      if (el.getAttribute('data-lang') === lang) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
  }

  /* ---------- hulpjes ---------- */
  function each(selector, fn) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) fn(nodes[i]);
  }

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* opslag geweigerd, taalkeuze geldt dan alleen voor deze pagina */
    }
  }
})();
