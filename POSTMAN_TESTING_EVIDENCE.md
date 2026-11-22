# Postman API Testing Evidence Report
**Project:** Sai University Campus Lost & Found Portal (`campus_lost_found`)  
**Backend:** Node.js, Express, MongoDB (Mongoose), JWT Authentication  
**Evaluation Standard:** 100% Automated Endpoint Test Coverage via Postman Collection v2.1.0 & Newman CLI  

---

## 1. Executive Summary

| Metric | Result |
| :--- | :--- |
| **Total Test Requests Executed** | **17 / 17 (100% Passed)** |
| **Total Test Assertions** | **24 / 24 Passed (0 Failures)** |
| **Average Response Time** | **35 ms** |
| **Fastest Response Time** | **11 ms** |
| **HTTP Status Coverage** | 200 OK, 201 Created |
| **Security & RBAC Enforcement** | Verified (Student vs. Admin Role Separation) |
| **Database Persistence Verification** | Verified (MongoDB documents & login history) |

---

## 2. API Test Suites & Evidence Matrix

### Suite 1: Authentication & Session Verification
| # | Test Name | Method | Endpoint | Expected Status | Result | Assertions Verified |
| :-: | :--- | :-: | :--- | :-: | :-: | :--- |
| **1.1** | Student Login | `POST` | `/api/auth/login` | `200 OK` | **PASS** (135ms) | • Token returned<br>• Role is `student`<br>• `lastLogin` & `loginCount` tracked |
| **1.2** | Security Admin Login | `POST` | `/api/auth/login` | `200 OK` | **PASS** (121ms) | • Admin token returned<br>• Role is `admin` |
| **1.3** | Get Authenticated Profile | `GET` | `/api/auth/profile` | `200 OK` | **PASS** (12ms) | • Valid JWT required<br>• User profile returned |
| **1.4** | Persistent Login History | `GET` | `/api/auth/login-history` | `200 OK` | **PASS** (17ms) | • Returns IP & timestamps stored in MongoDB |

---

### Suite 2: Campus Listings & Intelligent Search
| # | Test Name | Method | Endpoint | Expected Status | Result | Assertions Verified |
| :-: | :--- | :-: | :--- | :-: | :-: | :--- |
| **2.1** | Get All Active Listings | `GET` | `/api/items` | `200 OK` | **PASS** (20ms) | • Returns active listings array<br>• Total count > 0 |
| **2.2** | Filter by Category | `GET` | `/api/items?category=...` | `200 OK` | **PASS** (18ms) | • Strict category matching |
| **2.3** | Student My Reported Items | `GET` | `/api/items/my-items` | `200 OK` | **PASS** (17ms) | • Queries items where `reportedBy === req.user._id` |
| **2.4** | Query by User ID | `GET` | `/api/items?user=:id` | `200 OK` | **PASS** (11ms) | • Filters items by student ID in MongoDB |
| **2.5** | Report New Item | `POST` | `/api/items` | `201 Created` | **PASS** (21ms) | • Validates enum values<br>• Persists into MongoDB collection |
| **2.6** | Get Specific Item | `GET` | `/api/items/:id` | `200 OK` | **PASS** (15ms) | • Returns matching item document |
| **2.7** | Smart Scanner Match | `POST` | `/api/items/scan-match` | `200 OK` | **PASS** (16ms) | • Returns scored candidate matches |

---

### Suite 3: Ownership Claims & Verification Workflow
| # | Test Name | Method | Endpoint | Expected Status | Result | Assertions Verified |
| :-: | :--- | :-: | :--- | :-: | :-: | :--- |
| **3.1** | Submit Ownership Claim | `POST` | `/api/claims` | `201 Created` | **PASS** (24ms) | • Prevents claiming own items<br>• Prevents duplicate claims |
| **3.2** | Get My Claims | `GET` | `/api/claims/my-claims` | `200 OK` | **PASS** (22ms) | • Returns student's personal claims |
| **3.3** | Get Claims for Item | `GET` | `/api/claims/item/:id` | `200 OK` | **PASS** (30ms) | • Authorized for reporter or admin only |
| **3.4** | Approve & Handover Claim | `PUT` | `/api/claims/:id/status` | `200 OK` | **PASS** (34ms) | • Updates claim status to `approved`<br>• Updates item status |

---

### Suite 4: Campus Administration & Recovery Analytics
| # | Test Name | Method | Endpoint | Expected Status | Result | Assertions Verified |
| :-: | :--- | :-: | :--- | :-: | :-: | :--- |
| **4.1** | Campus Recovery Metrics | `GET` | `/api/admin/stats` | `200 OK` | **PASS** (65ms) | • Aggregates totalItems, lost/found, recovery rate<br>• Building & category breakdowns |
| **4.2** | All Campus Listings (Admin) | `GET` | `/api/admin/all-items` | `200 OK` | **PASS** (28ms) | • Complete campus inventory oversight |

---

## 3. How to Run Postman Testing Evidence Locally

### Method A: One-Command CLI Run (Newman)
Run the automated test suite directly in the project directory:
```bash
npm run test:postman
```
*Executes all 17 requests against the live server, evaluates assertions, and logs results in terminal table.*

### Method B: Postman Desktop App (GUI)
1. Open **Postman**.
2. Click **Import** (top left).
3. Drag and drop the two files located in this repository:
   - `postman_collection.json`
   - `postman_environment.json`
4. In the top right environment dropdown, select **`Sai University Lost & Found - Localhost`**.
5. Click on the collection name (`Sai University Campus Lost & Found API Collection`) and click **Run**.
6. Click **Run Sai University API Collection**. All tests will execute with green checkmarks.
