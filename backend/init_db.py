# backend/init_db.py
from backend.models import db
from backend.models.user import User
from backend.models.service import Service


def seed_services():
    """Seed default service categories if none exist."""
    default_services = [
        ("AC Servicing", "Cleaning, gas refill, and full servicing of AC units", 499.0, "AC Repair", "2-3 hours"),
        ("Bathroom Cleaning", "Deep clean of bathroom tiles, fixtures, and fittings", 299.0, "Cleaning", "1-2 hours"),
        ("Kitchen Cleaning", "Full kitchen deep-clean including chimney and appliances", 399.0, "Cleaning", "2 hours"),
        ("Electrical Wiring", "Wiring, switch replacement, and fault detection", 349.0, "Electrician", "1-3 hours"),
        ("Fan/Light Installation", "Install ceiling fans, LED lights, and fixtures", 199.0, "Electrician", "1 hour"),
        ("Plumbing Repair", "Fix leaks, blocked drains, and pipeline issues", 299.0, "Plumbing", "1-2 hours"),
        ("Tap/Shower Installation", "Install or replace taps, showers, and geysers", 249.0, "Plumbing", "1 hour"),
        ("Salon for Women", "Hair cut, facial, threading, and beauty services", 599.0, "Salon", "2-3 hours"),
        ("Salon for Men", "Hair cut, shave, and grooming services", 299.0, "Salon", "1 hour"),
        ("Pest Control", "Cockroach, rat, and mosquito treatment for home", 799.0, "Pest Control", "2-4 hours"),
    ]

    if Service.query.count() == 0:
        for name, desc, price, cat, time_req in default_services:
            db.session.add(Service(
                name=name, description=desc,
                base_price=price, category=cat, time_required=time_req
            ))
        db.session.commit()
        print("[init_db] Default services seeded.")
    else:
        print("[init_db] Services already exist — skipping seed.")


def sync_admin(admin_email: str, admin_password: str):
    """Ensure the admin user exists and credentials are up to date."""
    admin = User.query.filter_by(role="admin").first()

    if admin is None:
        admin = User(email=admin_email, username="Admin", role="admin")
        admin.set_password(admin_password)
        db.session.add(admin)
        db.session.commit()
        print(f"[init_db] Admin created -> {admin_email}")
    else:
        admin.email = admin_email
        admin.set_password(admin_password)
        db.session.commit()
        print(f"[init_db] Admin synced -> {admin_email}")


def init_database(app, admin_email: str = "admin@hsa.com", admin_password: str = "admin123"):
    """Called from create_app(). Creates tables, seeds services, ensures admin exists."""
    with app.app_context():
        db.create_all()
        seed_services()
        sync_admin(admin_email, admin_password)
        print("[init_db] Database initialization complete.")
