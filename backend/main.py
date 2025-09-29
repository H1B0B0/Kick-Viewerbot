from flask import Flask, send_file, request, redirect, abort
from flask_cors import CORS
from functools import wraps
import urllib.request
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
import datetime
import ssl
import time
import shutil

if platform.system() != "Windows":
    import resource
else:
    resource = None

def get_env_path():
    """Get the correct path for .env file in both dev and PyInstaller environments"""
    if getattr(sys, 'frozen', False):
        bundle_dir = sys._MEIPASS
        return os.path.join(bundle_dir, '.env')
    else:
        return os.path.join(os.path.dirname(__file__), '.env')

def get_certs_dir():
    """Get the correct path for certs directory in both dev and PyInstaller environments"""
    if getattr(sys, 'frozen', False):
        bundle_dir = sys._MEIPASS
        return os.path.join(bundle_dir, 'certs')
    else:
        return os.path.join(os.path.dirname(__file__), 'certs')

def check_certificate_expiry(cert_path):
    """
    Check if the SSL certificate is expired
    and return True if it is still valid
    """
    try:
        if not os.path.exists(cert_path):
            logger.warning(f"Certificate not found at {cert_path}")
            return False
            
        # Use OpenSSL directly to check certificate expiry
        try:
            import OpenSSL.crypto as crypto
            with open(cert_path, 'rb') as f:
                cert_data = f.read()
            
            cert = crypto.load_certificate(crypto.FILETYPE_PEM, cert_data)
            expiry = cert.get_notAfter().decode('ascii')
            
            expiry_date = datetime.datetime.strptime(expiry, '%Y%m%d%H%M%SZ')
            now = datetime.datetime.now()
            
            days_remaining = (expiry_date - now).days
            logger.info(f"Certificate expires in {days_remaining} days")
            
            return days_remaining > 7
        except ImportError:
            # Fall back to a simpler check if OpenSSL is not available
            logger.warning("OpenSSL not available, using simplified certificate check")
            # Check if the certificate file exists and is not empty
            return os.path.getsize(cert_path) > 0
        
    except Exception as e:
        logger.error(f"Error checking certificate expiry: {str(e)}")
        return False

def fetch_certificate():
    """
    Directly download the SSL certificate files from the API
    """
    cert_dir = get_certs_dir()
    cert_path = os.path.join(cert_dir, 'velbots.shop.cert')
    key_path = os.path.join(cert_dir, 'velbots.shop.key')
    
    # Ensure the certificates directory exists
    if not os.path.exists(cert_dir):
        os.makedirs(cert_dir)
    
    try:
        # Create backups if certificates already exist
        if os.path.exists(cert_path):
            shutil.copy2(cert_path, f"{cert_path}.backup")
        if os.path.exists(key_path):
            shutil.copy2(key_path, f"{key_path}.backup")
            
        # Directly download the certificate
        logger.info("Downloading certificate from API...")
        
        try:
            
            # Download certificate
            certificate_url = "https://api.velbots.shop/auth/certificate"
            urllib.request.urlretrieve(certificate_url, cert_path)
            logger.info("Certificate downloaded successfully")
            # Download private key from separate endpoint
            key_url = "https://api.velbots.shop/auth/certificate/key"
            urllib.request.urlretrieve(key_url, key_path)
            logger.info("Private key downloaded successfully")
            
            # Verify that both files exist and are not empty
            if os.path.exists(cert_path) and os.path.exists(key_path) and \
               os.path.getsize(cert_path) > 0 and os.path.getsize(key_path) > 0:
                
                # Additional validation: check if cert and key match
                try:
                    ssl_context = ssl.create_default_context()
                    ssl_context.load_cert_chain(cert_path, key_path)
                    logger.info("Certificate and key files successfully downloaded and validated - they match!")
                    return True
                except ssl.SSLError as ssl_error:
                    logger.error(f"❌ SSL VALIDATION FAILED: Certificate and private key do not match!")
                    logger.error(f"SSL Error details: {ssl_error}")
                    print("\n" + "="*60)
                    print("🚨 CRITICAL SSL ERROR 🚨")
                    print("="*60)
                    print("The downloaded certificate and private key DO NOT MATCH!")
                    print("This will prevent HTTPS from working properly.")
                    print("="*60 + "\n")
                    return False
                except Exception as validation_error:
                    logger.error(f"Certificate validation error: {validation_error}")
                    return False
            else:
                logger.error("Downloaded certificate or key files are empty")
                return False
            
        except Exception as download_error:
            logger.error(f"Error downloading certificate files: {str(download_error)}")
            
            try:
                # Restore backups if they exist
                if os.path.exists(f"{cert_path}.backup"):
                    shutil.copy2(f"{cert_path}.backup", cert_path)
                    logger.info("Restored certificate backup")
                if os.path.exists(f"{key_path}.backup"):
                    shutil.copy2(f"{key_path}.backup", key_path)
                    logger.info("Restored key backup")
                return os.path.exists(cert_path) and os.path.exists(key_path)
            except Exception as backup_error:
                logger.error(f"Error restoring backup certificates: {str(backup_error)}")
            
            return False
            
    except Exception as e:
        logger.error(f"Unexpected error in fetch_certificate: {str(e)}")

        return False

