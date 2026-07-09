from flask import current_app as app
from Backend.models import db
from flask_security import SQLAlchemyUserDatastore, hash_password

with app.app_context():
    db.create_all()

    userdatastore: SQLAlchemyUserDatastore = app.security.datastore

    # Ensure Role model exists
    userdatastore.find_or_create_role(name='admin', description='superuser')
    userdatastore.find_or_create_role(name='professional', description='user')
    userdatastore.find_or_create_role(name='customer', description='user')

    # Check if admin user exists, create if not
    if not userdatastore.find_user(email='admin@study.iitm.ac.in'):
        userdatastore.create_user(
            email='admin@study.iitm.ac.in',
            username='Admin',  
            password=hash_password('pass'),
            roles=['admin']
        )

    db.session.commit()