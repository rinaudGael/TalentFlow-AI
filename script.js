
      window.fillJobForm = function(job) {
  if (job.title) document.getElementById('job-title').value = job.title;
  if (job.department) document.getElementById('job-department').value = job.department;
  if (job.description) document.getElementById('job-description').value = job.description;
  if (job.required_skills) document.getElementById('job-required-skills').value = job.required_skills;
  if (job.preferred_skills) document.getElementById('job-preferred-skills').value = job.preferred_skills;
  if (job.min_experience !== undefined) document.getElementById('job-experience').value = job.min_experience;
  if (job.location) document.getElementById('job-location').value = job.location;
  if (job.salary_range) document.getElementById('job-salary').value = job.salary_range;

  if (job.education_level) {
    var eduSelect = document.getElementById("job-education");
    for (var i = 0; i < eduSelect.options.length; i++) {
      if (eduSelect.options[i].value === job.education_level) {
        eduSelect.selectedIndex = i;
        break;
      }
    }
  }

  if (job.contract_type) {
    var contractSelect = document.getElementById('job-contract');
    for (var i = 0; i < contractSelect.options.length; i++) {
      if (contractSelect.options[i].value === job.contract_type) {
        contractSelect.selectedIndex = i;
        break;
      }
    }
  }

  var inputs = document.querySelectorAll('#jobForm input, #jobForm select, #jobForm textarea');
  inputs.forEach(function(input) {
    if (input.value) {
      input.style.borderColor = '#059669';
      input.style.background = '#ecfdf5';
      setTimeout(function() {
        input.style.borderColor = '';
        input.style.background = '';
      }, 2000);
    }
  });
};
      // ==========================================
      // VÉRIFICATION DE CONNEXION
      // ==========================================

      function checkLogin() {
        var isLoggedIn = sessionStorage.getItem("isLoggedIn");
        var username = sessionStorage.getItem("username");

        if (isLoggedIn !== "true" || !username) {
          window.location.href = "login.html";
          return false;
        }

        document.getElementById("currentUsername").textContent = username;

        var roleElement = document.getElementById("userRole");
        if (roleElement) {
          roleElement.style.display = "none";
        }

        return true;
      }

      function logout() {
        // Demander confirmation
        if (confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
          // Supprimer les données de session
          sessionStorage.removeItem("isLoggedIn");
          sessionStorage.removeItem("username");
          sessionStorage.removeItem("loginTime");

          // Rediriger vers la page de connexion
          window.location.href = "login.html";
        }
      }

      // Vérifier la connexion au chargement
      window.addEventListener("load", function () {
        checkLogin();
      });

      // ==========================================
      // VARIABLES PRINCIPALES
      // ==========================================

      var API_URL =
        "https://vmi3051438.contaboserver.net/webhook/api/dashboard";

      var ACTION_URL =
        "https://vmi3051438.contaboserver.net/webhook/api/candidate-action";

      var allCandidates = [];
      var currentFilter = "all";
      var currentPage = 1;
      var itemsPerPage = 10;
      var currentCandidateId = null;
      var scoreChart = null;
      var statusChart = null;

      async function loadData() {
        try {
          var res = await fetch(API_URL);          
          var rawData = await res.json();
          var data = Array.isArray(rawData) ? rawData[0] : rawData;

          if (data.success) {
            allCandidates = data.data.recent_candidates;
            currentPage = 1; // Réinitialiser à la première page
            updateKPIs(data.data.summary);
            updatePipeline(data.data.pipeline);
            displayCandidatesPage(allCandidates);
            updateJobsTable(data.data.jobs);
            updateCharts(data.data);
            if (currentVue === 'kanban') renderKanban(allCandidates);
            document.getElementById("loading").style.display = "none";
            document.getElementById("content").style.display = "block";
            loadInterviews();
          }
        } catch (e) {
          console.error("Erreur API:", e);
          document.getElementById("loading").innerHTML =
            "<p>Erreur de chargement.</p>";
        }
      }

      function updateKPIs(summary) {
        document.getElementById("kpi-positions").textContent =
          summary.open_positions;
        document.getElementById("kpi-total").textContent =
          summary.total_candidates;
        document.getElementById("kpi-shortlisted").textContent =
          summary.shortlisted;
        document.getElementById("kpi-rejected").textContent = summary.rejected;
        document.getElementById("kpi-score").textContent =
          summary.avg_score || "0";
      }

      function updatePipeline(pipeline) {
        document.getElementById("pipe-received").textContent =
          pipeline.received;
        document.getElementById("pipe-analyzed").textContent =
          pipeline.analyzed;
        document.getElementById("pipe-shortlisted").textContent =
          pipeline.shortlisted;
        document.getElementById("pipe-interview").textContent =
          pipeline.interview;
        document.getElementById("pipe-hired").textContent = pipeline.hired;
      }

      function filterCandidates(status) {
        currentFilter = status;
        currentPage = 1; // Réinitialiser à la première page
        document.querySelectorAll(".filter-btn").forEach(function (btn) {
          btn.classList.remove("active");
        });
        event.target.classList.add("active");

        if (status === "all") {
          displayCandidatesPage(allCandidates);
        } else {
          var filtered = allCandidates.filter(function (c) {
            return c.status === status;
          });
          displayCandidatesPage(filtered);
        }
      }

      function displayCandidatesPage(candidates) {
        // Calculer les indices de pagination
        var totalPages = Math.ceil(candidates.length / itemsPerPage);
        var startIndex = (currentPage - 1) * itemsPerPage;
        var endIndex = startIndex + itemsPerPage;
        var paginatedCandidates = candidates.slice(startIndex, endIndex);

        // Afficher les candidats
        updateCandidatesTable(paginatedCandidates, candidates);

        // Mettre à jour les informations de pagination
        var totalRecords = candidates.length;
        var displayedFrom = totalRecords === 0 ? 0 : startIndex + 1;
        var displayedTo = Math.min(endIndex, totalRecords);
        document.getElementById("pagination-info").textContent =
          displayedFrom + " à " + displayedTo + " sur " + totalRecords;

        // Générer les contrôles de pagination
        generatePaginationControls(totalPages, candidates);
      }

      function generatePaginationControls(totalPages, allFilteredCandidates) {
        var paginationContainer = document.getElementById(
          "pagination-controls",
        );
        paginationContainer.innerHTML = "";

        if (totalPages <= 1) return; // Pas besoin de pagination si une seule page

        // Bouton Précédent
        var prevBtn = document.createElement("button");
        prevBtn.textContent = "← Précédent";
        prevBtn.style.cssText =
          "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;";
        prevBtn.disabled = currentPage === 1;
        prevBtn.style.opacity = currentPage === 1 ? "0.5" : "1";
        prevBtn.style.cursor = currentPage === 1 ? "not-allowed" : "pointer";
        prevBtn.onclick = function () {
          if (currentPage > 1) {
            currentPage--;
            displayCandidatesPage(allFilteredCandidates);
          }
        };
        paginationContainer.appendChild(prevBtn);

        // Numéros de page
        var startPage = Math.max(1, currentPage - 1);
        var endPage = Math.min(totalPages, currentPage + 1);

        for (var i = startPage; i <= endPage; i++) {
          var pageBtn = document.createElement("button");
          pageBtn.textContent = i;
          pageBtn.style.cssText =
            "width: 36px; height: 36px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;";

          if (i === currentPage) {
            pageBtn.style.background = "#1e40af";
            pageBtn.style.color = "white";
            pageBtn.style.borderColor = "#1e40af";
          } else {
            pageBtn.onmouseenter = function () {
              this.style.borderColor = "#1e40af";
              this.style.color = "#1e40af";
            };
            pageBtn.onmouseleave = function () {
              this.style.borderColor = "#d1d5db";
              this.style.color = "#333";
            };
          }

          pageBtn.onclick = (function (pageNum) {
            return function () {
              currentPage = pageNum;
              displayCandidatesPage(allFilteredCandidates);
            };
          })(i);

          paginationContainer.appendChild(pageBtn);
        }

        // Bouton Suivant
        var nextBtn = document.createElement("button");
        nextBtn.textContent = "Suivant →";
        nextBtn.style.cssText =
          "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;";
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.style.opacity = currentPage === totalPages ? "0.5" : "1";
        nextBtn.style.cursor =
          currentPage === totalPages ? "not-allowed" : "pointer";
        nextBtn.onclick = function () {
          if (currentPage < totalPages) {
            currentPage++;
            displayCandidatesPage(allFilteredCandidates);
          }
        };
        paginationContainer.appendChild(nextBtn);
      }

      function searchCandidates(query) {
        currentPage = 1;
        var searchTerm = query.toLowerCase().trim();

        if (searchTerm === "") {
          // Si la recherche est vide, afficher tous les candidats du filtre actuel
          if (currentFilter === "all") {
            displayCandidatesPage(allCandidates);
          } else {
            var filtered = allCandidates.filter(function (c) {
              return c.status === currentFilter;
            });
            displayCandidatesPage(filtered);
          }
        } else {
          // Filtrer les candidats selon la recherche
          var filtered = allCandidates.filter(function (c) {
            var name = (c.name || "").toLowerCase();
            var email = (c.email || "").toLowerCase();
            var job = (c.job || "").toLowerCase();
            return (
              name.includes(searchTerm) ||
              email.includes(searchTerm) ||
              job.includes(searchTerm)
            );
          });

          // Appliquer le filtre de statut sur les résultats de recherche
          if (currentFilter !== "all") {
            filtered = filtered.filter(function (c) {
              return c.status === currentFilter;
            });
          }

          displayCandidatesPage(filtered);
        }
      }

      function updateCandidatesTable(paginatedCandidates, allFilteredCandidates) {
  var tbody = document.getElementById("candidates-table");
  tbody.innerHTML = "";

  if (paginatedCandidates.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center; color:#888; padding:30px;">Aucun candidat dans cette categorie</td></tr>';
    return;
  }

  paginatedCandidates.forEach(function(c) {
    var scoreClass =
      c.score >= 70 ? "score-high" : c.score >= 40 ? "score-mid" : "score-low";
    var badgeClass = "badge-" + c.status;
    var statusText = formatStatus(c.status);
    var recoText = formatRecommendation(c.recommendation);
    var dateText = new Date(c.applied_at).toLocaleDateString("fr-FR");

    var tr = document.createElement("tr");
    tr.className = "candidate-row";

    // Checkbox de sélection
    var isSelected = selectedCandidates.some(function(s) { return s.id === c.id; });
    var checkboxHtml = '<td onclick="event.stopPropagation();" style="width:40px; text-align:center;">' +
      '<input type="checkbox" class="compare-checkbox" ' +
      (isSelected ? 'checked' : '') +
      ' onchange="toggleCandidateSelect(' + c.id + ', ' + JSON.stringify(c).replace(/"/g, '&quot;') + ', this)">' +
      '</td>';

    tr.innerHTML = checkboxHtml +
      "<td><strong>" + c.name +
      '</strong><br><small style="color:#888;">' + c.email + "</small></td>" +
      "<td>" + (c.job || "-") + "</td>" +
      '<td><div class="score-bar"><div class="score-fill ' +
      scoreClass + '" style="width:' + c.score +
      '%"></div></div><strong>' + c.score + "/100</strong></td>" +
      "<td>" + recoText + "</td>" +
      '<td><span class="badge ' + badgeClass + '">' + statusText + "</span></td>" +
      "<td>" + dateText + "</td>";

    tr.onclick = function() { openModal(c); };
    tbody.appendChild(tr);
  });
}

      function updateCharts(data) {
        var candidates = data.recent_candidates;

        if (scoreChart) scoreChart.destroy();
        var scoreCtx = document.getElementById("scoreChart");
        if (scoreCtx && candidates.length > 0) {
          scoreChart = new Chart(scoreCtx, {
            type: "bar",
            data: {
              labels: candidates.map(function (c) {
                return c.name;
              }),
              datasets: [
                {
                  label: "Competences",
                  data: candidates.map(function (c) {
                    return c.skills_score;
                  }),
                  backgroundColor: "#2563eb",
                },
                {
                  label: "Experience",
                  data: candidates.map(function (c) {
                    return c.experience_score;
                  }),
                  backgroundColor: "#059669",
                },
                {
                  label: "Formation",
                  data: candidates.map(function (c) {
                    return c.education_score;
                  }),
                  backgroundColor: "#d97706",
                },
                {
                  label: "Motivation",
                  data: candidates.map(function (c) {
                    return c.motivation_score;
                  }),
                  backgroundColor: "#7c3aed",
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: { y: { beginAtZero: true, max: 100 } },
            },
          });
        }

        if (statusChart) statusChart.destroy();
        var statusCtx = document.getElementById("statusChart");
        var summary = data.summary;
        if (statusCtx) {
          statusChart = new Chart(statusCtx, {
            type: "doughnut",
            data: {
              labels: [
                "Recus",
                "Analyses",
                "Preselectionnes",
                "Entretien",
                "Recrutes",
                "Refuses",
              ],
              datasets: [
                {
                  data: [
                    summary.pending,
                    summary.analyzed,
                    summary.shortlisted,
                    summary.in_interview,
                    summary.hired,
                    summary.rejected,
                  ],
                  backgroundColor: [
                    "#3b82f6",
                    "#f59e0b",
                    "#10b981",
                    "#8b5cf6",
                    "#047857",
                    "#ef4444",
                  ],
                },
              ],
            },
            options: { 
              responsive: true,
              maintainAspectRatio: false
            },
          });
        }
      }

      // Resize charts on window resize for better responsive behavior
      window.addEventListener('resize', function() {
        if (scoreChart) scoreChart.resize();
        if (statusChart) statusChart.resize();
      });

      function openModal(candidate) {
        currentCandidateId = candidate.id;

        document.getElementById("modal-name").innerHTML = 
  candidate.name +
  '<span style="margin-left:12px; display:inline-flex; gap:8px; vertical-align:middle;">' +
    '<i class="fas fa-eye" title="Voir le CV" onclick="toggleCV()" style="cursor:pointer; font-size:18px; color:#0055b8; transition:0.2s;" onmouseover="this.style.color=\'#003d7a\'" onmouseout="this.style.color=\'#0055b8\'"></i>' +
    '<i class="fas fa-file-pdf" title="Exporter en PDF" onclick="exportCVPDF()" style="cursor:pointer; font-size:18px; color:#059669; transition:0.2s;" onmouseover="this.style.color=\'#047857\'" onmouseout="this.style.color=\'#059669\'"></i>' +
  '</span>';
        document.getElementById("modal-email").textContent = candidate.email;
        document.getElementById("modal-job").textContent = candidate.job || "-";
        document.getElementById("modal-status-text").innerHTML =
          '<span class="badge badge-' +
          candidate.status +
          '">' +
          formatStatus(candidate.status) +
          "</span>";
        document.getElementById("modal-date").textContent = new Date(
          candidate.applied_at,
        ).toLocaleDateString("fr-FR");
        document.getElementById("modal-summary").textContent =
          candidate.summary || "Pas de resume disponible";

        // Scores detailles
        setScoreBar("skills", candidate.skills_score);
        setScoreBar("experience", candidate.experience_score);
        setScoreBar("education", candidate.education_score);
        setScoreBar("motivation", candidate.motivation_score);
        setScoreBar("overall", candidate.score);

        // Boutons d action selon le statut
        var actionsDiv = document.getElementById("modal-actions");
        var statusDiv = document.getElementById("modal-action-status");
        statusDiv.style.display = "none";
        document.getElementById("interview-form").style.display = "none";
        actionsDiv.style.display = "flex";
        if (
          candidate.status === "analyzed" ||
          candidate.status === "shortlisted"
        ) {
          actionsDiv.innerHTML =
            '<button class="modal-btn btn-interview" onclick="candidateAction(\'interview\')"><i class="fas fa-calendar"></i> Planifier Entretien</button>' +
            '<button class="modal-btn btn-reject" onclick="candidateAction(\'reject\')"><i class="fas fa-times-circle"></i> Refuser</button>';
        } else if (candidate.status === "interview") {
          actionsDiv.innerHTML =
            '<button class="modal-btn btn-hire" onclick="candidateAction(\'hire\')"><i class="fas fa-certificate"></i> Recruter</button>' +
            '<button class="modal-btn btn-reject" onclick="candidateAction(\'reject\')"><i class="fas fa-times-circle"></i> Refuser</button>';
        } else {
          actionsDiv.innerHTML = "";
        }

        document.getElementById("modal-overlay").style.display = "block";

        currentCVText = '';
document.getElementById('cv-viewer').style.display = 'none';
document.getElementById('cv-viewer-body').textContent = 'Chargement...';
      }

      function setScoreBar(name, score) {
        var val = parseInt(score) || 0;
        var color = val >= 70 ? "#059669" : val >= 40 ? "#d97706" : "#dc2626";
        document.getElementById("bar-" + name).style.width = val + "%";
        document.getElementById("bar-" + name).style.background = color;
        document.getElementById("val-" + name).textContent = val;
      }

      function closeModal() {
        document.getElementById("modal-overlay").style.display = "none";
        currentCandidateId = null;
      }

      function candidateAction(action) {
        if (!currentCandidateId) return;

        if (action === "interview") {
          // Afficher le formulaire de date
          document.getElementById("modal-actions").style.display = "none";
          document.getElementById("interview-form").style.display = "block";

          // Mettre la date par defaut a demain
          var tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          document.getElementById("interview-date").value = tomorrow
            .toISOString()
            .split("T")[0];
          document.getElementById("interview-time").value = "10:00";
        } else if (action === "reject") {
          sendAction("reject", null, null, null);
        } else if (action === "hire") {
          sendAction("hire", null, null, null);
        }
      }

      function cancelInterview() {
        document.getElementById("interview-form").style.display = "none";
        document.getElementById("modal-actions").style.display = "flex";
      }

      async function confirmInterview() {
        var date = document.getElementById("interview-date").value;
        var time = document.getElementById("interview-time").value;
        var type = document.getElementById("interview-type").value;

        if (!date || !time) {
          alert("Veuillez choisir une date et une heure");
          return;
        }

        document.getElementById("interview-form").style.display = "none";
        sendAction("interview", date, time, type);
      }

      async function sendAction(action, date, time, type) {
        var statusDiv = document.getElementById("modal-action-status");
        document.getElementById("modal-actions").style.display = "none";
        document.getElementById("interview-form").style.display = "none";

        statusDiv.style.display = "block";
        statusDiv.textContent = "Envoi en cours...";
        statusDiv.style.background = "#fef3c7";
        statusDiv.style.color = "#92400e";

        try {
          var bodyData = {
            candidate_id: currentCandidateId,
            action: action,
          };

          if (date) bodyData.interview_date = date;
          if (time) bodyData.interview_time = time;
          if (type) bodyData.interview_type = type;

          await fetch(ACTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData),
          });

          if (action === "interview") {
            var typeText =
              type === "video"
                ? "visioconference"
                : type === "phone"
                  ? "telephone"
                  : "sur site";
            statusDiv.innerHTML =
              '<i class=\"fas fa-check-circle\"></i> Entretien planifie le ' +
              date +
              " a " +
              time +
              " (" +
              typeText +
              "). Email envoye.";
            statusDiv.style.background = "#ecfdf5";
            statusDiv.style.color = "#047857";
          } else if (action === "hire") {
            statusDiv.innerHTML =
              '<i class=\"fas fa-certificate\"></i> Candidat recrute. Email de felicitations envoye.';
            statusDiv.style.background = "#d1fae5";
            statusDiv.style.color = "#065f46";
          } else {
            statusDiv.innerHTML =
              '<i class=\"fas fa-times-circle\"></i> Candidature refusee. Email de refus envoye.';
            statusDiv.style.background = "#fef2f2";
            statusDiv.style.color = "#b91c1c";
          }

          setTimeout(function () {
            loadData();
            closeModal();
          }, 3000);
        } catch (e) {
          statusDiv.textContent = "Erreur. Veuillez reessayer.";
          statusDiv.style.background = "#fef2f2";
          statusDiv.style.color = "#b91c1c";
        }
      }

      document
        .getElementById("modal-overlay")
        .addEventListener("click", function (e) {
          if (e.target === this) closeModal();
        });

      function formatStatus(status) {
        var map = {
          received: '<i class=\"fas fa-inbox\"></i> Recu',
          analyzed: '<i class=\"fas fa-search\"></i> Analyse',
          shortlisted: '<i class=\"fas fa-check\"></i> Preselectionne',
          interview: '<i class=\"fas fa-calendar\"></i> Entretien',
          hired: '<i class=\"fas fa-certificate\"></i> Recrute',
          rejected: '<i class=\"fas fa-times-circle\"></i> Refuse',
        };
        return map[status] || status;
      }

      function formatRecommendation(rec) {
        var map = {
          fortement_recommande:
            '<i class=\"fas fa-star\"></i><i class=\"fas fa-star\"></i><i class=\"fas fa-star\"></i>',
          recommande:
            '<i class=\"fas fa-star\"></i><i class=\"fas fa-star\"></i>',
          a_considerer: '<i class=\"fas fa-star\"></i>',
          non_recommande: '<i class=\"fas fa-ban\"></i>',
        };
        return map[rec] || rec || "-";
      }

      loadData();
      setInterval(loadData, 30000);

      // ==========================================
      //  MODAL : Ouvrir / Fermer
      // ==========================================

      function openJobModal() {
        document.getElementById("jobModal").classList.add("active");
        document.body.style.overflow = "hidden"; // Bloquer le scroll du body
        // Focus sur le premier champ
        setTimeout(() => document.getElementById("job-title").focus(), 300);
      }

      function closeJobModal() {
        document.getElementById("jobModal").classList.remove("active");
        document.body.style.overflow = "";
        document.getElementById("jobForm").reset();
      }

      // Fermer le modal en cliquant en dehors
      document
        .getElementById("jobModal")
        .addEventListener("click", function (e) {
          if (e.target === this) {
            closeJobModal();
          }
        });

      // Fermer le modal avec Echap
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          closeJobModal();
        }
      });

      // ==========================================
      //  SOUMISSION DU FORMULAIRE
      // ==========================================

      // ==========================================
      //  URL DE VOTRE WEBHOOK N8N
      // ==========================================

      const N8N_CREATE_JOB_URL =
        "https://vmi3051438.contaboserver.net/webhook/create-job";
      //

      // ==========================================
      //  MODAL : Ouvrir / Fermer
      // ==========================================

      function openJobModal() {
        document.getElementById("jobModal").classList.add("active");
        document.body.style.overflow = "hidden";
        setTimeout(() => document.getElementById("job-title").focus(), 300);
      }

      function closeJobModal() {
        document.getElementById("jobModal").classList.remove("active");
        document.body.style.overflow = "";
        document.getElementById("jobForm").reset();
      }

      // Fermer en cliquant en dehors
      document
        .getElementById("jobModal")
        .addEventListener("click", function (e) {
          if (e.target === this) {
            closeJobModal();
          }
        });

      // Fermer avec Echap
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          closeJobModal();
        }
      });

      // ==========================================
      //  SOUMISSION → WEBHOOK N8N
      // ==========================================

      async function submitJob(event) {
        event.preventDefault();

        const submitBtn = document.getElementById("submitJobBtn");
        const btnText = submitBtn.querySelector(".btn-text");
        const btnLoader = submitBtn.querySelector(".btn-loader");

        // État de chargement
        submitBtn.disabled = true;
        btnText.textContent = "Création...";
        btnLoader.style.display = "inline";

        // Convertir les compétences en tableaux
        const requiredSkillsRaw = document.getElementById(
          "job-required-skills",
        ).value;
        const preferredSkillsRaw = document.getElementById(
          "job-preferred-skills",
        ).value;

        const requiredSkills = requiredSkillsRaw
          ? requiredSkillsRaw
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s)
          : [];
        const preferredSkills = preferredSkillsRaw
          ? preferredSkillsRaw
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s)
          : [];

        // Construire les données
        const jobData = {
          title: document.getElementById("job-title").value.trim(),
          department:
            document.getElementById("job-department").value.trim() || null,
          description:
            document.getElementById("job-description").value.trim() || null,
          required_skills: requiredSkills,
          preferred_skills: preferredSkills,
          min_experience:
            parseInt(document.getElementById("job-experience").value) || 0,
          education_level:
            document.getElementById("job-education").value || null,
          contract_type: document.getElementById("job-contract").value || null,
          location:
            document.getElementById("job-location").value.trim() || null,
          salary_range:
            document.getElementById("job-salary").value.trim() || null,
          status: document.getElementById("job-status").value,
        };

        try {
          const response = await fetch(N8N_CREATE_JOB_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jobData),
          });

          if (response.ok) {
            let result;
            try {
              result = await response.json();
            } catch (e) {
              result = { success: true };
            }
            showToast(
              '<i class=\"fas fa-check-circle\"></i> Offre créée avec succès !',
              "success",
            );
            closeJobModal();
            loadData(); // <i class="fas fa-sync-alt"></i> Recharger les données du dashboard
          } else {
            const result = await response.json().catch(() => ({}));
            showToast(
              `<i class=\"fas fa-times-circle\"></i> Erreur : ${result.message || "Échec de la création"}`,
              "error",
            );
          }
        } catch (error) {
          console.error("Erreur:", error);
          showToast(
            '<i class=\"fas fa-times-circle\"></i> Erreur de connexion au serveur n8n',
            "error",
          );
        } finally {
          submitBtn.disabled = false;
          btnText.textContent = "Créer l'offre";
          btnLoader.style.display = "none";
        }
      }

      // ==========================================
      //  NOTIFICATION TOAST
      // ==========================================

      function showToast(message, type = "success") {
        const existingToast = document.querySelector(".toast");
        if (existingToast) existingToast.remove();

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.innerHTML = message;
        document.body.appendChild(toast);

        setTimeout(() => {
          if (toast.parentNode) toast.remove();
        }, 3000);
      }

      // ==========================================
      //  NOTIFICATION TOAST
      // ==========================================

      function showToast(message, type = "success") {
        // Supprimer tout toast existant
        const existingToast = document.querySelector(".toast");
        if (existingToast) existingToast.remove();

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.innerHTML = message;
        document.body.appendChild(toast);

        // Auto-suppression après l'animation
        setTimeout(() => {
          if (toast.parentNode) toast.remove();
        }, 3000);
      }

      // ==========================================
      //  GESTION OFFRES : MODIFIER / SUPPRIMER
      // ==========================================

      var N8N_MANAGE_JOB_URL =
        "https://vmi3051438.contaboserver.net/webhook/api/job-manage";

      // ====== OUVRIR LE MODAL EDITION ======
      async function openEditJobModal(jobId) {
        var modal = document.getElementById("editJobModal");
        var modalBody = document.getElementById("editModalBody");
        var btnDelete = document.getElementById("btnDeleteJob");
        var btnSave = document.getElementById("btnSaveJob");

        // Sauvegarder le HTML original du formulaire
        if (!window._editFormOriginalHTML) {
          window._editFormOriginalHTML = modalBody.innerHTML;
        }

        // Afficher le modal avec loading
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
        btnDelete.style.display = "none";
        btnSave.style.display = "none";

        modalBody.innerHTML =
          '<div class="edit-modal-loading">' +
          '<div class="edit-spinner"></div>' +
          "<p>Chargement de l'offre...</p></div>";

        try {
          var response = await fetch(N8N_MANAGE_JOB_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "details", job_id: jobId }),
          });

          var result = await response.json();
          // Gérer le format de réponse (peut être un tableau ou un objet)
          var raw = Array.isArray(result) ? result[0] : result;
          var job = raw.data || raw;

          // Restaurer le formulaire
          modalBody.innerHTML = window._editFormOriginalHTML;
          btnDelete.style.display = "inline-flex";
          btnSave.style.display = "inline-flex";

          // Remplir les champs
          document.getElementById("edit_job_id").value = job.id || jobId;
          document.getElementById("edit_title").value = job.title || "";
          document.getElementById("edit_department").value =
            job.department || "";
          document.getElementById("edit_description").value =
            job.description || "";
          // Formatter les skills pour l'affichage (JSON array -> texte virgules)
          var formatSkills = function (skills) {
            if (!skills) return "";
            try {
              var arr = JSON.parse(skills);
              if (Array.isArray(arr)) return arr.join(", ");
            } catch (e) {}
            return skills;
          };
          document.getElementById("edit_required_skills").value = formatSkills(
            job.required_skills,
          );
          document.getElementById("edit_preferred_skills").value = formatSkills(
            job.preferred_skills,
          );
          document.getElementById("edit_min_experience").value =
            job.min_experience || 0;
          document.getElementById("edit_contract_type").value =
            job.contract_type || "";
          document.getElementById("edit_location").value = job.location || "";
          document.getElementById("edit_salary_range").value =
            job.salary_range || "";
          document.getElementById("edit_status").value = job.status || "active";

          // Education level
          var eduSelect = document.getElementById("edit_education_level");
          if (job.education_level) {
            for (var i = 0; i < eduSelect.options.length; i++) {
              if (eduSelect.options[i].value === job.education_level) {
                eduSelect.selectedIndex = i;
                break;
              }
            }
          }

          // Scoring config
          document.getElementById("edit_skills_weight").value =
            job.skills_weight || 40;
          document.getElementById("edit_experience_weight").value =
            job.experience_weight || 25;
          document.getElementById("edit_education_weight").value =
            job.education_weight || 20;
          document.getElementById("edit_motivation_weight").value =
            job.motivation_weight || 15;
          document.getElementById("edit_min_score_shortlist").value =
            job.min_score_shortlist || 70;
          document.getElementById("edit_min_score_auto_reject").value =
            job.min_score_auto_reject || 30;

          // Mettre à jour le titre du modal
          document.getElementById("editModalTitle").innerHTML =
            '<i class="fas fa-pen"></i> ' + (job.title || "Modifier l'offre");
        } catch (error) {
          console.error("Erreur chargement offre:", error);
          modalBody.innerHTML =
            '<div class="edit-modal-loading">' +
            '<p style="color:#dc2626; font-size:1.1rem;"><i class="fas fa-exclamation-triangle"></i> Erreur de chargement</p>' +
            '<p style="margin-top:8px; color:#888;">' +
            error.message +
            "</p>" +
            '<button class="btn btn-cancel" onclick="closeEditJobModal()" style="margin-top:16px;">Fermer</button>' +
            "</div>";
        }
      }

      // ====== METTRE A JOUR L'OFFRE ======
      async function updateJob() {
        var btn = document.getElementById("btnSaveJob");
        btn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
        btn.disabled = true;

        var data = {
          action: "update",
          job_id: parseInt(document.getElementById("edit_job_id").value),
          title: document.getElementById("edit_title").value.trim(),
          department: document.getElementById("edit_department").value.trim(),
          description: document.getElementById("edit_description").value.trim(),
          required_skills: document
            .getElementById("edit_required_skills")
            .value.trim(),
          preferred_skills: document
            .getElementById("edit_preferred_skills")
            .value.trim(),
          min_experience:
            parseInt(document.getElementById("edit_min_experience").value) || 0,
          education_level: document.getElementById("edit_education_level")
            .value,
          contract_type: document.getElementById("edit_contract_type").value,
          location: document.getElementById("edit_location").value.trim(),
          salary_range: document
            .getElementById("edit_salary_range")
            .value.trim(),
          status: document.getElementById("edit_status").value,
          skills_weight:
            parseInt(document.getElementById("edit_skills_weight").value) || 40,
          experience_weight:
            parseInt(document.getElementById("edit_experience_weight").value) ||
            25,
          education_weight:
            parseInt(document.getElementById("edit_education_weight").value) ||
            20,
          motivation_weight:
            parseInt(document.getElementById("edit_motivation_weight").value) ||
            15,
          min_score_shortlist:
            parseInt(
              document.getElementById("edit_min_score_shortlist").value,
            ) || 70,
          min_score_auto_reject:
            parseInt(
              document.getElementById("edit_min_score_auto_reject").value,
            ) || 30,
        };

        // Validation titre
        if (!data.title) {
          showToast(
            '<i class="fas fa-exclamation-triangle"></i> Le titre du poste est obligatoire !',
            "error",
          );
          btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
          btn.disabled = false;
          return;
        }

        // Validation poids = 100%
        var totalWeight =
          data.skills_weight +
          data.experience_weight +
          data.education_weight +
          data.motivation_weight;
        if (totalWeight !== 100) {
          showToast(
            '<i class="fas fa-exclamation-triangle"></i> Le total des poids doit faire 100% (actuellement ' +
              totalWeight +
              "%)",
            "error",
          );
          btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
          btn.disabled = false;
          return;
        }

        try {
          var response = await fetch(N8N_MANAGE_JOB_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          var result = await response.json();

          showToast(
            '<i class="fas fa-check-circle"></i> Offre mise à jour avec succès !',
            "success",
          );
          closeEditJobModal();
          loadData();
        } catch (error) {
          console.error("Erreur update:", error);
          showToast(
            '<i class="fas fa-times-circle"></i> Erreur : ' + error.message,
            "error",
          );
        }

        btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
        btn.disabled = false;
      }

      // ====== SUPPRIMER L'OFFRE ======
      async function deleteJob() {
        var jobId = document.getElementById("edit_job_id").value;
        var jobTitle = document.getElementById("edit_title").value;

        var confirmMsg =
          'SUPPRIMER "' +
          jobTitle +
          '" ?\n\n' +
          "Cela supprimera DÉFINITIVEMENT :\n" +
          "• L'offre d'emploi\n" +
          "• Tous les candidats associés\n" +
          "• Toutes les analyses IA\n" +
          "• Toutes les communications\n\n" +
          "Cette action est IRRÉVERSIBLE !";

        if (!confirm(confirmMsg)) return;
        if (!confirm("Dernière confirmation : SUPPRIMER DÉFINITIVEMENT ?"))
          return;

        var btn = document.getElementById("btnDeleteJob");
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Suppression...';
        btn.disabled = true;

        try {
          var response = await fetch(N8N_MANAGE_JOB_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", job_id: parseInt(jobId) }),
          });

          var result = await response.json();

          showToast(
            '<i class="fas fa-check-circle"></i> Offre "' +
              jobTitle +
              '" supprimée !',
            "success",
          );
          closeEditJobModal();
          loadData();
        } catch (error) {
          console.error("Erreur delete:", error);
          showToast(
            '<i class="fas fa-times-circle"></i> Erreur : ' + error.message,
            "error",
          );
        }

        btn.innerHTML = '<i class="fas fa-trash"></i> Supprimer l\'offre';
        btn.disabled = false;
      }

      // ====== FERMER LE MODAL EDITION ======
      function closeEditJobModal() {
        document.getElementById("editJobModal").classList.remove("active");
        document.body.style.overflow = "";
      }

      // Fermer en cliquant sur l'overlay
      document
        .getElementById("editJobModal")
        .addEventListener("click", function (e) {
          if (e.target === this) closeEditJobModal();
        });

      // Ajouter Echap pour fermer le modal edition aussi
      (function () {
        var originalKeydown = null;
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape") {
            var editModal = document.getElementById("editJobModal");
            if (editModal.classList.contains("active")) {
              closeEditJobModal();
            }
          }
        });
      })();

      // ==========================================
      // CHATBOT IA RECRUTEUR
      // ==========================================

      var CHATBOT_URL =
        "https://vmi3051438.contaboserver.net/webhook/api/chatbot";
      var chatbotOpen = false;

      function toggleChatbot() {
        chatbotOpen = !chatbotOpen;
        var bubble = document.getElementById("chatbot-bubble");
        var window = document.getElementById("chatbot-window");

        if (chatbotOpen) {
          bubble.classList.add("active");
          window.classList.add("active");
          document.getElementById("chatbot-input").focus();
          // Masquer le badge
          document.getElementById("chatbot-badge").style.display = "none";
        } else {
          bubble.classList.remove("active");
          window.classList.remove("active");
        }
      }

      function askSuggestion(question) {
        document.getElementById("chatbot-input").value = question;
        sendChatMessage();
        // Masquer les suggestions après le premier clic
        document.getElementById("chatbot-suggestions").style.display = "none";
      }

      async function sendChatMessage() {
        var input = document.getElementById("chatbot-input");
        var question = input.value.trim();
        if (!question) return;

        // Désactiver input
        input.value = "";
        input.disabled = true;
        document.getElementById("chatbot-send-btn").disabled = true;

        // Masquer suggestions
        document.getElementById("chatbot-suggestions").style.display = "none";

        // Afficher message utilisateur
        addChatMessage("user", question);

        // Afficher typing indicator
        showTypingIndicator();

        try {
          var response = await fetch(CHATBOT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: question }),
          });

          // NOUVEAU CODE :
          var rawData = await response.json();
          console.log("Réponse chatbot brute:", rawData);

          // Gérer si c'est un tableau ou un objet
          var data = Array.isArray(rawData) ? rawData[0] : rawData;

          if (data && data.success && data.response) {
            removeTypingIndicator();
            addChatMessage("bot", data.response);
          } else if (data && data.response) {
            addChatMessage("bot", data.response);
          } else {
            addChatMessage(

              "bot",
              "Désolé, je n'ai pas pu traiter votre question. Réponse reçue: " +
                JSON.stringify(rawData).substring(0, 200),
            );
          }
        } catch (error) {
          removeTypingIndicator();
          addChatMessage(
            "bot",
            "Erreur de connexion. Vérifiez que le serveur est en ligne et réessayez.",
          );
        }

        // Réactiver input
        input.disabled = false;
        document.getElementById("chatbot-send-btn").disabled = false;
        input.focus();
      }

      function addChatMessage(type, content) {
        var messagesDiv = document.getElementById("chatbot-messages");

        var messageDiv = document.createElement("div");
        messageDiv.className = "chat-message " + type;

        var avatarIcon = type === "bot" ? "fa-robot" : "fa-user";

        // Formater le contenu (convertir les sauts de ligne et le markdown basique)
        var formattedContent = formatChatResponse(content);

        messageDiv.innerHTML =
          '<div class="chat-avatar"><i class="fas ' +
          avatarIcon +
          '"></i></div>' +
          '<div class="chat-content">' +
          formattedContent +
          "</div>";

        messagesDiv.appendChild(messageDiv);

        // Scroll en bas
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }

      function formatChatResponse(text) {
        if (!text) return "<p>Pas de réponse</p>";

        // Échapper le HTML dangereux
        var escaped = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        // Convertir markdown basique
        var formatted = escaped
          // Titres
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          // Listes à puces
          .replace(/^[\-\*] (.+)$/gm, "<li>$1</li>")
          // Numérotation
          .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
          // Sauts de ligne
          .replace(/\n\n/g, "</p><p>")
          .replace(/\n/g, "<br>");

        // Entourer les <li> dans des <ul>
        formatted = formatted.replace(/((?:<li>.*<\/li>\s*)+)/g, "<ul>$1</ul>");

        // Entourer dans des <p> si pas déjà fait
        if (!formatted.startsWith("<")) {
          formatted = "<p>" + formatted + "</p>";
        }

        return formatted;
      }

      function showTypingIndicator() {
        var messagesDiv = document.getElementById("chatbot-messages");

        var typingDiv = document.createElement("div");
        typingDiv.className = "chat-message bot";
        typingDiv.id = "typing-indicator";

        typingDiv.innerHTML =
          '<div class="chat-avatar"><i class="fas fa-robot"></i></div>' +
          '<div class="typing-indicator">' +
          '<div class="typing-dot"></div>' +
          '<div class="typing-dot"></div>' +
          '<div class="typing-dot"></div>' +
          "</div>";

        messagesDiv.appendChild(typingDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }

      function removeTypingIndicator() {
        var typing = document.getElementById("typing-indicator");
        if (typing) typing.remove();
      }

      // ==========================================
      // IMPORT LINKEDIN
      // ==========================================

      var LINKEDIN_IMPORT_URL =
        "https://vmi3051438.contaboserver.net/webhook/api/import-linkedin";

      function toggleLinkedinImport() {
        var body = document.getElementById("linkedin-import-body");
        var chevron = document.getElementById("linkedin-chevron");

        if (body.style.display === "none") {
          body.style.display = "block";
          chevron.classList.add("open");
        } else {
          body.style.display = "none";
          chevron.classList.remove("open");
        }
      }

      window.importFromLinkedin = async function() {
  var textInput = document.getElementById('linkedin-text');
  var text = textInput.value.trim();
  var statusDiv = document.getElementById('linkedin-status');
  var btn = document.getElementById('linkedin-import-btn');

  if (!text || text.length < 20) {
    statusDiv.className = 'linkedin-status error';
    statusDiv.style.display = 'block';
    statusDiv.textContent = '❌ Collez le texte complet de l\'offre LinkedIn (minimum 20 caractères)';
    return;
  }

  btn.disabled = true;
  btn.querySelector('.linkedin-btn-text').style.display = 'none';
  btn.querySelector('.linkedin-btn-loader').style.display = 'inline-flex';
  statusDiv.className = 'linkedin-status loading';
  statusDiv.style.display = 'block';
  statusDiv.textContent = '🔄 L\'IA analyse l\'offre... Cela peut prendre 1-2 minutes';

  try {
    var response = await fetch(LINKEDIN_IMPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });

    var rawData = await response.json();
    console.log('LinkedIn import response:', rawData);
    var data = Array.isArray(rawData) ? rawData[0] : rawData;

    if (data && data.success && data.job) {
      var j = data.job;

      var titleEl = document.getElementById('job-title');
      var deptEl = document.getElementById('job-department');
      var descEl = document.getElementById('job-description');
      var reqEl = document.getElementById('job-required-skills');
      var prefEl = document.getElementById('job-preferred-skills');
      var expEl = document.getElementById('job-experience');
      var locEl = document.getElementById('job-location');
      var salEl = document.getElementById('job-salary');
      var eduEl = document.getElementById('job-education');
      var contractEl = document.getElementById('job-contract');

      if (titleEl && j.title) titleEl.value = j.title;
      if (deptEl && j.department) deptEl.value = j.department;
      if (descEl && j.description) descEl.value = j.description;
      if (reqEl && j.required_skills) reqEl.value = j.required_skills;
      if (prefEl && j.preferred_skills) prefEl.value = j.preferred_skills;
      if (expEl && j.min_experience !== undefined) expEl.value = j.min_experience;
      if (locEl && j.location) locEl.value = j.location;
      if (salEl && j.salary_range) salEl.value = j.salary_range;

      if (eduEl && j.education_level) {
        for (var i = 0; i < eduEl.options.length; i++) {
          if (eduEl.options[i].value === j.education_level) {
            eduEl.selectedIndex = i;
            break;
          }
        }
      }

      if (contractEl && j.contract_type) {
        for (var i = 0; i < contractEl.options.length; i++) {
          if (contractEl.options[i].value === j.contract_type) {
            contractEl.selectedIndex = i;
            break;
          }
        }
      }

      // Animation verte
      var allInputs = document.querySelectorAll('#jobForm input, #jobForm select, #jobForm textarea');
      for (var k = 0; k < allInputs.length; k++) {
        (function(el) {
          if (el.value) {
            el.style.borderColor = '#059669';
            el.style.background = '#ecfdf5';
            setTimeout(function() {
              el.style.borderColor = '';
              el.style.background = '';
            }, 2000);
          }
        })(allInputs[k]);
      }

      statusDiv.className = 'linkedin-status success';
      statusDiv.style.display = 'block';
      statusDiv.textContent = '✅ Offre analysée ! Vérifiez les informations ci-dessous.';
    } else {
      statusDiv.className = 'linkedin-status error';
      statusDiv.style.display = 'block';
      statusDiv.textContent = '❌ ' + (data && data.message ? data.message : 'Impossible d\'analyser cette offre');
    }

  } catch (error) {
    console.error('Import LinkedIn error:', error);
    statusDiv.className = 'linkedin-status error';
    statusDiv.style.display = 'block';
    statusDiv.textContent = '❌ Erreur: ' + error.message;
  }

  btn.disabled = false;
  btn.querySelector('.linkedin-btn-text').style.display = 'inline-flex';
  btn.querySelector('.linkedin-btn-loader').style.display = 'none';
};

