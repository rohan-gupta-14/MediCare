/* TEMPORARY — Phase 15 UI smoke seed. Removed after run. */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User.model');
const Doctor = require('./models/Doctor.model');
const Department = require('./models/Department.model');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  await User.deleteMany({ email: /@(deptsmoke|deptstaff)\.example\.com$/ });
  await Doctor.deleteMany({ email: /@deptsmoke\.example\.com$/ });
  await Department.deleteMany({});

  await User.create({
    name: 'Dept Smoke Admin',
    email: 'admin@deptsmoke.example.com',
    password: 'Admin123!',
    role: 'admin',
  });
  await User.create({
    name: 'Dept Smoke Doctor',
    email: 'doctor@deptstaff.example.com',
    password: 'Doctor123!',
    role: 'doctor',
  });

  const docA = await Doctor.create({
    name: 'Dr. Head Smoke',
    email: 'head@deptsmoke.example.com',
    specialization: 'Cardiology',
    qualification: 'MBBS, MD',
    experience: 11,
    consultationFee: 850,
  });
  const docB = await Doctor.create({
    name: 'Dr. Spare Smoke',
    email: 'spare@deptsmoke.example.com',
    specialization: 'Neurology',
    qualification: 'MBBS, MD',
    experience: 7,
    consultationFee: 700,
  });

  const cardio = await Department.create({
    name: 'Cardiology',
    description: 'Heart care unit',
    location: 'Block A, Floor 2',
    status: 'active',
  });
  await Department.create({
    name: 'Neurology',
    description: 'Neuro sciences',
    location: 'Block B',
    status: 'inactive',
  });

  console.log('Seeded. cardio=', cardio._id.toString(), 'docA=', docA._id.toString(), 'docB=', docB._id.toString());
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
