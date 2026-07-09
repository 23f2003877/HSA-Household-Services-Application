# backend/config.py
import os
from datetime import timedelta
from celery.schedules import crontab

basedir = os.path.abspath(os.path.dirname(__file__))

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(basedir), ".env"))
except ImportError:
    pass

DEFAULT_REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
DEFAULT_CELERY_BROKER = os.environ.get("CELERY_BROKER_URL", DEFAULT_REDIS_URL)
DEFAULT_CELERY_RESULT = os.environ.get("CELERY_RESULT_BACKEND", DEFAULT_CELERY_BROKER)


class Config:
    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY", "hsa_change_this_secret_key_in_production_32chars!")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(basedir, 'hsa.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Redis / Celery
    REDIS_URL = DEFAULT_REDIS_URL
    CELERY_BROKER_URL = DEFAULT_CELERY_BROKER
    CELERY_RESULT_BACKEND = DEFAULT_CELERY_RESULT

    # JWT
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "hsa_jwt_change_this_secret_in_production_32chars!")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get("JWT_EXPIRES_SECONDS", 3600))
    )

    # Flask-Caching (Redis)
    CACHE_TYPE = "RedisCache"
    CACHE_REDIS_URL = DEFAULT_REDIS_URL
    CACHE_DEFAULT_TIMEOUT = 60

    # Admin defaults (seeded on first run)
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@hsa.com")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

    # Celery Beat Schedule (all times in IST: timezone="Asia/Kolkata")
    CELERY_BEAT_SCHEDULE = {
        # 8:00 PM IST — daily reminder to professionals with pending requests
        "daily-reminder-professionals": {
            "task": "backend.tasks.daily_reminder",
            "schedule": crontab(hour=20, minute=0),
        },
        # 1st of every month at 4:00 AM IST — monthly HTML report to customers
        "monthly-activity-report": {
            "task": "backend.tasks.monthly_report",
            "schedule": crontab(day_of_month=1, hour=4, minute=0),
        },
    }
