const STORAGE_KEY = 'vimarshana_gonu_records_v2';
let records = [];
let currentFilter = 'active';
let pendingDeleteId = null;

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    records = raw ? JSON.parse(raw) : [];
  } catch (e) {
    records = [];
  }
}

function saveAll() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  if (typeof pushRecordsToCloud === 'function') pushRecordsToCloud(false);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(dateStr);
  target.setHours(0,0,0,0);
  return Math.round((target - today) / (1000*60*60*24));
}

function maskDateInput(input) {
  let digits = input.value.replace(/\D/g, '').slice(0, 8);
  let out = '';
  if (digits.length > 0) out += digits.slice(0, 4);
  if (digits.length >= 5) out += '-' + digits.slice(4, 6);
  if (digits.length >= 7) out += '-' + digits.slice(6, 8);
  input.value = out;
}

// සියලුම ගොනු "ගොනුව ලද දිනය" (receivedDate) අනුව sort කර, ඒ අනුව
// අනු අංකය (serial) 1, 2, 3... ලෙස ස්වයංක්‍රීයව නැවත සකසන function එක.
// දිනය ඇතුළත් නොකළ ගොනු ලැයිස්තුවේ අවසානයට යනු ලැබේ.
function serialSortCompare(a, b) {
  const da = a.receivedDate || '';
  const db = b.receivedDate || '';
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da.localeCompare(db);
}

function recomputeSerials() {
  records.sort(serialSortCompare);
  records.forEach((r, idx) => { r.serial = idx + 1; });
}

// Form එකේ "ගොනුව ලද දිනය" type කරන විටම, එම දිනයට අනුව මෙම
// ගොනුවට ලැබෙන අනු අංකය කුමක්ද කියා live ලෙස පෙන්වයි (record එක save
// කරන තෙක් සැබෑ දත්තවලට වෙනසක් සිදු නොකරයි).
function previewSerial() {
  const dateVal = document.getElementById('receivedDate').value;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const validDate = datePattern.test(dateVal) ? dateVal : '';
  const editId = document.getElementById('editId').value;
  const temp = records.filter(r => r.id !== editId);
  const dummy = { receivedDate: validDate };
  temp.push(dummy);
  temp.sort(serialSortCompare);
  document.getElementById('serialNo').value = temp.indexOf(dummy) + 1;
}

function setComplaintType(value) {
  const sel = document.getElementById('complaintType');
  sel.value = value;
  sel.classList.remove('field-missing');
}

function toggleStageField() {
  const status = document.getElementById('statusField').value;
  const wrap = document.getElementById('stageFieldWrap');
  wrap.style.display = (status === 'completed') ? 'none' : '';
}

function resetForm() {
  document.getElementById('editId').value = '';
  previewSerial();
  document.getElementById('fileNo').value = '';
  setComplaintType('');
  document.getElementById('investigationType').value = 'preliminary';
  document.getElementById('description').value = '';
  document.getElementById('receivedDate').value = '';
  document.getElementById('hearingDate').value = '';
  document.getElementById('statusField').value = 'active';
  document.getElementById('stageField').value = 'not_started';
  document.getElementById('completedDate').value = '';
  document.getElementById('notesField').value = '';
  document.getElementById('formTitle').textContent = '➕ නව විමර්ශන ගොනුවක් ඇතුළත් කරන්න';
  toggleStageField();
}

function saveRecord() {
  const fileNo = document.getElementById('fileNo').value.trim();
  const complaintType = document.getElementById('complaintType').value;
  const investigationType = document.getElementById('investigationType').value;
  const description = document.getElementById('description').value.trim();
  const receivedDate = document.getElementById('receivedDate').value;
  const hearingDate = document.getElementById('hearingDate').value;
  const status = document.getElementById('statusField').value;
  const stage = document.getElementById('stageField').value;
  const completedDate = document.getElementById('completedDate').value;
  const notes = document.getElementById('notesField').value.trim();
  const editId = document.getElementById('editId').value;

  if (!fileNo || !complaintType || !description || !hearingDate) {
    if (!complaintType) {
      document.getElementById('complaintType').classList.add('field-missing');
    }
    alert('කරුණාකර තරු (*) ලකුණු කළ සියලුම තොරතුරු ඇතුළත් කරන්න (පැමිණිල්ල ලද ආකාරය ද තෝරන්න).');
    return;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(hearingDate) || (receivedDate && !datePattern.test(receivedDate)) || (completedDate && !datePattern.test(completedDate))) {
    alert('කරුණාකර දිනය YYYY-MM-DD (වර්ෂය-මාසය-දිනය) ආකාරයෙන් සම්පූර්ණයෙන් ඇතුළත් කරන්න.');
    return;
  }

  if (editId) {
    const rec = records.find(r => r.id === editId);
    if (rec) {
      rec.fileNo = fileNo;
      rec.complaintType = complaintType;
      rec.investigationType = investigationType;
      rec.description = description;
      rec.receivedDate = receivedDate;
      rec.hearingDate = hearingDate;
      rec.status = status;
      rec.stage = stage;
      rec.completedDate = completedDate;
      rec.notes = notes;
    }
  } else {
    records.push({
      id: 'r_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      fileNo, complaintType, investigationType, description, receivedDate, hearingDate, status, stage, completedDate, notes
    });
  }
  recomputeSerials();
  saveAll();
  resetForm();
  renderTable();
}

