/* TEMPORARY — Phase 15 HTTP suite for /api/departments. Removed after run. */
process.env.NODE_ENV = 'test';
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User.model');
const Doctor = require('./models/Doctor.model');
const Department = require('./models/Department.model');

const BASE = 'http://localhost:5000/api';
let pass = 0;
let fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
  ok ? (pass += 1) : (fail += 1);
};

const tokenFor = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '1d',
  });

const req = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, json };
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // ── temp users (one per non-admin role) ──────────────────────────
  await User.deleteMany({ email: /@depttest\.example\.com$/ });
  const roles = ['admin', 'doctor', 'patient', 'receptionist', 'pharmacist', 'lab_technician'];
  const users = {};
  for (const role of roles) {
    users[role] = await User.create({
      name: `Dept Test ${role}`,
      email: `${role}@depttest.example.com`,
      password: 'Test1234!',
      role,
    });
  }
  const T = Object.fromEntries(roles.map((r) => [r, tokenFor(users[r])]));

  // ── temp doctors (for headDoctor refs) ───────────────────────────
  await Doctor.deleteMany({ email: /@depttest\.example\.com$/ });
  const docA = await Doctor.create({
    name: 'Head Doc A',
    email: 'head.a@depttest.example.com',
    specialization: 'Cardiology',
    qualification: 'MBBS',
    experience: 10,
    consultationFee: 800,
  });
  const docB = await Doctor.create({
    name: 'Head Doc B',
    email: 'head.b@depttest.example.com',
    specialization: 'Neurology',
    qualification: 'MBBS',
    experience: 12,
    consultationFee: 900,
  });

  await Department.deleteMany({});

  // ── 1. auth ──────────────────────────────────────────────────────
  let r = await req('GET', '/departments');
  check('401 without token', r.status === 401);
  r = await req('GET', '/departments', { token: 'garbage.token.here' });
  check('401 with garbage token', r.status === 401);

  // ── 2. RBAC — only admin holds departments:* ─────────────────────
  for (const role of ['doctor', 'patient', 'receptionist', 'pharmacist', 'lab_technician']) {
    r = await req('GET', '/departments', { token: T[role] });
    check(`${role} 403 on read`, r.status === 403);
    r = await req('POST', '/departments', { token: T[role], body: { name: 'Xray' } });
    check(`${role} 403 on write`, r.status === 403);
  }

  // ── 3. validation 400s ───────────────────────────────────────────
  r = await req('POST', '/departments', { token: T.admin, body: {} });
  check('400 missing name', r.status === 400, r.json?.message);
  r = await req('POST', '/departments', { token: T.admin, body: { name: 'A' } });
  check('400 name too short', r.status === 400);
  r = await req('POST', '/departments', {
    token: T.admin,
    body: { name: 'Cardiology', status: 'bogus' },
  });
  check('400 invalid status', r.status === 400, r.json?.message);
  r = await req('POST', '/departments', {
    token: T.admin,
    body: { name: 'Cardiology', description: 'x'.repeat(1001) },
  });
  check('400 description > 1000', r.status === 400);
  r = await req('POST', '/departments', {
    token: T.admin,
    body: { name: 'Cardiology', location: 'x'.repeat(201) },
  });
  check('400 location > 200', r.status === 400);
  r = await req('POST', '/departments', {
    token: T.admin,
    body: { name: 'Neurology', headDoctor: 'not-an-id' },
  });
  check('400 headDoctor invalid id', r.status === 400, r.json?.message);
  r = await req('POST', '/departments', {
    token: T.admin,
    body: { name: 'Neurology', headDoctor: 'aaaaaaaaaaaaaaaaaaaaaaaa' },
  });
  check('404 headDoctor missing', r.status === 404, r.json?.message);

  // ── 4. create happy path ─────────────────────────────────────────
  r = await req('POST', '/departments', {
    token: T.admin,
    body: {
      name: 'Cardiology',
      description: 'Heart care unit',
      location: 'Block A, Floor 2',
      headDoctor: docA._id.toString(),
    },
  });
  check('201 create with head', r.status === 201, r.json?.message);
  const cardioId = r.json?.data?._id;
  check('defaults: status active', r.json?.data?.status === 'active');
  r = await req('POST', '/departments', {
    token: T.admin,
    body: { name: 'Neurology', location: 'Block B' },
  });
  check('201 create without head/description', r.status === 201);
  const neuroId = r.json?.data?._id;
  check('headDoctor null default', r.json?.data?.headDoctor === null);

  // duplicate name → 409
  r = await req('POST', '/departments', { token: T.admin, body: { name: 'Cardiology' } });
  check('409 duplicate name', r.status === 409, r.json?.message);

  // Phase 13 lesson: two departments without heads must NOT collide
  r = await req('POST', '/departments', { token: T.admin, body: { name: 'Orthopedics' } });
  check('201 second unheaded department (no false duplicate)', r.status === 201, r.json?.message);
  const orthoId = r.json?.data?._id;

  // same head on two departments → 409 (partial unique index)
  r = await req('POST', '/departments', {
    token: T.admin,
    body: { name: 'Cardio II', headDoctor: docA._id.toString() },
  });
  check('409 doctor already heads a department', r.status === 409, r.json?.message);

  // ── 5. list: search / filter / pagination / sort ─────────────────
  r = await req('GET', '/departments?q=neuro', { token: T.admin });
  check('search by name', r.json?.data?.departments?.length === 1 && r.json.data.departments[0].name === 'Neurology');
  r = await req('GET', '/departments?q=Block', { token: T.admin });
  check('search by location', r.json?.data?.departments?.length === 2);
  r = await req('GET', '/departments?q=Heart', { token: T.admin });
  check('search by description', r.json?.data?.departments?.length === 1);
  r = await req('GET', '/departments?status=inactive', { token: T.admin });
  check('status filter inactive → none', r.json?.data?.pagination?.total === 0);
  r = await req('GET', '/departments?status=bogus', { token: T.admin });
  check('400 invalid status filter', r.status === 400);
  r = await req('GET', '/departments?status=active&limit=2', { token: T.admin });
  check('pagination limit=2 + total=3', r.json?.data?.departments?.length === 2 && r.json.data.pagination.total === 3 && r.json.data.pagination.totalPages === 2);
  r = await req('GET', '/departments?sort=name', { token: T.admin });
  const sorted = r.json?.data?.departments?.map((d) => d.name);
  check('sort=name A–Z', JSON.stringify(sorted) === JSON.stringify(['Cardiology', 'Neurology', 'Orthopedics']), sorted?.join(' | '));
  check('list populates headDoctor', r.json?.data?.departments?.[0]?.headDoctor?.name === 'Head Doc A');

  // ── 6. detail ────────────────────────────────────────────────────
  r = await req('GET', `/departments/${cardioId}`, { token: T.admin });
  check('200 detail + populated head (fee)', r.status === 200 && r.json?.data?.headDoctor?.consultationFee === 800);
  r = await req('GET', '/departments/not-an-id', { token: T.admin });
  check('400 invalid id format', r.status === 400, r.json?.message);
  r = await req('GET', '/departments/aaaaaaaaaaaaaaaaaaaaaaaa', { token: T.admin });
  check('404 unknown id', r.status === 404);

  // ── 7. update ────────────────────────────────────────────────────
  r = await req('PUT', `/departments/${neuroId}`, {
    token: T.admin,
    body: { location: 'Block C, Floor 1', status: 'inactive' },
  });
  check('200 partial update', r.status === 200 && r.json?.data?.location === 'Block C, Floor 1' && r.json?.data?.status === 'inactive');
  r = await req('PUT', `/departments/${neuroId}`, { token: T.admin, body: { name: 'Cardiology' } });
  check('409 dup name on update', r.status === 409, r.json?.message);
  r = await req('PUT', `/departments/${neuroId}`, {
    token: T.admin,
    body: { headDoctor: docB._id.toString() },
  });
  check('200 assign head on update', r.status === 200 && r.json?.data?.headDoctor === docB._id.toString());
  r = await req('PUT', `/departments/${neuroId}`, {
    token: T.admin,
    body: { headDoctor: docA._id.toString() },
  });
  check('409 head taken by another dept on update', r.status === 409, r.json?.message);
  r = await req('PUT', `/departments/${neuroId}`, { token: T.admin, body: { headDoctor: '' } });
  check('200 clear head ("")', r.status === 200 && r.json?.data?.headDoctor === null);
  r = await req('PUT', `/departments/${neuroId}`, { token: T.admin, body: { status: 'retired' } });
  check('400 invalid status on update', r.status === 400);
  r = await req('PUT', '/departments/aaaaaaaaaaaaaaaaaaaaaaaa', { token: T.admin, body: { name: 'X' } });
  check('404 update unknown id', r.status === 404);
  r = await req('PUT', `/departments/${neuroId}`, { token: T.doctor, body: { name: 'Hijack' } });
  check('403 doctor on update', r.status === 403);
  void orthoId;

  // ── 8. delete ────────────────────────────────────────────────────
  r = await req('DELETE', `/departments/${orthoId}`, { token: T.admin });
  check('200 delete', r.status === 200, r.json?.message);
  r = await req('DELETE', `/departments/${orthoId}`, { token: T.admin });
  check('404 repeat delete', r.status === 404);
  r = await req('DELETE', `/departments/${cardioId}`, { token: T.doctor });
  check('403 doctor on delete', r.status === 403);

  // ── cleanup ──────────────────────────────────────────────────────
  await Department.deleteMany({});
  await Doctor.deleteMany({ email: /@depttest\.example\.com$/ });
  await User.deleteMany({ email: /@depttest\.example\.com$/ });
  await mongoose.disconnect();

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
