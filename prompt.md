# MEDICARE — HOSPITAL MANAGEMENT SYSTEM
## 45-PHASE DEVELOPMENT MASTER PROMPT

You are my senior full-stack developer, software architect, debugging assistant, and project mentor.

I am building a full-stack Hospital Management System called **MediCare**.

I have already started development, so you MUST work with my existing project rather than rebuilding it from scratch.

## REFERENCE PROJECT

Reference website:

https://medicare-frontend-kyt9.onrender.com/

Reference YouTube tutorial:

https://www.youtube.com/watch?v=ml1n5OMuNhs

Use the reference website primarily for:
- UI inspiration
- page structure
- feature ideas
- workflow
- overall user experience

Do NOT copy copyrighted code, branding, proprietary assets, or credentials.

The final project should be my own implementation with a professional hospital-management-system design.

---

# 🚨 MOST IMPORTANT DEVELOPMENT RULE

The project MUST be developed in **exactly 45 meaningful phases**.

Each phase corresponds to **ONE Git commit**.

However, I will NOT automatically commit after every phase.

The workflow MUST be:

```text
PHASE 01
   ↓
Implement
   ↓
Test
   ↓
Fix errors
   ↓
I approve
   ↓
I Git commit + push
   ↓
I tell you "Phase 01 completed"
   ↓
PHASE 02
```

Repeat this process until:

```text
PHASE 45
   ↓
Final testing
   ↓
I approve
   ↓
Final Git commit + push
```

## ABSOLUTE RULE

**NEVER start the next phase until I explicitly approve the current phase.**

If I say:

> Phase 1 completed

then you may start Phase 2.

If I have not approved the phase, stay on the current phase.

If there are errors, bugs, or incomplete functionality, DO NOT move to the next phase.

---

# EXISTING PROJECT RULE

I have already started the project.

Before implementing anything:

1. Inspect my existing project.
2. Understand the current architecture.
3. Identify what is already implemented.
4. Identify incomplete features.
5. Identify bugs.
6. Identify technologies already being used.
7. Reuse existing code whenever reasonable.
8. Do not unnecessarily rewrite working code.
9. Do not create duplicate components/routes/models.
10. Adapt the 45 phases to my actual current project.

If a phase is already partially completed, finish it instead of recreating it.

---

# TECH STACK

Prefer the following stack unless my existing project already uses a different compatible technology.

## Frontend

- React
- Vite
- React Router
- Axios
- Lucide React
- Recharts
- CSS / CSS Modules
- Responsive design

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt
- dotenv
- CORS
- Multer
- Cloudinary
- Nodemailer

## Database

MongoDB Atlas

## Deployment

Frontend:
Vercel

Backend:
Render

Database:
MongoDB Atlas

---

# SECURITY RULES

Never expose sensitive credentials.

Use `.env`.

Never commit:

```text
.env
API keys
database passwords
JWT secrets
Cloudinary secrets
payment secrets
email passwords
private credentials
```

Create:

```text
.env.example
```

with placeholder values.

When I provide credentials later, tell me:

1. Where the credential belongs.
2. Whether it belongs in frontend or backend.
3. The exact environment-variable name.
4. Whether it is safe to expose publicly.

Never hardcode secrets.

---

# USER ROLES

The application should support:

### 1. Admin

Full hospital management access.

### 2. Doctor

- View appointments
- View patients
- Medical records
- Prescriptions
- Doctor dashboard

### 3. Patient

- Profile
- Book appointments
- View appointments
- Medical records
- Prescriptions
- Bills
- Lab reports

### 4. Receptionist

- Patient management
- Appointment management
- Admission
- Discharge
- Billing

### 5. Pharmacist

- Medicine inventory
- Prescriptions
- Dispensing

### 6. Lab Technician

- Laboratory requests
- Test processing
- Test results
- Report uploads

---

# DEVELOPMENT PRINCIPLES

Every feature should be:

- modular
- reusable
- maintainable
- responsive
- secure
- properly validated
- properly error handled

Use meaningful names.

Avoid duplicated code.

