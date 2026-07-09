# backend/customer.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from backend.models import db
from backend.models.customer import Customer
from backend.models.professional import Professional
from backend.models.service import Service
from backend.models.service_request import ServiceRequest
from backend.utils import role_required, current_user_id
from backend.cache import cache, invalidate_key

customer_bp = Blueprint("customer", __name__, url_prefix="/customer")


def _get_customer():
    """Helper: fetch Customer for the current JWT user."""
    uid = current_user_id()
    return Customer.query.filter_by(user_id=uid).first()


# ─── PROFILE ────────────────────────────────────

@customer_bp.get("/profile")
@role_required("customer")
def profile():
    c = _get_customer()
    if not c:
        return jsonify({"msg": "profile not found"}), 404
    return jsonify(c.to_dict()), 200


@customer_bp.put("/profile")
@role_required("customer")
def update_profile():
    c = _get_customer()
    if not c:
        return jsonify({"msg": "profile not found"}), 404
    data = request.get_json() or {}
    c.full_name = data.get("full_name", c.full_name)
    c.address = data.get("address", c.address)
    c.pincode = data.get("pincode", c.pincode)
    db.session.commit()
    return jsonify({"msg": "profile updated", "profile": c.to_dict()}), 200


# ─── SERVICES & PROFESSIONALS ────────────────────

@customer_bp.get("/services")
@role_required("customer")
@cache.cached(timeout=60, key_prefix="customer:services")
def list_services():
    """All active services. Optional ?category= filter."""
    cat = request.args.get("category", "")
    q = Service.query.filter_by(is_active=True)
    if cat:
        q = q.filter_by(category=cat)
    services = q.all()
    cats = db.session.query(Service.category).distinct().all()
    return jsonify({
        "services": [s.to_dict() for s in services],
        "categories": [c[0] for c in cats],
    }), 200


@customer_bp.get("/search")
@role_required("customer")
def search():
    """Search services or professionals."""
    by = request.args.get("by", "service")
    text = request.args.get("q", "").strip()
    pincode = request.args.get("pincode", "").strip()

    if not text and not pincode:
        return jsonify({"msg": "q or pincode required"}), 400

    if by == "service":
        rows = Service.query.filter(
            Service.is_active == True,
            (Service.name.ilike(f"%{text}%") | Service.category.ilike(f"%{text}%"))
        ).all()
        return jsonify({"results": [s.to_dict() for s in rows]}), 200

    elif by == "professional":
        q = Professional.query.filter_by(status="approved")
        if text:
            q = q.filter(
                Professional.full_name.ilike(f"%{text}%") |
                Professional.service_type.ilike(f"%{text}%")
            )
        if pincode:
            q = q.filter(Professional.pincode == pincode)
        rows = q.all()
        return jsonify({"results": [p.to_dict() for p in rows]}), 200

    return jsonify({"msg": "invalid 'by' — use 'service' or 'professional'"}), 400


@customer_bp.get("/professionals/<category>")
@role_required("customer")
@cache.cached(timeout=60, key_prefix="customer:professionals")
def professionals_by_category(category):
    profs = Professional.query.filter_by(service_type=category, status="approved").all()
    return jsonify([p.to_dict() for p in profs]), 200


@customer_bp.get("/services-by-category/<category>")
@role_required("customer")
@cache.cached(timeout=60, key_prefix="customer:svc_by_cat")
def services_by_category(category):
    svcs = Service.query.filter_by(category=category, is_active=True).all()
    return jsonify([s.to_dict() for s in svcs]), 200


# ─── SERVICE REQUESTS ────────────────────────────

