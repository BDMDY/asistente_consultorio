function p0(){return decodeURIComponent(location.pathname);}
try { if (/Agenda Movil|Inicio Movil|Modulos Movil|Marca Movil|Intranet M/.test(p0())) sessionStorage.setItem('da-mobile', '1'); else if (/Pacientes/.test(p0())) { if (/movil/.test(location.hash)) sessionStorage.setItem('da-mobile', '1'); else sessionStorage.removeItem('da-mobile'); } else sessionStorage.removeItem('da-mobile'); } catch (e) {}
(function () {
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  function hexToRgb(h) { h = h.replace('#', ''); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbToHsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? ((b - r) / d + 2) : ((r - g) / d + 4); h *= 60; }
    return [h, s * 100, l * 100];
  }
  function hslToHex(h, s, l) {
    s /= 100; l /= 100; var a = s * Math.min(l, 1 - l);
    var f = function (n) { var k = (n + h / 30) % 12, c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, '0'); };
    return ('#' + f(0) + f(8) + f(4)).toUpperCase();
  }
  function lum(hex) { var c = hexToRgb(hex).map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function derive(hex) {
    if (!/^#?[0-9a-f]{6}$/i.test(hex || '')) hex = '#00A86B';
    if (hex[0] !== '#') hex = '#' + hex; hex = hex.toUpperCase();
    var hsl = rgbToHsl(hexToRgb(hex)), h = hsl[0], s = clamp(hsl[1], 25, 100), l = clamp(hsl[2], 30, 56), o = {};
    var L7 = l * .7, c7 = hslToHex(h, s, L7), i = 0;
    while (contrast(c7, '#FFFFFF') < 4.5 && i < 25) { L7 -= 2; c7 = hslToHex(h, s, L7); i++; }
    var T = { 50: 96, 100: 91, 200: 83, 300: 72, 400: l + (72 - l) * .45, 500: l, 600: Math.max(l * .86, L7 + 6), 700: L7, 800: Math.max(6, Math.min(l * .56, L7 - 8)), 900: Math.max(5, Math.min(l * .43, L7 - 15)), 950: Math.max(3, Math.min(l * .27, L7 - 22)) };
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].forEach(function (k) { o['--brand-' + k] = hslToHex(h, k <= 300 ? s * .92 : k >= 800 ? s * .85 : s, T[k]); });
    o['--brand-500'] = hex;
    return o;
  }
  var DEF = { hex: '#00A86B', accent: '#F5A524', name: 'Clínica Sonríe', slogan: 'Sonrisas que cuidamos contigo', f: 0, kicker: 'ORTODONCIA · ODONTOLOGÍA · LIMA', heroSub: 'Atención cálida y tecnología moderna. Reserva en menos de un minuto, sin llamadas.', servicesTitle: 'Nuestros servicios', teamTitle: 'Nuestro equipo', address: 'Av. Larco 345, Miraflores, Lima', phone: '+51 1 555 0123', whatsapp: '+51 987 654 321', email: 'hola@clinicasonrie.pe', instagram: '@clinicasonrie', facebook: '/clinicasonrie', hours: 'Lun–Vie 9:00–19:00 · Sáb 9:00–13:00' };
  var DEFSTATS = [{ id: 1, n: '12+', l: 'años de experiencia' }, { id: 2, n: '3,200', l: 'pacientes atendidos' }, { id: 3, n: '4.9', l: 'valoración promedio' }, { id: 4, n: '98%', l: 'recomiendan la clínica' }];
  var DEFQUOTES = [{ id: 1, t: 'Me explicaron todo el tratamiento y reservé desde mi celular. Excelente atención.', a: 'Lucía R. · Ortodoncia' }, { id: 2, t: 'Puntuales, limpios y muy amables con mi hijo. Lo recomiendo.', a: 'Marco T. · Odontopediatría' }];
  var DEFDOCS = [{ id: 1, name: 'Dra. Ana Quispe', spec: 'Ortodoncista', cop: '12345', photo: '' }, { id: 2, name: 'Dr. Luis Paredes', spec: 'Odontólogo general', cop: '23456', photo: '' }, { id: 3, name: 'Dra. Carla Vega', spec: 'Endodoncista', cop: '34567', photo: '' }];
  var DEFSV = [{ id: 1, name: 'Ortodoncia', desc: 'Brackets y alineadores a tu medida.', price: '150' }, { id: 2, name: 'Limpieza dental', desc: 'Profilaxis y control preventivo.', price: '90' }, { id: 3, name: 'Blanqueamiento', desc: 'Resultados visibles en una sesión.', price: '350' }, { id: 4, name: 'Implantes', desc: 'Recupera función y estética.', price: '1,800' }];
  function read(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function brand() {
    var b = Object.assign({}, DEF, read('da-brand-v1') || {});
    var vars = b.hex.toUpperCase() === DEF.hex ? {} : derive(b.hex);
    if (b.accent && b.accent.toUpperCase() !== DEF.accent) { vars['--accent-500'] = b.accent; var hs = rgbToHsl(hexToRgb(b.accent)); vars['--accent-100'] = hslToHex(hs[0], clamp(hs[1], 30, 90), 92); }
    b.vars = vars; b.waLink = 'https://wa.me/' + String(b.whatsapp || '').replace(/\D/g, '');
    b.head = ["'Plus Jakarta Sans',sans-serif", "'Lora',serif", "'Source Serif 4',serif"][b.f] || DEF_HEAD;
    b.body = ["'Plus Jakarta Sans',sans-serif", "'Inter',sans-serif", "'DM Sans',sans-serif"][b.f] || DEF_HEAD;
    return b;
  }
  var DEF_HEAD = "'Plus Jakarta Sans',sans-serif";
  function media() { var m = read('da-media-v2') || {}; return { stats: m.stats || DEFSTATS, quotes: m.quotes || DEFQUOTES, img: m.img || {}, docs: m.docs || DEFDOCS, facs: m.facs || [{ id: 1, cap: 'Recepción', photo: '' }], cases: m.cases || [{ id: 1, label: 'Ortodoncia · 14 meses', before: '', after: '' }], services: m.services || DEFSV }; }
  window.DA = {
    derive: derive, brand: brand, media: media, DEF: DEF,
    docs: function () { var d = media().docs; return d.length ? d : DEFDOCS; },
    services: function () { return media().services; },
    dur: function (i) { return [3, 2, 4, 6][i] || 3; },
    azul: function () { return derive('#2F6FDE'); },
    contrast: contrast,
    theme: function () { try { return localStorage.getItem('da-theme') === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; } },
    setTheme: function (v) { try { localStorage.setItem('da-theme', v); } catch (e) {} },
    money: function (n) { return 'S/ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
    payments: function () { return read('da-payments-v1') || []; },
    addPayment: function (p) { var l = read('da-payments-v1') || []; p.id = Date.now(); p.no = 'B001-' + String(l.length + 124).padStart(6, '0'); l.push(p); try { localStorage.setItem('da-payments-v1', JSON.stringify(l)); } catch (e) {} return p; },
    methods: ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia']
  };
  /* ---- aplicación global: marca, tema, nombre y conmutador ---- */
  window.__daApply = function () { applyGlobal(); };
  function applyGlobal() {
    try {
      var B = window.DA.brand(), th = window.DA.theme(), v = B.vars || {};
      var keep = ['--brand-50', '--brand-100', '--brand-800'];
      var light = '', dark = '';
      Object.keys(v).forEach(function (k) { light += k + ':' + v[k] + ';'; if (keep.indexOf(k) < 0) dark += k + ':' + v[k] + ';'; });
      var st = document.getElementById('da-brand-vars');
      if (!st) { st = document.createElement('style'); st.id = 'da-brand-vars'; document.head.appendChild(st); }
      st.textContent = ':root:not([data-theme="dark"]){' + light + '}html[data-theme="dark"]{' + dark + '}';
      document.documentElement.setAttribute('data-theme', th);
      var nm = B.name, def = 'Clínica Sonríe';
      if (nm && nm !== def && document.body) {
        var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n, list = [];
        while ((n = w.nextNode())) { if (n.nodeValue.indexOf(def) > -1) list.push(n); }
        list.forEach(function (t) { t.nodeValue = t.nodeValue.split(def).join(nm); });
      }
    } catch (e) {}
  }
  function boot() {
    applyGlobal();
    var t = null;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(applyGlobal, 80); }).observe(document.body, { childList: true, subtree: true, characterData: false });
    window.addEventListener('storage', applyGlobal);
    setTimeout(function () {
      if (window.self !== window.top) return;
      var txt = document.body.innerText || '';
      if (document.getElementById('da-topbar') || /Modo (oscuro|claro)/.test(txt) || document.querySelector('[aria-label*="modo claro y oscuro"]')) return;
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Cambiar entre modo claro y oscuro');
      b.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;width:44px;height:44px;border-radius:50%;border:0;cursor:pointer;background:var(--brand-900);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.25);font-size:18px';
      b.textContent = window.DA.theme() === 'dark' ? '☀' : '☾';
      b.onclick = function () { var n = window.DA.theme() === 'dark' ? 'light' : 'dark'; window.DA.setTheme(n); b.textContent = n === 'dark' ? '☀' : '☾'; applyGlobal(); };
      document.body.appendChild(b);
    }, 1400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.DA.perms = function () { var d = [['Agenda', 1, 1, 1], ['Pacientes', 1, 1, 1], ['Planes de tratamiento', 1, 1, 0], ['Inventario', 1, 0, 1], ['Finanzas', 1, 0, 0], ['Servicios', 1, 0, 1], ['Mensajes y campañas', 1, 0, 1], ['Reportes', 1, 0, 0], ['Configuración', 1, 0, 0]]; return read('da-perms-v1') || d; };
  window.DA.patients = function () { return read('da-patients-v1') || [{ id: 1, name: 'Lucía Rojas', dni: '45821367', phone: '987 654 321', email: 'lucia.rojas@mail.com', alerts: ['Alergia: penicilina', 'Hipertensión'] }, { id: 2, name: 'Mario Soto', dni: '40123456', phone: '986 111 222', alerts: [] }, { id: 3, name: 'Rosa León', dni: '41234567', phone: '985 222 333', alerts: [] }, { id: 4, name: 'Pedro Vera', dni: '42345678', phone: '984 333 444', alerts: ['Diabetes'] }, { id: 5, name: 'Carla Díaz', dni: '43456789', phone: '983 444 555', alerts: [] }, { id: 6, name: 'Jorge Ramos', dni: '44567890', phone: '982 555 666', alerts: [] }, { id: 7, name: 'Ana Cruz', dni: '46678901', phone: '981 666 777', alerts: [] }, { id: 8, name: 'Sofía Paz', dni: '47789012', phone: '980 777 888', alerts: [] }, { id: 9, name: 'Tomás Luna', dni: '48890123', phone: '979 888 999', alerts: [] }]; };
  window.DA.setPerms = function (p) { try { localStorage.setItem('da-perms-v1', JSON.stringify(p)); } catch (e) {} };
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('role') === 'button' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.click(); }
  });
})();

