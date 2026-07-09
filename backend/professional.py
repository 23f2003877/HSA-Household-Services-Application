# backend/professional.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from backend.models import db
from backend.models.professional import Professional
from backend.models.service_request import ServiceRequest
from backend.models.customer import Customer
from backend.models.service import Service
from backend.utils import role_required, current_user_id
from backend.cache import cache, invalidate_key

professional_bp = Blueprint("professional", __name__, url_prefix="/professional")


def _get_professional():
    uid = current_user_id()
    return Professional.query.filter_by(user_id=uid).first()


# ─── PROFILE ────────────────────────────────────

@professional_bp.get("/profile")
@role_required("professional")
def profile():
    p = _get_professional()
    if not p:
        return jsonify({"msg": "profile not found"}), 404
    return jsonify(p.to_dict()), 200


@professional_bp.put("/profile")
@role_required("professional")
def update_profile():
    p = _get_professional()
    if not p:
        return jsonify({"msg": "profile not found"}), 404
    data = request.get_json() or {}
    p.full_name = data.get("full_name", p.full_name)
    p.experience = data.get("experience", p.experience)
    p.address = data.get("address", p.address)
    p.pincode = data.get("pincode", p.pincode)
    p.description = data.get("description", p.description)
    db.session.commit()
    return jsonify({"msg": "profile updated", "profile": p.to_dict()}), 200


# ─── DASHBOARD ────────────────────────────────────

@professional_bp.get("/dashboard")
@role_required("professional")
def dashboard():
    p = _get_professional()
    if not p:
        return jsonify({"msg": "professional profile not found"}), 404

    all_reqs = ServiceRequest.query.filter_by(professional_id=p.id)\
        .order_by(ServiceRequest.created_at.desc()).all()

    by_status = {}
    for r in all_reqs:
        by_status.setdefault(r.status, []).append(r.to_dict())

    return jsonify({
        "profile": p.to_dict(),
        "requests_by_status": by_status,
        "total_requests": len(all_reqs),
    }), 200


# ─── SERVICE REQUESTS ────────────────────────────

@professional_bp.get("/requests")
@role_required("professional")
def list_requests():
    p = _get_professional()
    if not p:
        return jsonify([]), 200
    status = request.args.get("status")
    q = ServiceRequest.query.filter_by(professional_id=p.id)
    if status:
        q = q.filter_by(status=status)
    reqs = q.order_by(ServiceRequest.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reqs]), 200


@professional_bp.post("/requests/<int:req_id>/accept")
@role_required("professional")
def accept_request(req_id):
    p = _get_professional()
    r = ServiceRequest.query.get_or_404(req_id)
    if r.professional_id != p.id:
        return jsonify({"msg": "forbidden"}), 403
    if r.status not in ("requested", "assigned"):
        return jsonify({"msg": "request is not in requested/assigned state"}), 400
    r.status = "accepted"
    db.session.commit()
    invalidate_key("admin:dashboard")
    return jsonify({"msg": "request accepted", "request": r.to_dict()}), 200


@professional_bp.post("/requests/<int:req_id>/reject")
@role_required("professional")
def reject_request(req_id):
    p = _get_professional()
    r = ServiceRequest.query.get_or_404(req_id)
    if r.professional_id != p.id:
        return jsonify({"msg": "forbidden"}), 403
    if r.status not in ("requested", "assigned"):
        return jsonify({"msg": "can only reject pending/assigned requests"}), 400
    r.status = "rejected"
    db.session.commit()
    return jsonify({"msg": "request rejected", "request": r.to_dict()}), 200


@professional_bp.post("/requests/<int:req_id>/complete")
@role_required("professional")
def complete_request(req_id):
    p = _get_professional()
    r = ServiceRequest.query.get_or_404(req_id)
    if r.professional_id != p.id:
        return jsonify({"msg": "forbidden"}), 403
    if r.status != "accepted":
        return jsonify({"msg": "can only complete accepted requests"}), 400
    r.status = "completed"
    r.date_of_completion = datetime.utcnow().date()
    db.session.commit()
    return jsonify({"msg": "request marked completed", "request": r.to_dict()}), 200


# ─── SEARCH ────────────────────────────────────

@professional_bp.get("/search")
@role_required("professional")
def search():
    p = _get_professional()
    if not p:
        return jsonify({"msg": "professional profile not found"}), 404

    q_text = request.args.get("q", "").strip()
    if not q_text:
        return jsonify({"msg": "q parameter required"}), 400

    reqs = ServiceRequest.query.join(Customer).join(Service).filter(
        ServiceRequest.professional_id == p.id,
        (Service.name.ilike(f"%{q_text}%") | Customer.full_name.ilike(f"%{q_text}%"))
    ).all()
    return jsonify([r.to_dict() for r in reqs]), 200


# ─── SUMMARY / ANALYTICS ─────────────────────────

@professional_bp.get("/summary")
@role_required("professional")
@cache.cached(timeout=60, key_prefix="professional:summary")
def summary():
    p = _get_professional()
    if not p:
        return jsonify({"msg": "professional profile not found"}), 404

    ratings_data = db.session.query(
        ServiceRequest.rating,
        db.func.count(ServiceRequest.id)
    ).filter_by(professional_id=p.id).group_by(ServiceRequest.rating).all()

    rating_buckets = {"positive": 0, "neutral": 0, "negative": 0}
    for rating, count in ratings_data:
        if rating is None:
            continue
        if rating >= 4:
            rating_buckets["positive"] += count
        elif rating == 3:
            rating_buckets["neutral"] += count
        else:
            rating_buckets["negative"] += count

    avg_rating = db.session.query(
        db.func.avg(ServiceRequest.rating)
    ).filter_by(professional_id=p.id).scalar()

    status_counts = {
        status: ServiceRequest.query.filter_by(professional_id=p.id, status=status).count()
        for status in ("requested", "accepted", "completed", "rejected", "closed")
    }

    return jsonify({
        "profile": p.to_dict(),
        "rating_buckets": rating_buckets,
        "avg_rating": round(avg_rating, 2) if avg_rating else 0.0,
        "status_counts": status_counts,
        "total": ServiceRequest.query.filter_by(professional_id=p.id).count(),
    }), 200
