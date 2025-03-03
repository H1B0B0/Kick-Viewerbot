from flask import Blueprint
from .bot_controller import bot_api

api = Blueprint('api', __name__)
api.register_blueprint(bot_api, url_prefix='/bot')