// ==========================================
// VUE KANBAN
// ==========================================

var currentVue = 'table';
var draggedCard = null;
var draggedCandidateId = null;

function switchVue(vue) {
  currentVue = vue;
  var tableView = document.querySelector('.card:has(#candidates-table)') || document.getElementById('candidates-table').closest('.card');
  var kanbanView = document.getElementById('kanban-view');

  if (vue === 'kanban') {
    tableView.style.display = 'none';
    kanbanView.style.display = 'block';
    document.getElementById('btn-vue-kanban').style.background = '#003d7a';
    document.getElementById('btn-vue-kanban').style.color = 'white';
    document.getElementById('btn-vue-table').style.background = 'white';
    document.getElementById('btn-vue-table').style.color = '#003d7a';
    renderKanban(allCandidates);
  } else {
    tableView.style.display = 'block';
    kanbanView.style.display = 'none';
    document.getElementById('btn-vue-table').style.background = '#003d7a';
    document.getElementById('btn-vue-table').style.color = 'white';
    document.getElementById('btn-vue-kanban').style.background = 'white';
    document.getElementById('btn-vue-kanban').style.color = '#003d7a';
  }
}

function renderKanban(candidates) {
  var cols = ['received','analyzed','shortlisted','interview','hired','rejected'];

  // Vider toutes les colonnes
  cols.forEach(function(status) {
    document.getElementById('kcards-' + status).innerHTML = '';
    document.getElementById('kcount-' + status).textContent = '0';
  });

  // Remplir les colonnes
  var counts = {};
  cols.forEach(function(s) { counts[s] = 0; });

  candidates.forEach(function(c) {
    var status = c.status;
    if (!counts.hasOwnProperty(status)) return;
    counts[status]++;

    var scoreColor = c.score >= 70 ? '#059669' : c.score >= 40 ? '#d97706' : '#dc2626';

    var card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.candidateId = c.id;
    card.dataset.status = status;

    card.innerHTML =
      '<div class="kanban-card-name">' + c.name + '</div>' +
      '<div class="kanban-card-job">' + (c.job || '-') + '</div>' +
      '<span class="kanban-card-score" style="background:' + scoreColor + ';">' + c.score + '/100</span>';

    // Clic pour ouvrir le modal
    card.addEventListener('click', function() {
      openModal(c);
    });

    // Drag events
    card.addEventListener('dragstart', function(e) {
      draggedCard = card;
      draggedCandidateId = c.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', function() {
      card.classList.remove('dragging');
      document.querySelectorAll('.kanban-col').forEach(function(col) {
        col.classList.remove('drag-over');
      });
    });

    document.getElementById('kcards-' + status).appendChild(card);
  });

  // Mettre à jour les compteurs
  cols.forEach(function(s) {
    document.getElementById('kcount-' + s).textContent = counts[s];
  });

  // Drop zones
  document.querySelectorAll('.kanban-col').forEach(function(col) {
    col.addEventListener('dragover', function(e) {
      e.preventDefault();
      col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', function() {
      col.classList.remove('drag-over');
    });

    col.addEventListener('drop', function(e) {
      e.preventDefault();
      col.classList.remove('drag-over');
      var newStatus = col.dataset.status;

      if (!draggedCandidateId || !newStatus) return;

      // Trouver l'ancien statut
      var candidate = allCandidates.find(function(c) { return c.id == draggedCandidateId; });
      if (!candidate || candidate.status === newStatus) return;

      // Mapper le statut vers l'action
      var actionMap = {
        'interview': 'interview',
        'hired': 'hire',
        'rejected': 'reject'
      };

      if (actionMap[newStatus]) {
        // Nécessite une action avec email
        if (newStatus === 'interview') {
          // Ouvrir le modal pour planifier l'entretien
          currentCandidateId = draggedCandidateId;
          openModal(candidate);
          candidateAction('interview');
        } else {
          if (confirm('Confirmer : ' + (newStatus === 'hired' ? 'Recruter' : 'Refuser') + ' ' + candidate.name + ' ?')) {
            sendKanbanAction(draggedCandidateId, actionMap[newStatus], candidate);
          }
        }
      } else {
        // Changement de statut simple (ex: received → analyzed)
        updateCandidateStatusDirect(draggedCandidateId, newStatus, candidate);
      }
    });
  });
}