;(function () {
  try {
    var mob = false; try { if (/Agenda Movil|Inicio Movil|Modulos Movil|Intranet M/.test(p0())) sessionStorage.setItem('da-mobile', '1'); else if (/Intranet\.dc|Agenda Interactiva/.test(p0())) sessionStorage.removeItem('da-mobile'); mob = sessionStorage.getItem('da-mobile') === '1' && !/Agenda Interactiva/.test(p0()); } catch (e) {} if (mob && /Pacientes|Agenda Movil|Inicio Movil|Modulos Movil|Marca Movil/.test(p0())) return; var emb = false; try { emb = /Intranet/.test(decodeURIComponent(window.parent.location.pathname)); } catch (e) {} if (emb || window.innerWidth <= 480) return;
    var p = decodeURIComponent(location.pathname);
    if (!/Pacientes|Agenda Interactiva|Modulos Escritorio|Inicio Escritorio/.test(p)) return;
    function build() {
      if (document.getElementById('da-standalone-nav')) return;
      var M = 'DentAssist%20Modulos%20Escritorio.dc.html#';
      var items = [['Inicio', 'DentAssist%20Inicio%20Escritorio.dc.html', 'icon-layout-dashboard'], ['Agenda', 'DentAssist%20Agenda%20Interactiva.dc.html', 'icon-calendar-days'], ['Pacientes', 'DentAssist%20Pacientes.dc.html', 'icon-users'], ['Planes de tratamiento', M + 'planes', 'icon-clipboard-list'], ['Inventario', M + 'inventario', 'icon-package'], ['Finanzas', M + 'finanzas', 'icon-wallet'], ['Servicios', M + 'servicios', 'icon-stethoscope'], ['Mensajes y campañas', M + 'mensajes', 'icon-message-circle'], ['Reportes', M + 'reportes', 'icon-chart-column'], ['Configuración', M + 'configuracion', 'icon-settings']];
      var rail = document.createElement('div'); rail.id = 'da-standalone-nav'; rail.style.cssText = 'position:fixed;left:0;top:0;bottom:0;width:64px;z-index:9000;box-sizing:border-box;background:var(--surface,#fff);border-right:1px solid var(--line,#dfe6e2);display:flex;flex-direction:column;align-items:center;padding-top:12px';
      var hb = document.createElement('button'); hb.type = 'button'; hb.setAttribute('aria-label', 'Abrir menú'); hb.setAttribute('aria-expanded', 'false'); hb.style.cssText = 'all:unset;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px;color:var(--ink-900,#10241b)'; hb.innerHTML = '<i class="icon-menu" style="font-size:22px"></i>'; rail.appendChild(hb);
      var bd = document.createElement('div'); bd.style.cssText = 'position:fixed;inset:0;z-index:9400;background:rgba(16,36,27,.45);display:none';
      var b = document.createElement('aside'); b.id = 'da-desk-drawer'; b.setAttribute('aria-label', 'Navegación de la intranet');
      b.style.cssText = 'position:fixed;left:0;top:0;bottom:0;width:280px;max-width:86vw;z-index:9500;box-sizing:border-box;background:var(--surface,#fff);box-shadow:0 0 40px rgba(16,36,27,.3);padding:20px 14px;display:none;flex-direction:column;gap:4px;overflow:auto;font-family:inherit';
      var br = document.createElement('div'); br.style.cssText = 'display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;padding:4px 8px 20px;color:var(--ink-900,#10241b)';
      br.innerHTML = '<span style="width:34px;height:34px;border-radius:10px;background:var(--grad-btn,#00805a);color:#fff;display:flex;align-items:center;justify-content:center"><i class="icon-smile"></i></span><span style="flex:1">Clínica Sonríe</span><button type="button" aria-label="Cerrar menú" id="da-dd-x" style="all:unset;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center"><i class="icon-x"></i></button>'; b.appendChild(br);
      var rl = document.createElement('div'); rl.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-top:10px;flex:1;overflow:auto;align-items:center';
      items.forEach(function (l) {
        var ri = document.createElement('a'); ri.href = l[1]; ri.title = l[0]; ri.setAttribute('aria-label', l[0]); ri.innerHTML = '<i class="' + l[2] + '" style="font-size:20px"></i>'; ri.dataset.n = l[0]; ri.style.cssText = 'width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px;text-decoration:none;color:var(--ink-900,#10241b)'; rl.appendChild(ri);
        var a = document.createElement('a'); a.href = l[1]; a.innerHTML = '<i class="' + l[2] + '"></i><span>' + l[0] + '</span>';
        var hh = l[1].split('#')[1], on = hh ? (p.indexOf('Modulos Escritorio') > -1 && (location.hash || '#planes') === '#' + hh) : p.indexOf(decodeURIComponent(l[1])) > -1;
        a.style.cssText = 'display:flex;align-items:center;gap:12px;padding:0 12px;min-height:44px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;white-space:nowrap;color:' + (on ? 'var(--brand-800,#005a3c)' : 'var(--ink-900,#10241b)') + ';background:' + (on ? 'var(--brand-50,#e6f7ef)' : 'transparent');
        if (on) { a.setAttribute('aria-current', 'page'); ri.setAttribute('aria-current', 'page'); ri.style.background = 'var(--brand-50,#e6f7ef)'; ri.style.color = 'var(--brand-800,#005a3c)'; }
        b.appendChild(a);
      });
      rail.appendChild(rl);
      var bell = document.createElement('a'); bell.href = M + 'configuracion'; bell.title = 'Notificaciones'; bell.setAttribute('aria-label', 'Notificaciones'); bell.innerHTML = '<i class="icon-bell" style="font-size:20px"></i><span style="position:absolute;top:9px;right:10px;width:8px;height:8px;border-radius:50%;background:var(--error-fg,#c0392b)"></span>'; bell.style.cssText = 'position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px;text-decoration:none;color:var(--ink-900,#10241b)';
      var av = document.createElement('a'); av.href = M + 'configuracion'; av.title = 'Ana Cruz · Administradora'; av.setAttribute('aria-label', 'Perfil'); av.textContent = (window.daMe ? window.daMe().ini : 'AC'); av.style.cssText = 'width:40px;height:40px;border-radius:50%;background:var(--brand-100,#cdeedd);color:var(--brand-800,#005a3c);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;text-decoration:none;margin:4px 0 14px';
      var tg = document.createElement('button'); tg.type = 'button'; tg.setAttribute('aria-label', 'Cambiar entre modo claro y oscuro'); tg.title = 'Modo claro / oscuro'; tg.style.cssText = 'all:unset;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px;color:var(--ink-900,#10241b)'; var ic = function () { tg.innerHTML = '<i class="' + (window.DA.theme() === 'dark' ? 'icon-sun' : 'icon-moon') + '" style="font-size:20px"></i>'; }; ic(); tg.onclick = function () { window.DA.setTheme(window.DA.theme() === 'dark' ? 'light' : 'dark'); ic(); if (window.__daApply) window.__daApply(); };
      bell.onclick = function (e) { e.preventDefault(); window.daPop('notif', bell, 'rail'); }; av.onclick = function (e) { e.preventDefault(); window.daPop('perfil', av, 'rail'); };
      rail.appendChild(tg); rail.appendChild(bell); rail.appendChild(av);
      var sh = function (v) { bd.style.display = b.style.display = v ? (v === 2 ? 'flex' : 'block') : 'none'; b.style.display = v ? 'flex' : 'none'; hb.setAttribute('aria-expanded', v ? 'true' : 'false'); };
      hb.onclick = function () { sh(1); }; bd.onclick = function () { sh(0); }; b.querySelector('#da-dd-x').onclick = function () { sh(0); };
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') sh(0); });
      var me = (window.daMe || function () { return { nom: 'Ana Cruz Torres', dni: '45218790', rol: 'Administrador', ini: 'AC' }; })(), ft = document.createElement('div'); ft.style.cssText = 'margin-top:auto;position:sticky;bottom:-20px;background:var(--surface,#fff);border-top:1px solid var(--line,#dfe6e2);padding:14px 0 20px;display:flex;flex-direction:column;gap:10px';
      ft.innerHTML = '<div style="display:flex;gap:12px;align-items:center;padding:0 8px"><span style="flex:none;width:44px;height:44px;border-radius:50%;background:var(--brand-100,#cdeedd);color:var(--brand-800,#005a3c);font-weight:800;display:flex;align-items:center;justify-content:center">' + me.ini + '</span><span style="display:flex;flex-direction:column;min-width:0"><b style="font-size:14px;color:var(--ink-900,#10241b)">' + me.nom + '</b><span style="font-size:12px;color:var(--ink-500,#5b6e65)">' + me.rol + ' · DNI ' + me.dni + '</span></span></div><a href="DentAssist%20Intranet.dc.html" style="display:flex;align-items:center;gap:12px;padding:0 12px;min-height:44px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;color:var(--error-fg,#c0392b)"><i class="icon-log-out"></i>Cerrar sesión</a>'; b.appendChild(ft);
      document.body.appendChild(rail); document.body.appendChild(bd); document.body.appendChild(b); window.addEventListener('hashchange', function () { b.querySelectorAll('a').forEach(function (a) { var hh = (a.getAttribute('href') || '').split('#')[1]; if (hh && p.indexOf('Modulos Escritorio') > -1) { var on = (location.hash || '#planes') === '#' + hh; a.style.background = on ? 'var(--brand-50,#e6f7ef)' : 'transparent'; a.style.color = on ? 'var(--brand-800,#005a3c)' : 'var(--ink-900,#10241b)'; } }); });
      var bs = document.body.style; bs.boxSizing = 'border-box'; bs.paddingLeft = '64px';
    }
    if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
  } catch (e) {}
})();

