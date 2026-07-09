# backend/models/service_request.py
from backend.models import db
from sqlalchemy.orm import relationship
from datetime import datetime

class ServiceRequest(db.Model):
    __tablename__ = "service_requests"

    id = db.Column(db.Integer, primary_key=True)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    professional_id = db.Column(db.Integer, db.ForeignKey("professionals.id"), nullable=False)

    # Status: requested / assigned / accepted / completed / rejected / closed
    status = db.Column(db.String(30), nullable=False, default="requested")

    date_of_request = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    date_of_completion = db.Column(db.Date, nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    rating = db.Column(db.Integer, nullable=True)  # 1-5

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    service = relationship("Service", back_populates="requests")
    customer = relationship("Customer", back_populates="service_requests")
    professional = relationship("Professional", back_populates="service_requests")

    def to_dict(self):
        return {
            "id": self.id,
            "service_id": self.service_id,
            "service_name": self.service.name if self.service else None,
            "service_category": self.service.category if self.service else None,
            "customer_id": self.customer_id,
            "customer_name": self.customer.full_name if self.customer else None,
            "customer_address": self.customer.address if self.customer else None,
            "customer_pincode": self.customer.pincode if self.customer else None,
            "professional_id": self.professional_id,
            "professional_name": self.professional.full_name if self.professional else None,
            "professional_email": self.professional.user.email if (self.professional and self.professional.user) else None,
            "status": self.status,
            "date_of_request": self.date_of_request.isoformat() if self.date_of_request else None,
            "date_of_completion": self.date_of_completion.isoformat() if self.date_of_completion else None,
            "remarks": self.remarks,
            "rating": self.rating,
        }

    def __repr__(self):
        return f"<ServiceRequest #{self.id} {self.status}>"