async function sendKanbanAction(candidateId, action, candidate) {
  try {
    await fetch(ACTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, action: action })
    });
    showToast('<i class="fas fa-check-circle"></i> Statut mis à jour !', 'success');
    await loadData();
    if (currentVue === 'kanban') renderKanban(allCandidates);
  } catch(e) {
    showToast('<i class="fas fa-times-circle"></i> Erreur mise à jour', 'error');
  }
}

async function updateCandidateStatusDirect(candidateId, newStatus, candidate) {
  // Pour les statuts sans action email (received, analyzed, shortlisted)
  // On met à jour directement via l'API candidate-action
  try {
    await fetch(ACTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, action: newStatus })
    });
    showToast('<i class="fas fa-check-circle"></i> Candidat déplacé !', 'success');
    await loadData();
    if (currentVue === 'kanban') renderKanban(allCandidates);
  } catch(e) {
    showToast('<i class="fas fa-times-circle"></i> Erreur', 'error');
  }
}

var currentCVText = '';

async function loadCV(candidateId) {
  try {
    var res = await fetch('https://vmi3051438.contaboserver.net/webhook/api/get-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId })
    });
    var rawData = await res.json();
    var data = Array.isArray(rawData) ? rawData[0] : rawData;

    if (data.success && data.cv_text) {
      currentCVText = data.cv_text;
      document.getElementById('cv-viewer-body').textContent = data.cv_text;
    } else {
      currentCVText = '';
      document.getElementById('cv-viewer-body').textContent = 'Aucun CV disponible pour ce candidat.';
    }
  } catch(e) {
    document.getElementById('cv-viewer-body').textContent = 'Erreur de chargement du CV.';
  }
}

