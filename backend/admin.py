# backend/admin.py
import os
from flask import Blueprint, request, jsonify, send_file
from celery.result import AsyncResult
from backend.models import db
from backend.models.user import User
from backend.models.customer import Customer
from backend.models.professional import Professional
from backend.models.service import Service
from backend.models.service_request import ServiceRequest
from backend.utils import role_required
from backend.cache import cache, invalidate_key, invalidate_pattern

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

# ────────────────────────────────────────────────
# DASHBOARD & SUMMARY
# ────────────────────────────────────────────────

@admin_bp.get("/dashboard")
@role_required("admin")
@cache.cached(timeout=30, key_prefix="admin:dashboard")
def dashboard():
    return jsonify({
        "totals": {
            "services": Service.query.count(),
            "professionals": Professional.query.count(),
            "professionals_pending": Professional.query.filter_by(status="pending").count(),
            "customers": Customer.query.count(),
            "requests": ServiceRequest.query.count(),
            "requests_pending": ServiceRequest.query.filter(
                ServiceRequest.status.in_(["requested", "assigned"])
            ).count(),
            "requests_completed": ServiceRequest.query.filter_by(status="completed").count(),
        },
        "recent_requests": [
            r.to_dict() for r in
            ServiceRequest.query.order_by(ServiceRequest.created_at.desc()).limit(5).all()
        ],
        "pending_professionals": [
            p.to_dict() for p in
            Professional.query.filter_by(status="pending").all()
        ],
    }), 200


@admin_bp.get("/summary")
@role_required("admin")
@cache.cached(timeout=30, key_prefix="admin:summary")
def summary():
    """Analytics for admin summary page (Chart.js data)."""
    total_services = Service.query.count()
    total_professionals = Professional.query.count()
    total_requests = ServiceRequest.query.count()

    svc_stats = db.session.query(
        Service.name,
        db.func.count(ServiceRequest.id).label("count")
    ).outerjoin(ServiceRequest, ServiceRequest.service_id == Service.id)\
     .filter(ServiceRequest.status == "completed")\
     .group_by(Service.name).all()

    cat_stats = db.session.query(
        Service.category,
        db.func.count(Service.id).label("count")
    ).group_by(Service.category).all()

    prof_ratings = db.session.query(
        Professional.full_name,
        db.func.avg(ServiceRequest.rating).label("avg_rating")
    ).outerjoin(ServiceRequest, ServiceRequest.professional_id == Professional.id)\
     .group_by(Professional.id)\
     .order_by(db.func.avg(ServiceRequest.rating).desc()).all()

    return jsonify({
        "totals": {
            "services": total_services,
            "professionals": total_professionals,
            "requests": total_requests,
        },
        "services_by_name": [{"name": s.name, "completed": s.count or 0} for s in svc_stats],
        "services_by_category": [{"category": c.category, "count": c.count} for c in cat_stats],
        "professionals_with_ratings": [
            {"name": p.full_name, "avg_rating": round(p.avg_rating, 2) if p.avg_rating else 0}
            for p in prof_ratings
        ],
    }), 200


# ────────────────────────────────────────────────
# SERVICES CRUD
# ────────────────────────────────────────────────

@admin_bp.get("/services")
@role_required("admin")
@cache.cached(timeout=60, key_prefix="admin:services")
def list_services():
    services = Service.query.filter_by(is_active=True).all()
    cats = db.session.query(Service.category).distinct().all()
    return jsonify({
        "services": [s.to_dict() for s in services],
        "categories": [c[0] for c in cats],
    }), 200


@admin_bp.get("/services/all")
@role_required("admin")
def list_all_services():
    return jsonify([s.to_dict() for s in Service.query.all()]), 200


@admin_bp.get("/services/<int:service_id>")
@role_required("admin")
def get_service(service_id):
    s = Service.query.get_or_404(service_id)
    return jsonify(s.to_dict()), 200


@admin_bp.post("/services")
@role_required("admin")
def create_service():
    data = request.get_json() or {}
    required = ["name", "category", "base_price"]
    if any(f not in data for f in required):
        return jsonify({"msg": f"required: {required}"}), 400
    svc = Service(
        name=data["name"],
        description=data.get("description", ""),
        base_price=float(data["base_price"]),
        category=data["category"],
        time_required=data.get("time_required", ""),
    )
    db.session.add(svc)
    db.session.commit()
    invalidate_key("admin:services")
    invalidate_key("admin:dashboard")
    return jsonify({"msg": "service created", "service": svc.to_dict()}), 201


