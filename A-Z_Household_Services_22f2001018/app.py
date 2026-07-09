from flask import Flask
from flask_login import login_required
from Backend.config import DevelopmentConfig
from Backend.models import db, User, Role
from flask_security import Security, SQLAlchemyUserDatastore, auth_required
from flask_caching import Cache
from Backend.celery.celery_factory import celery_init_app
import flask_excel as excel
from flask_jwt_extended import JWTManager


def createApp():
    app = Flask(__name__, template_folder='Frontend', static_folder='Frontend', static_url_path='/static')
    app.config.from_object(DevelopmentConfig)
    app.config['JWT_SECRET_KEY'] = DevelopmentConfig.SECRET_KEY  # Ensure you have a secret key
    jwt = JWTManager(app) 


    # model init
    db.init_app(app)
    
    # cache init
    cache = Cache(app)


    #flask security
    datastore = SQLAlchemyUserDatastore(db, User, Role)
    app.cache = cache

    app.security = Security(app, datastore=datastore, register_blueprint=False)
    app.app_context().push()

    #from Backend.resources import api
    #flask-restful init
    #api.init_app(app)

    return app

app = createApp()

celery_app = celery_init_app(app)

import Backend.initial_data

import Backend.routes

import Backend.celery.celery_schedule

excel.init_excel(app)

if (__name__ == '__main__'):
    # flask-excel
    app.run()
