# backend/models/__init__.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from backend.models.user import User          # noqa: F401
from backend.models.customer import Customer  # noqa: F401
from backend.models.professional import Professional  # noqa: F401
from backend.models.service import Service    # noqa: F401
from backend.models.service_request import ServiceRequest  # noqa: F401
