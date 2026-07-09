# backend/models/service.py
from backend.models import db
from sqlalchemy.orm import relationship

class Service(db.Model):
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    base_price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(100), nullable=False)  # e.g. "Cleaning", "Plumbing"
    time_required = db.Column(db.String(50), nullable=True)  # e.g. "2 hours"
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    requests = relationship("ServiceRequest", back_populates="service")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "base_price": self.base_price,
            "category": self.category,
            "time_required": self.time_required,
            "is_active": self.is_active,
        }

    def __repr__(self):
        return f"<Service {self.name} ({self.category}) ₹{self.base_price}>"
