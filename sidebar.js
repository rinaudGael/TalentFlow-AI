// ==========================================
// SIDEBAR RÉTRACTABLE — sidebar.js
// ==========================================

(function () {

  // ── Définition des sections du dashboard ──
  var NAV_ITEMS = [
    {
      section: 'principal',
      label: 'Principal',
      items: [
        { id: 'sec-kpis',      icon: 'fas fa-tachometer-alt', label: 'Vue d\'ensemble',  badge: null },
        { id: 'sec-pipeline',  icon: 'fas fa-project-diagram', label: 'Pipeline',         badge: null },
        { id: 'sec-calendrier',icon: 'fas fa-calendar-alt',    label: 'Calendrier',       badge: null },
      ]
    },
    {
      section: 'analyse',
      label: 'Analyse',
      items: [
        { id: 'sec-graphiques', icon: 'fas fa-chart-bar',      label: 'Graphiques',       badge: null },
        { id: 'sec-candidats',  icon: 'fas fa-users',          label: 'Candidats',        badge: 'kpi-total' },
        { id: 'sec-offres',     icon: 'fas fa-briefcase',      label: 'Offres d\'emploi', badge: 'kpi-positions' },
      ]
    },
    {
      section: 'outils',
      label: 'Outils',
      items: [
        { id: 'sec-chatbot', icon: 'fas fa-robot',         label: 'Assistant IA',  badge: null },
      ]
    }
  ];

  // ── Correspondance id → sélecteur de l'élément cible ──
  var SCROLL_TARGETS = {
    'sec-kpis'       : '.kpi-row',
    'sec-pipeline'   : '.card:has(#pipe-received)',
    'sec-calendrier' : '.calendar-container',
    'sec-graphiques' : '.charts-row',
    'sec-candidats'  : '.card:has(#candidates-table)',
    'sec-offres'     : '.card:has(#jobs-table)',
    'sec-chatbot'    : '#chatbot-bubble',
  };

  // ── État ──
  var collapsed = false;
  var mobileOpen = false;

  // ── Création du HTML de la sidebar ──
  function buildSidebar() {
    var sidebarEl = document.createElement('nav');
    sidebarEl.className = 'sidebar';
    sidebarEl.id = 'appSidebar';

    // Header
    sidebarEl.innerHTML =
      '<div class="sidebar-header">' +
        '<div class="sidebar-logo">' +
          '<svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">' +
            '<circle cx="9" cy="16" r="4" fill="white"/>' +
            '<circle cx="16" cy="10" r="3" fill="white"/>' +
            '<circle cx="23" cy="14" r="4" fill="white"/>' +
            '<circle cx="19" cy="22" r="3" fill="white"/>' +
            '<circle cx="12" cy="24" r="2.5" fill="white"/>' +
            '<line x1="9" y1="16" x2="16" y2="10" stroke="white" stroke-width="1" opacity="0.5"/>' +
            '<line x1="16" y1="10" x2="23" y2="14" stroke="white" stroke-width="1" opacity="0.5"/>' +
            '<line x1="23" y1="14" x2="19" y2="22" stroke="white" stroke-width="1" opacity="0.5"/>' +
            '<line x1="19" y1="22" x2="12" y2="24" stroke="white" stroke-width="1" opacity="0.5"/>' +
            '<line x1="12" y1="24" x2="9" y2="16" stroke="white" stroke-width="1" opacity="0.5"/>' +
          '</svg>' +
          '<span class="sidebar-logo-text">TalentFlow<br>Ai</span>' +
        '</div>' +
        '<button class="sidebar-toggle" id="sidebarToggle" title="Réduire la sidebar">' +
          '<i class="fas fa-chevron-left"></i>' +
        '</button>' +
      '</div>';

    // Navigation
    var navEl = document.createElement('div');
    navEl.className = 'sidebar-nav';

    NAV_ITEMS.forEach(function (group) {
      var label = document.createElement('div');
      label.className = 'sidebar-section-label';
      label.textContent = group.label;
      navEl.appendChild(label);

      group.items.forEach(function (item) {
        var a = document.createElement('a');
        a.className = 'sidebar-item';
        a.dataset.target = item.id;
        a.href = '#';

        var badgeHtml = item.badge
          ? '<span class="sidebar-badge" id="sbadge-' + item.badge + '">0</span>'
          : '';

        a.innerHTML =
          '<span class="sidebar-icon"><i class="' + item.icon + '"></i></span>' +
          '<span class="sidebar-label">' + item.label + '</span>' +
          badgeHtml +
          '<span class="sidebar-tooltip">' + item.label + '</span>';

        a.addEventListener('click', function (e) {
          e.preventDefault();
          scrollToSection(item.id);
          setActive(a);
          if (mobileOpen) closeMobile();
        });

        navEl.appendChild(a);
      });

      var div = document.createElement('div');
      div.className = 'sidebar-divider';
      navEl.appendChild(div);
    });

    sidebarEl.appendChild(navEl);

    // Footer utilisateur
    sidebarEl.innerHTML +=
      '<div class="sidebar-footer">' +
        '<div class="sidebar-user">' +
          '<div class="sidebar-user-avatar"><i class="fas fa-user-circle"></i></div>' +
          '<div class="sidebar-user-info">' +
            '<div class="sidebar-user-name" id="sidebar-username">–</div>' +
            '<div class="sidebar-user-role">Recruteur</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Reconstruire car innerHTML a écrasé le nav
    sidebarEl.innerHTML =
      '<div class="sidebar-header">' +
        '<div class="sidebar-logo">' +
          '<svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">' +
            '<circle cx="9" cy="16" r="4" fill="white"/>' +
            '<circle cx="16" cy="10" r="3" fill="white"/>' +
            '<circle cx="23" cy="14" r="4" fill="white"/>' +
            '<circle cx="19" cy="22" r="3" fill="white"/>' +
            '<circle cx="12" cy="24" r="2.5" fill="white"/>' +
            '<line x1="9" y1="16" x2="16" y2="10" stroke="white" stroke-width="1" opacity="0.5"/>' +
            '<line x1="16" y1="10" x2="23" y2="14" stroke="white" stroke-width="1" opacity="0.5"/>' +
            '<line x1="23" y1="14" x2="19" y2="22" stroke="white" stroke-width="1" opacity="0.5"/>' +
            '<line x1="19" y1="22" x2="12" y2="24" stroke="white" stroke-width="1" opacity="0.5"/>' +
            '<line x1="12" y1="24" x2="9" y2="16" stroke="white" stroke-width="1" opacity="0.5"/>' +
          '</svg>' +
          '<span class="sidebar-logo-text">TalentFlow<br>Ai</span>' +
        '</div>' +
        '<button class="sidebar-toggle" id="sidebarToggle" title="Réduire">' +
          '<i class="fas fa-chevron-left"></i>' +
        '</button>' +
      '</div>';

    sidebarEl.appendChild(navEl);

    var footer = document.createElement('div');
    footer.className = 'sidebar-footer';
    footer.innerHTML =
      '<div class="sidebar-user">' +
        '<div class="sidebar-user-avatar"><i class="fas fa-user-circle" style="font-size:18px;"></i></div>' +
        '<div class="sidebar-user-info">' +
          '<div class="sidebar-user-name" id="sidebar-username">–</div>' +
          '<div class="sidebar-user-role">Recruteur</div>' +
        '</div>' +
      '</div>';
    sidebarEl.appendChild(footer);

    return sidebarEl;
  }

  // ── Scroll vers la section ──
  function scrollToSection(sectionId) {
    var selector = SCROLL_TARGETS[sectionId];
    if (!selector) return;

    var target;
    try {
      target = document.querySelector(selector);
    } catch(e) {
      // Fallback pour les sélecteurs :has() non supportés
      var fallbacks = {
        'sec-pipeline'  : function(){ return document.querySelector('.card h3')
                            ? Array.from(document.querySelectorAll('.card'))
                                .find(function(c){ return c.querySelector('#pipe-received'); })
                            : null; },
        'sec-candidats' : function(){ return document.getElementById('candidates-table')
                            ? document.getElementById('candidates-table').closest('.card')
                            : null; },
        'sec-offres'    : function(){ return document.getElementById('jobs-table')
                            ? document.getElementById('jobs-table').closest('.card')
                            : null; },
      };
      if (fallbacks[sectionId]) target = fallbacks[sectionId]();
    }

    if (!target) {
      // Fallback universel
      var fallbackMap = {
        'sec-kpis'       : '.kpi-row',
        'sec-candidats'  : '#candidates-table',
        'sec-offres'     : '#jobs-table',
        'sec-graphiques' : '#scoreChart',
        'sec-calendrier' : '#calendar-grid',
        'sec-chatbot'    : '#chatbot-bubble',
      };
      if (fallbackMap[sectionId]) target = document.querySelector(fallbackMap[sectionId]);
    }

    if (target) {
      var offset = 20;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
      // Animation de surbrillance
      target.classList.add('section-highlight');
      setTimeout(function(){ target.classList.remove('section-highlight'); }, 700);
    }

    // Si chatbot
    if (sectionId === 'sec-chatbot') {
      if (typeof toggleChatbot === 'function' && !chatbotOpen) toggleChatbot();
    }
  }

  // ── Active state ──
  function setActive(clickedEl) {
    document.querySelectorAll('.sidebar-item').forEach(function(el){
      el.classList.remove('active');
    });
    if (clickedEl) clickedEl.classList.add('active');
  }

  // ── Toggle collapse ──
  function toggleSidebar() {
    collapsed = !collapsed;
    var sidebar = document.getElementById('appSidebar');
    var mainContent = document.querySelector('.main-content');
    sidebar.classList.toggle('collapsed', collapsed);
    if (mainContent) mainContent.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
  }

  // ── Mobile ──
  function openMobile() {
    mobileOpen = true;
    var sidebar = document.getElementById('appSidebar');
    var overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.add('mobile-open');
    overlay.classList.add('visible');
  }

  function closeMobile() {
    mobileOpen = false;
    var sidebar = document.getElementById('appSidebar');
    var overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('visible');
  }

  // ── Sync badges avec KPIs ──
  function syncBadges() {
    var map = {
      'kpi-total'     : 'sbadge-kpi-total',
      'kpi-positions' : 'sbadge-kpi-positions',
    };
    Object.keys(map).forEach(function(srcId) {
      var src = document.getElementById(srcId);
      var dst = document.getElementById(map[srcId]);
      if (src && dst) {
        var val = src.textContent.trim();
        dst.textContent = val;
        dst.style.display = (val && val !== '0') ? 'inline-block' : 'none';
      }
    });
  }

  // ── Scroll spy ──
  function initScrollSpy() {
    var sectionMap = [
      { id: 'sec-kpis',        el: document.querySelector('.kpi-row') },
      { id: 'sec-pipeline',    el: (function(){ var c=document.querySelectorAll('.card'); for(var i=0;i<c.length;i++){ if(c[i].querySelector('#pipe-received')) return c[i]; } return null; })() },
      { id: 'sec-calendrier',  el: document.querySelector('.calendar-container') },
      { id: 'sec-graphiques',  el: document.querySelector('.charts-row') },
      { id: 'sec-candidats',   el: (function(){ var t=document.getElementById('candidates-table'); return t ? t.closest('.card') : null; })() },
      { id: 'sec-offres',      el: (function(){ var t=document.getElementById('jobs-table'); return t ? t.closest('.card') : null; })() },
    ];

    window.addEventListener('scroll', function() {
      var scrollY = window.scrollY + 100;
      var active = null;
      for (var i = sectionMap.length - 1; i >= 0; i--) {
        if (sectionMap[i].el && sectionMap[i].el.offsetTop <= scrollY) {
          active = sectionMap[i].id;
          break;
        }
      }
      if (active) {
        document.querySelectorAll('.sidebar-item').forEach(function(el) {
          el.classList.toggle('active', el.dataset.target === active);
        });
      }
    }, { passive: true });
  }

  // ── Sync username ──
  function syncUsername() {
    var mainUsername = document.getElementById('currentUsername');
    var sidebarUsername = document.getElementById('sidebar-username');
    if (mainUsername && sidebarUsername) {
      sidebarUsername.textContent = mainUsername.textContent || sessionStorage.getItem('username') || '–';
    }
  }

  // ── Restructurer le DOM ──
  function restructureDOM() {
    var app = document.getElementById('app');
    if (!app) return;

    // Créer le wrapper flex
    var wrapper = document.createElement('div');
    wrapper.className = 'app-with-sidebar';

    // Overlay mobile
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    overlay.addEventListener('click', closeMobile);

    // Bouton hamburger mobile
    var mobileBtn = document.createElement('button');
    mobileBtn.className = 'sidebar-mobile-btn';
    mobileBtn.id = 'sidebarMobileBtn';
    mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
    mobileBtn.addEventListener('click', openMobile);

    // Créer le conteneur main-content
    var mainContent = document.createElement('div');
    mainContent.className = 'main-content';

    // Déplacer le contenu de .app dans main-content
    while (app.firstChild) {
      mainContent.appendChild(app.firstChild);
    }

    // Construire la sidebar
    var sidebar = buildSidebar();

    // Assembler
    wrapper.appendChild(sidebar);
    wrapper.appendChild(mainContent);
    app.appendChild(overlay);
    app.appendChild(mobileBtn);
    app.appendChild(wrapper);

    // Restaurer l'état collapse
    var savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed === '1') {
      collapsed = true;
      sidebar.classList.add('collapsed');
      mainContent.classList.add('sidebar-collapsed');
    }

    // Event toggle
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);

    return mainContent;
  }

  // ── Init ──
  function init() {
    restructureDOM();

    // Sync username après que checkLogin() ait rempli #currentUsername
    setTimeout(syncUsername, 300);

    // Sync badges périodiquement (après loadData)
    setInterval(syncBadges, 2000);

    // Premier badge sync
    setTimeout(syncBadges, 2500);

    // Scroll spy
    setTimeout(initScrollSpy, 800);

    // Activer le premier item par défaut
    var firstItem = document.querySelector('.sidebar-item');
    if (firstItem) firstItem.classList.add('active');
  }

  // Lancer après le DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();