function toggleCV() {
  var viewer = document.getElementById('cv-viewer');
  if (viewer.style.display === 'none' || viewer.style.display === '') {
    viewer.style.display = 'block';
    loadCV(currentCandidateId);
  } else {
    viewer.style.display = 'none';
  }
}

function exportCVPDF() {
  if (!currentCandidateId) return;
  if (!currentCVText) {
    loadCV(currentCandidateId).then(function() { generatePDF(); });
  } else {
    generatePDF();
  }
}

function generatePDF() {
  var candidateName = document.getElementById('modal-name').textContent;
  var jobTitle = document.getElementById('modal-job').textContent;

  var htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    'body{font-family:Arial,sans-serif;padding:40px;color:#1f2937;}' +
    '.header{background:#003d7a;color:white;padding:20px;border-radius:8px;margin-bottom:24px;}' +
    '.header h1{margin:0;font-size:22px;}' +
    '.header p{margin:5px 0 0;opacity:0.85;font-size:14px;}' +
    '.content{white-space:pre-wrap;font-size:13px;line-height:1.8;}' +
    '.footer{margin-top:30px;padding-top:15px;border-top:1px solid #e5e7eb;font-size:11px;color:#888;}' +
    '</style></head><body>' +
    '<div class="header"><h1>' + candidateName + '</h1><p>Candidature pour : ' + jobTitle + '</p></div>' +
    '<div class="content">' + (currentCVText || 'Aucun CV disponible') + '</div>' +
    '<div class="footer">Exporté depuis TalentFlow AI ATS - ' + new Date().toLocaleDateString('fr-FR') + '</div>' +
    '</body></html>';

  var printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(function() { printWindow.print(); }, 500);
}