Create reusable components where appropriate.

Use loading states.

Use empty states.

Use error states.

Use success/error notifications where appropriate.

Do not create unnecessary complexity.

---

# UI/UX REQUIREMENTS

The application should look like a professional modern hospital management platform.

Design characteristics:

- Clean
- Modern
- Professional
- Medical/hospital themed
- Responsive
- Accessible
- Consistent spacing
- Consistent typography
- Consistent buttons
- Consistent forms
- Professional tables
- Dashboard cards
- Charts
- Status badges
- Modals
- Toast notifications
- Loading indicators
- Empty states
- Error states

The UI should work on:

- Desktop
- Laptop
- Tablet
- Mobile

Use the reference website as visual inspiration, but implement the design independently.

---

# 45 DEVELOPMENT PHASES

## PHASE 01 — EXISTING PROJECT AUDIT

Do NOT make major changes initially.

Inspect:

- project structure
- frontend
- backend
- package.json
- existing routes
- existing components
- existing pages
- existing models
- existing API
- authentication
- database
- environment configuration
- Git status/history

Create a clear architecture understanding.

Determine which of the 45 phases are already partially implemented.

Commit message:

```bash
chore: audit existing project and define architecture
```

---

## PHASE 02 — PROJECT ARCHITECTURE & CLEANUP

Organize the existing project.

Recommended frontend:

```text
src/
├── components/
├── pages/
├── layouts/
├── hooks/
├── context/
├── services/
├── utils/
├── assets/
└── styles/
```

Recommended backend:

```text
backend/
├── controllers/
├── models/
├── routes/
├── middleware/
├── services/
├── utils/
└── config/
```

Do not break existing functionality.

Commit:

```bash
refactor: organize frontend and backend architecture
```

---

## PHASE 03 — ENVIRONMENT CONFIGURATION

Configure environment variables.

Backend examples:

```text
PORT=
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_USER=
EMAIL_PASSWORD=
FRONTEND_URL=
```

Frontend:

```text
VITE_API_URL=
```

Create `.env.example`.

Update `.gitignore`.

Commit:

```bash
chore: configure environment variables
```

---

## PHASE 04 — DATABASE CONNECTION

Implement MongoDB Atlas connection using Mongoose.

Add:

- connection utility
- connection error handling
- server startup handling
- health-check endpoint

Test the connection.

Commit:

```bash
feat: connect application to MongoDB
```

---

## PHASE 05 — USER MODEL

Create/complete User model.

Fields:

```text
name
email
password
phone
role
profileImage
isActive
createdAt
updatedAt
```

Support roles:

```text
admin
doctor
patient
receptionist
pharmacist
lab_technician
```

Hash passwords with bcrypt.

Commit:

```bash
feat: add user authentication model
```

---

## PHASE 06 — BACKEND AUTHENTICATION

Implement:

