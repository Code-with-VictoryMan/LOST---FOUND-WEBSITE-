# Sai University — Campus Lost and Found Portal

A responsive, database-driven full-stack web application designed for Sai University students and faculty to report lost or found belongings, search listings, submit ownership verification claims, and track recovery requests.

---

## Features
- **Semantic HTML5 & Responsive CSS3:** Modern responsive interface with glassmorphism card layouts, mobile-first design, and status indicators.
- **RESTful API Backend:** Modular Express.js architecture with centralized error handling.
- **Persistent Database:** MongoDB with Mongoose schemas, text search indices, and relational references.
- **Authentication & Role Authorization:** Secure registration, login, and protected routes using JWT and bcrypt password hashing (`student`, `faculty`, `admin`).
- **Search & Filter Pipeline:** Real-time search by keyword, category, listing type (Lost vs Found), campus building, and date.
- **Ownership Verification & Claims Pipeline:** Students submit proof of ownership; item reporters or administrators review and approve/reject requests.
- **Custom Enhancements:**
  1. Real-time duplicate item detection alert.
  2. Campus building taxonomy (Block A/B, Library, Dining Hall, CS Labs, etc.).
  3. Interactive Administrative Analytics Dashboard with Chart.js charts.
- **Automated Seeding:** 12+ pre-populated realistic campus items and evaluation accounts.
- **Postman API Suite:** 10 test cases in `lost_and_found_tests.json`.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
A default `.env` file is provided:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/campus_lost_found
JWT_SECRET=sai_university_lost_and_found_jwt_secret_key_2026
NODE_ENV=development
```

### 3. Seed Database
Make sure MongoDB is running (locally or on MongoDB Atlas), then run:
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

## Postman Testing Evidence
Import `lost_and_found_tests.json` into Postman to run all 10 automated test cases against `http://localhost:5000`.
