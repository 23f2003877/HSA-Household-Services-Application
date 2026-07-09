from flask import current_app as app, jsonify, render_template,  request, send_file
from flask_security import SQLAlchemyUserDatastore, auth_required,auth_token_required, verify_password, hash_password, current_user, roles_required,login_user
from itsdangerous import Serializer
from Backend.config import DevelopmentConfig
from datetime import datetime
from celery.result import AsyncResult
import csv
import logging
from Backend.models import db, User, Customer, Professional, ServiceRequest, Service , UserRoles
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError
from flask_jwt_extended import create_access_token
from flask import current_app
from Backend.celery.tasks import create_csv

datastore = app.security.datastore
cache = app.cache
userdatastore: SQLAlchemyUserDatastore = app.security.datastore

# Home Route
@app.route('/')
def index():
  return render_template('index.html') 

#Login Route
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Invalid JSON input"}), 400

        email = data.get('email')
        password = data.get('password')
        role = data.get('role')

        if not email or not password:
            return jsonify({"message": "Invalid inputs"}), 400

        user = datastore.find_user(email=email)
        if not user:
            return jsonify({"message": "Invalid email"}), 404

        if verify_password(password, user.password):
            user_roles = [r.name for r in user.roles]  # Extract role names
            if role in user_roles:  # Check if role exists
                # Check if the user has the professional role and a "pending" or "rejected" status
                if role == 'professional':
                    professional = Professional.query.filter_by(email=email).first()
                    if professional and professional.status in ['Pending', 'Rejected']:
                        return jsonify({"message": "Your account status is pending or rejected. Login denied."}), 403
                    if professional and professional.status in ['Blocked']:
                        return jsonify({"message": "Your account status is blocked. Login denied."}), 403
                
                login_user(user)  # Flask-Security login
                
                print(f"User {user.email} logged in with role {role}")  # Debugging

                # Generate authentication token with expiry (Flask-JWT-Extended)
                token = create_access_token(identity={"user_id": user.id, "role": role})

                return jsonify({
                    'email': user.email,
                    'role': role,
                    'id': user.id,
                    'token': token,
                    'redirect': get_redirect_path(role)
                })

            return jsonify({'message': 'Role mismatch.', 'category': 'danger'}), 401

        return jsonify({'message': 'Incorrect password'}), 400

    except Exception as e:
        import traceback
        print("Error occurred during login:", traceback.format_exc())  # Debugging
        return jsonify({"message": "Internal Server Error"}), 500
    
# Helper function
def get_redirect_path(role):
    if role == 'customer':
        return 'customer_dashboard'
    elif role == 'professional':
        return 'professional_dashboard'
    elif role == 'admin':
        return 'admin_dashboard'
    return 'login'
    