function editRecord(id) {
  const rec = records.find(r => r.id === id);
  if (!rec) return;
  document.getElementById('editId').value = rec.id;
  document.getElementById('serialNo').value = rec.serial;
  document.getElementById('fileNo').value = rec.fileNo;
  setComplaintType(rec.complaintType || '');
  document.getElementById('investigationType').value = rec.investigationType || 'preliminary';
  document.getElementById('description').value = rec.description;
  document.getElementById('receivedDate').value = rec.receivedDate || '';
  document.getElementById('hearingDate').value = rec.hearingDate || '';
  document.getElementById('statusField').value = rec.status;
  document.getElementById('stageField').value = rec.stage || 'not_started';
  document.getElementById('completedDate').value = rec.completedDate || '';
  document.getElementById('notesField').value = rec.notes || '';
  document.getElementById('formTitle').textContent = '✏️ ගොනුව සංස්කරණය කරන්න — ' + rec.fileNo;
  toggleStageField();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function markCompleted(id) {
  const rec = records.find(r => r.id === id);
  if (rec) {
    rec.status = 'completed';
    if (!rec.completedDate) {
      rec.completedDate = new Date().toISOString().slice(0,10);
    }
    saveAll();
    renderTable();
  }
}

function deleteRecord(id) {
  pendingDeleteId = id;
  document.getElementById('confirmModal').classList.add('show');
}

document.getElementById('confirmDeleteBtn').onclick = function() {
  if (pendingDeleteId) {
    records = records.filter(r => r.id !== pendingDeleteId);
    recomputeSerials();
    saveAll();
    renderTable();
  }
  closeModal();
};

function closeModal() {
  pendingDeleteId = null;
  document.getElementById('confirmModal').classList.remove('show');
}

function setFilter(f) {
  currentFilter = f;

  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  const toggleBtn = document.querySelector(`.toggle-btn[data-filter="${f}"]`);
  if (toggleBtn) toggleBtn.classList.add('active');

  document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active-filter'));
  const statBox = document.querySelector(`.stat-box[data-filter="${f}"]`);
  if (statBox) statBox.classList.add('active-filter');

  renderTable();

  const listCard = document.getElementById('listCard');
  if (listCard) listCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatDate(d) {
  if (!d) return '-';
  return d;
}

function exportData() {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `vimarshana_gonu_backup_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('invalid');
      if (!confirm(`ගොනු ${imported.length}ක් import කිරීමට අවශ්‍යද? මේවා දැනට ඇති ලැයිස්තුවට එකතු වේ.`)) return;
      const existingIds = new Set(records.map(r => r.id));
      imported.forEach(r => {
        if (!r.id || existingIds.has(r.id)) {
          r.id = 'r_' + Date.now() + '_' + Math.floor(Math.random()*100000);
        }
        records.push(r);
      });
      recomputeSerials();
      saveAll();
      renderTable();
      alert('දත්ත සාර්ථකව import කරන ලදී.');
    } catch (err) {
      alert('Import වීමට අසමත් විය. JSON file එක නිවැරදිද බලන්න.');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function renderTable() {
  const search = document.getElementById('searchBox').value.trim().toLowerCase();
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  let list = records.slice().sort((a,b) => {
    return (a.serial || 0) - (b.serial || 0);
  });

  if (currentFilter === 'active') {
    list = list.filter(r => r.status !== 'completed');
  } else if (currentFilter === 'completed') {
    list = list.filter(r => r.status === 'completed');
  } else if (currentFilter === 'urgent') {
    list = list.filter(r => {
      if (r.status === 'completed') return false;
      const dl = daysUntil(r.hearingDate);
      return dl !== null && dl <= 2;
    });
  }

  if (search) {
    list = list.filter(r =>
      (r.fileNo || '').toLowerCase().includes(search) ||
      (r.description || '').toLowerCase().includes(search)
    );
  }

  let urgentCount = 0;
  let activeCount = 0;
  let doneCount = 0;

  records.forEach(r => {
    if (r.status === 'completed') doneCount++;
    else {
      activeCount++;
      const dl = daysUntil(r.hearingDate);
      if (dl !== null && dl <= 2) urgentCount++;
    }
  });

  document.getElementById('statTotal').textContent = activeCount;
  document.getElementById('statUrgent').textContent = urgentCount;
  document.getElementById('statDone').textContent = doneCount;
  document.getElementById('statAll').textContent = records.length;

  const banner = document.getElementById('alertBanner');
  if (urgentCount > 0) {
    banner.classList.add('show');
    document.getElementById('alertText').textContent =
      `අවධානය! ලිත් දිනය දින 02ක් හෝ ඊට අඩුවෙන් ඉතිරිව ඇති ගොනු ${urgentCount}ක් පවතී.`;
  } else {
    banner.classList.remove('show');
  }

  if (list.length === 0) {
    document.getElementById('emptyMsg').style.display = 'block';
  } else {
    document.getElementById('emptyMsg').style.display = 'none';
  }

  list.forEach(r => {
    const tr = document.createElement('tr');
    const dl = daysUntil(r.hearingDate);
    const isCompleted = r.status === 'completed';
    let isUrgent = false;

    if (!isCompleted && dl !== null && dl <= 2) {
      isUrgent = true;
      tr.classList.add('urgent-row');
    } else if (isCompleted) {
      tr.classList.add('completed-row');
    }

    let statusBadge = '';
    if (isCompleted) {
      statusBadge = '<span class="status-badge badge-done">අවසන් කර ඇත</span>';
    } else if (isUrgent) {
      statusBadge = '<span class="status-badge badge-urgent">ලිත් දිනය ආසන්න!</span>';
    } else if (r.status === 'pending') {
      statusBadge = '<span class="status-badge badge-none">පොරොත්තුවෙන්</span>';
    } else {
      statusBadge = '<span class="status-badge badge-active">සක්‍රීය</span>';
    }

    let daysLeftHtml = '-';
    if (!isCompleted && dl !== null) {
      if (dl < 0) {
        daysLeftHtml = `<span class="days-left danger">කල් ඉකුත් (${Math.abs(dl)} දින)</span>`;
      } else if (dl <= 2) {
        daysLeftHtml = `<span class="days-left danger">${dl} දින ඉතිරිය</span>`;
      } else {
        daysLeftHtml = `<span class="days-left ok">${dl} දින ඉතිරිය</span>`;
      }
    }

    const typeLabel = r.investigationType === 'investigation' ? 'විමර්ශනයක්' : 'මූලික පරීක්ෂණයක්';
    const complaintBadge = r.complaintType === 'නිර්නාමික'
      ? '<span class="status-badge" style="background:#fef3c7;color:#92400e;">🕵️ නිර්නාමික</span>'
      : (r.complaintType === 'ව්‍යාජ නාමික'
        ? '<span class="status-badge" style="background:#ede9fe;color:#5b21b6;">🎭 ව්‍යාජ නාමික</span>'
        : (r.complaintType === 'නාමික'
          ? '<span class="status-badge" style="background:#dbeafe;color:#1e40af;">👤 නාමික</span>'
          : '-'));

    tr.innerHTML = `
      <td>${r.serial}</td>
      <td><strong>${escapeHtml(r.fileNo)}</strong></td>
      <td>${complaintBadge}</td>
      <td>${typeLabel}</td>
      <td>${escapeHtml(r.description)}</td>
      <td>${formatDate(r.receivedDate)}</td>
      <td>${isCompleted ? '<span style="color:#9ca3af;">(සැඟවී ඇත)</span>' : formatDate(r.hearingDate)}</td>
      <td>${daysLeftHtml}</td>
      <td>${statusBadge}</td>
      <td>${isCompleted ? formatDate(r.completedDate) : '-'}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn edit" onclick="editRecord('${r.id}')">✏️ සංස්කරණය</button>
          ${!isCompleted ? `<button class="icon-btn done" onclick="markCompleted('${r.id}')">✅ අවසන්</button>` : ''}
          <button class="icon-btn" onclick="printRecord('${r.id}')">🖨️ මුද්‍රණය</button>
          <button class="icon-btn del" onclick="deleteRecord('${r.id}')">🗑️ මකන්න</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function printList() {
  document.body.classList.remove('print-single-mode');
  window.print();
}

function printRecord(id) {
  const rec = records.find(r => r.id === id);
  if (!rec) return;

  const typeLabel = rec.investigationType === 'investigation' ? 'විමර්ශනයක්' : 'මූලික පරීක්ෂණයක්';
  let statusLabel = 'සක්‍රීය';
  if (rec.status === 'completed') statusLabel = 'අවසන් කර ඇත';
  else if (rec.status === 'pending') statusLabel = 'පොරොත්තුවෙන්';

  document.getElementById('printSingleArea').innerHTML = `
    <h2 style="color:#1e3a5f; border-bottom:2px solid #1e3a5f; padding-bottom:8px;">🗂️ විමර්ශන ගොනු විස්තරය</h2>
    <table class="print-detail-table">
      <tr><th>01. අනු අංකය</th><td>${rec.serial}</td></tr>
      <tr><th>02. විමර්ශන ගොනු අංකය</th><td>${escapeHtml(rec.fileNo)}</td></tr>
      <tr><th>03. පැමිණිල්ල ලද ආකාරය</th><td>${escapeHtml(rec.complaintType) || '-'}</td></tr>
      <tr><th>04. විමර්ශන නියෝගය</th><td>${typeLabel}</td></tr>
      <tr><th>05. විස්තරය</th><td>${escapeHtml(rec.description)}</td></tr>
      <tr><th>06. ගොනුව ලද දිනය</th><td>${formatDate(rec.receivedDate)}</td></tr>
      <tr><th>07. ලිත් දිනය</th><td>${formatDate(rec.hearingDate)}</td></tr>
      <tr><th>08. වර්තමාන තත්ත්වය</th><td>${statusLabel}</td></tr>
      <tr><th>09. අවසන් කළ දිනය</th><td>${formatDate(rec.completedDate)}</td></tr>
      <tr><th>10. වැඩිදුර සටහන්</th><td>${escapeHtml(rec.notes) || '-'}</td></tr>
    </table>
    <div class="print-signature">
      <div class="line">.......................................................</div>
      <div>විමර්ශන නිලධාරියාගේ අත්සන සහ දිනය</div>
    </div>
  `;

  document.body.classList.add('print-single-mode');
  window.print();
}

window.addEventListener('afterprint', function() {
  document.body.classList.remove('print-single-mode');
});

// ===== Monthly Report (ලද ගොනු / අවසන් කළ ගොනු - මාසයෙන් මාසයට) =====

const SINHALA_MONTHS = ['ජනවාරි','පෙබරවාරි','මාර්තු','අප්‍රේල්','මැයි','ජූනි','ජූලි','අගෝස්තු','සැප්තැම්බර්','ඔක්තෝබර්','නොවැම්බර්','දෙසැම්බර්'];

function monthKeyOf(dateStr) {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(dateStr || '');
  if (!m) return null;
  return m[1] + '-' + m[2];
}

function monthLabelOf(key) {
  const parts = key.split('-');
  const year = parts[0];
  const idx = parseInt(parts[1], 10) - 1;
  return (SINHALA_MONTHS[idx] || parts[1]) + ' ' + year;
}

let currentMonthDetail = null;

function buildMonthlyData() {
  const receivedMap = {};
  const completedMap = {};
  const receivedRecords = {};
  const completedRecords = {};

  records.forEach(r => {
    const rk = monthKeyOf(r.receivedDate);
    if (rk) {
      receivedMap[rk] = (receivedMap[rk] || 0) + 1;
      (receivedRecords[rk] = receivedRecords[rk] || []).push(r);
    }

    if (r.status === 'completed') {
      const ck = monthKeyOf(r.completedDate);
      if (ck) {
        completedMap[ck] = (completedMap[ck] || 0) + 1;
        (completedRecords[ck] = completedRecords[ck] || []).push(r);
      }
    }
  });

  const allKeys = new Set([...Object.keys(receivedMap), ...Object.keys(completedMap)]);
  const sortedKeys = Array.from(allKeys).sort();

  return { receivedMap, completedMap, receivedRecords, completedRecords, sortedKeys };
}

function buildMonthlyRowsHtml(interactive) {
  const { receivedMap, completedMap, sortedKeys } = buildMonthlyData();
  let rows = '';
  let totalReceived = 0;
  let totalCompleted = 0;

  if (sortedKeys.length === 0) {
    rows = '<tr><td colspan="3" style="text-align:center; color:var(--muted); padding:20px;">දත්ත නොමැත</td></tr>';
  } else {
    sortedKeys.forEach(k => {
      const rc = receivedMap[k] || 0;
      const cc = completedMap[k] || 0;
      totalReceived += rc;
      totalCompleted += cc;

      const rcCell = (interactive && rc > 0)
        ? `<span class="month-count-link" onclick="showMonthDetail('${k}','received')">${rc}</span>`
        : String(rc);
      const ccCell = (interactive && cc > 0)
        ? `<span class="month-count-link" onclick="showMonthDetail('${k}','completed')">${cc}</span>`
        : String(cc);

      rows += `<tr><td>${monthLabelOf(k)}</td><td style="text-align:center;">${rcCell}</td><td style="text-align:center;">${ccCell}</td></tr>`;
    });
  }

  const footRow = `<tr style="font-weight:700; background:#f1f5f9;"><td>මුළු එකතුව</td><td style="text-align:center;">${totalReceived}</td><td style="text-align:center;">${totalCompleted}</td></tr>`;

  return { rows, footRow, hasData: sortedKeys.length > 0 };
}

function renderMonthlyReport() {
  const { rows, footRow, hasData } = buildMonthlyRowsHtml(true);
  document.getElementById('monthlyTableBody').innerHTML = rows;
  document.getElementById('monthlyTableFoot').innerHTML = hasData ? footRow : '';
}

function openMonthlyReport() {
  backToMonthlySummary();
  renderMonthlyReport();
  document.getElementById('monthlyModal').classList.add('show');
}

function closeMonthlyModal() {
  document.getElementById('monthlyModal').classList.remove('show');
}

function buildMonthDetailRowsHtml(key, type) {
  const { receivedRecords, completedRecords } = buildMonthlyData();
  const list = ((type === 'received' ? receivedRecords[key] : completedRecords[key]) || [])
    .slice()
    .sort((a, b) => (a.serial || 0) - (b.serial || 0));

  if (list.length === 0) {
    return { rows: '<tr><td colspan="5" style="text-align:center; color:var(--muted); padding:20px;">ගොනු නොමැත</td></tr>', list };
  }

  const rows = list.map(r => {
    let statusLabel = 'සක්‍රීය';
    if (r.status === 'completed') statusLabel = 'අවසන් කර ඇත';
    else if (r.status === 'pending') statusLabel = 'පොරොත්තුවෙන්';
    const dateShown = type === 'received' ? formatDate(r.receivedDate) : formatDate(r.completedDate);
    return `<tr>
      <td>${r.serial}</td>
      <td><strong>${escapeHtml(r.fileNo)}</strong></td>
      <td>${escapeHtml(r.description)}</td>
      <td>${dateShown}</td>
      <td>${statusLabel}</td>
    </tr>`;
  }).join('');

  return { rows, list };
}

function showMonthDetail(key, type) {
  currentMonthDetail = { key, type };
  const { rows, list } = buildMonthDetailRowsHtml(key, type);

  const typeTitle = type === 'received' ? '📥 ලද ගොනු' : '✅ අවසන් කළ ගොනු';
  document.getElementById('monthlyDetailTitle').textContent =
    `${typeTitle} — ${monthLabelOf(key)} (${list.length})`;
  document.getElementById('monthlyDetailTableBody').innerHTML = rows;

  document.getElementById('monthlySummaryView').style.display = 'none';
  document.getElementById('monthlyDetailView').style.display = 'block';
}

function backToMonthlySummary() {
  currentMonthDetail = null;
  document.getElementById('monthlyDetailView').style.display = 'none';
  document.getElementById('monthlySummaryView').style.display = 'block';
}

function printMonthlyReport() {
  const { rows, footRow } = buildMonthlyRowsHtml(false);

  document.getElementById('printSingleArea').innerHTML = `
    <h2 style="color:#1e3a5f; border-bottom:2px solid #1e3a5f; padding-bottom:8px;">📊 මාසික වාර්තාව — ලද ගොනු සහ අවසන් කළ ගොනු</h2>
    <table class="print-detail-table" style="margin-top:14px;">
      <thead>
        <tr>
          <th style="width:auto; background:#1e3a5f; color:#fff;">මාසය</th>
          <th style="width:auto; background:#1e3a5f; color:#fff; text-align:center;">ලද ගොනු ගණන</th>
          <th style="width:auto; background:#1e3a5f; color:#fff; text-align:center;">අවසන් කළ ගොනු ගණන</th>
        </tr>
      </thead>
      <tbody>${rows}${footRow}</tbody>
    </table>
  `;

  document.body.classList.add('print-single-mode');
  window.print();
}

function printMonthDetail() {
  if (!currentMonthDetail) return;
  const { key, type } = currentMonthDetail;
  const { rows } = buildMonthDetailRowsHtml(key, type);
  const typeTitle = type === 'received' ? '📥 ලද ගොනු' : '✅ අවසන් කළ ගොනු';

  document.getElementById('printSingleArea').innerHTML = `
    <h2 style="color:#1e3a5f; border-bottom:2px solid #1e3a5f; padding-bottom:8px;">${typeTitle} — ${monthLabelOf(key)}</h2>
    <table class="print-detail-table" style="margin-top:14px;">
      <thead>
        <tr>
          <th style="width:auto; background:#1e3a5f; color:#fff;">අනු අංකය</th>
          <th style="width:auto; background:#1e3a5f; color:#fff;">ගොනු අංකය</th>
          <th style="width:auto; background:#1e3a5f; color:#fff;">විස්තරය</th>
          <th style="width:auto; background:#1e3a5f; color:#fff;">දිනය</th>
          <th style="width:auto; background:#1e3a5f; color:#fff;">තත්ත්වය</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  document.body.classList.add('print-single-mode');
  window.print();
}

// ===== A ආකෘතිය / B ආකෘතිය (Word template එකේ දක්වා ඇති මාසික වාර්තා) =====

const OFFICER_INFO_KEY = 'vimarshana_officer_info_v1';

function getOfficerInfo() {
  try {
    const raw = localStorage.getItem(OFFICER_INFO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { name: parsed.name || '', number: parsed.number || '' };
    }
  } catch (e) { /* ignore */ }
  // Backward compatibility with the older single-name storage key
  const oldName = localStorage.getItem('vimarshana_officer_name');
  return { name: oldName || 'ඕ.ආර්.ටී.එම්. බණ්ඩාර', number: '' };
}

function getOfficerName() {
  return getOfficerInfo().name;
}

function saveOfficerInfo(name, number) {
  localStorage.setItem(OFFICER_INFO_KEY, JSON.stringify({ name: name.trim(), number: number.trim() }));
  renderOfficerInfoBar();
}

function renderOfficerInfoBar() {
  const el = document.getElementById('officerInfoText');
  if (!el) return;
  const info = getOfficerInfo();
  const numberPart = info.number ? ` (අංකය: ${escapeHtml(info.number)})` : '';
  el.textContent = `👮 විමර්ශන නිලධාරී: ${info.name || '-'}${numberPart}`;
}

function editOfficerInfo() {
  const current = getOfficerInfo();
  const updatedName = prompt('විමර්ශන නිලධාරියාගේ නම ඇතුළත් කරන්න:', current.name);
  if (updatedName === null) return;
  const updatedNumber = prompt('විමර්ශන නිලධාරියාගේ අංකය (Officer Number) ඇතුළත් කරන්න:', current.number);
  if (updatedNumber === null) return;
  if (!updatedName.trim()) {
    alert('නිලධාරී නම හිස් තැබිය නොහැක.');
    return;
  }
  saveOfficerInfo(updatedName, updatedNumber);
  alert('නිලධාරී තොරතුරු යාවත්කාලීන කරන ලදී.');
}

// Backward-compatible alias (older button markup may still reference this name)
function editOfficerName() { editOfficerInfo(); }

// ගොනු අංකයේ ඇතුළත් වර්ෂය (උදා: CB/2026/045 -> 2026) සොයාගැනීම
function yearFromFileNo(fileNo) {
  // ගොනු අංකයේ අවසානයේ ඇත්තේ අදාල වර්ෂයයි. සමහර ගොනු අංකවල අවසානයට
  // වරහන් ( ) තුල අමතර සටහනක් ඇතුලත් කර තිබිය හැක - එය ගොනු අංකයේ
  // කොටසක් නොවේ. එබැවින් වරහනට පෙර ඇති කොටසින් පමණක් වර්ෂය සොයා ගනී.
  let s = String(fileNo || '');
  const parenIdx = s.indexOf('(');
  if (parenIdx !== -1) s = s.slice(0, parenIdx);
  s = s.trim();
  const matches = s.match(/20\d{2}/g);
  if (matches && matches.length) return matches[matches.length - 1];
  return 'වර්ෂය සඳහන් නැත';
}

function stageLabel(stage) {
  if (stage === 'ongoing') return 'විමර්ශනය තත්වයේ ඇති';
  if (stage === 'final') return 'විමර්ශනය අවසන් අදියරේ ඇති';
  return 'විමර්ශනය ආරම්භ කර නොමැති';
}

// ===================================================================
// ===== A ආකෘතිය / B ආකෘතිය — මාසය සොයා (Search) මුද්‍රණය කිරීම =====
// ===================================================================

function populateABReportSelectors() {
  const yearSel = document.getElementById('abReportYear');
  const monthSel = document.getElementById('abReportMonth');
  if (!yearSel || !monthSel) return;

  const now = new Date();
  const currentYear = now.getFullYear();

  // දත්තවල ඇති (ලද දිනය / අවසන් කළ දිනය / ගොනු අංකයේ වර්ෂය) සියලු වර්ෂ එකතු කරගැනීම
  const yearSet = new Set();
  yearSet.add(String(currentYear));
  records.forEach(r => {
    const rk = monthKeyOf(r.receivedDate);
    if (rk) yearSet.add(rk.split('-')[0]);
    const ck = monthKeyOf(r.completedDate);
    if (ck) yearSet.add(ck.split('-')[0]);
    const fy = yearFromFileNo(r.fileNo);
    if (/^\d{4}$/.test(fy)) yearSet.add(fy);
  });
  // ආරක්ෂිතව ඉදිරි වසර කිහිපයක් ද ඇතුලත් කිරීම
  yearSet.add(String(currentYear + 1));

  const years = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  const prevYearVal = yearSel.value;
  yearSel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  yearSel.value = years.includes(prevYearVal) ? prevYearVal : String(currentYear);

  if (!monthSel.options.length) {
    monthSel.innerHTML = SINHALA_MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    monthSel.value = String(now.getMonth() + 1);
  }
}

function openABReportModal() {
  populateABReportSelectors();
  document.getElementById('abReportModalOverlay').classList.add('show');
}

function closeABReportModal() {
  document.getElementById('abReportModalOverlay').classList.remove('show');
}

function getSelectedABReportPeriod() {
  const year = parseInt(document.getElementById('abReportYear').value, 10);
  const month = parseInt(document.getElementById('abReportMonth').value, 10); // 1-12
  const pad = n => String(n).padStart(2, '0');
  const monthStartStr = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEndStr = `${year}-${pad(month)}-${pad(lastDay)}`;
  const monthLabel = `${SINHALA_MONTHS[month - 1]} ${year} මස`;
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevMonthLabel = `${SINHALA_MONTHS[prevMonthDate.getMonth()]} ${prevMonthDate.getFullYear()}`;
  return { year, month, monthStartStr, monthEndStr, monthLabel, prevMonthLabel };
}

// ---- A ආකෘතිය: තෝරාගත් මාසය අවසන් වන විට නිලධාරීන් අත ඇති සක්‍රිය ගොනු සාරාංශය ----
function generateReportA() {
  const period = getSelectedABReportPeriod();
  const officerInfo = getOfficerInfo();
  const officerName = officerInfo.name;
  const officerNumber = officerInfo.number;

  // තෝරාගත් මාසය අවසන් වන විට තවම විවෘතව තිබූ ගොනු (ලද දිනය එම මාසය හෝ ඊට පෙර, තවම අවසන් නොවූ)
  function isActiveAsOfMonthEnd(r) {
    const rd = r.receivedDate || '';
    if (rd && rd > period.monthEndStr) return false;
    if (r.completedDate) {
      return r.completedDate > period.monthEndStr;
    }
    return r.status !== 'completed';
  }

  const active = records.filter(isActiveAsOfMonthEnd);

  function groupList(prefixType, stage) {
    return active.filter(r =>
      (prefixType === 'P' ? r.investigationType !== 'investigation' : r.investigationType === 'investigation') &&
      (r.stage || 'not_started') === stage
    );
  }

  function buildSectionRows(list, headerLabel) {
    const cols = { 'නාමික': [], 'නිර්ණාමික': [], 'ව්‍යාජ නාමික': [] };
    list.forEach(r => {
      const ct = (r.complaintType === 'නිර්නාමික') ? 'නිර්ණාමික' : (r.complaintType || 'නාමික');
      if (cols[ct]) cols[ct].push(r.fileNo);
    });
    const maxLen = Math.max(cols['නාමික'].length, cols['නිර්ණාමික'].length, cols['ව්‍යාජ නාමික'].length, 1);
    let rows = '';
    for (let i = 0; i < maxLen; i++) {
      rows += `<tr>` + (i === 0 ? `<td rowspan="${maxLen}" style="font-weight:700; vertical-align:middle;">${headerLabel}</td>` : '') +
        `<td>${escapeHtml(cols['නාමික'][i] || '')}</td>` +
        `<td>${escapeHtml(cols['නිර්ණාමික'][i] || '')}</td>` +
        `<td>${escapeHtml(cols['ව්‍යාජ නාමික'][i] || '')}</td></tr>`;
    }
    return { rows, counts: { 'නාමික': cols['නාමික'].length, 'නිර්ණාමික': cols['නිර්ණාමික'].length, 'ව්‍යාජ නාමික': cols['ව්‍යාජ නාමික'].length } };
  }

  function buildGroup(prefixType, groupTitleParts) {
    const s1 = buildSectionRows(groupList(prefixType, 'not_started'), groupTitleParts[0]);
    const s2 = buildSectionRows(groupList(prefixType, 'ongoing'), groupTitleParts[1]);
    const s3 = buildSectionRows(groupList(prefixType, 'final'), groupTitleParts[2]);
    const total = {
      'නාමික': s1.counts['නාමික'] + s2.counts['නාමික'] + s3.counts['නාමික'],
      'නිර්ණාමික': s1.counts['නිර්ණාමික'] + s2.counts['නිර්ණාමික'] + s3.counts['නිර්ණාමික'],
      'ව්‍යාජ නාමික': s1.counts['ව්‍යාජ නාමික'] + s2.counts['ව්‍යාජ නාමික'] + s3.counts['ව්‍යාජ නාමික']
    };
    const totalRow = `<tr style="font-weight:700; background:#f1f5f9;"><td>එකතුව</td><td>${total['නාමික']}</td><td>${total['නිර්ණාමික']}</td><td>${total['ව්‍යාජ නාමික']}</td></tr>`;
    return { html: s1.rows + s2.rows + s3.rows + totalRow, total };
  }

  const pGroup = buildGroup('P', ['P - 1 (විමර්ශනය ආරම්භ කර නොමැති)', 'P - 2 (විමර්ශනය තත්වයේ ඇති)', 'P - 3 (විමර්ශනය අවසන් අදියරේ ඇති)']);
  const fGroup = buildGroup('F', ['F - 1 (විමර්ශනය ආරම්භ කර නොමැති)', 'F - 2 (විමර්ශනය තත්වයේ ඇති)', 'F - 3 (විමර්ශනය අවසන් අදියරේ ඇති)']);

  const grandTotal = pGroup.total['නාමික'] + pGroup.total['නිර්ණාමික'] + pGroup.total['ව්‍යාජ නාමික'] +
    fGroup.total['නාමික'] + fGroup.total['නිර්ණාමික'] + fGroup.total['ව්‍යාජ නාමික'];

  document.getElementById('printSingleArea').innerHTML = `
    <h2 style="color:#1e3a5f; border-bottom:2px solid #1e3a5f; padding-bottom:8px; text-align:center;">A ආකෘතිය</h2>
    <h3 style="text-align:center; margin-top:0;">නිලධාරීන් අත ඇති සක්‍රිය ගොනු සාරාංශය</h3>
    <p><strong>නම -</strong> ${escapeHtml(officerName)}${officerNumber ? ` &nbsp; <strong>අංකය -</strong> ${escapeHtml(officerNumber)}` : ''}</p>
    <p><strong>මාසය -</strong> ${period.monthLabel}</p>
    <p><strong>මුළු සක්‍රීය විමර්ශන ගොනු ගණන -</strong> ${grandTotal}</p>
    <table class="print-detail-table ab-report-table">
      <thead>
        <tr>
          <th style="background:#1e3a5f; color:#fff;"></th>
          <th style="background:#1e3a5f; color:#fff;">නාමික</th>
          <th style="background:#1e3a5f; color:#fff;">නිර්ණාමික</th>
          <th style="background:#1e3a5f; color:#fff;">ව්‍යාජ නාමික</th>
        </tr>
      </thead>
      <tbody>
        <tr><td colspan="4" style="background:#e2e8f0; font-weight:700;">P - 1 / P - 2 / P - 3 (P අක්ෂරයෙන් මූලික පරීක්ෂණ අදහස් කර ඇත)</td></tr>
        ${pGroup.html}
        <tr><td colspan="4" style="background:#e2e8f0; font-weight:700;">F - 1 / F - 2 / F - 3 (F අක්ෂරයෙන් විමර්ශන අදහස් කර ඇත)</td></tr>
        ${fGroup.html}
        <tr style="font-weight:700; background:#dbeafe;"><td colspan="3">මුළු එකතුව</td><td>${grandTotal}</td></tr>
      </tbody>
    </table>
    <div class="print-signature">
      <div class="sig-block">
        <div class="line">.......................................................</div>
        <div>විමර්ශන නිලධාරි අත්සන හා දිනය</div>
      </div>
      <div class="sig-block">
        <div class="line">.......................................................</div>
        <div>ස්ථානාධිපතිගේ අත්සන හා දිනය, දූෂණ විමර්ශන අංශ 1</div>
      </div>
    </div>
  `;
  closeABReportModal();
  document.body.classList.add('print-single-mode');
  window.print();
}

// ---- B ආකෘතිය: තෝරාගත් මාසය සඳහා සාරාංශය (වර්ෂය අනුව ගොනු ප්‍රවාහය) ----
function generateReportB() {
  const period = getSelectedABReportPeriod();
  const monthStartStr = period.monthStartStr;
  const monthEndStr = period.monthEndStr;
  const monthLabel = period.monthLabel;
  const prevMonthLabel = period.prevMonthLabel;

  const years = Array.from(new Set(records.map(r => yearFromFileNo(r.fileNo)))).sort();

  function isBroughtForward(r) {
    // දැනට ලද දිනය මේ මාසයට පෙර, තවම (මේ මාසය ආරම්භයේදී) අවසන් වී නොතිබූ ගොනු
    const rd = r.receivedDate || '';
    if (rd && rd >= monthStartStr) return false;
    if (r.status === 'completed' && r.completedDate && r.completedDate < monthStartStr) return false;
    return true;
  }
  function isReceivedThisMonth(r) {
    const rd = r.receivedDate || '';
    return rd >= monthStartStr && rd <= monthEndStr;
  }
  function isCompletedThisMonth(r) {
    const cd = r.completedDate || '';
    return r.status === 'completed' && cd >= monthStartStr && cd <= monthEndStr;
  }

  let rows = '';
  let totA = 0, totB = 0, totCompleted = 0;
  years.forEach(y => {
    const yearRecords = records.filter(r => yearFromFileNo(r.fileNo) === y);
    const a = yearRecords.filter(isBroughtForward).length;
    const b = yearRecords.filter(isReceivedThisMonth).length;
    const completed = yearRecords.filter(isCompletedThisMonth).length;
    const balance = a + b - completed;
    totA += a; totB += b; totCompleted += completed;
    rows += `<tr><td>${y}</td><td style="text-align:center;">${a}</td><td style="text-align:center;">${b}</td><td style="text-align:center;">${a + b}</td><td style="text-align:center;">${completed}</td><td style="text-align:center;">${balance}</td></tr>`;
  });
  const totBalance = totA + totB - totCompleted;
  rows += `<tr style="font-weight:700; background:#f1f5f9;"><td>එකතුව</td><td style="text-align:center;">${totA}</td><td style="text-align:center;">${totB}</td><td style="text-align:center;">${totA + totB}</td><td style="text-align:center;">${totCompleted}</td><td style="text-align:center;">${totBalance}</td></tr>`;

  // කුඩා සාරාංශ වගුව (Preliminary/Full බෙදීම)
  const broughtForward = records.filter(isBroughtForward);
  const receivedThisMonth = records.filter(isReceivedThisMonth);
  const completedThisMonth = records.filter(isCompletedThisMonth);

  function isActiveAsOfMonthEnd(r) {
    const rd = r.receivedDate || '';
    if (rd && rd > monthEndStr) return false;
    if (r.completedDate) {
      return r.completedDate > monthEndStr;
    }
    return r.status !== 'completed';
  }
  const currentActive = records.filter(isActiveAsOfMonthEnd);

  function splitPF(list) {
    const p = list.filter(r => r.investigationType !== 'investigation').length;
    const f = list.filter(r => r.investigationType === 'investigation').length;
    return { p, f, total: p + f };
  }
  const bf = splitPF(broughtForward);
  const rm = splitPF(receivedThisMonth);
  const cm = splitPF(completedThisMonth);
  const ca = splitPF(currentActive);

  document.getElementById('printSingleArea').innerHTML = `
    <h2 style="color:#1e3a5f; border-bottom:2px solid #1e3a5f; padding-bottom:8px; text-align:center;">B ආකෘතිය</h2>
    <h3 style="text-align:center; text-decoration:underline; margin-top:0;">${monthLabel} සාරාංශය</h3>
    <table class="print-detail-table ab-report-table">
      <thead>
        <tr>
          <th style="background:#1e3a5f; color:#fff;">වර්ෂය</th>
          <th style="background:#1e3a5f; color:#fff;">${prevMonthLabel} සිට ගෙන ආ ඉතිරිය (A)</th>
          <th style="background:#1e3a5f; color:#fff;">${monthLabel} ලැබුණු ගණන (B)</th>
          <th style="background:#1e3a5f; color:#fff;">විමර්ශනය වෙමින් පවතින මුළු ගණන (A+B)</th>
          <th style="background:#1e3a5f; color:#fff;">${monthLabel} අවසන් කළ විමර්ශන ගණන</th>
          <th style="background:#1e3a5f; color:#fff;">ඉතිරිව ඇති ගණන</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="print-detail-table ab-report-table" style="margin-top:24px;">
      <thead>
        <tr>
          <th style="background:#1e3a5f; color:#fff;">අනු අංකය</th>
          <th style="background:#1e3a5f; color:#fff;">විස්තරය</th>
          <th style="background:#1e3a5f; color:#fff;">මූලික</th>
          <th style="background:#1e3a5f; color:#fff;">පූර්ණ</th>
          <th style="background:#1e3a5f; color:#fff;">එකතුව</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>පසුගිය මාසයෙන් ඉදිරියට ගෙන එන ලද ගොනු ගණන</td><td style="text-align:center;">${bf.p}</td><td style="text-align:center;">${bf.f}</td><td style="text-align:center;">${bf.total}</td></tr>
        <tr><td>2</td><td>මාස තුල ලැබී ඇති ගොනු ගණන</td><td style="text-align:center;">${rm.p}</td><td style="text-align:center;">${rm.f}</td><td style="text-align:center;">${rm.total}</td></tr>
        <tr><td>3</td><td>මාසය තුල විමර්ශනයෙන් පසු යවන ලද ගොනු ගණන</td><td style="text-align:center;">${cm.p}</td><td style="text-align:center;">${cm.f}</td><td style="text-align:center;">${cm.total}</td></tr>
        <tr><td>4</td><td>දැනට භාරයේ ඇති ගොනු ගණන</td><td style="text-align:center;">${ca.p}</td><td style="text-align:center;">${ca.f}</td><td style="text-align:center;">${ca.total}</td></tr>
        <tr><td>5</td><td>නඩු දැමීමට යෝජනා කර ඇති ගොනු ගණන <span style="color:var(--muted); font-weight:400;">(අතින් පුරවන්න)</span></td><td style="text-align:center;">-</td><td style="text-align:center;">-</td><td style="text-align:center;">-</td></tr>
      </tbody>
    </table>
    <div class="print-signature">
      <div class="sig-block">
        <div class="line">.......................................................</div>
        <div>විමර්ශන නිලධාරි අත්සන හා දිනය</div>
      </div>
      <div class="sig-block">
        <div class="line">.......................................................</div>
        <div>ස්ථානාධිපතිගේ අත්සන හා දිනය, දූෂණ විමර්ශන අංශ 1</div>
      </div>
    </div>
  `;
  closeABReportModal();
  document.body.classList.add('print-single-mode');
  window.print();
}

// ===================================================================
// ===== Login / Authentication (Username + Password, Offline) =====
// ===================================================================
// සටහන: මෙය සම්පූර්ණයෙන්ම Offline පද්ධතියක් බැවින්, Password Local
// Storage තුළ සරල hash එකක් ලෙස පමණක් සුරැකේ (Internet වෙත කිසිවක් යවනු
// නොලැබේ). මෙය කණ්ඩායමේ ගොනු වෙත අනවසර ප්‍රවේශය වළක්වා ගැනීම සඳහා පමණි.

const AUTH_USERS_KEY = 'vimarshana_auth_users_v1';
const AUTH_SESSION_KEY = 'vimarshana_auth_session_v1';

// cyrb53 - වේගවත්, තිරසාර (non-cryptographic) hash function එකක්.
function cyrb53Hash(str, seed = 0) {
  str = String(str || '');
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function getAuthUsers() {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveAuthUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function getCurrentSessionUser() {
  return sessionStorage.getItem(AUTH_SESSION_KEY) || '';
}

function showLoginOverlay() {
  document.getElementById('loginOverlay').style.display = 'flex';
}

function hideLoginOverlay() {
  document.getElementById('loginOverlay').style.display = 'none';
  renderOfficerInfoBar();
  if (typeof initCloudSync === 'function') initCloudSync();
}

function showAuthError(msg) {
  const box = document.getElementById('loginErrorBox');
  if (!box) return;
  box.textContent = msg;
  box.classList.add('show');
}

function initAuth() {
  const users = getAuthUsers();
  if (Object.keys(users).length === 0) {
    renderSetupScreen();
    return;
  }
  const sessionUser = getCurrentSessionUser();
  if (sessionUser && Object.prototype.hasOwnProperty.call(users, sessionUser)) {
    hideLoginOverlay();
  } else {
    renderLoginScreen();
  }
}

function renderSetupScreen() {
  const box = document.getElementById('loginBox');
  box.innerHTML = `
    <h2>🔐 පද්ධතිය පළමු වරට පිහිටුවීම</h2>
    <p class="sub">විමර්ශන ගොනු කළමනාකරණ පද්ධතිය භාවිතා කිරීමට පෙර, පිවිසුම් සඳහා Username සහ Password එකක් සකසන්න.</p>
    <div id="loginErrorBox" class="login-error"></div>
    <div class="field"><label>Username *</label><input id="setupUser" type="text" autocomplete="off"></div>
    <div class="field"><label>Password *</label><input id="setupPass" type="password" autocomplete="new-password"></div>
    <div class="field"><label>Password නැවත ඇතුළත් කරන්න *</label><input id="setupPass2" type="password" autocomplete="new-password"></div>
    <button class="btn btn-primary" onclick="submitSetup()">✅ ගිණුම සාදා පිවිසෙන්න</button>
    <p class="login-note">🔒 මෙම Username/Password දත්ත ඔබගේ මෙම පරිගණකයේ Browser එකේ Local Storage තුළ පමණක් සුරැකේ. එය Internet වෙත යවනු නොලැබේ.</p>
  `;
  showLoginOverlay();
  const u = document.getElementById('setupUser');
  u.focus();
  document.getElementById('setupPass2').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') submitSetup();
  });
}

function renderLoginScreen() {
  const box = document.getElementById('loginBox');
  box.innerHTML = `
    <h2>🔒 පද්ධතියට පිවිසෙන්න</h2>
    <p class="sub">විමර්ශන ගොනු කළමනාකරණ පද්ධතිය — ඉදිරියට යාමට Login වන්න.</p>
    <div id="loginErrorBox" class="login-error"></div>
    <div class="field"><label>Username</label><input id="loginUser" type="text" autocomplete="username"></div>
    <div class="field"><label>Password</label><input id="loginPass" type="password" autocomplete="current-password"></div>
    <button class="btn btn-primary" onclick="submitLogin()">🔓 පිවිසෙන්න (Login)</button>
    <p class="login-note">🔒 මෙම පද්ධතිය සම්පූර්ණයෙන්ම Offline ලෙස ක්‍රියාත්මක වේ. ඔබගේ පිවිසුම් තොරතුරු Internet වෙත යවනු නොලැබේ.</p>
  `;
  showLoginOverlay();
  const u = document.getElementById('loginUser');
  u.focus();
  document.getElementById('loginPass').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') submitLogin();
  });
}

function submitSetup() {
  const user = (document.getElementById('setupUser').value || '').trim();
  const pass = document.getElementById('setupPass').value || '';
  const pass2 = document.getElementById('setupPass2').value || '';
  if (!user || !pass) { showAuthError('Username සහ Password දෙකම ඇතුළත් කළ යුතුය.'); return; }
  if (pass.length < 4) { showAuthError('Password අඩුම තරමින් අකුරු 4ක් වත් තිබිය යුතුය.'); return; }
  if (pass !== pass2) { showAuthError('Password දෙක නොගැලපේ. නැවත උත්සාහ කරන්න.'); return; }
  const users = {};
  users[user] = cyrb53Hash(pass);
  saveAuthUsers(users);
  sessionStorage.setItem(AUTH_SESSION_KEY, user);
  hideLoginOverlay();
}

function submitLogin() {
  const user = (document.getElementById('loginUser').value || '').trim();
  const pass = document.getElementById('loginPass').value || '';
  const users = getAuthUsers();
  if (!user || !pass) { showAuthError('Username සහ Password ඇතුළත් කරන්න.'); return; }
  if (!Object.prototype.hasOwnProperty.call(users, user) || users[user] !== cyrb53Hash(pass)) {
    showAuthError('Username හෝ Password වැරදිය. නැවත උත්සාහ කරන්න.');
    return;
  }
  sessionStorage.setItem(AUTH_SESSION_KEY, user);
  hideLoginOverlay();
}

function doLogout() {
  if (!confirm('ඔබට පද්ධතියෙන් ඉවත් වීමට අවශ්‍යද?')) return;
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  renderLoginScreen();
}

// ===== Account Settings (Username / Password වෙනස් කිරීම) =====
function openAccountSettings() {
  document.getElementById('stCurrentPass').value = '';
  document.getElementById('stNewUser').value = '';
  document.getElementById('stNewPass').value = '';
  document.getElementById('stNewPass2').value = '';
  const msg = document.getElementById('settingsMsg');
  msg.textContent = '';
  msg.classList.remove('show');
  document.getElementById('settingsModalOverlay').classList.add('show');
}

function closeAccountSettings() {
  document.getElementById('settingsModalOverlay').classList.remove('show');
}

function saveAccountSettings() {
  const currentUser = getCurrentSessionUser();
  const users = getAuthUsers();
  const msg = document.getElementById('settingsMsg');
  msg.classList.remove('show');

  if (!currentUser || !Object.prototype.hasOwnProperty.call(users, currentUser)) {
    msg.textContent = 'වත්මන් පිවිසුම සොයාගත නොහැක. නැවත Login වන්න.';
    msg.classList.add('show');
    return;
  }
  const currentPass = document.getElementById('stCurrentPass').value || '';
  if (users[currentUser] !== cyrb53Hash(currentPass)) {
    msg.textContent = 'වත්මන් Password එක වැරදිය.';
    msg.classList.add('show');
    return;
  }
  const newUser = (document.getElementById('stNewUser').value || '').trim();
  const newPass = document.getElementById('stNewPass').value || '';
  const newPass2 = document.getElementById('stNewPass2').value || '';

  if (newPass || newPass2) {
    if (newPass.length < 4) { msg.textContent = 'නව Password අඩුම තරමින් අකුරු 4ක් වත් තිබිය යුතුය.'; msg.classList.add('show'); return; }
    if (newPass !== newPass2) { msg.textContent = 'නව Password දෙක නොගැලපේ.'; msg.classList.add('show'); return; }
  }
  if (newUser && Object.prototype.hasOwnProperty.call(users, newUser) && newUser !== currentUser) {
    msg.textContent = 'එම Username එක දැනටමත් භාවිතයේ ඇත.';
    msg.classList.add('show');
    return;
  }

  const finalUser = newUser || currentUser;
  const finalPassHash = newPass ? cyrb53Hash(newPass) : users[currentUser];

  if (finalUser !== currentUser) {
    delete users[currentUser];
  }
  users[finalUser] = finalPassHash;
  saveAuthUsers(users);
  sessionStorage.setItem(AUTH_SESSION_KEY, finalUser);
  closeAccountSettings();
  alert('ගිණුම් තොරතුරු සාර්ථකව යාවත්කාලීන කරන ලදී.');
}

// init
loadRecords();
recomputeSerials();
saveAll();
resetForm();
renderTable();
renderOfficerInfoBar();
initAuth();
