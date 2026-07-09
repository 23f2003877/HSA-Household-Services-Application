# backend/app.py
import os
from flask import Flask, jsonify, send_from_directory
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt

from backend.config import Config
from backend.models import db
from backend.cache import cache, init_cache


def create_app(config_class=Config):
    app = Flask(
        __name__,
        static_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend"),
        static_url_path="/static",
    )
    app.config.from_object(config_class)

    # Extensions
    db.init_app(app)
    init_cache(app)
    Bcrypt(app)
    JWTManager(app)

    # Blueprints
    from backend.auth import auth_bp
    from backend.admin import admin_bp
    from backend.customer import customer_bp
    from backend.professional import professional_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(professional_bp)

    # Health check
    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    # Serve SPA index.html for all non-API routes
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def spa(path):
        static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
        if path and os.path.exists(os.path.join(static_dir, path)):
            return send_from_directory(static_dir, path)
        return send_from_directory(static_dir, "index.html")

    # Seed database
    from backend.init_db import init_database
    init_database(
        app,
        admin_email=app.config.get("ADMIN_EMAIL", "admin@hsa.com"),
        admin_password=app.config.get("ADMIN_PASSWORD", "admin123"),
    )

    return app