```text
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

Implement:

- bcrypt
- JWT
- authentication middleware
- safe user responses
- validation
- error handling

Never return passwords.

Commit:

```bash
feat: implement JWT authentication
```

---

## PHASE 07 — FRONTEND AUTHENTICATION

Create:

- Login
- Registration
- Logout
- AuthContext
- Protected routes
- Current-user handling

Connect frontend to backend API.

Commit:

```bash
feat: implement frontend authentication
```

---

## PHASE 08 — ROLE-BASED ACCESS CONTROL

Implement role permissions.

Admin:

```text
Full access
```

Doctor:

```text
Appointments
Patients
Medical records
Prescriptions
```

Patient:

```text
Own appointments
Own medical records
Own prescriptions
Own bills
```

Receptionist:

```text
Patients
Appointments
Admissions
Billing
```

Pharmacist:

```text
Pharmacy
Prescriptions
Inventory
```

Lab technician:

```text
Laboratory
Test reports
```

Commit:

```bash
feat: implement role based access control
```

---

## PHASE 09 — MAIN APPLICATION LAYOUT

Create:

- Sidebar
- Navbar
- Header
- User menu
- Notification area
- Mobile navigation
- Page container

Create consistent dashboard layout.

Commit:

```bash
feat: create responsive dashboard layout
```

---

## PHASE 10 — ADMIN DASHBOARD

Create admin dashboard.

Display:

- Total patients
- Total doctors
- Today's appointments
- Pending appointments
- Revenue
- Available beds
- Occupied beds

Charts:

- Patients
- Appointments
- Revenue

Use Recharts.

Commit:

```bash
feat: create admin dashboard analytics
```

---

## PHASE 11 — PATIENT MODEL & API

Create Patient model.

Fields:

```text
user
patientId
name
email
phone
gender
dateOfBirth
bloodGroup
address
emergencyContact
profileImage
medicalHistory
allergies
```

Implement CRUD APIs.

Commit:

```bash
feat: add patient management
```

---

## PHASE 12 — PATIENT MANAGEMENT UI

Create:

- Patient list
- Patient table
- Search
- Filters
- Add patient
- Edit patient
- Delete patient
- Patient details

Commit:

```bash
feat: create patient management interface
```

---

## PHASE 13 — DOCTOR MODEL & API

Create Doctor model.

Fields:

```text
user
doctorId
name
specialization
department
qualification
experience
phone
email
consultationFee
availability
profileImage
bio
```

Create APIs.

Commit:

```bash
feat: add doctor management
```

---

## PHASE 14 — DOCTOR MANAGEMENT UI

Create:

- Doctor list
- Doctor cards
- Doctor table
- Doctor details
- Add doctor
- Edit doctor
- Delete doctor
- Doctor profile

Add search and specialization filtering.

Commit:

```bash
feat: create doctor management interface
```

---

## PHASE 15 — DEPARTMENT MANAGEMENT

Create Department model.

Fields:

```text
name
description
headDoctor
location
status
```

Implement:

- CRUD
- Department list
- Department details
- Search/filter

Commit:

```bash
feat: add hospital department management
```

---

## PHASE 16 — APPOINTMENT MODEL

Create Appointment model.

Fields:

```text
patient
doctor
department
appointmentDate
appointmentTime
reason
status
notes
createdAt
```

Statuses:

```text
pending
confirmed
completed
cancelled
rejected
```

Commit:

```bash
feat: create appointment system
```

---

## PHASE 17 — APPOINTMENT BOOKING

Patient workflow:

```text
Department
↓
Doctor
↓
Date
↓
Available Time
↓
Reason
↓
Confirm
```

Create appointment booking UI.

Commit:

```bash
feat: implement appointment booking
```

---

## PHASE 18 — APPOINTMENT MANAGEMENT

Implement:

- Appointment list
- Search
- Filter
- Confirm
- Reject
- Cancel
- Complete
- Status badges

Role-based access.

Commit:

```bash
feat: implement appointment management workflow
```

---

## PHASE 19 — DOCTOR DASHBOARD

Doctor dashboard:

- Today's appointments
- Upcoming appointments
- Total patients
- Pending consultations
- Recent records
- Quick actions

Commit:

```bash
feat: create doctor dashboard
```

---

## PHASE 20 — PATIENT DASHBOARD

Patient dashboard:

- Upcoming appointment
- Recent prescriptions
- Medical history
- Bills
- Doctor information

Quick actions:

- Book appointment
- Medical records
- Prescriptions
- Bills

Commit:

```bash
feat: create patient dashboard
```

---

## PHASE 21 — MEDICAL RECORD MODEL

Create MedicalRecord model.

Fields:

```text
patient
doctor
appointment
symptoms
diagnosis
bloodPressure
temperature
pulse
weight
notes
treatmentPlan
followUpDate
createdAt
```

Commit:

```bash
feat: add medical records system
```

---

## PHASE 22 — MEDICAL RECORD UI

Doctor:

- Create record
- Edit record
- View patient history

Patient:

- View own records

Create timeline-style history.

Commit:

```bash
feat: implement medical records interface
```

---

## PHASE 23 — PRESCRIPTION MODEL

Create Prescription model.

Fields:

```text
patient
doctor
appointment
medicines
diagnosis
instructions
validUntil
createdAt
```

Medicine:

```text
medicine
dosage
frequency
duration
quantity
instructions
```

Commit:

```bash
feat: add prescription management
```

---

## PHASE 24 — PRESCRIPTION UI

Doctor can create prescriptions.

Dynamic medicine rows:

```text
Medicine
Dosage
Frequency
Duration
Quantity
Instructions
```

Allow adding/removing medicines.

Patients can view prescriptions.

Commit:

```bash
feat: create prescription interface
```

---

## PHASE 25 — MEDICINE MODEL

Create Medicine model.

Fields:

```text
name
category
manufacturer
batchNumber
expiryDate
price
stock
reorderLevel
description
```

Commit:

```bash
feat: add medicine inventory model
```

---

## PHASE 26 — PHARMACY INVENTORY

Implement:

- Add medicine
- Edit medicine
- Delete medicine
- Search
- Filters
- Stock adjustment
- Low-stock alerts
- Expiry warnings

Commit:

```bash
feat: implement pharmacy inventory
```

---

## PHASE 27 — PRESCRIPTION DISPENSING

Pharmacist workflow:

```text
View prescription
↓
Check stock
↓
Dispense medicine
↓
Decrease inventory
↓
Mark prescription dispensed
```

Prevent dispensing when stock is insufficient.

Commit:

```bash
feat: implement prescription dispensing
```

---

## PHASE 28 — LABORATORY MODEL

Create LabTest model.

Fields:

```text
patient
doctor
testName
category
price
status
result
reportFile
requestedAt
completedAt
```

Statuses:

```text
requested
processing
completed
cancelled
```

Commit:

```bash
feat: add laboratory management
```

---

## PHASE 29 — LABORATORY DASHBOARD

Lab technician can:

- View requests
- Accept test
- Process test
- Enter result
- Upload report
- Complete test

Patient can view completed reports.

Commit:

```bash
feat: create laboratory workflow
```

---

## PHASE 30 — WARD & BED MANAGEMENT

Create:

### Ward

```text
name
type
floor
capacity
```

### Bed

```text
bedNumber
ward
status
patient
```

Statuses:

```text
available
occupied
maintenance
```

Create management UI.

Commit:

```bash
feat: add ward and bed management
```

---

## PHASE 31 — PATIENT ADMISSION

Implement:

- Select patient
- Select ward
- Select bed
- Admission date
- Admission reason

Automatically mark bed occupied.

Commit:

```bash
feat: implement patient admission workflow
```

---

## PHASE 32 — PATIENT DISCHARGE

Implement:

- Discharge patient
- Calculate stay duration
- Release bed
- Generate discharge summary
- Prepare final bill

Commit:

```bash
feat: implement patient discharge workflow
```

---

## PHASE 33 — BILLING MODEL

Create Invoice model.

Fields:

```text
invoiceNumber
patient
appointment
services
medicines
labTests
roomCharges
consultationFee
subtotal
discount
tax
total
paymentStatus
paymentMethod
createdAt
```

Commit:

```bash
feat: add billing system
```

---

## PHASE 34 — BILLING UI

Create:

- Billing dashboard
- Invoice creation
- Invoice list
- Invoice details
- Search
- Filters
- Paid/pending status

Create professional invoice layout.

Commit:

```bash
feat: create billing interface
```

---

## PHASE 35 — ONLINE PAYMENT

If required, integrate Razorpay or another suitable payment provider.

Implement:

- Order creation
- Payment verification
- Transaction ID
- Payment status

Never store card information.

Keep all secret keys in backend `.env`.

Commit:

```bash
feat: integrate secure online payments
```

---

## PHASE 36 — CLOUDINARY FILE UPLOAD

Integrate Cloudinary.

Support:

- Profile images
- Doctor images
- Patient images
- Lab reports
- Medical documents

Validate file type and size.

Commit:

```bash
feat: add cloud file storage
```

---

## PHASE 37 — EMAIL NOTIFICATIONS

Implement email notifications for:

- Registration
- Appointment confirmation
- Appointment cancellation
- Appointment reminder
- Prescription availability
- Lab report availability
- Invoice generation

Use Nodemailer.

Commit:

```bash
feat: add email notifications
```

---

## PHASE 38 — NOTIFICATION SYSTEM

Create Notification model.

Fields:

```text
user
title
message
type
isRead
createdAt
```

Create:

- Notification dropdown
- Unread count
- Mark as read
- Mark all as read

Commit:

```bash
feat: implement notification system
```

---

## PHASE 39 — ADVANCED SEARCH & FILTERING

Improve search/filtering for:

- Patients
- Doctors
- Appointments
- Medicines
- Prescriptions
- Invoices
- Laboratory tests

Add:

- Pagination
- Sorting
- Date filters
- Status filters

Commit:

```bash
feat: add advanced search and filtering
```

---

## PHASE 40 — REPORTS & ANALYTICS

Create analytics dashboard.

Reports:

- Patient growth
- Appointment statistics
- Revenue
- Doctor performance
- Medicine usage
- Lab tests
- Bed occupancy

Add date-range filtering.

Use charts.

Commit:

```bash
feat: add hospital reports and analytics
```

---

## PHASE 41 — PROFILE & SETTINGS

Profile:

- Name
- Phone
- Profile image
- Password
- Address

Hospital settings:

- Hospital name
- Contact
- Address
- Currency
- Notifications

Commit:

```bash
feat: add profile and hospital settings
```

---

## PHASE 42 — SECURITY HARDENING

Perform security audit.

Check/implement:

- Helmet
- CORS
- Rate limiting
- JWT validation
- bcrypt
- Input validation
- Authorization
- Secure cookies where appropriate
- Environment variables
- Error handling
- MongoDB injection protection
- File upload validation

Remove sensitive console logs.

Commit:

```bash
security: harden application security
```

---

## PHASE 43 — UI/UX POLISH

Improve entire application.

Focus on:

- Typography
- Spacing
- Colors
- Cards
- Tables
- Buttons
- Forms
- Modals
- Sidebar
- Dashboard
- Loading states
- Empty states
- Error states
- Toast notifications
- Responsive behavior
- Animations

Make the application look production-ready.

Commit:

```bash
style: polish hospital management UI
```

---

## PHASE 44 — COMPLETE TESTING & BUG FIXING

Perform end-to-end testing.

Test:

- Registration
- Login
- Logout
- Role permissions
- Patients
- Doctors
- Departments
- Appointments
- Medical records
- Prescriptions
- Pharmacy
- Laboratory
- Admission
- Discharge
- Billing
- Payments
- Notifications
- File uploads
- Reports

Test:

- Desktop
- Tablet
- Mobile

Check:

- Browser console
- Network errors
- Backend errors
- API errors
- Database errors

Fix discovered bugs.

Commit:

```bash
test: complete end to end application testing
```

---

## PHASE 45 — PRODUCTION DEPLOYMENT

Prepare final production release.

Frontend:

```text
Vercel
```

Backend:

```text
Render
```

Database:

```text
MongoDB Atlas
```

Configure:

- Production API URL
- CORS
- Environment variables
- JWT
- Cloudinary
- Email
- Payment system

Create documentation:

```text
README.md
SETUP.md
API_DOCUMENTATION.md
```

README should include:

- Project overview
- Features
- Technologies
- Architecture
- Installation
- Environment variables
- Database setup
- API routes
- User roles
- Demo accounts
- Deployment
- Screenshots
- Future improvements

Build and test the production version.

Final commit:

```bash
chore: prepare project for production deployment
```

---

# 🧪 TESTING RULE FOR EVERY PHASE

At the end of EVERY phase, you must provide:

## 1. Implementation summary

Explain what changed.

## 2. Files changed

Show:

```text
Created:
- ...