#customer signup
@app.route('/register/customer', methods=['POST'])
def register_customer():
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')
    fullname = data.get('fullname')
    address = data.get('address')

    # Validate input fields
    if not email or not password or not fullname or not address :
        return jsonify({"message": "All fields are required"}), 400

    # Check if the user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "User already exists"}), 400

    try:
        # Create user via Flask-Security datastore
        if not userdatastore.find_user(email=email):
            userdatastore.create_user(
                email=email,
                username=fullname,  
                password=hash_password(password),
                roles=['customer']
            )
        
        # Add customer details
        new_customer = Customer(email=email, name=fullname, address=address)
        db.session.add(new_customer)
        db.session.commit()
        
        return jsonify({"message": "Customer registered successfully"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error creating customer", "error": str(e)}), 500

#Professional Signup
@app.route('/register/professional', methods=['POST'])
def register_professional():
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    fullname = data.get('fullname')
    category = data.get('service')
    experience = data.get('experience')
    address = data.get('address')
    pincode = data.get('pincode')
    
    # Validate required fields
    if not all([email, password, fullname, category, address, pincode]):
        return jsonify({"message": "Invalid inputs", "category": "danger"}), 400
    
    if datastore.find_user(email=email):
        return jsonify({"message": "User already exists", "category": "danger"}), 400
    
    try:
        
        # Create user via Flask-Security datastore
        if not userdatastore.find_user(email=email):
            userdatastore.create_user(
                email=email,
                username=fullname,  
                password=hash_password(password),
                roles=['professional']
            )
        
        # Create professional profile
        new_professional = Professional(
            email=email, fullname=fullname, category=category,
            experience=experience, address=address, pincode=pincode, status="Pending"
        )
        db.session.add(new_professional)
        db.session.commit()
        
        return jsonify({"message": "Professional registered successfully. Awaiting admin approval.", "category": "success"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error creating professional", "error": str(e), "category": "danger"}), 400

#Admin Dashboard
@app.route('/admin/dashboard', methods=['GET'])
@auth_required()  # Ensure the user is authenticated
@roles_required('admin')  # Ensure the user has the 'admin' role
@cache.cached(timeout = 5)
def admin_dashboard():
    try:
        if not current_user.is_authenticated:
            return jsonify({'message': 'You are not authorized to access this page.'}), 403

        # Check if the user has the 'admin' role
        if 'admin' not in [role.name for role in current_user.roles]:
            return jsonify({'message': 'You are not authorized to access this page.'}), 403

        # Fetch data from the database
        professionals = Professional.query.all()
        services = Service.query.all()
        categories = Service.query.with_entities(Service.category).distinct().all()

        # Prepare the response data
        return jsonify(
            professionals=[prof.to_dict() for prof in professionals],
            services=[service.to_dict() for service in services],
            categories=[category[0] for category in categories] if categories else []
        )

    except Exception as e:
        current_app.logger.error(f"Error occurred while fetching data: {str(e)}")  # Log the error
        return jsonify({'message': 'Error fetching data', 'error': str(e)}), 500
    
@auth_required('token') 
@app.get('/get-csv/<id>')
def getCSV(id):
    result = AsyncResult(id)

    if result.ready():
        return send_file(f'./Backend/celery/exports/{result.result}'), 200
    else:
        return {'message' : 'task not ready'}, 405

@auth_required('token') 
@app.get('/create-csv')
def createCSV():
    task = create_csv.delay()
    return {'task_id' : task.id}, 200

# Manage Professional (Accept/Reject) Route
@app.route("/admin/manage-professionals/<int:professional_id>/<string:action>", methods=["POST"])
@auth_required()  # Ensure token authentication
@roles_required('admin')
def manage_professional(professional_id, action):
    try:
        professional = Professional.query.get(professional_id)
        if not professional:
            return jsonify({"error": "Professional not found"}), 404

        if action == "accept":
            professional.status = "Accepted"
        elif action == "reject":
            professional.status = "Rejected"
        elif action == "block":
            professional.status = "Blocked"
        else:
            return jsonify({"error": "Invalid action"}), 400

        db.session.commit()
        return jsonify({"message": f"Professional {action}ed successfully", "professional": professional.to_dict()}), 200
    except SQLAlchemyError as e:
        db.session.rollback()  # Rollback transaction on error
        return jsonify({"error": "Failed to update professional", "details": str(e)}), 500
    except Exception as e:
        db.session.rollback()  # Ensure rollback in case of unexpected errors
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500


# Get Service by ID
@app.route('/admin/services/get/<int:service_id>', methods=['GET'])
@auth_required()
@roles_required('admin')
@cache.memoize(timeout=5)
def get_service(service_id):
    service = Service.query.get_or_404(service_id)
    return jsonify(service.to_dict()), 200

# Create Service
@app.route('/admin/services/create', methods=['POST'])
@auth_required()
@roles_required('admin')
def create_service():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid input data"}), 400

        required_fields = ["name", "description", "base_price", "category"]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({"error": f"Missing fields: {', '.join(missing_fields)}"}), 400

        new_service = Service(
            name=data["name"],
            description=data["description"],
            base_price=int(data["base_price"]),
            category=data["category"]
        )
        db.session.add(new_service)
        db.session.commit()
        return jsonify({"message": "Service created successfully", "service": new_service.to_dict()}), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create service", "details": str(e)}), 500


@app.route("/admin/services/update/<int:service_id>", methods=["PUT"])
@auth_required()
@roles_required('admin')
def update_service(service_id):
    try:
        service = Service.query.get(service_id)
        if not service:
            return jsonify({"error": "Service not found"}), 404

        data = request.get_json()
        logging.info(f"Received data: {data}")  # Log the incoming request data

        if not data:
            return jsonify({"error": "Invalid input data"}), 400

        service.name = data.get("name", service.name)
        service.description = data.get("description", service.description)
        service.base_price = data.get("base_price", service.base_price)
        service.category = data.get("category", service.category)

        db.session.commit()

        return jsonify({"message": "Service updated successfully", "service": {
            "id": service.id, "name": service.name, "description": service.description,
            "base_price": service.base_price, "category": service.category
        }}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logging.error(f"SQLAlchemy Error: {e}")
        return jsonify({"error": "Failed to update service", "details": str(e)}), 500


# Delete Service
@app.route("/admin/services/delete/<int:service_id>", methods=["DELETE"])
@auth_required()
@roles_required('admin')
def delete_service(service_id):
    try:
        service = Service.query.get(service_id)
        if not service:
            return jsonify({"error": "Service not found"}), 404

        related_requests = ServiceRequest.query.filter_by(service_id=service_id).count()
        if related_requests > 0:
            return jsonify({"error": "Cannot delete service with active requests"}), 400

        db.session.delete(service)
        db.session.commit()
        return jsonify({"message": "Service deleted successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete service", "details": str(e)}), 500

# Admin Search
@app.route('/admin/search', methods=['POST'])
@auth_required()
@roles_required('admin')
def admin_search():
    data = request.get_json()
    search_by = data.get('search_type')
    search_text = data.get('search_text')
    results = []

    if search_by == 'service':
        results = Service.query.filter(
            (Service.name.contains(search_text)) | (Service.category.contains(search_text))
        ).all()
    elif search_by == 'professional':
        results = Professional.query.filter(Professional.fullname.contains(search_text)).all()
    elif search_by == 'request':
        results = ServiceRequest.query.join(Professional).join(Service).filter(
            (Service.name.contains(search_text)) | 
            (Service.category.contains(search_text)) | 
            (Professional.fullname.contains(search_text))
        ).all()

    formatted_results = []
    for res in results:
        if isinstance(res, Service):
            formatted_results.append({
                "id": res.id,
                "type": "Service",
                "details": f"{res.name} - {res.category}"
            })
        elif isinstance(res, Professional):
            formatted_results.append({
                "id": res.id,
                "type": "Professional",
                "details": f"{res.fullname} - {res.status}"
            })
        elif isinstance(res, ServiceRequest):
            formatted_results.append({
                "id": res.id,
                "type": "Service Request",
                "details": f"{res.service.name} - {res.professional.fullname} - {res.status}"  # Fix here
            })

    return jsonify({"data": formatted_results, "message": "Search completed successfully"}), 200

# Delete Service, Professional, or Request
@app.route('/admin/delete/<int:id>', methods=['POST'])
@auth_required()
@roles_required('admin')
def admin_delete(id):
    service_request = ServiceRequest.query.get(id)
    if service_request:
        db.session.delete(service_request)
        db.session.commit()
        return jsonify({'message': 'Service request deleted successfully'}), 200

    service = Service.query.get(id)
    if service:
        related_requests = ServiceRequest.query.filter_by(service_id=id).count()
        if related_requests > 0:
            return jsonify({"error": "Cannot delete service with active requests"}), 400
        db.session.delete(service)
        db.session.commit()
        return jsonify({"message": "Service deleted successfully"}), 200

    professional = Professional.query.get(id)
    if professional:
        # Also delete the associated User if it exists
        user = User.query.filter_by(email=professional.email).first()
        if user:
            # Delete user roles relationship first
            UserRoles.query.filter_by(user_id=user.id).delete()
            db.session.delete(user)
        
        db.session.delete(professional)
        db.session.commit()
        return jsonify({'message': 'Professional deleted successfully'}), 200

    return jsonify({'error': 'Record not found'}), 404

# Accept or Block Professionals
@app.route('/admin/search-manage-professionals/<int:professional_id>/<action>', methods=['POST'])
@auth_required()
@roles_required('admin')
def search_manage_professionals(professional_id, action):
    professional = Professional.query.get(professional_id)
    if professional and action in ["accept", "block"]:
        professional.status = "Accepted" if action == "accept" else "Blocked"
        db.session.commit()
        return jsonify({"message": f"Professional {action}ed successfully"}), 200
    return jsonify({"error": "Invalid action or professional not found"}), 400

# Admin Summary API
@app.route('/admin/summary', methods=['GET'])
@auth_required()
@roles_required('admin')
@cache.cached(timeout = 5)
def admin_summary():
    summary_data = {
        "total_services": Service.query.count(),
        "total_professionals": Professional.query.count(),
        "total_requests": ServiceRequest.query.count()
    }

    services_by_name = db.session.query(
        Service.name, db.func.count(ServiceRequest.id).label('completed_request_count')
    ).outerjoin(ServiceRequest, ServiceRequest.service_id == Service.id).filter(
        ServiceRequest.status == 'Completed'
    ).group_by(Service.name).all()

    services_by_category = db.session.query(
        Service.category, db.func.count(Service.id).label('category_count')
    ).group_by(Service.category).all()

    professionals_with_ratings = db.session.query(
        Professional.fullname,
        db.func.avg(ServiceRequest.rating).label('avg_rating'),
        (db.func.avg(ServiceRequest.rating) / 5 * 100).label('rating_percentage')
    ).outerjoin(ServiceRequest, ServiceRequest.professional_id == Professional.id).group_by(Professional.fullname).order_by(db.func.avg(ServiceRequest.rating).desc()).all()

    return jsonify({
        "summary_data": summary_data,
        "services_by_name": [{"name": row.name, "completed_request_count": row.completed_request_count or 0} for row in services_by_name],
        "services_by_category": [{"category": row.category, "category_count": row.category_count or 0} for row in services_by_category],
        "professionals_with_ratings": [{
            "fullname": row.fullname,
            "avg_rating": round(row.avg_rating, 2) if row.avg_rating is not None else 0.0,
            "rating_percentage": round(row.rating_percentage, 2) if row.rating_percentage is not None else 0.0
        } for row in professionals_with_ratings]
    })

# Customer Dashboard
@app.route('/customer/dashboard', methods=['GET'])
@auth_required()
@roles_required('customer')
@cache.cached(timeout = 5)
def customer_dashboard():
    try:
        # Get all services available
        services = Service.query.all()

        # Prepare the response data
        services_data = [
            {'id': s.id, 'name': s.name, 'category': s.category, 'base_price': s.base_price}
            for s in services
        ]
        
        return jsonify({
            'view': 'home',
            'services': services_data
        })

    except Exception as e:
        import traceback
        print("Error occurred during dashboard fetch:", traceback.format_exc())
        return jsonify({"message": "Internal Server Error"}), 500   


# Customer Search Functionality
@app.route('/customer/search', methods=['GET'])
@auth_required()
@roles_required('customer')
@cache.cached(timeout = 5)
def customer_search():
    try:
        # Get search parameters from request
        search_by = request.args.get('searchBy')
        search_text = request.args.get('searchText')

        # Get current customer
        customer = Customer.query.filter_by(email=current_user.email).first()
        customer_id = customer.id if customer else None

        if not search_by or not search_text:
            return jsonify({'error': 'Both searchBy and searchText parameters are required.'}), 400

        results = []

        # Search for Services
        if search_by == 'service':
            results = Service.query.filter(
                (Service.name.ilike(f"%{search_text}%")) | 
                (Service.category.ilike(f"%{search_text}%"))
            ).all()

        # Search for Professionals
        elif search_by == 'professional':
            results = Professional.query.filter(
                Professional.fullname.ilike(f"%{search_text}%"),
                Professional.status == 'Accepted'
            ).all()

        # Search for Service Requests
        elif search_by == 'request' and customer_id:
            results = ServiceRequest.query.join(Professional).join(Service).filter(
                ServiceRequest.customer_id == customer_id,
                (Service.name.ilike(f"%{search_text}%")) | 
                (Professional.fullname.ilike(f"%{search_text}%"))
            ).all()

        return jsonify({
            'results': [
                {
                    'id': r.id,
                    'type': 'request' if isinstance(r, ServiceRequest) else 
                            'service' if isinstance(r, Service) else 
                            'professional',
                    'name': getattr(r, 'name', ''),
                    'description': getattr(r, 'description', ''),
                    'base_price': getattr(r, 'base_price', ''),
                    'category': getattr(r, 'category', ''),
                    'fullname': getattr(r, 'fullname', ''),
                    'experience': getattr(r, 'experience', ''),
                    'status': getattr(r, 'status', ''),
                    'service_name': getattr(r.service, 'name', '') if hasattr(r, 'service') else "Unknown",
                    'professional_name': getattr(r.professional, 'fullname', '') if hasattr(r, 'professional') else "Unknown",
                    'request_date': r.request_date.strftime('%Y-%m-%d') if hasattr(r, 'request_date') and r.request_date else None
                }
                for r in results
            ]
        })

    except Exception as e:
        current_app.logger.error(f"Error occurred: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred. Please try again later.'}), 500
    
# Customer Service Request
# Get Professionals by Category
@app.route('/get_professionals/<category>', methods=['GET'])
@cache.memoize(timeout=5)
def get_professionals(category):
    # Filter professionals by the category
    professionals = Professional.query.filter_by(category=category).all()
    return jsonify({'professionals': [{'id': p.id, 'fullname': p.fullname, 'category': p.category} for p in professionals]})

# Get Services by Category
@app.route('/get_services/<category>', methods=['GET'])
@cache.memoize(timeout=5)
def get_services(category):
    # Filter services by the category
    services = Service.query.filter_by(category=category).all()
    return jsonify({'services': [{'id': s.id, 'name': s.name, 'category': s.category} for s in services]})

@app.route('/customer/request-service', methods=['POST'])
@auth_required()
@roles_required('customer')
def customer_request_service():
    data = request.get_json()
    
    # Extracting form data
    request_date_str = data.get('requestDate')
    category = data.get('category')
    service_id = data.get('service')
    professional_id = data.get('professional')

    # Check if all required fields are provided
    if not all([request_date_str, category, service_id, professional_id]):
        return jsonify({"message": "All fields are required.", "category": "danger"}), 400
    
    # Ensure the service and professional exist
    service = Service.query.get(service_id)
    professional = Professional.query.get(professional_id)

    customer = Customer.query.filter_by(email=current_user.email).first()
    Customer_id = customer.id if customer else None

    if not service or not professional:
        return jsonify({"message": "Invalid service or professional.", "category": "danger"}), 400

    # Ensure the professional's category matches the selected service category
    if professional.category != service.category:
        return jsonify({"message": "The professional's category does not match the selected service category.", "category": "danger"}), 400

    try:
        # Convert the request_date to a datetime object
        request_date = datetime.strptime(request_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Please use YYYY-MM-DD.", "category": "danger"}), 400

    # Create the service request
    new_request = ServiceRequest(
        customer_id=Customer_id,
        service_id=service_id,
        professional_id=professional_id,
        request_date=request_date,
        status="Pending"  # Default status is 'Pending'
    )
    
    # Add and commit the new service request
    db.session.add(new_request)
    db.session.commit()

    # Return a success message
    return jsonify({"message": "Service request submitted successfully!", "category": "success"}), 201

@app.route('/customer/requested-services', methods=['GET'])
@auth_required()
@roles_required('customer')
@cache.cached(timeout = 5)
def show_requested_services():
    try:
        customer = Customer.query.filter_by(email=current_user.email).first()
        Customer_id = customer.id if customer else None

        # Fetch service requests for the logged-in customer
        service_requests = ServiceRequest.query.filter_by(customer_id=Customer_id).all()

        if not service_requests:
            return jsonify({'error': 'No service requests found for the customer'}), 404

        categorized_services = {}

        for service in service_requests:
            status = service.status
            if status not in categorized_services:
                categorized_services[status] = []

            # Check if the service has a customer (it should, but add the check anyway)
            customer_address = None
            if service.customer:
                customer_address = service.customer.address

            categorized_services[status].append({
                'id': service.id,
                'professional_name': service.professional.fullname,
                'professional_email': service.professional.email,
                'customer_address': customer_address,  # This is now safe
                'service_name': service.service.name,
                'category': service.service.category,
                'request_date': service.request_date.isoformat(),  # Ensure proper date format for frontend
                'status': service.status,
            })

        return jsonify({'categorized_services': categorized_services}), 200
    except Exception as e:
        print(f"Error in /customer/requested-services: {e}")
        return jsonify({'error': 'An unexpected error occurred while fetching requested services.'}), 500

# Delete Request
@app.route('/customer/delete/<int:id>', methods=['DELETE'])
@auth_required()
@roles_required('customer')
def customer_delete(id):
    try:
        service_request = ServiceRequest.query.get(id)

        if not service_request:
            return jsonify({'error': 'Service request not found'}), 404

        if service_request.status != 'Pending':
            return jsonify({'error': 'Only pending service requests can be deleted'}), 403

        db.session.delete(service_request)
        db.session.commit()

        return jsonify({'message': 'Service request deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting service request: {e}")
        return jsonify({'error': 'An unexpected error occurred while deleting the service request.'}), 500

# Customer Submit Rating
# Get completed and unrated service requests for a customer
@app.route('/customer/get_unrated_services', methods=['GET'])
@auth_required()
@roles_required('customer')
@cache.cached(timeout = 5)
def get_unrated_services():
    # Fetch the customer object based on the logged-in user
    customer = Customer.query.filter_by(email=current_user.email).first()
    Customer_id = customer.id if customer else None

    if not customer:
        return jsonify({'error': 'No associated customer found for this user'}), 404

    # Get completed & unrated service requests
    service_requests = ServiceRequest.query.filter_by(
        customer_id= Customer_id, status='Completed', rating=None
    ).all()

    return jsonify({
        'service_requests': [
            {
                'id': req.id,
                'service_name': req.service.name,
                'professional_name': req.professional.fullname,
                'professional_email': req.professional.email,
                'customer_address': customer.address,  # Use fetched customer object
                'category': req.service.category,
                'request_date': req.request_date.strftime('%Y-%m-%d')
            } for req in service_requests
        ]
    })

@app.route('/customer/submit_rating', methods=['POST'])
@auth_required()
@roles_required('customer')
def submit_rating():
    data = request.get_json()
    service_request_id = data.get('serviceRequestId')
    rating = data.get('rating')

    if not service_request_id or rating is None:
        return jsonify({"success": False, "message": "Invalid data provided"}), 400

    try:
        rating = int(rating)  # Convert to integer
    except ValueError:
        return jsonify({"success": False, "message": "Rating must be a number"}), 400

    if not (1 <= rating <= 5):
        return jsonify({"success": False, "message": "Rating must be between 1 and 5"}), 400

    service_request = ServiceRequest.query.get(service_request_id)
    if not service_request:
        return jsonify({"success": False, "message": "Service request not found"}), 404

    service_request.rating = rating
    db.session.commit()
    
    return jsonify({"success": True, "message": "Rating submitted successfully"})

# Professional Dashboard
@app.route('/professional/dashboard', methods=['GET'])  # Changed to GET
@auth_required()
@roles_required('professional')
@cache.cached(timeout = 5)
def professional_dashboard():
    professional = Professional.query.filter_by(email=current_user.email).first()
    if not professional:
        return jsonify({"message": "Professional not found"}), 404
    
    service_requests = ServiceRequest.query.filter_by(professional_id=professional.id).all()

    # Organize services by status
    services_by_status = {
        "Pending": [],
        "Completed": [],
        "Rejected": [],
        "Accepted": []
    }
    
    for service in service_requests:
        if service.status in services_by_status:
            services_by_status[service.status].append(service)

    # Get all unique customer_ids
    customer_ids = list(set(s.customer_id for s in service_requests))
    customers = {c.id: c for c in Customer.query.filter(Customer.id.in_(customer_ids)).all()}

    # Get all unique service_ids
    service_ids = list(set(s.service_id for s in service_requests))
    services = {s.id: s for s in Service.query.filter(Service.id.in_(service_ids)).all()}

    def serialize_service(service):
        return {
            "id": service.id,
            "status": service.status,
            "request_date": service.request_date.strftime('%Y-%m-%d'),
            "customer_id": service.customer_id,
            "service_id": service.service_id
        }

    def serialize_customer(service):
        customer = customers.get(service.customer_id)
        return {
            "name": customer.name if customer else "Unknown",
            "email": customer.email if customer else "Unknown",
            "address": customer.address if customer else "Unknown"
        }

    def serialize_service_info(service):
        service_info = services.get(service.service_id)
        return {
            "name": service_info.name if service_info else "Unknown",
            "category": service_info.category if service_info else "Unknown"
        }

    return jsonify({
        "pending_services": [serialize_service(s) for s in services_by_status["Pending"]],
        "completed_services": [serialize_service(s) for s in services_by_status["Completed"]],
        "rejected_services": [serialize_service(s) for s in services_by_status["Rejected"]],
        "accepted_services": [serialize_service(s) for s in services_by_status["Accepted"]],
        "pending_customers": {s.id: serialize_customer(s) for s in services_by_status["Pending"]},
        "completed_customers": {s.id: serialize_customer(s) for s in services_by_status["Completed"]},
        "rejected_customers": {s.id: serialize_customer(s) for s in services_by_status["Rejected"]},
        "accepted_customers": {s.id: serialize_customer(s) for s in services_by_status["Accepted"]},
        "pending_services_dict": {s.id: serialize_service_info(s) for s in services_by_status["Pending"]},
        "completed_services_dict": {s.id: serialize_service_info(s) for s in services_by_status["Completed"]},
        "rejected_services_dict": {s.id: serialize_service_info(s) for s in services_by_status["Rejected"]},
        "accepted_services_dict": {s.id: serialize_service_info(s) for s in services_by_status["Accepted"]},
    })

@app.route('/professional/update_request_status/<string:status>/<int:service_id>', methods=['PUT'])
@auth_required()
@roles_required('professional')
def update_request_status(status, service_id):
    valid_statuses = ['accepted', 'completed', 'rejected']  # Use lowercase for validation
    
    status = status.lower()  # Ensure the status is lowercase

    if status not in valid_statuses:
        return jsonify({"message": "Invalid status"}), 400

    professional = Professional.query.filter_by(email=current_user.email).first()
    service_request = ServiceRequest.query.get(service_id)
    
    if not service_request or service_request.professional_id != professional.id:
        return jsonify({"message": "Invalid service request"}), 400
    
    service_request.status = status.capitalize()  # Capitalize before saving
    db.session.commit()
    
    return jsonify({"message": f"Service {status.lower()} successfully"})

#Professional Search
@app.route('/professional/search', methods=['GET'])
@auth_required()
@roles_required('professional')
@cache.cached(timeout = 5)
def professional_search():
    try:
        # Get the search parameter from the URL
        search_text = request.args.get('searchText', '').strip()
        
        if not search_text:
            return jsonify({'error': 'SearchText parameter is required.'}), 400
        
        # Get the professional object
        professional = Professional.query.filter_by(email=current_user.email).first()
        
        if not professional:
            current_app.logger.error(f"Professional with email {current_user.email} not found.")
            return jsonify({'error': 'Professional not found'}), 404
        
        # Search for service requests assigned to the professional
        service_requests = ServiceRequest.query.join(Customer).join(Service).filter(
            ServiceRequest.professional_id == professional.id,
            (Service.name.ilike(f"%{search_text}%")) | (Customer.name.ilike(f"%{search_text}%"))
        ).all()
        
        def serialize_request(request):
            return {
                "id": request.id,
                "status": request.status,
                "request_date": request.request_date.strftime('%Y-%m-%d'),
                "customer": {
                    "name": request.customer.name,
                    "email": request.customer.email,
                    "address": request.customer.address
                },
                "service": {
                    "name": request.service.name,
                    "category": request.service.category
                }
            }
        
        return jsonify({
            "service_requests": [serialize_request(req) for req in service_requests]
        })
    
    except Exception as e:
        current_app.logger.error(f"Error occurred: {str(e)}")  # Log the exception
        return jsonify({'error': 'An unexpected error occurred. Please try again later.'}), 500

# Summary API (Ratings & Service Statistics)
@app.route('/professional/summary', methods=['GET'])
@auth_required()
@roles_required('professional')
@cache.cached(timeout = 5)
def professional_summary():
    professional = Professional.query.filter_by(email=current_user.email).first()

    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    try:
        # Fetch reviews and ratings
        ratings = db.session.query(
            ServiceRequest.rating,
            db.func.count(ServiceRequest.id)
        ).filter(ServiceRequest.professional_id == professional.id).group_by(ServiceRequest.rating).all()

        reviews_ratings = {"positive": 0, "neutral": 0, "negative": 0}
        for rating, count in ratings:
            if rating is None:
                continue
            elif rating >= 4:
                reviews_ratings["positive"] += count
            elif rating == 3:
                reviews_ratings["neutral"] += count
            else:
                reviews_ratings["negative"] += count

        # Fetch service request statistics
        service_requests = {
            "total": ServiceRequest.query.filter_by(professional_id=professional.id).count(),
            "completed": ServiceRequest.query.filter_by(professional_id=professional.id, status="Completed").count(),
            "accepted": ServiceRequest.query.filter_by(professional_id=professional.id, status="Accepted").count(),
            "pending": ServiceRequest.query.filter_by(professional_id=professional.id, status="Pending").count()
        }

        return jsonify({"reviews_ratings": reviews_ratings, "service_requests": service_requests})

    except Exception as e:
        return jsonify({"message": "Error fetching professional summary", "error": str(e)}), 500


# Logout route
@app.route('/logout', methods=['POST'])
@auth_required()
def logout():
    return jsonify({"message": "Successfully logged out"})
