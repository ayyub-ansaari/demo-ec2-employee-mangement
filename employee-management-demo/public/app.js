const API = '/api';
const rowsEl = document.getElementById('employee-rows');
const modal = document.getElementById('modal-backdrop');
const form = document.getElementById('employee-form');
const formError = document.getElementById('form-error');
let employees = [];
let editingId = null;
let toastTimer;
const avatarColors = [ ['#e9e5ff','#6658d8'], ['#e1f5ed','#218b68'], ['#fff0df','#c17d2d'], ['#e3f1ff','#397bb5'], ['#ffe7ee','#c45478'], ['#e8edf6','#596c8f'] ];
const initials = name => name.split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('').toUpperCase();
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateLabel = value => { if (!value) return '—'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}); };
const statusClass = status => status === 'Active' ? 'status-active' : status === 'On Leave' ? 'status-on-leave' : 'status-inactive';

async function request(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type':'application/json', ...(options.headers || {}) }, ...options });
  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    try { const payload = await response.json(); message = payload.error || message; } catch {}
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}
async function loadStats() {
  const stats = await request(`${API}/stats`);
  document.getElementById('total-stat').textContent = stats.total;
  document.getElementById('active-stat').textContent = stats.active;
  document.getElementById('leave-stat').textContent = stats.onLeave;
  document.getElementById('department-stat').textContent = stats.departments;
  document.getElementById('nav-count').textContent = stats.total;
}
async function loadEmployees() {
  const params = new URLSearchParams();
  const search = document.getElementById('search-input').value.trim();
  const department = document.getElementById('department-filter').value;
  const status = document.getElementById('status-filter').value;
  if (search) params.set('search', search);
  if (department !== 'All') params.set('department', department);
  if (status !== 'All') params.set('status', status);
  try {
    employees = await request(`${API}/employees?${params.toString()}`);
    renderEmployees();
    await loadStats();
    updateDepartmentOptions();
  } catch (error) {
    rowsEl.innerHTML = `<tr><td colspan="7" class="empty-cell"><strong>Could not load employees</strong>${escapeHtml(error.message)}</td></tr>`;
    showToast(error.message);
  }
}
function updateDepartmentOptions() {
  const select = document.getElementById('department-filter');
  const current = select.value;
  const departments = [...new Set(employees.map(employee => employee.department))].sort();
  // Keep known choices available even when filters return no matching rows.
  const standard = ['Design','Engineering','Finance','Human Resources','Marketing','Operations','Sales'];
  select.innerHTML = '<option>All</option>' + [...new Set([...standard, ...departments])].sort().map(dept => `<option value="${escapeHtml(dept)}">${escapeHtml(dept)}</option>`).join('');
  select.value = [...select.options].some(option => option.value === current) ? current : 'All';
}
function renderEmployees() {
  document.getElementById('heading-count').textContent = employees.length;
  document.getElementById('results-label').textContent = `Showing ${employees.length} employee${employees.length === 1 ? '' : 's'}`;
  document.getElementById('select-all').checked = false;
  if (!employees.length) {
    rowsEl.innerHTML = '<tr><td colspan="7" class="empty-cell"><strong>No employees found</strong>Try changing your search or filters.</td></tr>';
    return;
  }
  rowsEl.innerHTML = employees.map((employee, index) => {
    const [background, foreground] = avatarColors[index % avatarColors.length];
    return `<tr>
      <td><input class="row-check" type="checkbox" aria-label="Select ${escapeHtml(employee.name)}" data-id="${escapeHtml(employee.id)}" /></td>
      <td><div class="employee-cell"><div class="employee-avatar" style="background:${background};color:${foreground}">${escapeHtml(initials(employee.name))}</div><div class="employee-name"><strong>${escapeHtml(employee.name)}</strong><span>${escapeHtml(employee.email)}</span></div></div></td>
      <td><span class="dept-pill">${escapeHtml(employee.department)}</span></td><td><span class="role-text">${escapeHtml(employee.role)}</span></td><td><span class="date-text">${escapeHtml(dateLabel(employee.joinedDate))}</span></td><td><span class="status-pill ${statusClass(employee.status)}">${escapeHtml(employee.status)}</span></td>
      <td><button class="row-actions" data-action="menu" data-id="${escapeHtml(employee.id)}" aria-label="Actions for ${escapeHtml(employee.name)}" title="Edit or delete employee">•••</button></td>
    </tr>`;
  }).join('');
}
function openModal(employee = null) {
  editingId = employee ? employee.id : null;
  form.reset(); formError.textContent = '';
  document.getElementById('modal-title').textContent = employee ? 'Edit employee' : 'Add employee';
  document.getElementById('save-employee').textContent = employee ? 'Save changes' : 'Save employee';
  const today = new Date().toISOString().slice(0,10);
  form.elements.joinedDate.value = employee?.joinedDate || today;
  if (employee) for (const field of ['name','email','department','role','status','joinedDate']) form.elements[field].value = employee[field] || '';
  modal.hidden = false;
  setTimeout(() => form.elements.name.focus(), 50);
}
function closeModal() { modal.hidden = true; editingId = null; }
function showToast(message) {
  const toast = document.getElementById('toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.getElementById('add-employee').addEventListener('click', () => openModal());
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('cancel-modal').addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
form.addEventListener('submit', async event => {
  event.preventDefault(); formError.textContent = '';
  const employee = Object.fromEntries(new FormData(form).entries());
  const wasEditing = Boolean(editingId);
  const button = document.getElementById('save-employee'); button.disabled = true; button.textContent = 'Saving…';
  try {
    await request(editingId ? `${API}/employees/${editingId}` : `${API}/employees`, { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(employee) });
    closeModal(); await loadEmployees(); showToast(wasEditing ? 'Employee updated successfully.' : 'Employee added successfully.');
  } catch (error) { formError.textContent = error.message; }
  finally { button.disabled = false; button.textContent = wasEditing ? 'Save changes' : 'Save employee'; }
});
let searchTimer;
document.getElementById('search-input').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadEmployees, 220); });
document.getElementById('department-filter').addEventListener('change', loadEmployees);
document.getElementById('status-filter').addEventListener('change', loadEmployees);
document.getElementById('reset-filters').addEventListener('click', () => { document.getElementById('search-input').value = ''; document.getElementById('department-filter').value = 'All'; document.getElementById('status-filter').value = 'All'; loadEmployees(); });
rowsEl.addEventListener('click', async event => {
  const button = event.target.closest('[data-action="menu"]'); if (!button) return;
  const employee = employees.find(item => item.id === button.dataset.id); if (!employee) return;
  const action = window.prompt(`Employee: ${employee.name}\nType EDIT to update this employee or DELETE to remove them.`, 'EDIT');
  if (!action) return;
  if (action.trim().toUpperCase() === 'EDIT') openModal(employee);
  else if (action.trim().toUpperCase() === 'DELETE') {
    if (!window.confirm(`Delete ${employee.name}? This cannot be undone.`)) return;
    try { await request(`${API}/employees/${employee.id}`, { method:'DELETE' }); await loadEmployees(); showToast('Employee deleted.'); }
    catch (error) { showToast(error.message); }
  }
});
document.getElementById('select-all').addEventListener('change', event => document.querySelectorAll('.row-check').forEach(check => { check.checked = event.target.checked; }));
document.getElementById('export-csv').addEventListener('click', () => {
  if (!employees.length) return showToast('There are no employees to export.');
  const fields = ['name','email','department','role','joinedDate','status'];
  const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [fields.join(','), ...employees.map(employee => fields.map(field => csvCell(employee[field])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}));
  const link = document.createElement('a'); link.href = url; link.download = 'employees.csv'; link.click(); URL.revokeObjectURL(url); showToast('Employee list exported.');
});
document.getElementById('today-label').textContent = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
loadEmployees();