Modified:
- ...

Deleted:
- ...
```

## 3. How to test

Give exact commands.

Example:

```bash
npm run dev
```

Then explain exactly what I should click/test.

## 4. Expected result

Tell me what should happen.

## 5. Common errors

Tell me what errors I might encounter and how to fix them.

## 6. Git commit

Give exactly one commit command:

```bash
git add .
git commit -m "..."
git push origin main
```

## 7. STOP

After completing the phase, STOP.

Do NOT start the next phase.

Wait for my confirmation.

---

# 🚦 APPROVAL SYSTEM

I will explicitly tell you:

```text
Phase 01 completed
```

or:

```text
Phase 1 approved
```

Only after that should you begin Phase 02.

If I say:

```text
Phase 1 has an error
```

remain on Phase 01.

If I provide an error screenshot/log:

- diagnose it
- fix it
- retest it
- remain on the same phase

Do not move forward until I approve.

---

# 🐛 ERROR DEBUGGING RULE

When I send an error:

First explain:

```text
ROOT CAUSE:
...
```

Then:

```text
FILE:
...
```

Then:

```text
CHANGE:
...
```

Then provide the corrected code.

Then explain:

```text
TEST:
...
```

Do not rewrite unrelated files.

Do not introduce unnecessary dependencies.

Do not change architecture unless required.

---

# 🔑 API KEY / CREDENTIAL RULE

When I give you a key such as:

```text
MongoDB URI
Cloudinary key
Razorpay key
Email credentials
JWT secret
```

tell me exactly where to put it.

Example:

```env
MONGO_URI=your_value_here
JWT_SECRET=your_value_here
```

Never place secrets directly inside source code.

Never place private backend secrets inside React/Vite frontend variables.

Remember:

```text
VITE_* variables are exposed to the frontend.
```

Therefore private secrets must remain backend-only.

---

# 📦 DEPENDENCY RULE

Before installing a package:

1. Check whether it already exists.
2. Use an existing dependency if possible.
3. Install only when necessary.
4. Explain why the dependency is required.

Do not install unnecessary libraries.

---

# 🗃️ DATABASE RULE

Use Mongoose models with:

- validation
- timestamps where appropriate
- indexes where useful
- references where appropriate

Avoid unnecessary duplication.

Use proper relationships between:

```text
User
Patient
Doctor
Department
Appointment
MedicalRecord
Prescription
Medicine
LabTest
Ward
Bed
Admission
Invoice
Notification
```

---

# 🔐 AUTHORIZATION RULE

Never trust frontend role checks alone.

The backend must verify:

```text
Authentication
+
Authorization
```

For example, a patient must NOT be able to access another patient's medical records simply by changing an ID in the URL.

Always enforce ownership and role permissions on the backend.

---

# 📱 RESPONSIVENESS RULE

Every UI feature must be checked on:

```text
Desktop
Tablet
Mobile
```

Do not finish a phase if the feature only works on desktop.

---

# 🎨 DESIGN RULE

Use the reference MediCare project for inspiration.

Do not blindly clone it.

The final product should have:

- its own implementation
- clean component architecture
- consistent design system
- professional UI
- original code
- original assets where possible

---

# 🧠 COMMUNICATION STYLE

Explain technical concepts in a beginner-friendly way because I am still learning full-stack development.

When giving code:

- Give complete code when a file needs substantial changes.
- Otherwise show the exact section to change.
- Clearly mention file paths.
- Avoid unexplained advanced concepts.
- Explain why a change is required.

Do not overwhelm me with future-phase implementation.

Only discuss the current phase.

---

# 🚨 FINAL RULE

At any point in the project, if I say:

> "Start Phase X"

you should first inspect the current state and determine whether previous phases were actually completed.

Never blindly assume the project is in the expected state.

The project must ultimately reach:

```text
45 meaningful phases
45 meaningful Git commits
Fully functional Hospital Management System
Secure authentication
Role-based access
Professional UI
Responsive frontend
Production backend
MongoDB database
Deployment-ready architecture
Complete documentation
```

START NOW WITH:

# PHASE 01 — EXISTING PROJECT AUDIT

Do NOT implement Phase 02.

Do NOT make unnecessary changes.

First inspect my existing project and tell me what is already implemented.