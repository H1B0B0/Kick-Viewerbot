from flask import Flask, send_file, request, redirect, abort
from flask_cors import CORS
from functools import wraps
import os
import sys
import logging
import jwt
from dotenv import load_dotenv
import webbrowser
from api import api
from gevent.pywsgi import WSGIServer
import argparse
import platform

if platform.system() != "Windows":
    import resource
else:
    resource = None

def get_env_path():
    """Get the correct path for .env file in both dev and PyInstaller environments"""
    if getattr(sys, 'frozen', False):
        # Running in PyInstaller bundle
        bundle_dir = sys._MEIPASS
        return os.path.join(bundle_dir, '.env')
    else:
        # Running in normal Python environment
        return os.path.join(os.path.dirname(__file__), '.env')

# Modify logging configuration
if getattr(sys, 'frozen', False):
    # Running in PyInstaller bundle (production)
    logging.getLogger().setLevel(logging.CRITICAL)  # Only show errors
    logging.getLogger("urllib3").setLevel(logging.CRITICAL)
    logging.getLogger("werkzeug").setLevel(logging.CRITICAL)  # Disable Flask debug logs
else:
    # Running in development mode
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.basicConfig(level=logging.DEBUG)

logger = logging.getLogger(__name__)

# Parse command line arguments - Do this first!
parser = argparse.ArgumentParser()
parser.add_argument('--dev', action='store_true', help='Run in development mode without authentication')
args = parser.parse_args()

# Load environment variables from .env file
env_path = get_env_path()
load_dotenv(env_path)

# Only check for JWT_SECRET if not in dev mode
JWT_SECRET = None
if not args.dev:
    JWT_SECRET = os.getenv('JWT_SECRET')
    if not JWT_SECRET:
        logger.error(f"JWT_SECRET not found in environment variables. Env path: {env_path}")
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                logger.info(f"Env file contents: {f.read()}")
        raise ValueError("JWT_SECRET must be set in environment variables")
else:
    # In dev mode, use a dummy secret
    JWT_SECRET = 'dev_secret_key'
    logger.warning("Running in development mode - Using dummy JWT secret")

app = Flask(__name__, static_folder='static')
app.config['JWT_SECRET'] = JWT_SECRET

# Simplified CORS configuration
CORS(app, 
     resources={
         r"/*": {
             "origins": ["http://localhost:3000", "http://localhost:3001", "https://velbots.shop"],
             "methods": ["GET", "POST", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True
         }
     })

# Register the API blueprint
app.register_blueprint(api, url_prefix='/api')

def verify_token(token):
    try:
        # Add leeway parameter to handle time differences
        jwt.decode(
            token, 
            app.config['JWT_SECRET'], 
            algorithms=["HS256"],
            leeway=5
        )
        return True
    except jwt.InvalidTokenError as e:
        logger.error(f"Token verification failed: {e}")
        return False

def auth_middleware(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip authentication if in dev mode
        if getattr(parser.parse_args(), 'dev', False):
            return f(*args, **kwargs)

        path = request.path
        logger.info(f"Current path: {path}")

        # Liste des ressources statiques à ignorer
        static_resources = [
            'favicon.ico',
            '.js',
            '.css',
            '.png',
            '.jpg',
            '.jpeg',
            '.gif',
            '.svg',
            '.woff',
            '.woff2',
            '.ttf',
            '.eot'
        ]
        
        # Vérifier si c'est une ressource statique
        is_static = any(path.endswith(ext) for ext in static_resources) or \
                   path.startswith(('/api/', '/_next/', '/static/', '/images/'))
                   
        if is_static:
            return f(*args, **kwargs)

        # Get token and check authentication
        token = request.cookies.get('access_token')
        is_authenticated = token and verify_token(token)
        logger.info(f"Is authenticated: {is_authenticated}")

        # Si l'utilisateur est authentifié et essaie d'accéder à login/register
        if is_authenticated and path in ['/login', '/register']:
            logger.info("Redirecting authenticated user from login/register to home")
            return redirect('/')

        # Check if path should bypass auth
        is_public_path = path in ['/login', '/register']
        if is_public_path and not is_authenticated:
            return f(*args, **kwargs)

        # If not authenticated and not a public path, redirect to login
        if not is_authenticated:
            logger.info("Redirecting to login - not authenticated")
            return redirect('/login')

        return f(*args, **kwargs)
    return decorated_function

@app.route('/login')
@auth_middleware  # Ajouter le middleware ici
def serve_login():
    # If you have a login.html in static/
    login_file = os.path.join(app.static_folder, 'login.html')
    logger.info(f"Login file path: {login_file}")
    if os.path.exists(login_file):
        return send_file(login_file)
    return abort(404)

@app.route('/register')
@auth_middleware  # Ajouter le middleware ici
def serve_register():
    # If you have a register.html in static/
    register_file = os.path.join(app.static_folder, 'register.html')
    logger.info(f"Register file path: {register_file}")
    if os.path.exists(register_file):
        return send_file(register_file)
    return abort(404)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
@auth_middleware  # Optional if you still want to protect routes
def serve_frontend(path):
    # Return the static files from the "static" folder
    if not path:
        path = 'index.html'
    full_path = os.path.join(app.static_folder, path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_file(full_path)
    # Fallback to serving index.html
    return send_file(os.path.join(app.static_folder, 'index.html'))

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin in ["http://localhost:3000", "http://localhost:3001", "https://velbots.shop"]:
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

def open_browser():
    print("Opening browser...")
    webbrowser.open('https://velbots.shop')

def set_resource_limits():
    # Vérifier si le module resource est disponible (systèmes Unix/Linux/macOS)
    if resource:
        # Increase the soft limit for number of open files
        soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
        resource.setrlimit(resource.RLIMIT_NOFILE, (min(4096, hard), hard))
    else:
        # Sur Windows, cette fonction ne fait rien
        logger.info("Resource limits adjustment not supported on Windows")

if __name__ == '__main__':
    set_resource_limits()
    # Create uploads directory if it doesn't exist
    uploads_dir = os.path.join(os.path.dirname(app.instance_path), 'uploads')
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
        
    logger.info(f"Static folder path: {os.path.abspath(app.static_folder)}")
    if not os.path.exists(app.static_folder):
        logger.error(f"Static folder not found: {app.static_folder}")
        exit(1)

    if args.dev:
        logger.warning("Running in development mode - Authentication disabled")
    
    from threading import Timer
    Timer(1.5, open_browser).start()

    CERT_PATH = os.path.join(os.path.dirname(__file__), 'certs', 'velbots.shop.cert')
    KEY_PATH = os.path.join(os.path.dirname(__file__), 'certs', 'velbots.shop.key')


    if os.path.exists(CERT_PATH) and os.path.exists(KEY_PATH):
        https_server = WSGIServer(
            ('0.0.0.0', 443),
            app,
            certfile=CERT_PATH,
            keyfile=KEY_PATH,
            log=None  # Disable WSGIServer logs in production
        )
        logger.info("Starting HTTPS on port 443")
        https_server.serve_forever()
    else:
        logger.warning("SSL certificates not found, running in development mode")
        if getattr(sys, 'frozen', False):
            # Production mode
            app.run(debug=False, host='0.0.0.0', port=3001)
        else:
            # Development mode
            app.run(debug=True, host='0.0.0.0', port=3001)