// ==========================================
// CALENDRIER ENTRETIENS
// ==========================================

var INTERVIEWS_URL = 'https://vmi3051438.contaboserver.net/webhook/api/get-interviews';
var allInterviews = [];
var calendarDate = new Date();

async function loadInterviews() {
  try {
    var res = await fetch(INTERVIEWS_URL);
    var rawData = await res.json();
    var data = Array.isArray(rawData) ? rawData[0] : rawData;
    if (data.success) {
      allInterviews = data.interviews;
      renderCalendar();
    }
  } catch(e) {
    console.log('Erreur chargement entretiens:', e);
  }
}

function renderCalendar() {
  var year = calendarDate.getFullYear();
  var month = calendarDate.getMonth();

  var monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  document.getElementById('calendar-title').textContent = monthNames[month] + ' ' + year;

  var grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  // Headers jours
  var days = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  days.forEach(function(d) {
    var header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = d;
    grid.appendChild(header);
  });

  // Premier jour du mois
  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0);

  // Ajuster pour commencer lundi (0=lundi)
  var startDay = (firstDay.getDay() + 6) % 7;

  // Jours du mois précédent
  for (var i = 0; i < startDay; i++) {
    var prevDate = new Date(year, month, -startDay + i + 1);
    var dayDiv = createDayDiv(prevDate, true);
    grid.appendChild(dayDiv);
  }

  // Jours du mois courant
  for (var d = 1; d <= lastDay.getDate(); d++) {
    var date = new Date(year, month, d);
    var dayDiv = createDayDiv(date, false);
    grid.appendChild(dayDiv);
  }

  // Compléter la grille
  var totalCells = startDay + lastDay.getDate();
  var remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (var i = 1; i <= remainingCells; i++) {
    var nextDate = new Date(year, month + 1, i);
    var dayDiv = createDayDiv(nextDate, true);
    grid.appendChild(dayDiv);
  }
}

