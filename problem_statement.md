# Household Services Application - V2

## 🛠 Overview

The **Household Services Application - V2** is a full-stack web application that connects customers with local service professionals for household needs like plumbing, AC repair, electrical work, and more. The platform supports three distinct roles—Admin, Customer, and Service Professional—each with specific features and access permissions.

The application is built with the following technologies:
- **Flask** (Backend/API)
- **Vue.js** (Frontend)
- **Bootstrap** (Styling)
- **SQLite** (Database)
- **Redis + Celery** (Caching and Background Jobs)

---

## 🚀 Features

### 🔐 Authentication and Role-Based Access (RBAC)
- JWT/session-based login/register for Customers and Service Professionals
- Admin login (no registration required)
- Distinct dashboards for each user role

### 🧑‍💼 Admin Capabilities
- Manage all users (Customers & Professionals)
- Approve professional profiles
- Block users based on reports
- Create/Update/Delete services
- Trigger CSV export of closed service requests

### 👩‍🔧 Service Professional Features
- Register/Login
- View and manage assigned service requests
- Accept/Reject new service requests
- Close completed services
- Ranked based on customer reviews

### 👤 Customer Features
- Register/Login
- Search services by name, pin code, or location
- Book, edit, or close service requests
- Leave reviews and remarks

### 🧰 Core Functionalities
- Full CRUD on services and service requests
- Reviews and ratings system
- Location-based service discovery

---

## ⏱ Backend Jobs (Celery + Redis)

### ⏰ Daily Reminder
- Sends automated alerts to service professionals for pending service requests

### 📊 Monthly Activity Report
- Emails customers a summary of their service history on the first of every month

### 📁 CSV Export (Async)
- Admin-triggered batch job to export all closed service requests to a downloadable CSV

---

## 🧩 Technology Stack

| Layer            | Technology                     |
|------------------|-------------------------------|
| **Backend**      | Flask                          |
| **Frontend**     | Vue.js                         |
| **Styling**      | Bootstrap                      |
| **Templates**    | Jinja2 (only for server-side rendering if required) |
| **Database**     | SQLite                         |
| **Caching**      | Redis                          |
| **Background Jobs** | Celery                      |

> ⚠️ Note: No external CSS frameworks or databases are permitted.
