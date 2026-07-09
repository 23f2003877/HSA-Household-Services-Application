# backend/tasks.py
# -----------------------------------------------------------------------
# Celery tasks for A-Z Household Services
#
# Tasks:
#   1. daily_reminder      — Alert professionals with pending requests (8 PM IST)
#   2. monthly_report      — HTML activity report for all customers (1st of month)
#   3. export_csv          — Admin-triggered CSV of closed service requests
# -----------------------------------------------------------------------

import os
import csv
import traceback
from datetime import datetime, timezone, timedelta

from celery import shared_task

IST = timezone(timedelta(hours=5, minutes=30))

EXPORT_FOLDER = os.environ.get(
    "EXPORT_FOLDER", os.path.join(os.getcwd(), "backend", "exports")
)
os.makedirs(EXPORT_FOLDER, exist_ok=True)


def _make_flask_app():
    from backend.app import create_app
    return create_app()


# -----------------------------------------------------------------------
# 1. DAILY REMINDER
#    Runs at 8:00 PM IST via Celery Beat.
#    Finds professionals with pending/assigned requests and logs them.
# -----------------------------------------------------------------------
@shared_task(bind=True, name="backend.tasks.daily_reminder")
def daily_reminder(self):
    """
    Daily reminder for professionals with pending service requests.
    Logs a reminder sheet to backend/exports/reminders/.
    Extend with email/webhook as needed.
    """
    try:
        app = _make_flask_app()
        with app.app_context():
            from backend.models.service_request import ServiceRequest
            from backend.models.professional import Professional

            now_ist = datetime.now(IST)
            today = now_ist.date()

            pending = (
                ServiceRequest.query
                .filter(ServiceRequest.status.in_(["requested", "assigned"]))
                .all()
            )

            # Group by professional
            prof_map = {}
            for req in pending:
                pid = req.professional_id
                if pid not in prof_map:
                    prof_map[pid] = {"professional": req.professional, "requests": []}
                prof_map[pid]["requests"].append(req)

            reminders_dir = os.path.join(EXPORT_FOLDER, "reminders")
            os.makedirs(reminders_dir, exist_ok=True)
            filename = f"reminders_{today.strftime('%Y%m%d')}.html"
            filepath = os.path.join(reminders_dir, filename)

            rows_html = ""
            for pid, data in prof_map.items():
                prof = data["professional"]
                for req in data["requests"]:
                    rows_html += (
                        f"<tr>"
                        f"<td>{getattr(prof, 'full_name', 'N/A')}</td>"
                        f"<td>{getattr(prof, 'user', None) and prof.user.email or 'N/A'}</td>"
                        f"<td>{req.id}</td>"
                        f"<td>{getattr(req.service, 'name', 'N/A')}</td>"
                        f"<td>{req.date_of_request}</td>"
                        f"<td>{req.status}</td>"
                        f"</tr>\n"
                    )

            with open(filepath, "w", encoding="utf-8") as fh:
                fh.write(f"""<!DOCTYPE html><html><head><meta charset='utf-8'>
<title>Daily Reminder — {today}</title>
<style>
body{{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;padding:20px}}
h1{{font-size:18px;color:#38bdf8}}
p.meta{{font-size:12px;color:#94a3b8}}
table{{border-collapse:collapse;width:100%}}
th,td{{border:1px solid #334155;padding:6px 10px;font-size:13px}}
th{{background:#1e293b}}
</style></head><body>
<h1>Daily Reminder — Professionals with Pending Requests</h1>
<p class='meta'>Generated {now_ist.isoformat()} IST &nbsp;|&nbsp; Total pending: {len(pending)}</p>
<table><thead><tr><th>Professional</th><th>Email</th><th>Request#</th>
<th>Service</th><th>Requested On</th><th>Status</th></tr></thead>
<tbody>{rows_html}</tbody></table></body></html>""")

            return {
                "status": "SUCCESS",
                "date": today.isoformat(),
                "pending_count": len(pending),
                "file": os.path.abspath(filepath),
            }

    except Exception as e:
        tb = traceback.format_exc()
        return {"status": "FAIL", "error": str(e), "trace": tb}