;(function () {
  try {
    var p = decodeURIComponent(location.pathname);
    if (!/Pacientes|Agenda Movil|Inicio Movil|Modulos Movil|Marca Movil/.test(p) || (window.innerWidth > 480 && !/Agenda Movil|Inicio Movil|Modulos Movil|Marca Movil/.test(p) && sessionStorage.getItem('da-mobile') !== '1')) return;
    function build() {
      if (document.getElementById('da-mobile-tabs')) return;
      var b = document.createElement('nav'); b.id = 'da-mobile-tabs'; b.setAttribute('aria-label', 'Navegación principal');
      b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;margin:0 auto;max-width:430px;z-index:9999;display:grid;grid-template-columns:repeat(3,1fr);background:var(--surface,#fff);border-top:1px solid var(--line,#dfe6e2);padding-bottom:env(safe-area-inset-bottom)';
      [['Inicio', 'DentAssist%20Inicio%20Movil.dc.html', 'icon-house'], ['Agenda', 'DentAssist%20Agenda%20Movil.dc.html', 'icon-calendar-days'], ['Pacientes', 'DentAssist%20Pacientes.dc.html#movil', 'icon-users']].forEach(function (l) {
        var on = p.indexOf(l[0] === 'Inicio' ? 'Inicio Movil' : l[0] === 'Agenda' ? 'Agenda Movil' : 'Pacientes') > -1, a = document.createElement('a'); a.href = l[1]; a.target = '_self';
        a.innerHTML = '<i class="' + l[2] + '" style="font-size:20px"></i><span>' + l[0] + '</span>';
        a.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:56px;font-size:12px;font-weight:700;text-decoration:none;color:' + (on ? 'var(--brand-700,#00805a)' : 'var(--ink-500,#5b6e65)');
        if (on) a.setAttribute('aria-current', 'page');
        b.appendChild(a);
      });
      var TT = { planes: 'Planes de tratamiento', inventario: 'Inventario', finanzas: 'Finanzas', servicios: 'Servicios', mensajes: 'Mensajes y campañas', reportes: 'Reportes', configuracion: 'Configuración' }; var T = /Marca Movil/.test(p) ? 'Configuración' : /Modulos Movil/.test(p) ? (TT[(location.hash || '#planes').slice(1)] || 'Módulo') : /Inicio Movil/.test(p) ? 'Inicio' : /Agenda Movil/.test(p) ? 'Agenda' : 'Pacientes';
      var tb = document.createElement('header'); tb.id = 'da-topbar';
      tb.style.cssText = 'position:fixed;top:0;left:0;right:0;margin:0 auto;max-width:430px;height:56px;z-index:9998;display:flex;align-items:center;gap:8px;padding:0 6px;box-sizing:border-box;background:var(--surface,#fff);border-bottom:1px solid var(--line,#dfe6e2);font-family:inherit';
      tb.innerHTML = '<button type="button" id="da-hbtn" aria-label="Abrir menú" style="all:unset;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px"><i class="icon-menu" style="font-size:22px"></i></button><b id="da-ttl" style="font-size:17px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + T + '</b><button type="button" id="da-bell" aria-label="Notificaciones" style="all:unset;cursor:pointer;position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px"><i class="icon-bell" style="font-size:20px"></i><span style="position:absolute;top:10px;right:11px;width:8px;height:8px;border-radius:50%;background:var(--error-fg,#c0392b)"></span></button><button type="button" id="da-av" aria-label="Perfil" style="all:unset;cursor:pointer;width:36px;height:36px;margin-right:6px;border-radius:50%;background:var(--brand-100,#cdeedd);color:var(--brand-800,#005a3c);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center">AC</button>';
      window.addEventListener('hashchange', function () { var t = document.getElementById('da-ttl'); if (t && /Modulos Movil/.test(p)) t.textContent = TT[(location.hash || '#planes').slice(1)] || 'Módulo'; });
      var tg = document.createElement('button'); tg.type = 'button'; tg.setAttribute('aria-label', 'Cambiar entre modo claro y oscuro'); tg.style.cssText = 'all:unset;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px'; var ic = function () { tg.innerHTML = '<i class="' + (window.DA.theme() === 'dark' ? 'icon-sun' : 'icon-moon') + '" style="font-size:20px"></i>'; }; ic(); tg.onclick = function () { window.DA.setTheme(window.DA.theme() === 'dark' ? 'light' : 'dark'); ic(); if (window.__daApply) window.__daApply(); }; tb.insertBefore(tg, tb.lastElementChild);
      document.body.appendChild(tb); tb.querySelector('#da-bell').onclick = function () { window.daPop('notif', tb.querySelector('#da-bell'), 'top'); }; tb.querySelector('#da-av').onclick = function () { window.daPop('perfil', tb.querySelector('#da-av'), 'top'); }; tb.querySelector('#da-hbtn').onclick = function () { window.daOpenMenu(); };
      var bs = document.body.style; bs.maxWidth = '430px'; bs.margin = '0 auto'; bs.paddingTop = '56px'; bs.position = 'relative'; bs.boxShadow = window.innerWidth > 480 ? '0 0 0 1px var(--line,#dfe6e2), 0 12px 40px rgba(16,36,27,.12)' : 'none'; bs.minHeight = '100vh';
      var st = document.createElement('style'); st.textContent = '#da-hb{display:none!important}html{background:var(--bone,#f2f5f3)}'; document.head.appendChild(st);
      document.body.appendChild(b); document.body.style.boxSizing = 'border-box'; document.body.style.paddingBottom = '56px';
    }
    if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
  } catch (e) {}
})();

;(function () {
  var MODS = [['Inicio', 'icon-house', 'DentAssist%20Inicio%20Movil.dc.html'], ['Agenda', 'icon-calendar-days', 'DentAssist%20Agenda%20Movil.dc.html'], ['Pacientes', 'icon-users', 'DentAssist%20Pacientes.dc.html#movil'], ['Planes de tratamiento', 'icon-clipboard-list', 'DentAssist%20Modulos%20Movil.dc.html#planes'], ['Inventario', 'icon-package', 'DentAssist%20Modulos%20Movil.dc.html#inventario'], ['Finanzas', 'icon-wallet', 'DentAssist%20Modulos%20Movil.dc.html#finanzas'], ['Servicios', 'icon-stethoscope', 'DentAssist%20Modulos%20Movil.dc.html#servicios'], ['Mensajes y campañas', 'icon-message-circle', 'DentAssist%20Modulos%20Movil.dc.html#mensajes'], ['Reportes', 'icon-chart-column', 'DentAssist%20Modulos%20Movil.dc.html#reportes'], ['Configuración', 'icon-settings', 'DentAssist%20Modulos%20Movil.dc.html#configuracion']];
  window.daOpenMenu = function () {
    if (document.getElementById('da-drawer')) return;
    var p = decodeURIComponent(location.pathname), cur = /Marca Movil/.test(p) ? 'Configuración' : /Modulos Movil/.test(p) ? ({ planes: 'Planes de tratamiento', inventario: 'Inventario', finanzas: 'Finanzas', servicios: 'Servicios', mensajes: 'Mensajes y campañas', reportes: 'Reportes', configuracion: 'Configuración' })[(location.hash || '').slice(1)] : /Inicio Movil/.test(p) ? 'Inicio' : /Agenda Movil/.test(p) ? 'Agenda' : /Pacientes/.test(p) ? 'Pacientes' : '';
    var w = document.createElement('div'); w.id = 'da-drawer'; w.style.cssText = 'position:fixed;inset:0;z-index:10050;background:transparent'; var col = document.createElement('div'); col.style.cssText = 'position:absolute;top:0;bottom:0;left:50%;width:min(430px,100vw);transform:translateX(-50%);overflow:hidden;background:rgba(16,36,27,.45)';
    var a = document.createElement('aside'); a.setAttribute('role', 'dialog'); a.setAttribute('aria-label', 'Menú');
    a.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:min(300px,86vw);background:var(--surface,#fff);padding:20px 14px;display:flex;flex-direction:column;gap:3px;box-shadow:0 12px 40px rgba(16,36,27,.3);font-family:inherit;overflow:auto';
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px 16px"><b style="display:flex;align-items:center;gap:10px;font-size:17px"><span style="width:32px;height:32px;border-radius:9px;background:var(--grad-btn);color:#fff;display:flex;align-items:center;justify-content:center"><i class="icon-smile" style="font-size:18px"></i></span>Clínica Sonríe</b><button id="da-dclose" aria-label="Cerrar menú" style="all:unset;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center"><i class="icon-x"></i></button></div>';
    h += '<div style="padding:10px 12px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line,#dfe6e2);font-size:14px;font-weight:600;display:flex;gap:8px;align-items:center;margin-bottom:8px"><i class="icon-building-2" style="font-size:18px"></i>Sede Miraflores</div>';
    MODS.forEach(function (m) {
      var on = m[0] === cur, st0 = 0, st = 'display:flex;align-items:center;gap:12px;padding:0 12px;min-height:46px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;box-sizing:border-box;background:' + (on ? 'var(--brand-50,#e6f7ef)' : 'transparent') + ';color:' + (on ? 'var(--brand-800,#006a49)' : m[2] ? 'var(--ink-900,#10241b)' : 'var(--ink-500,#5b6e65)');
      h += m[2] ? '<a href="' + m[2] + '" data-close="1" style="' + st + '"><i class="' + m[1] + '" style="font-size:18px"></i>' + m[0] + '</a>' : '<div style="' + st + '"><i class="' + m[1] + '" style="font-size:18px"></i>' + m[0] + '</div>';
    });
    h += '<div style="flex:1"></div><div style="display:flex;align-items:center;gap:10px;padding:8px"><span style="width:38px;height:38px;border-radius:50%;background:var(--brand-100,#ccefdf);color:var(--brand-800,#006a49);font-weight:700;display:flex;align-items:center;justify-content:center">AQ</span><div style="font-size:13px"><b>Ana Quispe</b><div style="color:var(--ink-500,#5b6e65)">Doctora · Cerrar sesión</div></div></div>';
    a.innerHTML = h; col.appendChild(a); w.appendChild(col); document.body.appendChild(w);
    var close = function () { w.remove(); document.removeEventListener('keydown', esc); }, esc = function (e) { if (e.key === 'Escape') close(); };
    w.addEventListener('click', function (e) { if (e.target === w || e.target === col) close(); }); a.querySelector('#da-dclose').onclick = close; a.querySelectorAll('a[data-close]').forEach(function (l) { l.addEventListener('click', function () { setTimeout(close, 0); }); }); document.addEventListener('keydown', esc);
  };
})();


;(function () {
  var P = decodeURIComponent(location.pathname), MOB = /Movil|Móvil/.test(P) || (/Pacientes/.test(P) && !!document.getElementById('da-mobile-tabs'));
  function esc(s) { return String(s).replace(/[&<>"]/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]; }); }
  function toast(t) { var d = document.createElement('div'); d.setAttribute('role', 'status'); d.textContent = t; d.style.cssText = 'position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:10300;background:var(--ink-900,#10241b);color:#fff;padding:12px 18px;border-radius:12px;font:600 14px var(--font-sans,inherit);box-shadow:0 8px 24px rgba(0,0,0,.25)'; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
  function data() { var d = null; try { d = JSON.parse(localStorage.getItem('da-mod-v2') || 'null'); } catch (e) {} d = d || {}; if (!d.users) d.users = [{ id: 'u4', nom: 'Ana Cruz Torres', dni: '45218790', rol: 'Administrador', on: true }]; if (!d.inv) d.inv = [{ id: 'i1', n: 'Resina A2', u: 'g', qty: 3, min: 10, venc: '' }, { id: 'i2', n: 'Brackets metálicos', u: 'unid.', qty: 18, min: 40, venc: '' }, { id: 'i3', n: 'Anestesia lidocaína', u: 'ml', qty: 25, min: 10, venc: '2026-11-12' }, { id: 'i4', n: 'Guantes M', u: 'cajas', qty: 34, min: 20, venc: '' }]; if (!d.fin) d.fin = [{ id: 'f1', c: 'Lucía Rojas · Cuota 8', m: 'Yape', a: 350, st: 'pagado' }, { id: 'f2', c: 'Carlos Vera · Implante', m: 'Tarjeta', a: 1200, st: 'pagado' }, { id: 'f3', c: 'Ana Cruz · Saldo', m: '', a: 280, st: 'pendiente' }, { id: 'f4', c: 'Mario Soto · Cuota 3', m: '', a: 400, st: 'vencido' }]; return d; }
  window.daData = data;
  window.daMe = function () { var u = (data().users || []).filter(function (x) { return x.rol === 'Administrador' && x.on; })[0] || {}; var n = u.nom || 'Ana Cruz Torres'; return { nom: n, dni: u.dni || '45218790', rol: u.rol || 'Administrador', ini: n.split(' ').slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() }; };
  window.daStock = function () { return (data().inv || []).filter(function (i) { return i.qty < i.min; }); };
  function close() { ['da-pop', 'da-pop-bd'].forEach(function (id) { var n = document.getElementById(id); if (n) n.remove(); }); }
  function pwd() {
    close(); var w = document.createElement('div'); w.id = 'da-pop-bd'; w.style.cssText = 'position:fixed;inset:0;z-index:10200;background:rgba(16,36,27,.45);display:flex;align-items:center;justify-content:center;padding:16px' + (MOB ? ';max-width:430px;margin:0 auto' : '') + '';
    var f = function (id, l) { return '<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700">' + l + '<input id="' + id + '" type="password" autocomplete="off" style="min-height:44px;border-radius:10px;border:1px solid var(--line,#dfe6e2);padding:0 12px;font:500 15px inherit;background:var(--surface,#fff);color:inherit"></label>'; };
    w.innerHTML = '<div role="dialog" aria-label="Cambiar contraseña" style="background:var(--surface,#fff);color:var(--ink-900,#10241b);border-radius:16px;padding:22px;width:min(380px,100%);display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:var(--font-sans,inherit)"><b style="font-size:18px">Cambiar contraseña</b>' + f('pw0', 'Contraseña actual') + f('pw1', 'Nueva contraseña (mín. 8 caracteres)') + f('pw2', 'Repetir nueva contraseña') + '<div id="pwe" style="color:var(--error-fg,#c0392b);font-size:13px;min-height:16px"></div><div style="display:flex;gap:10px;justify-content:flex-end"><button id="pwc" style="all:unset;cursor:pointer;min-height:44px;padding:0 16px;display:flex;align-items:center;font-weight:700">Cancelar</button><button id="pws" style="all:unset;cursor:pointer;min-height:44px;padding:0 20px;border-radius:12px;background:var(--grad-btn,#00805a);color:#fff;font-weight:700;display:flex;align-items:center">Guardar</button></div></div>';
    document.body.appendChild(w); var g = function (i) { return w.querySelector('#' + i); }; g('pw0').focus();
    w.onclick = function (e) { if (e.target === w) close(); }; g('pwc').onclick = close;
    g('pws').onclick = function () { var e = !g('pw0').value ? 'Escribe tu contraseña actual' : g('pw1').value.length < 8 ? 'La nueva contraseña debe tener al menos 8 caracteres' : g('pw1').value !== g('pw2').value ? 'Las contraseñas no coinciden' : ''; g('pwe').textContent = e; if (!e) { close(); toast('Contraseña actualizada'); } };
  }
  window.daPop = function (kind, anchor, mode) {
    var was = document.getElementById('da-pop') && document.getElementById('da-pop').dataset.k === kind; close(); if (was) return;
    var base = MOB ? 'DentAssist%20Modulos%20Movil.dc.html#' : 'DentAssist%20Modulos%20Escritorio.dc.html#', agenda = MOB ? 'DentAssist%20Agenda%20Movil.dc.html' : 'DentAssist%20Agenda%20Interactiva.dc.html';
    var bd = document.createElement('div'); bd.id = 'da-pop-bd'; bd.style.cssText = 'position:fixed;inset:0;z-index:10100'; bd.onclick = close;
    var p = document.createElement('div'); p.id = 'da-pop'; p.dataset.k = kind; p.setAttribute('role', 'dialog');
    var ar = anchor.getBoundingClientRect(), pw0 = Math.min(320, window.innerWidth - 16), pos = mode === 'rail' ? 'left:72px;' + (kind === 'perfil' ? 'bottom:12px' : 'bottom:70px') : 'top:' + Math.round(ar.bottom + 8) + 'px;left:' + Math.round(Math.max(8, Math.min(ar.right - pw0, window.innerWidth - pw0 - 8))) + 'px';
    p.style.cssText = 'position:fixed;' + pos + ';z-index:10101;width:' + pw0 + 'px;background:var(--surface,#fff);color:var(--ink-900,#10241b);border-radius:16px;box-shadow:0 12px 40px rgba(16,36,27,.28);overflow:hidden;font-family:var(--font-sans,inherit)';
    var row = function (icon, c, t, s, h) { return '<a href="' + h + '" style="display:flex;gap:12px;align-items:center;padding:12px 16px;min-height:44px;text-decoration:none;color:inherit;border-top:1px solid var(--line,#dfe6e2)"><i class="' + icon + '" style="color:' + c + '"></i><span style="flex:1;display:flex;flex-direction:column"><b style="font-size:14px">' + esc(t) + '</b><span style="font-size:12px;color:var(--ink-500,#5b6e65)">' + esc(s) + '</span></span></a>'; };
    if (kind === 'notif') {
      var st = window.daStock(), fin = (data().fin || []).filter(function (f) { return f.st === 'pendiente' || f.st === 'vencido'; }), h = '<div style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">Notificaciones</b><a href="' + base + 'configuracion" style="font-size:13px;font-weight:700;color:var(--brand-700,#00805a);text-decoration:none">Ajustes</a></div>';
      h += row('icon-package', 'var(--error-fg,#c0392b)', st.length + ' productos con stock bajo', st.slice(0, 2).map(function (i) { return i.n; }).join(', ') || 'Todo en orden', base + 'inventario');
      h += row('icon-wallet', 'var(--warning-fg,#9a6700)', fin.length + ' cobros pendientes', 'Registra el pago o envía recordatorio', base + 'finanzas');
      h += row('icon-message-circle', 'var(--warning-fg,#9a6700)', '3 citas sin confirmar hoy', 'Envía el recordatorio por WhatsApp', agenda);
      p.innerHTML = h;
    } else {
      p.innerHTML = '<div style="display:flex;gap:12px;align-items:center;padding:16px"><span style="width:44px;height:44px;border-radius:50%;background:var(--brand-100,#cdeedd);color:var(--brand-800,#005a3c);font-weight:800;display:flex;align-items:center;justify-content:center">' + window.daMe().ini + '</span><span style="display:flex;flex-direction:column"><b>' + esc(window.daMe().nom) + '</b><span style="font-size:12px;color:var(--ink-500,#5b6e65)">' + window.daMe().rol + ' · DNI ' + window.daMe().dni + '</span></span></div><button id="da-pw" style="all:unset;cursor:pointer;box-sizing:border-box;width:100%;display:flex;gap:12px;align-items:center;padding:12px 16px;min-height:44px;border-top:1px solid var(--line,#dfe6e2);font-weight:600;font-size:14px"><i class="icon-key-round"></i>Cambiar contraseña</button><a href="DentAssist%20Intranet.dc.html" style="display:flex;gap:12px;align-items:center;padding:12px 16px;min-height:44px;border-top:1px solid var(--line,#dfe6e2);font-weight:600;font-size:14px;text-decoration:none;color:var(--error-fg,#c0392b)"><i class="icon-log-out"></i>Cerrar sesión</a>';
    }
    document.body.appendChild(bd); document.body.appendChild(p);
    var pw = p.querySelector('#da-pw'); if (pw) pw.onclick = pwd;
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
