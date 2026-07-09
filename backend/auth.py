# backend/auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from backend.models import db
from backend.models.user import User
from backend.models.customer import Customer
from backend.models.professional import Professional
from backend.utils import role_required, current_user_id

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.post("/login")
def login():
    """Login for all roles. Returns JWT access token."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"msg": "email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "user not found"}), 404

    if not user.check_password(password):
        return jsonify({"msg": "invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"msg": "account is blocked — contact admin"}), 403

    # Extra guard: professional must be approved
    if user.role == "professional":
        prof = Professional.query.filter_by(user_id=user.id).first()
        if prof and prof.status in ("pending", "rejected"):
            return jsonify({"msg": f"account is {prof.status} — awaiting admin approval"}), 403
        if prof and prof.status == "blocked":
            return jsonify({"msg": "account is blocked"}), 403

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role},
    )
    return jsonify({
        "access_token": token,
        "user": user.to_dict(),
        "redirect": f"{user.role}_dashboard",
    }), 200


@auth_bp.post("/register/customer")
def register_customer():
    """Self-registration for customers."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("full_name") or data.get("fullname", "")
    address = data.get("address", "")
    pincode = data.get("pincode", "")

    if not all([email, password, full_name]):
        return jsonify({"msg": "email, password, and full_name are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "email already registered"}), 409

    try:
        user = User(email=email, username=full_name, role="customer")
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        customer = Customer(
            user_id=user.id,
            full_name=full_name,
            address=address,
            pincode=pincode,
        )
        db.session.add(customer)
        db.session.commit()
        return jsonify({"msg": "registered successfully"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "registration failed", "error": str(e)}), 500


@auth_bp.post("/register/professional")
def register_professional():
    """Self-registration for professionals (status=pending until admin approves)."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("full_name") or data.get("fullname", "")
    service_type = data.get("service_type") or data.get("service", "")
    experience = data.get("experience", "")
    address = data.get("address", "")
    pincode = data.get("pincode", "")
    description = data.get("description", "")

    if not all([email, password, full_name, service_type]):
        return jsonify({"msg": "email, password, full_name, and service_type are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "email already registered"}), 409

    try:
        user = User(email=email, username=full_name, role="professional")
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        prof = Professional(
            user_id=user.id,
            full_name=full_name,
            service_type=service_type,
            experience=experience,
            address=address,
            pincode=pincode,
            description=description,
            status="pending",
        )
        db.session.add(prof)
        db.session.commit()
        return jsonify({"msg": "registered — awaiting admin approval"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "registration failed", "error": str(e)}), 500


@auth_bp.get("/me")
@role_required()
def me():
    """Return current user info."""
    uid = current_user_id()
    user = User.query.get(uid)
    if not user:
        return jsonify({"msg": "not found"}), 404
    payload = user.to_dict()
    if user.role == "customer":
        profile = Customer.query.filter_by(user_id=uid).first()
        if profile:
            payload["profile"] = profile.to_dict()
    elif user.role == "professional":
        profile = Professional.query.filter_by(user_id=uid).first()
        if profile:
            payload["profile"] = profile.to_dict()
    return jsonify(payload), 200


@auth_bp.post("/change-password")
@role_required()
def change_password():
    uid = current_user_id()
    user = User.query.get(uid)
    data = request.get_json() or {}
    old = data.get("old_password", "")
    new = data.get("new_password", "")
    if not user.check_password(old):
        return jsonify({"msg": "incorrect old password"}), 400
    if len(new) < 6:
        return jsonify({"msg": "new password must be ≥ 6 chars"}), 400
    user.set_password(new)
    db.session.commit()
    return jsonify({"msg": "password changed"}), 200
