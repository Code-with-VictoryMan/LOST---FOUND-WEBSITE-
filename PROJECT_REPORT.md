# SAI UNIVERSITY
### School of Computing and Data Science
**B.Tech Computer Science | Academic Year 2026–2027**  
**Course:** Web Technology and Internet Programming  
**Project Title:** Campus Lost and Found Portal  
**Student Name:** Sai Sravan V  
**Submission Deadline:** 30 November 2026  
**Submission Platform:** Google Classroom  

---

## 1. Executive Summary & Problem Statement
On a vibrant higher education campus, students and staff routinely misplace personal belongings—ranging from student ID cards and laptops to scientific calculators, keys, and water bottles. Concurrently, good samaritans discover these items but lack a centralized, transparent platform to identify the legitimate owner. Physical notice boards and informal chat groups suffer from fragmentation, lack of searchability, and zero privacy or ownership verification.

This project delivers a responsive, full-stack, database-driven **Campus Lost and Found Portal** engineered to:
1. Provide a single, centralized database for reporting lost and found belongings across all Sai University buildings.
2. Provide real-time keyword search, campus-building filtering, category grouping, and incident-date sorting.
3. Facilitate secure, privacy-preserving ownership verification claims before handing over valuable property.
4. Supply an Administrative Dashboard with real-time analytics, recovery metrics, and visual distribution charts.

---

## 2. System Architecture & Tech Stack

### 2.1 Technology Stack
- **Frontend:** Semantic HTML5, Responsive CSS3 (CSS Custom Variables, Flexbox/Grid), Modern Vanilla JavaScript (ES6+ Modules, Fetch API, Async/Await, DOM manipulation).
- **Backend:** Node.js runtime with Express.js RESTful API architecture.
- **Database:** MongoDB with Mongoose ODM (featuring text indexing, subdocuments, and automated timestamps).
- **Security & Auth:** JSON Web Tokens (JWT) for stateless session handling, `bcryptjs` with salt rounds for one-way password hashing, and role-based access control (Student vs Admin).
- **Visualization:** Chart.js for campus building and category distribution visual metrics.
- **API Testing:** Postman API Suite (Automated JSON test suite with assertions).

### 2.2 System Architecture Diagram
```
+-------------------------------------------------------------+
|                     Client Browser Layer                    |
|  - HTML5 Responsive Interface (index.html, dashboard.html)   |
|  - Client-side Event Listeners & Async Fetch API (ES6+)     |
|  - Real-time Duplicate Detection & Chart.js Visualizations  |
+------------------------------+------------------------------+
                               | HTTPS / JSON Payloads
                               v
+-------------------------------------------------------------+
|                  Express.js Application Layer               |
|  - CORS & JSON Body Parser Middleware                       |
|  - JWT Authentication Guard (`protect` & `adminOnly`)       |
|  - RESTful Route Handlers (/api/auth, /items, /claims, etc)|
+------------------------------+------------------------------+
                               | Mongoose ODM Queries
                               v
+-------------------------------------------------------------+
|                     MongoDB Database Layer                  |
|  - Users Collection (Students, Faculty, Campus Security)    |
|  - Items Collection (Lost & Found reports, Text Indexing)   |
|  - Claims Collection (Proof of ownership & verification)    |
+------------------------------+------------------------------+
```

---

## 3. Database Design & Schemas

### 3.1 Entity-Relationship (ER) Schema
```
+-------------------+          +---------------------+          +-------------------+
|       User        | 1      * |        Item         | 1      * |       Claim       |
+-------------------+----------+---------------------+----------+-------------------+
| _id (ObjectId)    |          | _id (ObjectId)      |          | _id (ObjectId)    |
| name (String)     |          | title (String)      |          | item (Ref -> Item)|
| email (String, UQ)|          | type (lost/found)   |          | claimant (Ref->Usr|
| password (Hash)   |          | category (String)   |          | proof (String)    |
| role (std/admin)  |          | building (String)   |          | contactPhone(Str) |
| phone (String)    |          | specificLoc (String)|          | status (pnd/app/rj|
| createdAt (Date)  |          | status(open/claim/rs|          | reviewNotes (Str) |
+-------------------+          | reportedBy (Ref->Usr|          | createdAt (Date)  |
                               +---------------------+          +-------------------+
```

---

## 4. Custom Features Implemented
In accordance with Section 5 of the project syllabus:
1. **Interactive Administrative Dashboard Charts:** Integrated Chart.js to render real-time bar charts of campus building distribution and donut charts of category frequency.
2. **Campus Building & Specific Location Filter:** Specialized taxonomy covering official Sai University facilities (Academic Blocks A/B, Library, Dining Hall, Sports Complex, CS Labs, Auditorium, Campus Grounds).
3. **Automated Duplicate Match Alert:** Client triggers an asynchronous pre-flight check upon title entry. If an item in the same category was reported in that building, a warning badge alerts the student before duplicate submission.
4. **Camera Item Scanner & Instant Owner Lookup:** Allows a student who finds a misplaced item anywhere on campus to capture/upload a photo, identify the item, and scan active lost reports. If a match is found, the system instantly reveals verified owner contact details (Name, Department, Official Email, Phone) so the item can be returned immediately.

---

## 5. API Test Suite & Postman Evidence Table

| # | Endpoint | Method | Purpose | Auth | Expected Status |
|---|---|---|---|---|---|
| 1 | `/api/auth/register` | POST | Register new student account | None | 201 Created |
| 2 | `/api/auth/register` | POST | Validation error handling (missing password) | None | 400 Bad Request |
| 3 | `/api/auth/login` | POST | Verify credentials & issue JWT token | None | 200 OK |
| 4 | `/api/items` | GET | Filter items by category, building & keyword | None | 200 OK |
| 5 | `/api/items` | POST | Create item report with validation | Bearer JWT | 201 Created |
| 6 | `/api/items/:id` | GET | Retrieve single item details with populate | None | 200 OK |
| 7 | `/api/items` | POST | Guard against unauthorized access | None | 401 Unauthorized |
| 8 | `/api/claims` | POST | Submit ownership claim with proof description | Bearer JWT | 201 Created |
| 9 | `/api/items/scan-match` | POST | Scan found item keywords & return owner profile | None | 200 OK |
| 10 | `/api/auth/login` | POST | Admin login authentication | None | 200 OK |
| 11 | `/api/admin/stats` | GET | Access aggregate analytics and metrics | Admin JWT | 200 OK |

---

## 6. Deployment & Hosting Strategy
1. **Database:** Hosted on MongoDB Atlas Free M0 Tier cluster with IP whitelist (`0.0.0.0/0`).
2. **Application:** Deployed on Render / Railway as a Web Service running `node server.js`.
3. **Environment Secrets:** Managed via Cloud Dashboard environment variables (`MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`).

---

## 7. AI-Use Disclosure Statement
In compliance with Sai University academic honesty policies, Generative AI (Antigravity agent) was utilized as an intelligent pair-programming assistant to scaffold boilerplate Express routing, generate mock data fixtures for campus buildings, and format Postman JSON structures. All architectural design, system logic, data validation schemas, DOM manipulation routines, and final code reviews were authored, verified, and understood by the student.