def ensure_valid_certificates():
    """
    Ensures that valid certificates are available
    Checks expiry and retrieves new certificates if needed
    """
    cert_dir = get_certs_dir()
    cert_path = os.path.join(cert_dir, 'velbots.shop.cert')
    key_path = os.path.join(cert_dir, 'velbots.shop.key')
    
    # If certificates don't exist or are expired, retrieve new ones
    if not os.path.exists(cert_path) or not os.path.exists(key_path) or not check_certificate_expiry(cert_path):
        logger.warning("Certificates missing or expired, fetching new ones")
        # Ajouter un délai aléatoire pour éviter que tous les clients ne demandent en même temps
        time.sleep(0.5 + (datetime.datetime.now().microsecond / 1000000))  # 0.5-1.5 secondes
        return fetch_certificate()
    else:
        logger.info("Certificates are valid and up to date")
    
    return True

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
        is_public_path = path in ['/login', '/register', '/ssl_error.html']
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

@app.route('/ssl_error.html')
def serve_ssl_error():
    """Serve the SSL error page without authentication - generated dynamically"""
    error_html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TwitchViewerBOT - SSL Certificate Error</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                max-width: 600px;
                text-align: center;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .error-icon {
                font-size: 64px;
                margin-bottom: 20px;
            }
            h1 {
                margin: 0 0 20px 0;
                font-size: 2.5em;
                font-weight: 300;
            }
            .error-message {
                font-size: 1.2em;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .details {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
                text-align: left;
                font-family: monospace;
                font-size: 0.9em;
            }
            .retry-btn {
                background: linear-gradient(45deg, #00C9FF, #92FE9D);
                border: none;
                padding: 15px 30px;
                border-radius: 25px;
                color: #333;
                font-weight: bold;
                cursor: pointer;
                font-size: 1.1em;
                transition: transform 0.2s;
            }
            .retry-btn:hover {
                transform: translateY(-2px);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error-icon">🔒❌</div>
            <h1>SSL Certificate Error</h1>
            <div class="error-message">
                TwitchViewerBOT encountered an SSL certificate validation error.
                The certificate and private key don't match properly.
            </div>
            <div class="details">
                <strong>Technical Details:</strong><br>
                • Certificate and private key mismatch<br>
                • HTTPS server cannot start safely<br>
                • Running in fallback HTTP mode on port 3001<br>
                • Check server logs for more information
            </div>
            <button class="retry-btn" onclick="window.location.reload()">
                🔄 Retry Connection
            </button>
            <div style="margin-top: 30px; font-size: 0.9em; opacity: 0.8;">
                The application is still running on <strong>http://localhost:3001</strong>
            </div>
        </div>
        <script>
            // Manual refresh only - no auto-refresh to avoid spam
            console.log('SSL Error Page loaded. Click retry button to check if SSL is fixed.');
        </script>
    </body>
    </html>
    """
    return error_html

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

def open_ssl_error_page():
    """Open the SSL error page in browser"""
    print("Opening SSL error page...")
    webbrowser.open('http://localhost:3001/ssl_error.html')

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
    
    cert_dir = get_certs_dir()
    CERT_PATH = os.path.join(cert_dir, 'velbots.shop.cert')
    KEY_PATH = os.path.join(cert_dir, 'velbots.shop.key')

    cert_status = ensure_valid_certificates()

    if os.path.exists(CERT_PATH) and os.path.exists(KEY_PATH) and cert_status:
        # Try to validate certificates before starting HTTPS
        try:
            ssl_context = ssl.create_default_context()
            ssl_context.load_cert_chain(CERT_PATH, KEY_PATH)
            logger.info("SSL certificates validated successfully")
            
            from threading import Timer
            Timer(1.5, open_browser).start()
            
            https_server = WSGIServer(
                ('0.0.0.0', 443),
                app,
                certfile=CERT_PATH,
                keyfile=KEY_PATH,
                log=None  # Disable WSGIServer logs in production
            )
            logger.info("Starting HTTPS on port 443")
            https_server.serve_forever()
        except ssl.SSLError as e:
            logger.error(f"SSL certificate validation failed: {e}")
            logger.warning("Certificate and key don't match, falling back to HTTP mode")
            
            print("\n" + "="*60)
            print("🚨 SSL CERTIFICATE ERROR - FALLBACK MODE 🚨")
            print("="*60)
            print("HTTPS server cannot start due to SSL certificate issues.")
            print("The application is running in HTTP fallback mode on port 3001.")
            print("Access the application at: http://localhost:3001")
            print("Opening SSL error page in browser...")
            print("="*60 + "\n")
            
            # Open SSL error page once only
            from threading import Timer
            Timer(1.5, open_ssl_error_page).start()
            
            if getattr(sys, 'frozen', False):
                # Production mode
                app.run(debug=False, host='0.0.0.0', port=3001)
            else:
                # Development mode
                app.run(debug=True, host='0.0.0.0', port=3001)
    else:
        logger.warning("SSL certificates not found or invalid, running in development mode")
        print("\n" + "="*50)
        print("🔧 DEVELOPMENT MODE - No SSL certificates")
        print("="*50)
        print("Running in HTTP mode on port 3001")
        print("Access the application at: http://localhost:3001")
        print("="*50 + "\n")
        
        # Open browser once only for development mode (normal app, not SSL error page)
        from threading import Timer
        Timer(1.5, lambda: webbrowser.open('http://localhost:3001/ssl_error.html')).start()

        if getattr(sys, 'frozen', False):
            # Production mode
            app.run(debug=False, host='0.0.0.0', port=3001)
        else:
            # Development mode
            app.run(debug=True, host='0.0.0.0', port=3001)