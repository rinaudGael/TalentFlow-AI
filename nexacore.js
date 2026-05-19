// ==========================================
// NEXACORE TECHNOLOGIES — Script
// ==========================================

const API_BASE = 'https://vmi3051438.contaboserver.net';

// ── NAVBAR ──
function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
  document.getElementById('navBurger').classList.toggle('open');
}

// Fermer menu au clic lien
document.querySelectorAll('.nav-links a').forEach(function(link) {
  link.addEventListener('click', function() {
    document.getElementById('navLinks').classList.remove('open');
    document.getElementById('navBurger').classList.remove('open');
  });
});

// Navbar scroll effect
window.addEventListener('scroll', function() {
  var nav = document.getElementById('nav');
  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

// Fermer menu au clic extérieur
document.addEventListener('click', function(e) {
  var nav = document.getElementById('navLinks');
  var burger = document.getElementById('navBurger');
  if (nav && burger && !nav.contains(e.target) && !burger.contains(e.target)) {
    nav.classList.remove('open');
    burger.classList.remove('open');
  }
});

// ── COMPTEURS ANIMÉS ──
function animateCounters() {
  var counters = document.querySelectorAll('.metric-val[data-target]');
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        var target = parseInt(el.dataset.target);
        var duration = 2000;
        var start = 0;
        var increment = target / (duration / 16);

        function update() {
          start += increment;
          if (start >= target) {
            el.textContent = target;
            return;
          }
          el.textContent = Math.floor(start);
          requestAnimationFrame(update);
        }
        update();
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(function(c) { observer.observe(c); });
}

// ── SCROLL ANIMATIONS ──
function initScrollReveal() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  var elements = document.querySelectorAll(
    '.exp-card, .real-card, .temo-card, .why-card, .ps, .mt-step'
  );

  elements.forEach(function(el, i) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease ' + (i % 4) * 0.1 + 's, transform 0.6s ease ' + (i % 4) * 0.1 + 's';
    observer.observe(el);
  });
}

// Classe revealed
var style = document.createElement('style');
style.textContent = '.revealed { opacity: 1 !important; transform: translateY(0) !important; }';
document.head.appendChild(style);

// ── OFFRES D'EMPLOI (CARRIÈRES) ──
var allOffres = [];
var currentFilter = 'all';

async function loadOffres() {
  var loading = document.getElementById('offres-loading');
  var empty = document.getElementById('offres-empty');
  var list = document.getElementById('offres-list');
  var countEl = document.getElementById('offres-count');

  if (!loading) return; // pas sur la page carrières

  try {
    var response = await fetch(API_BASE + '/webhook/api/offres');
    var data = await response.json();

    allOffres = (Array.isArray(data) ? data : []).filter(function(o) {
      return o.status === 'active';
    });

    loading.style.display = 'none';

    if (countEl) countEl.textContent = allOffres.length;

    if (allOffres.length === 0) {
      empty.style.display = 'block';
      return;
    }

    renderOffres(allOffres);

  } catch (err) {
    console.error('Erreur chargement offres:', err);
    if (loading) {
      loading.innerHTML = '<p style="color:#dc2626;">Erreur de chargement des offres</p>';
    }
  }
}

