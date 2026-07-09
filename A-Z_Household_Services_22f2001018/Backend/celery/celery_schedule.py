from celery.schedules import crontab
from flask import current_app as app
from Backend.celery.tasks import send_reminder, generate_monthly_report

celery_app = app.extensions['celery']

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):

    # Daily task at 6 PM
    #sender.add_periodic_task(crontab(hour=18, minute=0), send_reminder.s(), name='daily_reminder_task')

    # Monthly report task (Runs on the 1st day of the month at 8 AM)
    #sender.add_periodic_task(crontab(day_of_month=1, hour=8, minute=0), generate_monthly_report.s(), name='monthly_activity_report_task')

    # Daily task at 6 PM
    sender.add_periodic_task(20.0, send_reminder.s(), name='daily_reminder_task')
    

    # Monthly report task (Runs on the 1st day of the month at 8 AM)
    sender.add_periodic_task(60.0, generate_monthly_report.s(), name='monthly_activity_report_task')
