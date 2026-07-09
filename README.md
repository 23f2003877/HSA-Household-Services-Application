# A-Z Household Services Application (HSA)

> **Student:** Parth Jain | **IITM:** 23f2003877 | **VIT:** 23bce10156

A full-stack Household Services platform built with **Flask + Vue 3 (CDN) + SQLite + Redis + Celery**.  
Customers can book home services, professionals manage requests, and admins control the entire platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Flask 3, SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt, Flask-Caching |
| Frontend | Vue 3 (CDN), Bootstrap 5.3, Bootstrap Icons, Chart.js, Axios |
| Database | SQLite (via SQLAlchemy) |
| Caching | Redis (via Flask-Caching) |
| Task Queue | Celery 5, Redis Broker |
| Async Jobs | Celery Beat — daily reminder + monthly report |

---

## Project Structure

```
P4 - HSA/
├── run.py                  # Flask entry point
├── .env.example            # Environment variable template
├── .gitignore
├── README.md
│
└── backend/
    ├── app.py              # Flask App Factory
    ├── config.py           # Config + Celery Beat schedules
    ├── auth.py             # /auth/* blueprint (login, register)
    ├── admin.py            # /admin/* blueprint
    ├── customer.py         # /customer/* blueprint
    ├── professional.py     # /professional/* blueprint
    ├── cache.py            # Redis cache helpers
    ├── utils.py            # JWT role_required() decorator
    ├── celery_app.py       # Celery instance + Beat schedule
    ├── tasks.py            # Celery tasks (reminder, report, CSV)
    ├── init_db.py          # DB seed (admin + 10 default services)
    ├── requirements.txt
    │
    ├── models/
    │   ├── __init__.py     # db instance
    │   ├── user.py         # User (all roles)
    │   ├── customer.py     # Customer profile
    │   ├── professional.py # Professional profile
    │   ├── service.py      # Service (name, category, price)
    │   └── service_request.py
    │
    └── static/
        ├── index.html      # SPA HTML shell
        ├── main.css        # Dark glassmorphism theme
        ├── app.js          # Vue 3 root + auth + routing
        └── components/
            ├── admin.js
            ├── customer.js
            └── professional.js
```

---

## Roles and Features

### Admin
- Dashboard with stats, pending approvals, recent requests
- Service CRUD (create, edit, soft-delete)
- Professional management (approve/reject/block/unblock/delete)
- Customer management (block/unblock)
- Service request management
- Search (professional, customer, service, request)
- Async CSV export via Celery
- Monthly report generation trigger
- Analytics with Chart.js (categories + ratings)

### Customer
- Browse and filter services by category
- Search services and professionals
- Book a service (select professional + date)
- My requests: cancel / close / rate (1-5 stars)
- Unrated request reminder
- Profile update

### Professional
- Accept, reject, complete assigned requests
- Search own requests
- Analytics summary (sentiment + status charts)
- Profile update

---

## Setup and Run

```bash
# 1. Create virtualenv
python -m venv venv
venv\Scripts\activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Configure
cp .env.example .env

# 4. Start app (auto-seeds DB on first run)
python run.py
```

Open http://localhost:5000

---

## Celery Workers

```bash
# Terminal 2 — Worker
celery -A backend.celery_app.celery worker --loglevel=info

# Terminal 3 — Beat scheduler
celery -A backend.celery_app.celery beat --loglevel=info
```

Redis must be running on localhost:6379.

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hsa.com | admin123 |

Register customers and professionals from the landing page.
Professionals require admin approval before login.

---

## API Summary

### Auth (/auth/)
- POST /auth/login
- POST /auth/register/customer
- POST /auth/register/professional
- GET  /auth/me

### Admin (/admin/) — admin JWT required
- GET  /admin/dashboard
- GET  /admin/summary
- GET/POST /admin/services
- PUT/DELETE /admin/services/id
- GET /admin/professionals
- POST /admin/professionals/id/action (approve/reject/block/unblock)
- GET /admin/customers
- POST /admin/customers/id/block|unblock
- GET /admin/requests
- POST /admin/search
- POST /admin/export/csv/trigger
- GET  /admin/export/csv/download/task_id

### Customer (/customer/) — customer JWT required
- GET  /customer/dashboard
- GET  /customer/services
- GET  /customer/search
- POST /customer/requests (book)
- GET  /customer/requests
- DELETE /customer/requests/id (cancel)
- POST /customer/requests/id/close
- POST /customer/requests/id/rate

### Professional (/professional/) — professional JWT required
- GET  /professional/dashboard
- GET  /professional/requests
- POST /professional/requests/id/accept|reject|complete
- GET  /professional/search
- GET  /professional/summary

---

## Celery Scheduled Tasks

| Task | Schedule | Output |
|------|----------|--------|
| daily_reminder | 8:00 PM IST daily | HTML log in backend/exports/reminders/ |
| monthly_report | 1st of month 4:00 AM IST | Per-customer HTML in backend/exports/reports/ |
| export_csv | User-triggered | CSV in backend/exports/csv/ |

---

*Built for IIT Madras — Modern Application Development II (MAD-2)*
