const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'employees.json');

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const initial = [
      { id: crypto.randomUUID(), name: 'Aarav Sharma', email: 'aarav.sharma@example.com', department: 'Engineering', role: 'Frontend Developer', status: 'Active', joinedDate: '2024-02-12' },
      { id: crypto.randomUUID(), name: 'Priya Nair', email: 'priya.nair@example.com', department: 'Design', role: 'Product Designer', status: 'Active', joinedDate: '2023-11-06' },
      { id: crypto.randomUUID(), name: 'Rohan Mehta', email: 'rohan.mehta@example.com', department: 'Engineering', role: 'Backend Developer', status: 'On Leave', joinedDate: '2022-08-22' },
      { id: crypto.randomUUID(), name: 'Fatima Khan', email: 'fatima.khan@example.com', department: 'Human Resources', role: 'HR Executive', status: 'Active', joinedDate: '2024-05-20' },
      { id: crypto.randomUUID(), name: 'Daniel Joseph', email: 'daniel.joseph@example.com', department: 'Finance', role: 'Financial Analyst', status: 'Inactive', joinedDate: '2021-04-14' }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
  }
}
function readEmployees() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeEmployees(employees) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(employees, null, 2));
  fs.renameSync(tempFile, DATA_FILE);
}
function validateEmployee(body) {
  const fields = ['name', 'email', 'department', 'role', 'status', 'joinedDate'];
  const employee = {};
  for (const field of fields) employee[field] = typeof body[field] === 'string' ? body[field].trim() : '';
  if (!employee.name || !employee.email || !employee.department || !employee.role || !employee.joinedDate) {
    return { error: 'Name, email, department, role, and joining date are required.' };
  }
  if (!/^\S+@\S+\.\S+$/.test(employee.email)) return { error: 'Enter a valid email address.' };
  if (!['Active', 'On Leave', 'Inactive'].includes(employee.status)) employee.status = 'Active';
  return { employee };
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'employee-management-demo' }));
app.get('/api/employees', (req, res) => {
  const { search = '', department = 'All', status = 'All' } = req.query;
  const q = String(search).toLowerCase().trim();
  let employees = readEmployees();
  if (q) employees = employees.filter(e => [e.name, e.email, e.role, e.department].some(v => v.toLowerCase().includes(q)));
  if (department !== 'All') employees = employees.filter(e => e.department === department);
  if (status !== 'All') employees = employees.filter(e => e.status === status);
  res.json(employees);
});
app.get('/api/stats', (_req, res) => {
  const employees = readEmployees();
  res.json({ total: employees.length, active: employees.filter(e => e.status === 'Active').length, onLeave: employees.filter(e => e.status === 'On Leave').length, departments: new Set(employees.map(e => e.department)).size });
});
app.post('/api/employees', (req, res) => {
  const { employee, error } = validateEmployee(req.body);
  if (error) return res.status(400).json({ error });
  const employees = readEmployees();
  if (employees.some(e => e.email.toLowerCase() === employee.email.toLowerCase())) return res.status(409).json({ error: 'An employee with this email already exists.' });
  const created = { id: crypto.randomUUID(), ...employee };
  employees.unshift(created);
  writeEmployees(employees);
  res.status(201).json(created);
});
app.put('/api/employees/:id', (req, res) => {
  const { employee, error } = validateEmployee(req.body);
  if (error) return res.status(400).json({ error });
  const employees = readEmployees();
  const index = employees.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Employee not found.' });
  if (employees.some(e => e.id !== req.params.id && e.email.toLowerCase() === employee.email.toLowerCase())) return res.status(409).json({ error: 'An employee with this email already exists.' });
  employees[index] = { id: req.params.id, ...employee };
  writeEmployees(employees);
  res.json(employees[index]);
});
app.delete('/api/employees/:id', (req, res) => {
  const employees = readEmployees();
  const remaining = employees.filter(e => e.id !== req.params.id);
  if (remaining.length === employees.length) return res.status(404).json({ error: 'Employee not found.' });
  writeEmployees(remaining);
  res.status(204).end();
});
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

ensureStore();
app.listen(PORT, '0.0.0.0', () => console.log(`Employee Management app listening on port ${PORT}`));