function createDayDiv(date, otherMonth) {
  var today = new Date();
  var dayDiv = document.createElement('div');
  dayDiv.className = 'calendar-day';

  if (otherMonth) dayDiv.classList.add('other-month');
  if (date.toDateString() === today.toDateString()) dayDiv.classList.add('today');

  // Numéro du jour
  var dayNumber = document.createElement('div');
  dayNumber.className = 'calendar-day-number';
  dayNumber.textContent = date.getDate();
  dayDiv.appendChild(dayNumber);

  // Trouver les entretiens de ce jour
  var dayInterviews = allInterviews.filter(function(i) {
    if (!i.interview_date) return false;
    var iDate = new Date(i.interview_date);
    return iDate.getDate() === date.getDate() &&
           iDate.getMonth() === date.getMonth() &&
           iDate.getFullYear() === date.getFullYear();
  });

  if (dayInterviews.length > 0) {
    dayDiv.classList.add('has-interview');
    dayInterviews.forEach(function(interview) {
      var event = document.createElement('div');
      var typeClass = interview.interview_type === 'video' ? 'video' :
                      interview.interview_type === 'phone' ? 'phone' :
                      interview.interview_type === 'onsite' ? 'onsite' : '';
      event.className = 'calendar-event ' + typeClass;

      var iDate = new Date(interview.interview_date);
      var timeStr = iDate.getHours().toString().padStart(2,'0') + ':' + iDate.getMinutes().toString().padStart(2,'0');
      event.textContent = timeStr + ' - ' + interview.name;
      event.title = interview.name + ' - ' + interview.job_title;

      event.onclick = function(e) {
        e.stopPropagation();
        showInterviewDetail(interview);
      };
      dayDiv.appendChild(event);
    });
  }

  return dayDiv;
}

