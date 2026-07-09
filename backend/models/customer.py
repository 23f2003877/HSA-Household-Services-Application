# backend/models/customer.py
from backend.models import db
from sqlalchemy.orm import relationship

class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    full_name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(300), nullable=True)
    pincode = db.Column(db.String(20), nullable=True)

    user = relationship("User", backref=db.backref("customer_profile", uselist=False))
    service_requests = relationship("ServiceRequest", back_populates="customer", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "full_name": self.full_name,
            "email": self.user.email if self.user else None,
            "address": self.address,
            "pincode": self.pincode,
            "is_active": self.user.is_active if self.user else True,
        }

    def __repr__(self):
        return f"<Customer {self.full_name}>"
