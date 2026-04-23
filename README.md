# College Attendance Management System

A robust, multi-role web application designed for educational institutions to efficiently manage student attendance, academic marks, leave requests, timetable scheduling, and more. Built with React, Vite, Tailwind CSS, and powered by Cloudflare Workers and D1 Database.

## 🌟 Key Features

### Multi-Role Architecture
The system supports four distinct user roles, each with specialized modules and access controls:
- **Admin:** Overall system configuration, user management, semester transitions, and bulk data uploads.
- **HOD (Head of Department):** Department-level analytics, leave/condonation approvals, timetable management, and notice distribution.
- **Teacher:** Mark attendance (including multi-class and borrowed lectures), process condonation requests, and view historical attendance data.
- **Student:** View personal attendance records, academic marks, request condonations, and access end-semester submissions.

### Advanced Modules
- **Attendance & Condonation Workflow:** Complete tracking of daily attendance with a dedicated multi-stage condonation request process.
- **OCR Integration:** Built-in support for processing schedules and documents via Tesseract.js.
- **Data Import/Export:** Bulk upload and management capabilities via CSV parsing (using PapaParse) and file saving exports.
- **Analytics & Reporting:** Visual insights via Recharts for quick administrative analysis and oversight.
- **Real-time Notifications:** In-app notifications using React Hot Toast and notice boards to keep all entities aligned.

## 🛠 Tech Stack
- **Frontend:** React 19, React Router DOM, Tailwind CSS
- **Build Tool:** Vite
- **Backend/API:** Cloudflare Workers (Hono)
- **Database:** Cloudflare D1 (SQLite)
- **File Storage:** Cloudflare R2
- **Auth:** JWT-based session management (jose)

---

## 📝 Compliance & Implementation Specification Checklist

_Status: `[x]` = Implemented | `[/]` = In Progress | `[ ]` = Pending_

### Environment & Deployment
- [x] Frontend: React + Vite + Tailwind CSS
- [x] Backend: Cloudflare Workers + Hono
- [x] Database: Cloudflare D1 (SQL)
- [x] File Storage: Cloudflare R2
- [x] Local Development: Wrangler dev

### User Roles & Auth
- [x] 4 Roles: Admin, HOD, Teacher, Student
- [x] JWT-based Authentication
- [x] Role-based routing and API protection
- [x] Password hashing with bcryptjs

### Database Schema (D1)
- [x] `branches`, `users`, `students` tables
- [x] `subjects`, `subject_assignments` tables
- [x] `lectures`, `attendance` tables
- [x] `attendance_change_requests`, `attendance_condonation` tables
- [x] `ct_marks`, `endsem_marks` tables
- [x] `holidays`, `timetable`, `notices` tables
- [x] `system_config`, `archive_log` tables

### Advanced Logic & Workflows
- [x] Multi-Class Attendance
- [x] Borrowed / Reference Lecture Logic
- [x] OCR processing for Timetable images
- [x] Semester Archiving and Summary generation

---

## 🚀 Getting Started

### Local Development
1. Clone the repository
2. Install dependencies: `npm install`
3. Initialize local D1 database: `npm run db:setup`
4. Set up `.dev.vars` with a `JWT_SECRET` (min 16 chars)
5. Start the development server (Frontend + Worker): `npm run dev:full`

### Deployment
1. Build the frontend: `npm run build`
2. Deploy to Cloudflare: `npx wrangler deploy`