function showInterviewDetail(interview) {
  var iDate = new Date(interview.interview_date);
  var dateStr = iDate.toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  var timeStr = iDate.getHours().toString().padStart(2,'0') + ':' + iDate.getMinutes().toString().padStart(2,'0');

  var typeText = interview.interview_type === 'video' ? '🎥 Visioconférence' :
                 interview.interview_type === 'phone' ? '📞 Téléphone' :
                 interview.interview_type === 'onsite' ? '🏢 Sur site' : '📅 Entretien';

  var statusColor = interview.status === 'scheduled' ? '#059669' : interview.status === 'completed' ? '#003d7a' : '#dc2626';

  document.getElementById('interview-detail-content').innerHTML =
    '<div style="display:flex; flex-direction:column; gap:12px;">' +
    '<div style="display:flex; gap:10px; align-items:center;">' +
    '<i class="fas fa-user" style="color:#003d7a; width:16px;"></i>' +
    '<div><strong>' + interview.name + '</strong><br><small style="color:#6b7280;">' + interview.email + '</small></div>' +
    '</div>' +
    '<div style="display:flex; gap:10px; align-items:center;">' +
    '<i class="fas fa-briefcase" style="color:#003d7a; width:16px;"></i>' +
    '<span>' + interview.job_title + '</span>' +
    '</div>' +
    '<div style="display:flex; gap:10px; align-items:center;">' +
    '<i class="fas fa-calendar" style="color:#003d7a; width:16px;"></i>' +
    '<span>' + dateStr + ' à ' + timeStr + '</span>' +
    '</div>' +
    '<div style="display:flex; gap:10px; align-items:center;">' +
    '<i class="fas fa-video" style="color:#003d7a; width:16px;"></i>' +
    '<span>' + typeText + '</span>' +
    '</div>' +
    '<div style="display:flex; gap:10px; align-items:center;">' +
    '<i class="fas fa-circle" style="color:' + statusColor + '; width:16px; font-size:10px;"></i>' +
    '<span style="color:' + statusColor + '; font-weight:600;">' + interview.status + '</span>' +
    '</div>' +
    (interview.notes ? '<div style="background:#f8f9fa; padding:10px; border-radius:6px; font-size:13px; color:#374151;"><i class="fas fa-sticky-note" style="color:#d97706;"></i> ' + interview.notes + '</div>' : '') +
    '</div>';

  document.getElementById('interview-detail-overlay').style.display = 'block';
  document.getElementById('interview-detail-popup').style.display = 'block';
}

function closeInterviewDetail() {
  document.getElementById('interview-detail-overlay').style.display = 'none';
  document.getElementById('interview-detail-popup').style.display = 'none';
}

function prevMonth() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
}

// Charger les entretiens au démarrage
loadInterviews();

// ==========================================
// COMPARATEUR DE CANDIDATS
// ==========================================

