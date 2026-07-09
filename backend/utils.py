# backend/utils.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt, jwt_required
from backend.models.user import User


def role_required(*allowed_roles):
    """
    JWT role guard. Usage:
        @role_required('admin')
        @role_required('customer', 'admin')
        @role_required()   # any authenticated active user
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            ident = get_jwt_identity()
            try:
                user_id = int(ident)
            except (TypeError, ValueError):
                return jsonify({"msg": "invalid token identity"}), 401

            user = User.query.get(user_id)
            if not user:
                return jsonify({"msg": "user not found"}), 401
            if not user.is_active:
                return jsonify({"msg": "account is blocked"}), 403

            if not allowed_roles:
                return fn(*args, **kwargs)

            claims = get_jwt() or {}
            role = claims.get("role") or getattr(user, "role", None)

            if role not in allowed_roles:
                return jsonify({"msg": "forbidden — insufficient role"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def current_user_id():
    """Return the int user_id from the JWT identity."""
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None
