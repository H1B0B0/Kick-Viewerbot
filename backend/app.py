from flask import Flask
from flask_cors import CORS
from api import api

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

app.register_blueprint(api, url_prefix='/api')

if __name__ == '__main__':
    app.run(debug=True, port=3001)  # Match the frontend port