@admin_bp.put("/services/<int:service_id>")
@role_required("admin")
def update_service(service_id):
    svc = Service.query.get_or_404(service_id)
    data = request.get_json() or {}
    svc.name = data.get("name", svc.name)
    svc.description = data.get("description", svc.description)
    svc.base_price = float(data.get("base_price", svc.base_price))
    svc.category = data.get("category", svc.category)
    svc.time_required = data.get("time_required", svc.time_required)
    db.session.commit()
    invalidate_key("admin:services")
    return jsonify({"msg": "service updated", "service": svc.to_dict()}), 200


@admin_bp.delete("/services/<int:service_id>")
@role_required("admin")
def delete_service(service_id):
    svc = Service.query.get_or_404(service_id)
    active = ServiceRequest.query.filter(
        ServiceRequest.service_id == service_id,
        ServiceRequest.status.in_(["requested", "assigned", "accepted"])
    ).count()
    if active > 0:
        return jsonify({"msg": "cannot delete service with active requests"}), 400
    svc.is_active = False  # soft delete
    db.session.commit()
    invalidate_key("admin:services")
    return jsonify({"msg": "service deleted"}), 200


# ────────────────────────────────────────────────
# PROFESSIONAL MANAGEMENT
# ────────────────────────────────────────────────

@admin_bp.get("/professionals")
@role_required("admin")
@cache.cached(timeout=30, key_prefix="admin:professionals")
def list_professionals():
    profs = Professional.query.all()
    return jsonify([p.to_dict() for p in profs]), 200


@admin_bp.get("/professionals/<int:prof_id>")
@role_required("admin")
def get_professional(prof_id):
    p = Professional.query.get_or_404(prof_id)
    return jsonify(p.to_dict()), 200


@admin_bp.post("/professionals/<int:prof_id>/action")
@role_required("admin")
def manage_professional(prof_id):
    """action: approve | reject | block | unblock"""
    data = request.get_json() or {}
    action = data.get("action", "").lower()
    p = Professional.query.get_or_404(prof_id)

    if action == "approve":
        p.status = "approved"
        p.user.is_active = True
    elif action == "reject":
        p.status = "rejected"
    elif action == "block":
        p.status = "blocked"
        p.user.is_active = False
    elif action == "unblock":
        p.status = "approved"
        p.user.is_active = True
    else:
        return jsonify({"msg": "invalid action — use: approve/reject/block/unblock"}), 400

    db.session.commit()
    invalidate_key("admin:professionals")
    invalidate_key("admin:dashboard")
    return jsonify({"msg": f"professional {action}d", "professional": p.to_dict()}), 200


@admin_bp.delete("/professionals/<int:prof_id>")
@role_required("admin")
def delete_professional(prof_id):
    p = Professional.query.get_or_404(prof_id)
    user = p.user
    db.session.delete(p)
    if user:
        db.session.delete(user)
    db.session.commit()
    invalidate_key("admin:professionals")
    return jsonify({"msg": "professional deleted"}), 200


# ────────────────────────────────────────────────
# CUSTOMER MANAGEMENT
# ────────────────────────────────────────────────

@admin_bp.get("/customers")
@role_required("admin")
@cache.cached(timeout=30, key_prefix="admin:customers")
def list_customers():
    customers = Customer.query.all()
    return jsonify([c.to_dict() for c in customers]), 200


@admin_bp.post("/customers/<int:cust_id>/block")
@role_required("admin")
def block_customer(cust_id):
    c = Customer.query.get_or_404(cust_id)
    c.user.is_active = False
    db.session.commit()
    invalidate_key("admin:customers")
    return jsonify({"msg": "customer blocked"}), 200


@admin_bp.post("/customers/<int:cust_id>/unblock")
@role_required("admin")
def unblock_customer(cust_id):
    c = Customer.query.get_or_404(cust_id)
    c.user.is_active = True
    db.session.commit()
    invalidate_key("admin:customers")
    return jsonify({"msg": "customer unblocked"}), 200


