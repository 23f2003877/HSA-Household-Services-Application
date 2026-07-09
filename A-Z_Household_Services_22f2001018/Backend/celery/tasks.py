from celery import shared_task
import csv
import smtplib
import os
from email.mime.text import MIMEText
from datetime import datetime
from Backend.models import Professional, Customer, ServiceRequest
from flask import current_app as app
import flask_excel


def send_notification(email, message):
    msg = MIMEText(message, 'plain')
    msg['Subject'] = "Service Request Reminder"
    msg['From'] = "22f2001018@ds.study.iitm.ac.in"
    msg['To'] = email
    with smtplib.SMTP('localhost', 1025) as server:
        server.send_message(msg)
    print(f"Notification sent to {email}")

@shared_task(ignore_result=True)
def send_reminder():
    professionals = Professional.query.join(ServiceRequest).filter(ServiceRequest.status == "Pending").all()
    for professional in professionals:
        message = "Reminder: You have pending service requests. Please take action."
        send_notification(professional.email, message)

@shared_task(ignore_result=True)
def generate_monthly_report():
    customers = Customer.query.all()
    for customer in customers:
        report = create_monthly_report(customer.id)
        send_email(customer.email, "Monthly Activity Report", report)

def create_monthly_report(customer_id):
    service_requests = ServiceRequest.query.filter_by(customer_id=customer_id).all()
    report_content = "<html><body><h1>Monthly Report</h1><ul>"
    for request in service_requests:
        report_content += f"<li>Service ID: {request.service_id}, Status: {request.status}</li>"
    report_content += "</ul></body></html>"
    return report_content

def send_email(to_email, subject, body):
    msg = MIMEText(body, 'html')
    msg['Subject'] = subject
    msg['From'] = "22f2001018@ds.study.iitm.ac.in"
    msg['To'] = to_email
    with smtplib.SMTP('localhost', 1025) as server:
        server.send_message(msg)
    print(f"Email sent to {to_email}")

@shared_task(bind=True, ignore_result=False)
def create_csv(self):
    task_id = self.request.id
    filename = f"service_requests_{task_id}.csv"
    export_dir = "./Backend/celery/exports/"
    os.makedirs(export_dir, exist_ok=True)
    filepath = os.path.join(export_dir, filename)
    
    data = ServiceRequest.query.filter_by(status="Completed").all()
    column_names = [column.name for column in ServiceRequest.__table__.columns]
    
    csv_out = flask_excel.make_response_from_query_sets(
        data, column_names=column_names, file_type="csv"
    )
    
    with open(filepath, "wb") as file:
        file.write(csv_out.data)
    
    return filename