var COMPARE_URL = 'https://vmi3051438.contaboserver.net/webhook/api/compare-candidates';
var selectedCandidates = [];

function updateCompareBtn() {
  var btn = document.getElementById('compare-btn');
  var count = document.getElementById('compare-count');
  count.textContent = selectedCandidates.length;
  if (selectedCandidates.length >= 2) {
    btn.style.display = 'inline-block';
  } else {
    btn.style.display = 'none';
  }
}

function toggleCandidateSelect(candidateId, candidate, checkbox) {
  // Stopper la propagation pour ne pas ouvrir le modal
  event.stopPropagation();

  if (checkbox.checked) {
    if (selectedCandidates.length >= 4) {
      checkbox.checked = false;
      showToast('<i class="fas fa-exclamation-triangle"></i> Maximum 4 candidats comparables', 'error');
      return;
    }
    selectedCandidates.push({ id: candidateId, data: candidate });
  } else {
    selectedCandidates = selectedCandidates.filter(function(c) { return c.id !== candidateId; });
  }
  updateCompareBtn();
}

async function compareSelected() {
  if (selectedCandidates.length < 2) {
    showToast('<i class="fas fa-exclamation-triangle"></i> Sélectionnez au moins 2 candidats', 'error');
    return;
  }

  // Afficher le modal avec loading
  document.getElementById('compare-modal-overlay').style.display = 'block';
  document.getElementById('compare-modal').style.display = 'block';
  document.getElementById('compare-modal-content').innerHTML =
    '<div style="text-align:center; padding:40px;">' +
    '<i class="fas fa-spinner fa-spin" style="font-size:40px; color:#7c3aed;"></i>' +
    '<p style="margin-top:16px; color:#6b7280; font-size:15px;">L\'IA analyse et compare les candidats...<br><small>Cela peut prendre 30 secondes</small></p>' +
    '</div>';

  try {
    var ids = selectedCandidates.map(function(c) { return c.id; });
    var res = await fetch(COMPARE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_ids: ids })
    });

    var rawData = await res.json();
    var data = Array.isArray(rawData) ? rawData[0] : rawData;

    if (data.success) {
      renderCompareModal(data);
    } else {
      document.getElementById('compare-modal-content').innerHTML =
        '<p style="color:#dc2626; text-align:center;">' + (data.message || 'Erreur') + '</p>';
    }
  } catch(e) {
    document.getElementById('compare-modal-content').innerHTML =
      '<p style="color:#dc2626; text-align:center;">Erreur de connexion</p>';
  }
}

function renderCompareModal(data) {
  var candidates = data.candidates;
  var html = '';

  // Tableau comparatif scores
  html += '<table class="compare-table"><thead><tr>' +
    '<th>Critère</th>';
  candidates.forEach(function(c) {
    var scoreColor = c.overall_score >= 70 ? '#059669' : c.overall_score >= 40 ? '#d97706' : '#dc2626';
    html += '<th>' + c.first_name + ' ' + c.last_name +
      '<br><span style="font-size:18px; color:' + scoreColor + ';">' + (c.overall_score || 0) + '/100</span></th>';
  });
  html += '</tr></thead><tbody>';

  // Lignes scores
  var rows = [
    { label: '🎯 Compétences', key: 'skills_score' },
    { label: '💼 Expérience', key: 'experience_score' },
    { label: '🎓 Formation', key: 'education_score' },
    { label: '💡 Motivation', key: 'motivation_score' },
    { label: '📅 Années exp.', key: 'years_experience' }
  ];

  rows.forEach(function(row) {
    html += '<tr><td><strong>' + row.label + '</strong></td>';
    candidates.forEach(function(c) {
      var val = parseInt(c[row.key]) || 0;
      var isScore = row.key !== 'years_experience';
      var color = val >= 70 ? '#059669' : val >= 40 ? '#d97706' : '#dc2626';
      if (isScore) {
        html += '<td>' + val + '/100' +
          '<div class="compare-score-bar"><div class="compare-score-fill" style="width:' + val + '%; background:' + color + ';"></div></div>' +
          '</td>';
      } else {
        html += '<td>' + val + ' ans</td>';
      }
    });
    html += '</tr>';
  });

  // Points forts
  html += '<tr><td><strong>✅ Points forts</strong></td>';
  candidates.forEach(function(c) {
    var strengths = '';
    try {
      var arr = JSON.parse(c.strengths || '[]');
      strengths = arr.map(function(s) { return '• ' + s; }).join('<br>');
    } catch(e) { strengths = c.strengths || '-'; }
    html += '<td style="color:#059669;">' + strengths + '</td>';
  });
  html += '</tr>';

  // Points faibles
  html += '<tr><td><strong>❌ Points faibles</strong></td>';
  candidates.forEach(function(c) {
    var weaknesses = '';
    try {
      var arr = JSON.parse(c.weaknesses || '[]');
      weaknesses = arr.map(function(s) { return '• ' + s; }).join('<br>');
    } catch(e) { weaknesses = c.weaknesses || '-'; }
    html += '<td style="color:#dc2626;">' + weaknesses + '</td>';
  });
  html += '</tr>';

  html += '</tbody></table>';

  // Analyse IA
  if (data.comparison) {
    html += '<div style="background:#f8f9fa; border-radius:10px; padding:16px; margin-bottom:16px;">' +
      '<h4 style="color:#1f2937; margin-bottom:8px;"><i class="fas fa-robot" style="color:#7c3aed;"></i> Analyse comparative IA</h4>' +
      '<p style="font-size:13px; line-height:1.7; color:#374151;">' + data.comparison + '</p>' +
      '</div>';
  }

  // Recommandation finale
  if (data.recommendation) {
    html += '<div class="compare-recommendation">' +
      '<h4><i class="fas fa-trophy" style="color:#d97706;"></i> Recommandation finale</h4>' +
      '<p>' + data.recommendation + '</p>' +
      '</div>';
  }

  document.getElementById('compare-modal-content').innerHTML = html;
}

function closeCompareModal() {
  document.getElementById('compare-modal-overlay').style.display = 'none';
  document.getElementById('compare-modal').style.display = 'none';
}

function updateJobsTable(jobs) {
  var tbody = document.getElementById("jobs-table");
  tbody.innerHTML = "";

  if (!jobs || jobs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center; color:#888; padding:30px;">Aucune offre d\'emploi</td></tr>';
    return;
  }

  jobs.forEach(function(j) {
    var scoreColor =
      j.avg_score >= 70 ? "#059669" : j.avg_score >= 40 ? "#d97706" : "#dc2626";
    var statusDot =
      j.status === "active" ? "active" : j.status === "closed" ? "closed" : "draft";

    var tr = document.createElement("tr");
    tr.className = "job-row-clickable";
    tr.onclick = function() { openEditJobModal(j.id); };
    tr.innerHTML =
      "<td>" +
      "<strong>" + (j.title || "Sans titre") + "</strong>" +
      '<br><small><span class="status-dot ' + statusDot + '"></span>' + (j.status || "active") + "</small>" +
      "</td>" +
      "<td>" + (j.total_candidates || 0) + "</td>" +
      '<td style="color:#059669; font-weight:bold;">' + (j.shortlisted || 0) + "</td>" +
      '<td style="color:#dc2626;">' + (j.rejected || 0) + "</td>" +
      '<td><span style="color:' + scoreColor + '; font-weight:600;">' +
      (j.avg_score ? j.avg_score + "/100" : "-") + "</span></td>" +
      '<td><button class="btn-edit-job" onclick="event.stopPropagation(); openEditJobModal(' + j.id + ')">' +
      '<i class="fas fa-pen"></i> Modifier</button></td>';
    tbody.appendChild(tr);
  });
}

// Mesurer le temps de chargement du dashboard
async function loadDashboard() {
  console.time('⏱️ Chargement Dashboard');
  
  const response = await fetch('http://172.18.0.3:5678/webhook/api/dashboard');
  const data = await response.json();
  
  console.timeEnd('⏱️ Chargement Dashboard');
  // Affiche: "⏱️ Chargement Dashboard: 324ms"
}

// Mesurer l'analyse IA
async function analyzeCV() {
  console.time('🤖 Analyse IA');
  
  const response = await fetch('http://172.18.0.3:5678/webhook/analyse-cv', {
    method: 'POST',
    body: JSON.stringify({ candidate_id: 1 })
  });
  
  console.timeEnd('🤖 Analyse IA');
  // Affiche: "🤖 Analyse IA: 8523ms"
}