# ────────────────────────────────────────────────
# SERVICE REQUESTS MANAGEMENT
# ────────────────────────────────────────────────

@admin_bp.get("/requests")
@role_required("admin")
def list_requests():
    status = request.args.get("status")
    q = ServiceRequest.query
    if status:
        q = q.filter_by(status=status)
    reqs = q.order_by(ServiceRequest.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reqs]), 200


@admin_bp.delete("/requests/<int:req_id>")
@role_required("admin")
def delete_request(req_id):
    r = ServiceRequest.query.get_or_404(req_id)
    db.session.delete(r)
    db.session.commit()
    return jsonify({"msg": "request deleted"}), 200


# ────────────────────────────────────────────────
# SEARCH
# ────────────────────────────────────────────────

@admin_bp.post("/search")
@role_required("admin")
def admin_search():
    data = request.get_json() or {}
    search_type = data.get("search_type", "service")
    search_text = data.get("search_text", "").strip()

    results = []
    if search_type == "service":
        rows = Service.query.filter(
            Service.name.ilike(f"%{search_text}%") |
            Service.category.ilike(f"%{search_text}%")
        ).all()
        results = [{"id": r.id, "type": "service", "details": f"{r.name} — {r.category} ₹{r.base_price}"} for r in rows]

    elif search_type == "professional":
        rows = Professional.query.filter(
            Professional.full_name.ilike(f"%{search_text}%") |
            Professional.service_type.ilike(f"%{search_text}%")
        ).all()
        results = [{"id": r.id, "type": "professional", "details": f"{r.full_name} — {r.service_type} [{r.status}]"} for r in rows]

    elif search_type == "customer":
        rows = Customer.query.filter(
            Customer.full_name.ilike(f"%{search_text}%") |
            Customer.pincode.ilike(f"%{search_text}%")
        ).all()
        results = [{"id": r.id, "type": "customer", "details": f"{r.full_name} — {r.pincode}"} for r in rows]

    elif search_type == "request":
        rows = ServiceRequest.query.join(Service).join(Professional).filter(
            Service.name.ilike(f"%{search_text}%") |
            Professional.full_name.ilike(f"%{search_text}%") |
            ServiceRequest.status.ilike(f"%{search_text}%")
        ).all()
        results = [{"id": r.id, "type": "request", "details": f"#{r.id} {r.service.name} — {r.professional.full_name} [{r.status}]"} for r in rows]

    return jsonify({"results": results}), 200


# ────────────────────────────────────────────────
# BACKGROUND JOBS (CSV export)
# ────────────────────────────────────────────────

@admin_bp.post("/export/csv/trigger")
@role_required("admin")
def trigger_csv():
    from backend.tasks import export_csv
    task = export_csv.delay()
    return jsonify({"task_id": task.id, "msg": "CSV export started"}), 202


@admin_bp.get("/export/csv/status/<task_id>")
@role_required("admin")
def csv_status(task_id):
    result = AsyncResult(task_id)
    return jsonify({
        "task_id": task_id,
        "ready": result.ready(),
        "status": result.status,
        "result": result.result if result.ready() else None,
    }), 200


@admin_bp.get("/export/csv/download/<task_id>")
@role_required("admin")
def download_csv(task_id):
    result = AsyncResult(task_id)
    if not result.ready():
        return jsonify({"msg": "task not ready yet"}), 202
    file_path = result.result.get("file") if isinstance(result.result, dict) else None
    if not file_path or not os.path.exists(file_path):
        return jsonify({"msg": "file not found"}), 404
    return send_file(file_path, as_attachment=True), 200


@admin_bp.post("/export/report/trigger")
@role_required("admin")
def trigger_monthly_report():
    from backend.tasks import monthly_report
    task = monthly_report.delay()
    return jsonify({"task_id": task.id, "msg": "monthly report started"}), 202


@admin_bp.get("/export/report/status/<task_id>")
@role_required("admin")
def report_status(task_id):
    result = AsyncResult(task_id)
    return jsonify({
        "task_id": task_id,
        "ready": result.ready(),
        "status": result.status,
        "result": result.result if result.ready() else None,
    }), 200
