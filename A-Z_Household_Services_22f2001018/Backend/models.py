from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_security import UserMixin, RoleMixin

# Initialize SQLAlchemy

db = SQLAlchemy()

# Many-to-Many relationship for roles
class UserRoles(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    role_id = db.Column(db.Integer, db.ForeignKey('role.id'))

# User model
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    fs_uniquifier = db.Column(db.String, unique=True, nullable=False)
    active = db.Column(db.Boolean, default=True)
    roles = db.relationship('Role', backref='bearers', secondary='user_roles')

# Role model
class Role(db.Model, RoleMixin):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, unique=True, nullable=False)
    description = db.Column(db.String, nullable=True)

# Customer model
class Customer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(250), nullable=False)

    __table_args__ = (db.UniqueConstraint('email', name='unique_customer_email'),)

# Service model
class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    base_price = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(100), nullable=False)

    # Add the to_dict method
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "base_price": self.base_price,
            "category": self.category
        }

# Professional model
class Professional(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    fullname = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), nullable=False, default="Pending")  # "Pending", "Accepted", "Rejected"
    category = db.Column(db.String(100), nullable=False)
    experience = db.Column(db.String(100), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    pincode = db.Column(db.String(20), nullable=True)

    __table_args__ = (db.UniqueConstraint('email', name='unique_professional_email'),)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "fullname": self.fullname,
            "status": self.status,
            "category": self.category,
            "experience": self.experience,
            "address": self.address,
            "pincode": self.pincode
        }

# Service Request model
class ServiceRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    professional_id = db.Column(db.Integer, db.ForeignKey('professional.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('service.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False, default="Pending")  # "Pending", "Approved", "Rejected"
    request_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    rating = db.Column(db.Integer, nullable=True)

    professional = db.relationship('Professional', backref=db.backref('service_requests', lazy=True))
    service = db.relationship('Service', backref=db.backref('requests', lazy=True))
    customer = db.relationship('Customer', backref=db.backref('service_requests', lazy=True))
