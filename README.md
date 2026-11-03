# Sai University — Campus Lost and Found Portal (SAIU PROJECTS)

A responsive, database-driven full-stack web application designed for Sai University students and faculty to report lost or found belongings, search listings, submit ownership verification claims, track recovery requests, and scan found items to locate owners.

> [!IMPORTANT]
> ### 🌐 Where to Find Frontend HTML Files
> All frontend HTML templates and static assets are located inside the **`public/`** directory:
> - **[`public/index.html`](public/index.html)**: Main campus portal interface (search & filter feed, report submission modals, smart camera item scanner, and menu drawer).
> - **[`public/dashboard.html`](public/dashboard.html)**: Personal user dashboard (my reports, claim verification tracking) and Campus Administrative Analytics console with Chart.js charts.
> - **[`public/styles.css`](public/styles.css)**: Atmospheric dark aesthetic styling, responsive layouts, and glassmorphic blur effects.
> - **[`public/app.js`](public/app.js)** & **[`public/dashboard.js`](public/dashboard.js)**: Client-side JavaScript, WebRTC camera scanner, dynamic DOM rendering, and API communication.

---

## Project Structure

```
campus-lost-and-found/
├── public/                     <-- ALL FRONTEND HTML, CSS & CLIENT JS
│   ├── index.html              <-- Main Portal Home Page
│   ├── dashboard.html          <-- Student & Admin Dashboard Page
│   ├── styles.css              <-- Global Stylesheet & Responsive Layouts
│   ├── app.js                  <-- Home Page Logic & Camera Scanner
│   ├── dashboard.js            <-- Dashboard Charts & Claim Handlers
│   └── sai-university-logo.png <-- Official Sai University Chennai Logo
├── config/
│   ├── db.js                   <-- MongoDB Mongoose Connection
│   └── offlineStore.js         <-- Resilient Offline Store Fallback
├── middleware/
│   └── auth.js                 <-- JWT Authentication & Role Authorization
├── models/
│   ├── User.js                 <-- User Schema (Student, Faculty, Admin)
│   ├── Item.js                 <-- Item Schema (Lost vs Found, Building Taxonomy)
│   └── Claim.js                <-- Ownership Claims Schema
├── routes/
│   ├── authRoutes.js           <-- Register, Login & Profile Endpoints
│   ├── itemRoutes.js           <-- CRUD, Search, Duplicate Check & Scan-Match
│   ├── claimRoutes.js          <-- Claim Submission & Approval Verification
│   └── adminRoutes.js          <-- Campus Recovery Statistics & Chart Feeds
├── lost_and_found_tests.json   <-- Postman API Automated Test Suite
├── PROJECT_REPORT.md           <-- Official Sai University Academic Report
├── package.json
└── server.js                   <-- Express.js Application Entry Point
```

---

## Core Features

- **Semantic HTML5 & Responsive Design:** Clean semantic markup in `public/index.html` and `public/dashboard.html` with responsive CSS3 grid/flexbox layouts.
- **Smart Camera Item Scanner & Owner Lookup:** Built-in WebRTC camera capture and optical/keyword matcher to identify lost items and display owner contact information immediately.
- **RESTful API Backend:** Modular Express.js architecture with centralized error handling and input validation.
- **Persistent Database with Resilient Offline Store:** MongoDB Atlas with Mongoose schemas, text search indices, and zero-downtime offline fallback store.
- **Authentication & Role Authorization:** Secure registration and login using JWT and bcrypt password hashing (`student`, `faculty`, `admin`).
- **Real-Time Duplicate Item Detection:** Alerts users if a similar item was already registered in the specified campus building.
- **Campus Building Taxonomy:** Standardized locations across Sai University (Library, CS Labs, Academic Blocks A/B, Dining Hall, Sports Complex, Auditorium, Lawn).
- **Administrative Analytics Dashboard:** Interactive recovery rate counters and Chart.js bar and doughnut charts.
- **Automated Seeding:** 12 pre-populated realistic campus items and evaluation accounts.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=sai_university_lost_and_found_jwt_secret_key_2026
NODE_ENV=development
```

### 3. Seed Database (Optional)
```bash
npm run seed
```

### 4. Start Application
```bash
npm start
```
Open **`http://localhost:5000`** in your browser.

---

## Evaluation Credentials

| Role | Email | Password |
|---|---|---|
| **Campus Admin** | `admin@saiuniversity.edu.in` | `AdminPassword123` |
| **Student 1** | `saisravan@saiuniversity.edu.in` | `StudentPassword123` |
| **Student 2** | `aditi.sharma@saiuniversity.edu.in` | `StudentPassword123` |

---

## Postman API Testing
Import `lost_and_found_tests.json` into Postman to run all 11 automated test cases against `http://localhost:5000`.
