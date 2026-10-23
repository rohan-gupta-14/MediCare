/* TEMPORARY — TQM presentation benchmark. Scratch DB: medicare_tqm_bench. */
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

const URI = 'mongodb://localhost:27017/medicare_tqm_bench';
const N = 50000;

const FIRST = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Rohan', 'Priya', 'Ananya', 'Ishita', 'Kavya', 'Meera', 'Sunita', 'Rahul', 'Sneha', 'Vikram', 'Pooja', 'Deepak', 'Neha', 'Karan', 'Tanya', 'Amit'];
const LAST = ['Sharma', 'Verma', 'Patel', 'Nair', 'Reddy', 'Iyer', 'Gupta', 'Singh', 'Rawat', 'Joshi', 'Mishra', 'Chauhan', 'Kapoor', 'Banerjee', 'Das'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function makeDocs(n) {
  const now = Date.now();
  const docs = [];
  for (let i = 1; i <= n; i++) {
    const name = `${rand(FIRST)} ${rand(LAST)}`;
    docs.push({
      patientId: `PAT-${String(i).padStart(4, '0')}`,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}.${i}@example.com`,
      phone: `+91-${String(9000000000 + Math.floor(Math.random() * 999999999))}`,
      gender: Math.random() < 0.5 ? 'male' : 'female',
      bloodGroup: rand(BLOOD),
      user: null,
      createdAt: new Date(now - Math.floor(Math.random() * 730 * 86400000)),
      updatedAt: new Date(now),
    });
  }
  return docs;
}

async function seed(col) {
  const docs = makeDocs(N);
  for (let i = 0; i < docs.length; i += 5000) {
    await col.insertMany(docs.slice(i, i + 5000), { ordered: false });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function timeIt(fn, iters = 30) {
  await fn(); // warm-up
  const times = [];
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return { med: times[Math.floor(times.length / 2)], p95: times[Math.floor(times.length * 0.95)] };
}

// Same shape as backend/controllers/patient.controller.js
const searchFilter = (q) => {
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return { $or: [{ name: rx }, { email: rx }, { patientId: rx }, { phone: rx }] };
};

async function scenario(col, label) {
  const out = { label };

  // L1 default list (sort -createdAt, page 1) + count — controller runs both in parallel
  let r = await timeIt(async () => {
    const [rows, total] = await Promise.all([
      col.find({}).sort({ createdAt: -1 }).skip(0).limit(20).toArray(),
      col.countDocuments({}),
    ]);
    return [rows, total];
  });
  out.list_default = r;

  // L2 search regex $or + count (the actual /api/patients?q=...)
  r = await timeIt(async () => {
    const f = searchFilter('Sharma');
    const [rows, total] = await Promise.all([
      col.find(f).sort({ createdAt: -1 }).skip(0).limit(20).toArray(),
      col.countDocuments(f),
    ]);
    return [rows, total];
  });
  out.search_regex = r;

  // L3 deep pagination — page 1000
  r = await timeIt(async () => {
    return col.find({}).sort({ createdAt: -1 }).skip(19980).limit(20).toArray();
  });
  out.deep_page = r;

  // L4 sort by name (whitelisted sort key "name")
  r = await timeIt(async () => {
    return col.find({}).sort({ name: 1 }).skip(0).limit(20).toArray();
  });
  out.sort_name = r;

  // L5 filter by gender + sort (gender/bloodGroup filters in UI)
  r = await timeIt(async () => {
    return col.find({ gender: 'female' }).sort({ createdAt: -1 }).skip(0).limit(20).toArray();
  });
  out.filter_gender = r;

  // L6 exact detail lookup by patientId (PAT-0001 style)
  r = await timeIt(async () => {
    return col.find({ patientId: 'PAT-12345' }).toArray();
  });
  out.detail_by_id = r;

  // explain: search query
  const ex = await col.find(searchFilter('Sharma')).sort({ createdAt: -1 }).limit(20)
    .explain('executionStats');
  const win = ex.queryPlanner.winningPlan;
  out.search_explain = {
    stage: win.stage || (win.inputStage && win.inputStage.stage),
    input: win.inputStage ? win.inputStage.stage : null,
    keysExamined: ex.executionStats.totalKeysExamined,
    docsExamined: ex.executionStats.totalDocsExamined,
    nReturned: ex.executionStats.nReturned,
    ms: ex.executionStats.executionTimeMillis,
  };

  // explain: default list
  const ex2 = await col.find({}).sort({ createdAt: -1 }).limit(20).explain('executionStats');
  const win2 = ex2.queryPlanner.winningPlan;
  out.list_explain = {
    stage: win2.stage,
    input: win2.inputStage ? win2.inputStage.stage : null,
    keysExamined: ex2.executionStats.totalKeysExamined,
    docsExamined: ex2.executionStats.totalDocsExamined,
    ms: ex2.executionStats.executionTimeMillis,
  };

  return out;
}

(async () => {
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  const col = db.collection('patients');

  console.log('Seeding', N, 'documents...');
  const t0 = performance.now();
  await seed(col);
  console.log('Seeded in', ((performance.now() - t0) / 1000).toFixed(1) + 's');
  console.log('Indexes now:', (await col.indexes()).map((i) => i.name).join(', '));

  const results = [];

  // ── STATE A: baseline, no secondary indexes (drop everything except _id)
  for (const idx of await col.indexes()) {
    if (idx.name !== '_id_') await col.dropIndex(idx.name);
  }
  results.push(await scenario(col, 'A_baseline_no_indexes'));

  // ── STATE B: as-built (schema indexes exactly as in Patient.model.js)
  await col.createIndex({ name: 1 });
  await col.createIndex({ user: 1 });
  await col.createIndex({ email: 1 }, { unique: true });
  await col.createIndex({ patientId: 1 }, { unique: true });
  results.push(await scenario(col, 'B_as_built_schema_indexes'));

  // ── STATE C: optimized — B + createdAt index (list/default sort)
  await col.createIndex({ createdAt: -1 });
  results.push(await scenario(col, 'C_plus_createdAt_index'));

  // ── STATE D: text-index search (proposed next-cycle control)
  await col.createIndex({ name: 'text', email: 'text' }, { weights: { name: 10, email: 5 }, name: 'patient_text' });
  const tText = await timeIt(async () => {
    const f = { $text: { $search: 'Sharma' } };
    const [rows, total] = await Promise.all([
      col.find(f).sort({ createdAt: -1 }).skip(0).limit(20).toArray(),
      col.countDocuments(f),
    ]);
    return [rows, total];
  });
  const exT = await col.find({ $text: { $search: 'Sharma' } }).sort({ createdAt: -1 }).limit(20)
    .explain('executionStats');
  results.push({
    label: 'D_text_index_search',
    text_search: tText,
    text_explain: {
      stage: exT.queryPlanner.winningPlan.stage,
      input: exT.queryPlanner.winningPlan.inputStage ? exT.queryPlanner.winningPlan.inputStage.stage : null,
      keysExamined: exT.executionStats.totalKeysExamined,
      docsExamined: exT.executionStats.totalDocsExamined,
      ms: exT.executionStats.executionTimeMillis,
    },
  });

  console.log('\n===== RESULTS =====');
  console.log(JSON.stringify(results, null, 2));

  await mongoose.disconnect();
  await mongoose.connection.dropDatabase().catch(() => {});
  console.log('\nScratch DB dropped.');
  process.exit(0);
})().catch((e) => {
  console.error('BENCH ERROR:', e);
  process.exit(1);
});