# -----------------------------------------------------------------------
# 2. MONTHLY REPORT
#    1st of month, 4:00 AM IST via Celery Beat.
#    Generates per-customer HTML activity report.
# -----------------------------------------------------------------------
@shared_task(bind=True, name="backend.tasks.monthly_report")
def monthly_report(self, year=None, month=None):
    """
    Generate monthly HTML activity report for all customers.
    Saved to backend/exports/reports/YYYY-MM/.
    """
    try:
        app = _make_flask_app()
        with app.app_context():
            from backend.models.customer import Customer
            from backend.models.service_request import ServiceRequest

            now_ist = datetime.now(IST)
            if not year:
                year = now_ist.year
            if not month:
                month = now_ist.month

            month_str = f"{year:04d}-{month:02d}"
            reports_dir = os.path.join(EXPORT_FOLDER, "reports", month_str)
            os.makedirs(reports_dir, exist_ok=True)

            customers = Customer.query.all()
            files_generated = []

            for customer in customers:
                reqs = (
                    ServiceRequest.query
                    .filter(ServiceRequest.customer_id == customer.id)
                    .filter(
                        ServiceRequest.date_of_request >= f"{year}-{month:02d}-01",
                        ServiceRequest.date_of_request < f"{year}-{month+1:02d}-01" if month < 12 else f"{year+1}-01-01",
                    )
                    .all()
                )

                rows = ""
                for r in reqs:
                    rows += (
                        f"<tr>"
                        f"<td>{r.id}</td>"
                        f"<td>{getattr(r.service, 'name', 'N/A')}</td>"
                        f"<td>{getattr(r.service, 'category', 'N/A')}</td>"
                        f"<td>{getattr(r.professional, 'full_name', 'N/A')}</td>"
                        f"<td>₹{getattr(r.service, 'base_price', 0)}</td>"
                        f"<td>{r.date_of_request}</td>"
                        f"<td>{r.status}</td>"
                        f"<td>{'⭐' * (r.rating or 0)}</td>"
                        f"</tr>\n"
                    )

                filename = f"report_{customer.id}_{month_str}.html"
                filepath = os.path.join(reports_dir, filename)

                cid = customer.user.email if customer.user else f"ID#{customer.id}"
                with open(filepath, "w", encoding="utf-8") as fh:
                    fh.write(f"""<!DOCTYPE html><html><head><meta charset='utf-8'>
<title>Monthly Report — {cid} — {month_str}</title>
<style>
body{{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;padding:20px}}
h1{{font-size:20px;color:#34d399}}h2{{font-size:14px;color:#94a3b8}}
table{{border-collapse:collapse;width:100%;margin-top:16px}}
th,td{{border:1px solid #334155;padding:6px 10px;font-size:13px}}
th{{background:#1e293b}}
</style></head><body>
<h1>Monthly Activity Report — {month_str}</h1>
<h2>Customer: {customer.full_name} ({cid})</h2>
<h2>Total Requests: {len(reqs)}</h2>
<table><thead><tr><th>#</th><th>Service</th><th>Category</th>
<th>Professional</th><th>Price</th><th>Date</th><th>Status</th><th>Rating</th></tr></thead>
<tbody>{rows}</tbody></table></body></html>""")

                files_generated.append(os.path.abspath(filepath))

            return {
                "status": "SUCCESS",
                "month": month_str,
                "customers": len(customers),
                "files": files_generated,
            }

    except Exception as e:
        tb = traceback.format_exc()
        return {"status": "FAIL", "error": str(e), "trace": tb}


# -----------------------------------------------------------------------
# 3. CSV EXPORT (User-triggered from admin dashboard)
#    Exports all closed service requests to CSV.
# -----------------------------------------------------------------------
@shared_task(bind=True, name="backend.tasks.export_csv")
def export_csv(self):
    """
    Export closed/completed service requests to CSV.
    Returns the filepath once done.
    """
    try:
        app = _make_flask_app()
        with app.app_context():
            from backend.models.service_request import ServiceRequest

            now_ist = datetime.now(IST)
            csv_dir = os.path.join(EXPORT_FOLDER, "csv")
            os.makedirs(csv_dir, exist_ok=True)

            ts = now_ist.strftime("%Y%m%d%H%M%S")
            filename = f"service_requests_closed_{ts}.csv"
            filepath = os.path.join(csv_dir, filename)

            reqs = ServiceRequest.query.filter(
                ServiceRequest.status.in_(["completed", "closed"])
            ).all()

            with open(filepath, "w", newline="", encoding="utf-8") as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow([
                    "Request_ID", "Service_ID", "Service_Name", "Category",
                    "Customer_ID", "Customer_Name", "Customer_Address",
                    "Professional_ID", "Professional_Name",
                    "Date_of_Request", "Date_of_Completion",
                    "Status", "Rating", "Remarks"
                ])
                for r in reqs:
                    writer.writerow([
                        r.id,
                        r.service_id,
                        getattr(r.service, "name", ""),
                        getattr(r.service, "category", ""),
                        r.customer_id,
                        getattr(r.customer, "full_name", ""),
                        getattr(r.customer, "address", ""),
                        r.professional_id,
                        getattr(r.professional, "full_name", ""),
                        r.date_of_request.isoformat() if r.date_of_request else "",
                        r.date_of_completion.isoformat() if r.date_of_completion else "",
                        r.status,
                        r.rating or "",
                        r.remarks or "",
                    ])

            return {"status": "SUCCESS", "file": os.path.abspath(filepath), "count": len(reqs)}

    except Exception as e:
        tb = traceback.format_exc()
        return {"status": "FAIL", "error": str(e), "trace": tb}