function renderOffres(offres) {
  var list = document.getElementById('offres-list');
  var empty = document.getElementById('offres-empty');

  if (offres.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  list.innerHTML = offres.map(function(o) {
    var contractClass = (o.contract_type || '').toLowerCase().replace(/\s/g, '');
    var skills = (o.required_skills || '').split(',').filter(function(s) {
      return s.trim();
    }).slice(0, 5);

    return '<div class="offre-item" onclick=\'openOffreDetail(' +
      JSON.stringify(o).replace(/'/g, "\\'") + ')\'>' +
      '<div>' +
        '<div class="offre-item-title">' + (o.title || 'Poste') +
          (o.contract_type ? ' <span class="contract-badge ' + contractClass + '">' + o.contract_type + '</span>' : '') +
        '</div>' +
        '<div class="offre-item-meta">' +
          (o.department ? '<span><i class="fas fa-building"></i> ' + o.department + '</span>' : '') +
          (o.location ? '<span><i class="fas fa-map-marker-alt"></i> ' + o.location + '</span>' : '') +
          (o.salary_range ? '<span><i class="fas fa-euro-sign"></i> ' + o.salary_range + '</span>' : '') +
          (o.min_experience ? '<span><i class="fas fa-clock"></i> ' + o.min_experience + ' ans min.</span>' : '') +
        '</div>' +
        (skills.length > 0 ? '<div class="offre-item-tags">' +
          skills.map(function(s) {
            return '<span class="offre-item-tag">' + s.trim() + '</span>';
          }).join('') +
        '</div>' : '') +
      '</div>' +
      '<div class="offre-item-arrow"><i class="fas fa-arrow-right"></i></div>' +
    '</div>';
  }).join('');
}

function filterOffres() {
  var search = document.getElementById('searchInput').value.toLowerCase();
  var filtered = allOffres.filter(function(o) {
    var matchSearch = !search ||
      (o.title || '').toLowerCase().includes(search) ||
      (o.description || '').toLowerCase().includes(search) ||
      (o.required_skills || '').toLowerCase().includes(search) ||
      (o.location || '').toLowerCase().includes(search) ||
      (o.department || '').toLowerCase().includes(search);

    var matchFilter = currentFilter === 'all' || o.contract_type === currentFilter;

    return matchSearch && matchFilter;
  });

  renderOffres(filtered);
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.pill').forEach(function(p) {
    p.classList.remove('active');
  });
  btn.classList.add('active');
  filterOffres();
}

// ── MODAL OFFRE ──
function openOffreDetail(offre) {
  var overlay = document.getElementById('offreOverlay');
  var modal = document.getElementById('offreDetail');
  var content = document.getElementById('offreDetailContent');

  var skills = (offre.required_skills || '').split(',').filter(function(s) { return s.trim(); });
  var prefSkills = (offre.preferred_skills || '').split(',').filter(function(s) { return s.trim(); });

  content.innerHTML =
    '<h2 class="od-title">' + (offre.title || 'Poste') + '</h2>' +
    '<div class="od-meta">' +
      (offre.contract_type ? '<span><i class="fas fa-file-contract"></i> ' + offre.contract_type + '</span>' : '') +
      (offre.location ? '<span><i class="fas fa-map-marker-alt"></i> ' + offre.location + '</span>' : '') +
      (offre.department ? '<span><i class="fas fa-building"></i> ' + offre.department + '</span>' : '') +
      (offre.salary_range ? '<span><i class="fas fa-euro-sign"></i> ' + offre.salary_range + '</span>' : '') +
      (offre.min_experience ? '<span><i class="fas fa-clock"></i> ' + offre.min_experience + ' ans d\'exp.</span>' : '') +
      (offre.education_level ? '<span><i class="fas fa-graduation-cap"></i> ' + offre.education_level + '</span>' : '') +
    '</div>' +

    (offre.description ? '<div class="od-section"><h4><i class="fas fa-align-left"></i> Description du poste</h4><p>' + offre.description + '</p></div>' : '') +

    (skills.length > 0 ? '<div class="od-section"><h4><i class="fas fa-check-circle"></i> Compétences requises</h4><div class="od-skills">' +
      skills.map(function(s) { return '<span class="od-skill">' + s.trim() + '</span>'; }).join('') +
    '</div></div>' : '') +

    (prefSkills.length > 0 ? '<div class="od-section"><h4><i class="fas fa-star"></i> Compétences appréciées</h4><div class="od-skills">' +
      prefSkills.map(function(s) { return '<span class="od-skill preferred">' + s.trim() + '</span>'; }).join('') +
    '</div></div>' : '') +

    '<a href="http://vmi3051438.contaboserver.net:8080/soutenance_gael/postuler.html" class="od-apply">' +
    '<i class="fas fa-paper-plane"></i> Postuler à cette offre</a>';

  overlay.style.display = 'block';
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeOffreDetail() {
  document.getElementById('offreOverlay').style.display = 'none';
  document.getElementById('offreDetail').style.display = 'none';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeOffreDetail();
});

// ── SMOOTH SCROLL ──
document.querySelectorAll('a[href^="#"]').forEach(function(a) {
  a.addEventListener('click', function(e) {
    var target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ── INIT ──
document.addEventListener('DOMContentLoaded', function() {
  animateCounters();
  initScrollReveal();
  loadOffres();
});