@customer_bp.post("/requests")
@role_required("customer")
def create_request():
    """Create a new service request."""
    c = _get_customer()
    if not c:
        return jsonify({"msg": "customer profile not found"}), 404

    data = request.get_json() or {}
    service_id = data.get("service_id")
    professional_id = data.get("professional_id")
    date_str = data.get("date_of_request")

    if not all([service_id, professional_id, date_str]):
        return jsonify({"msg": "service_id, professional_id, date_of_request required"}), 400

    svc = Service.query.get(service_id)
    prof = Professional.query.get(professional_id)

    if not svc or not prof:
        return jsonify({"msg": "invalid service or professional"}), 400
    if prof.status != "approved":
        return jsonify({"msg": "professional is not approved"}), 400
    if prof.service_type != svc.category:
        return jsonify({"msg": "professional does not offer this service category"}), 400

    try:
        date_of_request = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"msg": "date format must be YYYY-MM-DD"}), 400

    req = ServiceRequest(
        service_id=service_id,
        customer_id=c.id,
        professional_id=professional_id,
        date_of_request=date_of_request,
        status="requested",
    )
    db.session.add(req)
    db.session.commit()
    invalidate_key("admin:dashboard")
    return jsonify({"msg": "service request created", "request": req.to_dict()}), 201


@customer_bp.get("/requests")
@role_required("customer")
def list_requests():
    c = _get_customer()
    if not c:
        return jsonify([]), 200
    reqs = ServiceRequest.query.filter_by(customer_id=c.id)\
        .order_by(ServiceRequest.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reqs]), 200


@customer_bp.delete("/requests/<int:req_id>")
@role_required("customer")
def cancel_request(req_id):
    c = _get_customer()
    r = ServiceRequest.query.get_or_404(req_id)
    if r.customer_id != c.id:
        return jsonify({"msg": "forbidden"}), 403
    if r.status not in ("requested", "assigned"):
        return jsonify({"msg": "only requested/assigned requests can be cancelled"}), 400
    db.session.delete(r)
    db.session.commit()
    return jsonify({"msg": "request cancelled"}), 200


@customer_bp.post("/requests/<int:req_id>/close")
@role_required("customer")
def close_request(req_id):
    """Customer closes (marks done) a completed request."""
    c = _get_customer()
    r = ServiceRequest.query.get_or_404(req_id)
    if r.customer_id != c.id:
        return jsonify({"msg": "forbidden"}), 403
    if r.status not in ("completed", "accepted"):
        return jsonify({"msg": "request is not in completed/accepted state"}), 400
    r.status = "closed"
    r.date_of_completion = datetime.utcnow().date()
    db.session.commit()
    return jsonify({"msg": "request closed", "request": r.to_dict()}), 200


@customer_bp.post("/requests/<int:req_id>/rate")
@role_required("customer")
def rate_request(req_id):
    """Submit rating + remarks for a closed request."""
    c = _get_customer()
    r = ServiceRequest.query.get_or_404(req_id)
    if r.customer_id != c.id:
        return jsonify({"msg": "forbidden"}), 403
    if r.status not in ("closed", "completed"):
        return jsonify({"msg": "can only rate closed/completed requests"}), 400

    data = request.get_json() or {}
    rating = data.get("rating")
    remarks = data.get("remarks", "")

    try:
        rating = int(rating)
        if not 1 <= rating <= 5:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"msg": "rating must be 1–5"}), 400

    r.rating = rating
    r.remarks = remarks
    db.session.commit()
    return jsonify({"msg": "rating submitted", "request": r.to_dict()}), 200


@customer_bp.get("/requests/unrated")
@role_required("customer")
def unrated_requests():
    c = _get_customer()
    if not c:
        return jsonify([]), 200
    reqs = ServiceRequest.query.filter(
        ServiceRequest.customer_id == c.id,
        ServiceRequest.status.in_(["closed", "completed"]),
        ServiceRequest.rating.is_(None)
    ).all()
    return jsonify([r.to_dict() for r in reqs]), 200


# ─── DASHBOARD ────────────────────────────────────

@customer_bp.get("/dashboard")
@role_required("customer")
def dashboard():
    c = _get_customer()
    if not c:
        return jsonify({"msg": "customer profile not found"}), 404

    all_requests = ServiceRequest.query.filter_by(customer_id=c.id).all()
    by_status = {}
    for r in all_requests:
        by_status.setdefault(r.status, []).append(r.to_dict())

    services = Service.query.filter_by(is_active=True).limit(12).all()
    cats = db.session.query(Service.category).distinct().all()

    return jsonify({
        "profile": c.to_dict(),
        "requests_by_status": by_status,
        "total_requests": len(all_requests),
        "services": [s.to_dict() for s in services],
        "categories": [c[0] for c in cats],
    }), 200
