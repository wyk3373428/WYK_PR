  let currentPage = 1;
  const limit = 20;
  let isAdminMode = false;
  let currentData = [];
  let myChart = null;

  // ค่าเริ่มต้นของกล่องแจ้งเตือนให้เข้ากับธีม
  window.Swal = Swal.mixin({
    confirmButtonColor: '#c8326f',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'ตกลง'
  });

  const SAVE_ICON = '<i class="bi bi-check2"></i>';

  function setActiveNav(sectionId) {
    const navKey = sectionId === 'admin-dashboard' || sectionId === 'admin-login' ? '' : sectionId;
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === navKey));
    const nav = document.getElementById('navbarNav');
    if (nav && nav.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(nav).hide();
  }

  function showSection(sectionId) {
    setActiveNav(sectionId);
    window.scrollTo({ top: 0 });
    document.querySelectorAll('.app-section').forEach(el => el.style.display = 'none');
    
    if (document.getElementById(sectionId)) {
      document.getElementById(sectionId).style.display = 'block';
    }

    if (sectionId === 'home-dashboard') {
      isAdminMode = false;
      loadDashboardData();
    } else if (sectionId === 'public-dashboard') {
      isAdminMode = false;
      const pubHeader = document.getElementById('dashboard-header');
      if (pubHeader) pubHeader.style.display = 'flex';
      loadData();
    } else if (sectionId === 'form-section') {
      fetchRegNumber();
      document.getElementById('record-form').reset();
      toggleOtherCategory('f-category', 'f-category-other-div');
    } else if (sectionId === 'admin-dashboard') {
      isAdminMode = true;
      document.getElementById('public-dashboard').style.display = 'block';
      const pubHeader = document.getElementById('dashboard-header');
      if (pubHeader) pubHeader.style.display = 'none';
      loadData();
      toggleAdminTab('data');
    }
  }

  function loadDashboardData() {
    document.getElementById('dash-loading').style.display = 'block';
    document.getElementById('dash-content').style.display = 'none';
    
    let year = document.getElementById('dash-year-filter').value;
    
    google.script.run
      .withSuccessHandler(renderDashboard)
      .withFailureHandler(error => {
        document.getElementById('dash-loading').innerHTML = `
          <i class="bi bi-exclamation-triangle fs-2 text-danger d-block mb-2"></i>
          <div class="fw-semibold mb-1">ดึงข้อมูลไม่สำเร็จ</div>
          <div class="small text-muted mb-3">${escapeHtml(error.message)}</div>
          <button class="btn btn-outline-secondary btn-sm" onclick="loadDashboardData()"><i class="bi bi-arrow-clockwise"></i>ลองใหม่</button>
        `;
      })
      .getDashboardStats(year);
  }

  function renderDashboard(data) {
    document.getElementById('dash-loading').style.display = 'none';
    document.getElementById('dash-content').style.display = 'block';

    let yearSelect = document.getElementById('dash-year-filter');
    if (yearSelect.options.length <= 1 && data.years.length > 0) {
      let currentVal = yearSelect.value;
      yearSelect.innerHTML = '<option value="">ทั้งหมด</option>';
      data.years.forEach(y => {
        yearSelect.innerHTML += `<option value="${y}" ${y === currentVal ? 'selected' : ''}>ปี ${y}</option>`;
      });
    }

    document.getElementById('stat-total').innerText = data.total;
    document.getElementById('stat-success').innerText = data.status['ดำเนินการเรียบร้อย'] || 0;
    document.getElementById('stat-pending').innerText = data.status['รอดำเนินการ'] || 0;
    document.getElementById('stat-failed').innerText = data.status['ไม่สามารถดำเนินการได้'] || 0;
    document.getElementById('stat-analysis').innerHTML = data.analysisText;

    // กราฟแท่งแนวนอน เรียงจากมากไปน้อย
    const entries = Object.entries(data.categories).sort((a, b) => b[1] - a[1]);
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (myChart != null) { myChart.destroy(); }
    myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entries.map(e => e[0].replace('กลุ่มบริหารงาน', '')),
        datasets: [{
          label: 'จำนวนวารสาร',
          data: entries.map(e => e[1]),
          backgroundColor: '#c8326f',
          hoverBackgroundColor: '#a9275c',
          borderRadius: 4,
          barThickness: 22
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: 'IBM Plex Sans Thai' },
            bodyFont: { family: 'IBM Plex Sans Thai' },
            callbacks: { label: c => ` ${c.parsed.x} รายการ` }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#64748b', font: { family: 'IBM Plex Sans Thai' } },
            grid: { color: '#f1f5f9' },
            border: { display: false }
          },
          y: {
            ticks: { color: '#334155', font: { family: 'IBM Plex Sans Thai', size: 13 } },
            grid: { display: false },
            border: { color: '#e5e7eb' }
          }
        }
      }
    });
  }

  function statusBadge(status) {
    let cls = 'status-รอ', icon = 'bi-hourglass-split';
    if (status === 'ดำเนินการเรียบร้อย') { cls = 'status-สำเร็จ'; icon = 'bi-check-circle'; }
    else if (status === 'ไม่สามารถดำเนินการได้') { cls = 'status-ไม่สามารถ'; icon = 'bi-x-circle'; }
    return `<span class="status-badge ${cls}"><i class="bi ${icon}"></i>${escapeHtml(status)}</span>`;
  }

  function escapeHtml(unsafe) {
    if(!unsafe) return "";
    return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function loadData(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="spinner-border text-brand mb-2" role="status"></div><div>กำลังโหลดข้อมูล...</div></td></tr>';
    
    const params = {
      page: currentPage,
      limit: limit,
      search: document.getElementById('filter-search').value,
      status: document.getElementById('filter-status').value,
      category: document.getElementById('filter-category').value
    };

    google.script.run.withSuccessHandler(renderTable).getRecords(params);
  }

  function renderTable(response) {
    const tbody = document.getElementById('data-table-body');
    currentData = response.data;
    tbody.innerHTML = '';

    if (currentData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="bi bi-inbox"></i>ไม่พบข้อมูลวารสาร</td></tr>';
    } else {
      currentData.forEach((row, index) => {
        const cat = row['หมวดหมู่'] === 'อื่นๆ' ? `อื่นๆ (${escapeHtml(row['หมวดหมู่_อื่นๆ'])})` : escapeHtml(row['หมวดหมู่']);

        let tr = `
          <tr>
            <td data-label="เลขทะเบียน" class="cell-reg">${escapeHtml(row['เลขทะเบียน'])}</td>
            <td data-label="หัวข้อเรื่อง">
              <div>
                <div class="cell-topic text-truncate" title="${escapeHtml(row['หัวข้อ'])}">${escapeHtml(row['หัวข้อ'])}</div>
                <div class="cell-sub"><i class="bi bi-person me-1"></i>${escapeHtml(row['ชื่อผู้กรอก'])}</div>
              </div>
            </td>
            <td data-label="กลุ่มงาน"><span class="small">${cat}</span></td>
            <td data-label="สถานะ">${statusBadge(row['สถานะ'])}</td>
            <td data-label="วันที่บันทึก" class="cell-date">${escapeHtml((row['วันที่บันทึก'] || '').split(' ')[0])}</td>
            <td data-label="จัดการ" class="text-end">
              <div class="d-inline-flex gap-1">
                <button class="btn btn-icon" title="ดูรายละเอียด" aria-label="ดูรายละเอียด" onclick="viewRecord(${index})"><i class="bi bi-eye"></i></button>
                ${isAdminMode ? `<button class="btn btn-icon" title="แก้ไข" aria-label="แก้ไข" onclick="openEditModal(${index})"><i class="bi bi-pencil"></i></button>` : ''}
              </div>
            </td>
          </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', tr);
      });
    }
    renderPagination(response.totalPages);
    document.getElementById('pagination-info').innerText = `หน้า ${response.currentPage} จาก ${response.totalPages} (รวม ${response.totalRecords} รายการ)`;
  }

  function renderPagination(totalPages) {
    const pCtrl = document.getElementById('pagination-controls');
    pCtrl.innerHTML = '';
    if (totalPages <= 1) return;

    let btnPrev = `<button class="btn btn-outline-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="loadData(${currentPage - 1})"><i class="bi bi-chevron-left"></i>ก่อนหน้า</button>`;
    let btnNext = `<button class="btn btn-outline-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="loadData(${currentPage + 1})">ถัดไป<i class="bi bi-chevron-right ms-2"></i></button>`;
    pCtrl.innerHTML = btnPrev + btnNext;
  }

  function fetchRegNumber() {
    document.getElementById('f-regNo').value = "กำลังดึงเลข...";
    google.script.run.withSuccessHandler(num => {
      document.getElementById('f-regNo').value = num;
    }).generateRegistrationNumber();
  }

  function toggleOtherCategory(selectId, otherDivId) {
    const sel = document.getElementById(selectId).value;
    const div = document.getElementById(otherDivId);
    if (sel === 'อื่นๆ') {
      div.style.display = 'block';
      document.getElementById(otherDivId.replace('-div', '')).required = true;
    } else {
      div.style.display = 'none';
      document.getElementById(otherDivId.replace('-div', '')).required = false;
      document.getElementById(otherDivId.replace('-div', '')).value = "";
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerHTML = "กำลังบันทึก...";

    const data = {
      regNo: document.getElementById('f-regNo').value,
      topic: document.getElementById('f-topic').value,
      content: document.getElementById('f-content').value,
      author: document.getElementById('f-author').value,
      category: document.getElementById('f-category').value,
      categoryOther: document.getElementById('f-category-other').value
    };

    google.script.run.withFailureHandler(err => {
      btn.disabled = false;
      btn.innerHTML = SAVE_ICON + "บันทึกข้อมูล";
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }).withSuccessHandler(res => {
      btn.disabled = false;
      btn.innerHTML = SAVE_ICON + "บันทึกข้อมูล";
      if (res.success) {
        Swal.fire('สำเร็จ', `บันทึกข้อมูลเรียบร้อย<br>เลขทะเบียน: <b>${res.regNo}</b>`, 'success').then(() => {
          showSection('public-dashboard');
        });
      } else {
        Swal.fire('ข้อผิดพลาด', res.message, 'error');
      }
    }).saveRecord(data);
  }

  function viewRecord(index) {
    const row = currentData[index];
    const item = (label, value) => `<div class="row"><dt class="col-sm-3">${label}</dt><dd class="col-sm-9">${value}</dd></div>`;
    let html = `
      <dl class="detail-list">
        ${item('เลขทะเบียน', `<span class="cell-reg">${escapeHtml(row['เลขทะเบียน'])}</span>`)}
        ${item('สถานะ', statusBadge(row['สถานะ']))}
        ${item('หัวข้อ', `<span class="fw-semibold">${escapeHtml(row['หัวข้อ'])}</span>`)}
        ${item('เนื้อหา', `<div style="white-space: pre-wrap;">${escapeHtml(row['เนื้อหา'])}</div>`)}
        ${item('ผู้กรอกข้อมูล', escapeHtml(row['ชื่อผู้กรอก']))}
        ${item('กลุ่มงาน', `${escapeHtml(row['หมวดหมู่'])} ${row['หมวดหมู่_อื่นๆ'] ? `(${escapeHtml(row['หมวดหมู่_อื่นๆ'])})` : ''}`)}
        ${item('วันที่บันทึก', escapeHtml(row['วันที่บันทึก']))}
      </dl>
      ${row['หมายเหตุ'] ? `<div class="detail-note"><i class="bi bi-info-circle me-2"></i><b>หมายเหตุ:</b> ${escapeHtml(row['หมายเหตุ'])}</div>` : ''}
    `;
    document.getElementById('view-title').innerText = "รายละเอียดวารสาร";
    document.getElementById('view-body').innerHTML = html;
    new bootstrap.Modal(document.getElementById('viewModal')).show();
  }

  function checkAdminAccess() {
    if (isAdminMode) showSection('admin-dashboard');
    else showSection('admin-login');
  }

  function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    const user = document.getElementById('login-id').value;
    const pass = document.getElementById('login-pass').value;

    google.script.run.withFailureHandler(err => {
      btn.disabled = false;
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }).withSuccessHandler(res => {
      btn.disabled = false;
      if (res.success) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'เข้าสู่ระบบสำเร็จ', showConfirmButton: false, timer: 1500 });
        document.getElementById('login-id').value = '';
        document.getElementById('login-pass').value = '';
        showSection('admin-dashboard');
      } else {
        Swal.fire('เข้าสู่ระบบไม่สำเร็จ', res.message, 'error');
      }
    }).checkAdminLogin(user, pass);
  }

  function logoutAdmin() {
    isAdminMode = false;
    if (window.clearAdminToken) clearAdminToken();
    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'ออกจากระบบแล้ว', showConfirmButton: false, timer: 1500 });
    showSection('home-dashboard');
  }

  let editModalInstance;
  function openEditModal(index) {
    const row = currentData[index];
    document.getElementById('e-id').value = row['ID'];
    document.getElementById('e-regNo').value = row['เลขทะเบียน'];
    document.getElementById('e-status').value = row['สถานะ'];
    document.getElementById('e-topic').value = row['หัวข้อ'];
    document.getElementById('e-content').value = row['เนื้อหา'];
    document.getElementById('e-author').value = row['ชื่อผู้กรอก'];
    document.getElementById('e-category').value = row['หมวดหมู่'];
    
    toggleOtherCategory('e-category', 'e-category-other-div');
    if(row['หมวดหมู่'] === 'อื่นๆ') {
      document.getElementById('e-category-other').value = row['หมวดหมู่_อื่นๆ'];
    }
    document.getElementById('e-note').value = row['หมายเหตุ'];

    if(!editModalInstance) editModalInstance = new bootstrap.Modal(document.getElementById('editModal'));
    editModalInstance.show();
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-edit');
    btn.disabled = true;
    btn.innerText = "กำลังบันทึก...";

    const id = document.getElementById('e-id').value;
    const data = {
      regNo: document.getElementById('e-regNo').value,
      status: document.getElementById('e-status').value,
      topic: document.getElementById('e-topic').value,
      content: document.getElementById('e-content').value,
      author: document.getElementById('e-author').value,
      category: document.getElementById('e-category').value,
      categoryOther: document.getElementById('e-category-other').value,
      note: document.getElementById('e-note').value
    };

    google.script.run.withFailureHandler(err => {
      btn.disabled = false;
      btn.innerText = "บันทึกการแก้ไข";
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }).withSuccessHandler(res => {
      btn.disabled = false;
      btn.innerText = "บันทึกการแก้ไข";
      if (res.success) {
        editModalInstance.hide();
        Swal.fire('สำเร็จ', res.message, 'success');
        loadData(currentPage); 
        loadDashboardData();
      } else {
        Swal.fire('ข้อผิดพลาด', res.message, 'error');
      }
    }).updateRecord(id, data);
  }

  // Admin Settings Logic
  function toggleAdminTab(tab) {
    if (tab === 'data') {
      document.getElementById('public-dashboard').style.display = 'block';
      document.getElementById('admin-settings-container').style.display = 'none';
      document.getElementById('btn-tab-data').className = "btn btn-admin-tab active";
      document.getElementById('btn-tab-settings').className = "btn btn-admin-tab";
    } else if (tab === 'settings') {
      document.getElementById('public-dashboard').style.display = 'none';
      document.getElementById('admin-settings-container').style.display = 'block';
      document.getElementById('btn-tab-data').className = "btn btn-admin-tab";
      document.getElementById('btn-tab-settings').className = "btn btn-admin-tab active";
      loadAdminSettings();
    }
  }

  function toggleFormDisable() {
    const isEnabled = document.getElementById('set-notify-enable').checked;
    document.getElementById('setting-details-group').style.opacity = isEnabled ? '1' : '0.4';
    document.getElementById('setting-details-group').style.pointerEvents = isEnabled ? 'auto' : 'none';
  }

  function toggleDaySelection() {
    const isSpecific = document.getElementById('day-specific').checked;
    document.getElementById('specific-days-container').style.display = isSpecific ? 'block' : 'none';
  }

  function loadAdminSettings() {
    const btn = document.getElementById('btn-save-settings');
    btn.disabled = true;
    btn.innerText = "กำลังดึงข้อมูล...";
    
    google.script.run.withSuccessHandler(res => {
      document.getElementById('set-notify-enable').checked = res.notifyEnabled;
      document.getElementById('set-notify-hour').value = res.notifyHour;
      
      if (res.notifyDaysType === 'specific') {
        document.getElementById('day-specific').checked = true;
      } else {
        document.getElementById('day-daily').checked = true;
      }
      toggleDaySelection();
      toggleFormDisable();
      
      document.querySelectorAll('.day-checkbox').forEach(cb => cb.checked = false);
      const savedDays = res.notifyDaysList ? JSON.parse(res.notifyDaysList) : [];
      savedDays.forEach(day => {
        const cb = document.querySelector(`.day-checkbox[value="${day}"]`);
        if (cb) cb.checked = true;
      });

      btn.disabled = false;
      btn.innerHTML = SAVE_ICON + "บันทึกการตั้งค่า";
    }).getAdminSettings();
  }

  function handleSaveSettings(e) {
    e.preventDefault();
    
    const notifyDaysType = document.querySelector('input[name="notifyDayType"]:checked').value;
    const notifyDaysList = [];
    if (notifyDaysType === 'specific') {
      document.querySelectorAll('.day-checkbox:checked').forEach(cb => { notifyDaysList.push(cb.value); });
      if (notifyDaysList.length === 0) {
        Swal.fire('แจ้งเตือน', 'กรุณาติ๊กเลือกวันอย่างน้อย 1 วัน', 'warning');
        return;
      }
    }

    const btn = document.getElementById('btn-save-settings');
    btn.disabled = true;
    btn.innerText = "กำลังอัปเดตระบบ...";
    
    const data = {
      notifyEnabled: document.getElementById('set-notify-enable').checked,
      notifyHour: document.getElementById('set-notify-hour').value,
      notifyDaysType: notifyDaysType,
      notifyDaysList: notifyDaysList
    };
    
    google.script.run.withSuccessHandler(res => {
      btn.disabled = false;
      btn.innerHTML = SAVE_ICON + "บันทึกการตั้งค่า";
      if (res.success) {
        Swal.fire('สำเร็จ', res.message, 'success');
      } else {
        Swal.fire('ข้อผิดพลาด', res.message, 'error');
      }
    }).saveAdminSettings(data);
  }

  window.onload = () => {
    const fy = document.getElementById("footer-year");
    if (fy) fy.textContent = new Date().getFullYear() + 543;
    showSection('home-dashboard');
  };
