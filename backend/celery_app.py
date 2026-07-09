# backend/celery_app.py
import os
from celery import Celery
from celery.schedules import crontab

DEFAULT_BROKER = os.environ.get("CELERY_BROKER_URL",
                                 os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
DEFAULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", DEFAULT_BROKER)
DEFAULT_INCLUDES = ["backend.tasks"]


def make_celery(flask_app):
    """Create a Celery instance tied to the Flask app."""
    broker = flask_app.config.get("CELERY_BROKER_URL", DEFAULT_BROKER)
    backend = flask_app.config.get("CELERY_RESULT_BACKEND", DEFAULT_BACKEND)

    celery = Celery(
        flask_app.import_name,
        broker=broker,
        backend=backend,
        include=DEFAULT_INCLUDES,
    )

    celery.conf.update({
        "task_serializer": "json",
        "accept_content": ["json"],
        "result_serializer": "json",
        "timezone": "Asia/Kolkata",
        "enable_utc": False,
        "imports": DEFAULT_INCLUDES,
    })

    # Load beat schedule from Flask config
    beat = flask_app.config.get("CELERY_BEAT_SCHEDULE", {})
    if beat:
        celery.conf.beat_schedule = beat

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with flask_app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery


# Module-level celery for CLI usage:
#   celery -A backend.celery_app.celery worker --loglevel=info
#   celery -A backend.celery_app.celery beat --loglevel=info
celery = Celery(
    "hsa",
    broker=DEFAULT_BROKER,
    backend=DEFAULT_BACKEND,
    include=DEFAULT_INCLUDES,
)

celery.conf.update({
    "task_serializer": "json",
    "accept_content": ["json"],
    "result_serializer": "json",
    "timezone": "Asia/Kolkata",
    "enable_utc": False,
    "imports": DEFAULT_INCLUDES,
})

# Beat schedule (must match config.py)
celery.conf.beat_schedule = {
    "daily-reminder-professionals": {
        "task": "backend.tasks.daily_reminder",
        "schedule": crontab(hour=20, minute=0),
    },
    "monthly-activity-report": {
        "task": "backend.tasks.monthly_report",
        "schedule": crontab(day_of_month=1, hour=4, minute=0),
    },
}


class _ContextTask(celery.Task):
    def __call__(self, *args, **kwargs):
        try:
            from backend.app import create_app
            app = create_app()
            with app.app_context():
                return self.run(*args, **kwargs)
        except Exception:
            return self.run(*args, **kwargs)


celery.Task = _ContextTask

try:
    import importlib
    importlib.import_module("backend.tasks")
except Exception:
    pass
