# backend/models/professional.py
from backend.models import db
from sqlalchemy.orm import relationship

class Professional(db.Model):
    __tablename__ = "professionals"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    full_name = db.Column(db.String(200), nullable=False)
    service_type = db.Column(db.String(100), nullable=False)  # matches Service.category
    experience = db.Column(db.String(100), nullable=True)
    address = db.Column(db.String(300), nullable=True)
    pincode = db.Column(db.String(20), nullable=True)
    description = db.Column(db.Text, nullable=True)
    # Status: pending / approved / rejected / blocked
    status = db.Column(db.String(30), nullable=False, default="pending")

    user = relationship("User", backref=db.backref("professional_profile", uselist=False))
    service_requests = relationship("ServiceRequest", back_populates="professional")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "full_name": self.full_name,
            "email": self.user.email if self.user else None,
            "service_type": self.service_type,
            "experience": self.experience,
            "address": self.address,
            "pincode": self.pincode,
            "description": self.description,
            "status": self.status,
            "is_active": self.user.is_active if self.user else True,
        }

    def __repr__(self):
        return f"<Professional {self.full_name} ({self.service_type}) [{self.status}]>"
