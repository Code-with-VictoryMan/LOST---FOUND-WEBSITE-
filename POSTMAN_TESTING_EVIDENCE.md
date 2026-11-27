# Postman API Testing Evidence Report
**Project:** Sai University Campus Lost & Found Portal (`campus_lost_found`)  
**Live Deployment URL:** `https://lost-found-website-sai-university.onrender.com`  
**Backend Stack:** Node.js, Express, MongoDB Atlas (Mongoose), JWT Authentication  
**Evaluation Standard:** 100% Automated Endpoint Test Coverage via Postman Collection v2.1.0 & Newman CLI  
**Test Date:** November 27, 2026  

---

## 1. Executive Summary

| Metric | Postman Desktop App Run | Newman CLI Run |
| :--- | :--- | :--- |
| **Target Environment** | Live Render (`lost-found-website-sai-university.onrender.com`) | Live Render (`lost-found-website-sai-university.onrender.com`) |
| **Total Test Requests Executed** | **18 / 18 (100% Passed)** | **18 / 18 (100% Passed)** |
| **Total Test Assertions** | **25 / 25 Passed (0 Failures)** | **25 / 25 Passed (0 Failures)** |
| **Total Run Duration** | **6s 832ms** | **8.5s** |
| **Average Response Time** | **274 ms** | **388 ms** (min: 242 ms, max: 906 ms) |
| **HTTP Status Coverage** | `200 OK`, `201 Created` | `200 OK`, `201 Created` |
| **Security & RBAC Enforcement** | Verified (Student vs. Admin Role Separation) | Verified (Student vs. Admin Role Separation) |
| **Database Persistence Verification** | Verified (MongoDB Atlas documents & login history) | Verified (MongoDB Atlas documents & login history) |

---

## 2. API Test Suites & Evidence Matrix (Live Render Run)

### Suite 1: Authentication & Session Verification
| # | Test Name | Method | Endpoint | Expected Status | Result | Assertions Verified |
| :-: | :--- | :-: | :--- | :-: | :-: | :--- |
| **1.1** | Student Login | `POST` | `/api/auth/login` | `200 OK` | **PASS** (906ms) | • Token returned<br>• Role is `student`<br>• `lastLogin` & `loginCount` tracked |
| **1.2** | Security Admin Login | `POST` | `/api/auth/login` | `200 OK` | **PASS** (689ms) | • Admin token returned<br>• Role is `admin` |
| **1.3** | Get Authenticated Profile | `GET` | `/api/auth/profile` | `200 OK` | **PASS** (262ms) | • Valid JWT required<br>• User profile returned |
| **1.4** | Persistent Login History | `GET` | `/api/auth/login-history` | `200 OK` | **PASS** (263ms) | • Returns IP & timestamps stored in MongoDB |

---

### Suite 2: Campus Listings & Intelligent Search
| # | Test Name | Method | Endpoint | Expected Status | Result | Assertions Verified |
| :-: | :--- | :-: | :--- | :-: | :-: | :--- |
| **2.1** | Get All Active Items Feed | `GET` | `/api/items` | `200 OK` | **PASS** (251ms) | • Returns active listings array<br>• Non-negative count (`>= 0`) |
| **2.2** | Filter Items by Category | `GET` | `/api/items?category=Electronics%20%26%20Gadgets` | `200 OK` | **PASS** (259ms) | • Strict category matching |
| **2.3** | Get Current Student Reported Items | `GET` | `/api/items/my-items` | `200 OK` | **PASS** (277ms) | • Queries items where `reportedBy === req.user._id` |
| **2.4** | Filter Items by User ID Query | `GET` | `/api/items?user=:id` | `200 OK` | **PASS** (560ms) | • Filters items by student ID in MongoDB |
| **2.5** | Report New Lost or Found Item | `POST` | `/api/items` | `201 Created` | **PASS** (264ms) | • Admin-authored item persisted into MongoDB<br>• Captures `targetClaimItemId` |
| **2.6** | Get Specific Item by ID | `GET` | `/api/items/:id` | `200 OK` | **PASS** (779ms) | • Returns matching item document |
| **2.7** | Smart Scanner & AI Keyword Match | `POST` | `/api/items/scan-match` | `200 OK` | **PASS** (243ms) | • Returns scored candidate matches |

---

### Suite 3: Ownership Claims & Verification Workflow
| # | Test Name | Method | Endpoint | Expected Status | Result | Assertions Verified |
| :-: | :--- | :-: | :--- | :-: | :-: | :--- |
| **3.1** | Submit Ownership Claim | `POST` | `/api/claims` | `201 Created` | **PASS** (312ms) | • Student submits claim on admin-reported item<br>• Enforces ownership & duplicate-claim rules |
| **3.2** | Get My Submitted Claims | `GET` | `/api/claims/my-claims` | `200 OK` | **PASS** (512ms) | • Returns student's personal claims |
| **3.3** | Get Claims for Reported Item | `GET` | `/api/claims/item/:id` | `200 OK` | **PASS** (392ms) | • Authorized for reporter or admin only |
| **3.4** | Decide Claim (Admin Review & Handover) | `PUT` | `/api/claims/:id/status` | `200 OK` | **PASS** (250ms) | • Updates claim status to `approved`<br>• Updates item status |

---

### Suite 4: Campus Administration & Recovery Analytics
| # | Test Name | Method | Endpoint | Expected Status | Result | Assertions Verified |
| :-: | :--- | :-: | :--- | :-: | :-: | :--- |
| **4.1** | Get Campus Analytics & Recovery Rate | `GET` | `/api/admin/stats` | `200 OK` | **PASS** (250ms) | • Aggregates totalItems, lost/found, recovery rate<br>• Building & category breakdowns |
| **4.2** | Get All Campus Listings for Admin Oversight | `GET` | `/api/admin/all-items` | `200 OK` | **PASS** (287ms) | • Complete campus inventory oversight |
| **4.3** | Audit Student Database & Login Records | `GET` | `/api/admin/student-logins` | `200 OK` | **PASS** (242ms) | • Live MongoDB audit of registered students<br>• Login counts, timestamps & session history |

---

## 3. How to Reproduce Postman Testing Evidence

### Method A: One-Command CLI Run (Newman)
Run the automated test suite directly in the project directory:
```bash
npx newman run postman_collection.json -e postman_environment.json --env-var "baseUrl=https://lost-found-website-sai-university.onrender.com"
```
*Executes all 18 requests against the live Render server, evaluates all 25 assertions, and logs results in a terminal table.*

### Method B: Postman Desktop App (GUI)
1. Open **Postman Desktop App**.
2. Click **Import** (top left) and select:
   - `postman_collection.json`
   - `postman_environment.json`
3. In the top-right environment dropdown, select **`Sai University Lost & Found - Localhost`** (with `baseUrl` set to `https://lost-found-website-sai-university.onrender.com`).
4. Click **`Sai University Campus Lost & Found API Collection`** -> **Run** -> **Start run**.
5. All 18 requests and 25 assertions execute with `0` errors.
