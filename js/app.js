  let currentPage = 1;
  const limit = 20;
  let isAdminMode = false;
  let currentData = [];
  let myChart = null;

  function showSection(sectionId) {
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
          <div class="text-danger fw-bold mb-2">❌ เกิดข้อผิดพลาดในการดึงข้อมูล</div>
          <div class="small text-muted mb-3">${error.message}</div>
          <button class="btn btn-outline-danger btn-sm rounded-pill" onclick="loadDashboardData()">ลองใหม่อีกครั้ง</button>
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
    document.getElementById('stat-analysis').innerHTML = data.analysisText;

    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (myChart != null) { myChart.destroy(); }
    myChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(data.categories),
        datasets: [{
          data: Object.values(data.categories),
          backgroundColor: ['#ff6fa3', '#667eea', '#38a169', '#f6ad55', '#4fd1c5', '#a0aec0'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { font: { family: 'Prompt' } } } },
        cutout: '65%'
      }
    });
  }

  function escapeHtml(unsafe) {
    if(!unsafe) return "";
    return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function loadData(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-brand" role="status"></div><br>กำลังโหลดข้อมูล...</td></tr>';
    
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
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">📭 ไม่พบข้อมูลวารสาร</td></tr>';
    } else {
      currentData.forEach((row, index) => {
        let statusClass = "status-รอ";
        let statusIcon = "⏳";
        if (row['สถานะ'] === "ดำเนินการเรียบร้อย") { statusClass = "status-สำเร็จ"; statusIcon = "✅"; }
        else if (row['สถานะ'] === "ไม่สามารถดำเนินการได้") { statusClass = "status-ไม่สามารถ"; statusIcon = "❌"; }

        const cat = row['หมวดหมู่'] === 'อื่นๆ' ? `อื่นๆ (${escapeHtml(row['หมวดหมู่_อื่นๆ'])})` : escapeHtml(row['หมวดหมู่']);

        let tr = `
          <tr>
            <td data-label="📌 ทะเบียน :" class="fw-bold text-brand">${escapeHtml(row['เลขทะเบียน'])}</td>
            <td data-label="📄 หัวข้อเรื่อง :">
              <div>
                <div class="text-truncate fw-medium" style="max-width: 250px;" title="${escapeHtml(row['หัวข้อ'])}">${escapeHtml(row['หัวข้อ'])}</div>
                <div class="small text-muted mt-1">👤 ${escapeHtml(row['ชื่อผู้กรอก'])}</div>
              </div>
            </td>
            <td data-label="📁 หมวดหมู่ :"><span class="text-muted small">${cat}</span></td>
            <td data-label="🚦 สถานะ :"><span class="status-badge ${statusClass}">${statusIcon} ${escapeHtml(row['สถานะ'])}</span></td>
            <td data-label="📅 วันที่บันทึก :" class="small text-muted">${escapeHtml(row['วันที่บันทึก'].split(' ')[0])}</td>
            <td data-label="⚙️ จัดการ :">
              <button class="btn btn-sm btn-light border rounded-circle shadow-sm" style="width: 38px; height: 38px;" title="ดูรายละเอียด" onclick="viewRecord(${index})">🔍</button>
              ${isAdminMode ? `<button class="btn btn-sm btn-light border rounded-circle shadow-sm ms-2" style="width: 38px; height: 38px;" title="แก้ไข" onclick="openEditModal(${index})">✏️</button>` : ''}
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

    let btnPrev = `<button class="btn btn-outline-secondary btn-sm rounded-pill px-3" ${currentPage === 1 ? 'disabled' : ''} onclick="loadData(${currentPage - 1})">« ก่อนหน้า</button>`;
    let btnNext = `<button class="btn btn-outline-secondary btn-sm rounded-pill px-3 ms-1" ${currentPage === totalPages ? 'disabled' : ''} onclick="loadData(${currentPage + 1})">ถัดไป »</button>`;
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
      btn.innerHTML = "💾 บันทึกข้อมูล";
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }).withSuccessHandler(res => {
      btn.disabled = false;
      btn.innerHTML = "💾 บันทึกข้อมูล";
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
    let html = `
      <table class="table table-bordered mb-0">
        <tbody>
          <tr><th width="30%" class="bg-light">เลขทะเบียน</th><td class="text-brand fw-bold">${escapeHtml(row['เลขทะเบียน'])}</td></tr>
          <tr><th class="bg-light">สถานะ</th><td><b>${escapeHtml(row['สถานะ'])}</b></td></tr>
          <tr><th class="bg-light">หัวข้อ</th><td class="fw-medium">${escapeHtml(row['หัวข้อ'])}</td></tr>
          <tr><th class="bg-light">เนื้อหา</th><td style="white-space: pre-wrap;">${escapeHtml(row['เนื้อหา'])}</td></tr>
          <tr><th class="bg-light">ผู้กรอกข้อมูล</th><td>${escapeHtml(row['ชื่อผู้กรอก'])}</td></tr>
          <tr><th class="bg-light">หมวดหมู่</th><td>${escapeHtml(row['หมวดหมู่'])} ${row['หมวดหมู่_อื่นๆ'] ? `(${escapeHtml(row['หมวดหมู่_อื่นๆ'])})` : ''}</td></tr>
          <tr><th class="bg-light">วันที่บันทึก</th><td>${escapeHtml(row['วันที่บันทึก'])}</td></tr>
          ${row['หมายเหตุ'] ? `<tr><th class="bg-light text-danger">หมายเหตุ</th><td class="text-danger fw-bold">${escapeHtml(row['หมายเหตุ'])}</td></tr>` : ''}
        </tbody>
      </table>
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
      document.getElementById('btn-tab-data').className = "btn btn-light rounded-pill px-3 shadow-sm fw-bold";
      document.getElementById('btn-tab-settings').className = "btn btn-outline-light rounded-pill px-3 fw-bold";
    } else if (tab === 'settings') {
      document.getElementById('public-dashboard').style.display = 'none';
      document.getElementById('admin-settings-container').style.display = 'block';
      document.getElementById('btn-tab-data').className = "btn btn-outline-light rounded-pill px-3 fw-bold";
      document.getElementById('btn-tab-settings').className = "btn btn-light rounded-pill px-3 shadow-sm fw-bold";
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
      btn.innerText = "💾 บันทึกการตั้งค่า";
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
      btn.innerText = "💾 บันทึกการตั้งค่า";
      if (res.success) {
        Swal.fire('สำเร็จ', res.message, 'success');
      } else {
        Swal.fire('ข้อผิดพลาด', res.message, 'error');
      }
    }).saveAdminSettings(data);
  }

  window.onload = () => {
    showSection('home-dashboard');
  };
