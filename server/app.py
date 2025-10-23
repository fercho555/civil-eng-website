import re
import json
import os
import math
import logging
from datetime import datetime, timezone, timedelta
import base64

from flask import (
    Flask, request, jsonify, make_response, g
)
from flask_cors import CORS
from flask_pymongo import PyMongo
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import scrypt
import bcrypt
from bson import ObjectId
from dotenv import load_dotenv
from pathlib import Path
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity

from free_access import require_trial_access  # Assuming you have this module


# Load env variables early
env_path = Path(__file__).parent.parent / 'client' / '.env'
load_dotenv(dotenv_path=env_path)

# Mongo client and collections, global for static operations or during data loading
# mongo_uri = os.getenv("MONGO_URI")
# client = MongoClient(mongo_uri)
# db = client['contactDB']
# users_collection = db['users']
# contacts_collection = db['contacts']


# Global static data holders (loaded only once)
IDF_DATA = {}
STATIONS_DATA_BY_PROVINCE = {}
STATIONS_DATA = []


def load_data():
    """Load data recursively from province subdirectories in data dir."""
    print("--- Starting data loading process ---")
    loaded_provinces = []
    DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
    for province_code in os.listdir(DATA_DIR):
        province_path = os.path.join(DATA_DIR, province_code)
        if os.path.isdir(province_path):
            stations_file_path = os.path.join(province_path, 'master_stations_enriched_validated.json')
            corrected_idf_file_path = os.path.join(province_path, 'idf_data_by_station_corrected.json')
            original_idf_file_path = os.path.join(province_path, 'idf_data_by_station.json')

            try:
                if os.path.exists(stations_file_path):
                    with open(stations_file_path, 'r', encoding='utf-8') as f:
                        stations = json.load(f)
                        STATIONS_DATA_BY_PROVINCE[province_code] = stations
                        STATIONS_DATA.extend(stations)
                        print(f"Loaded {len(stations)} stations for {province_code}.")
                else:
                    print(f"Warning: Station data file not found for {province_code} at {stations_file_path}")
                    continue

                idf_file_path = None
                if os.path.exists(corrected_idf_file_path):
                    idf_file_path = corrected_idf_file_path
                    print(f"Using corrected IDF data file for {province_code}.")
                elif os.path.exists(original_idf_file_path):
                    idf_file_path = original_idf_file_path
                    print(f"Using original IDF data file for {province_code}.")
                else:
                    print(f"Warning: No IDF data file found for {province_code}")
                    continue

                with open(idf_file_path, 'r', encoding='utf-8') as f:
                    idf_data_raw = json.load(f)

                sample_key = next(iter(idf_data_raw))
                if sample_key.isalnum():
                    for station_id, idf_data in idf_data_raw.items():
                        IDF_DATA[station_id] = idf_data
                else:
                    for long_key, idf_data in idf_data_raw.items():
                        match = re.search(fr"_{province_code}_([0-9A-Z]+)", long_key)
                        if match:
                            station_id = match.group(1)
                            IDF_DATA[station_id] = idf_data
                        else:
                            print(f"Warning: Could not parse station ID from key: {long_key}")

                print(f"Loaded IDF data for {province_code}. Current total keys: {len(IDF_DATA)}")
                loaded_provinces.append(province_code)

            except json.JSONDecodeError as e:
                print(f"ERROR: Failed to parse JSON data for {province_code}: {e}")
            except Exception as e:
                print(f"An unexpected error occurred while loading data for {province_code}: {e}")

    if loaded_provinces:
        print("\n--- Data loading complete ---")
        print(f"Successfully loaded data for: {', '.join(loaded_provinces)}")
        print(f"Total stations loaded: {len(STATIONS_DATA)}")
        print(f"Total IDF data sets loaded: {len(IDF_DATA)}")
    else:
        print("\n--- Data loading failed ---")
        print("No valid provincial data found.")

    if not IDF_DATA:
        raise Exception("No IDF data was loaded. The application cannot start without IDF data.")


try:
    load_data()
except Exception as e:
    print(f"Application will not start due to a critical data loading error: {e}")
    exit()

# Flask-PyMongo instance globally:
mongo = PyMongo()

# Helper functions at module level for reusability and clarity:

def duration_to_minutes(duration_str):
    if not isinstance(duration_str, str):
        return None
    duration_str = duration_str.lower().strip()
    if 'min' in duration_str:
        return int(duration_str.replace('min', '').strip())
    elif 'h' in duration_str:
        return int(float(duration_str.replace('h', '').strip()) * 60)
    return None

def extract_province_code(province_str):
    CODES = ["BC", "AB", "SK", "MB", "ON", "QC", "NB", "NS", "PE", "NL", "YT", "NT", "NU"]
    if not isinstance(province_str, str):
        return None
    for code in CODES:
        if code in province_str:
            return code
    return None

def haversine(lat1, lon1, lat2, lon2):
    R = 6371 # Radius of Earth in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R*c

def legacy_verify(pw, hash_val):
    if isinstance(hash_val, (tuple, list)):
        hash_val = hash_val[0] if hash_val else ''
    if not isinstance(hash_val, str):
        logging.warning(f"Password hash is not string: {hash_val}")
        return False
    try:
        if hash_val.startswith('scrypt:'):
            parts = hash_val.split('$')
            if len(parts) == 4:
                _, params, salt_b64, key_b64 = parts
                salt = base64.b64decode(salt_b64)
                key = base64.b64decode(key_b64)
                derived = scrypt.hash(pw, salt, N=32768, r=8, p=1, buflen=len(key))
                return derived == key
            else:
                logging.warning(f"Malformed scrypt hash structure: {hash_val}")
                return False
        elif hash_val.startswith('$2b$') or hash_val.startswith('$2a$'):
            return bcrypt.checkpw(pw.encode('utf-8'), hash_val.encode('utf-8'))
        else:
            logging.warning(f"Unsupported hash format: {hash_val}")
            return False
    except Exception as e:
        logging.error(f"Exception in legacy_verify for hash {hash_val}: {e}")
        return False
jwt_manager = JWTManager()
# Create app factory:
def create_app():
    app = Flask(__name__, static_folder='../build', static_url_path='/')

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret')
    app.config['MONGO_URI'] = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')

    # Initialize PyMongo with app
    mongo.init_app(app)
    jwt_manager.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "https://civil-eng-website-1ugh.vercel.app"]}}, supports_credentials=True)
    
    from api.user_routes import user_bp
    CORS(user_bp, supports_credentials=True)
    app.register_blueprint(user_bp, url_prefix='/api')

    @app.before_request
    def before_request_func():
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "https://civil-eng-website-1ugh.vercel.app")
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE,OPTIONS')
            response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 200

    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_secret_here")

    def create_jwt(user):
        payload = {
            "sub": str(user["_id"]),
            "username": user["username"],
            "role": user.get("role", "user"),
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        return token

    def verify_password(plain_password, password_hash):
        if not password_hash:
            return False
        if password_hash.startswith('pbkdf2:sha256:') or password_hash.startswith('pbkdf2:sha256$'):
            return check_password_hash(password_hash, plain_password)
        elif password_hash.startswith('$2b$') or password_hash.startswith('$2a$'):
            return bcrypt.checkpw(plain_password.encode('utf-8'), password_hash.encode('utf-8'))
        elif password_hash.startswith('scrypt:'):
            try:
                parts = password_hash.split('$')
                if len(parts) == 4:
                    _, params, salt_b64, key_b64 = parts
                    salt = base64.b64decode(salt_b64)
                    key = base64.b64decode(key_b64)
                    derived = scrypt.hash(plain_password, salt, N=32768, r=8, p=1, buflen=len(key))
                    return derived == key
                else:
                    return False
            except Exception as e:
                app.logger.error(f"Error verifying scrypt hash: {e}")
                return False
        else:
            return False

    def decode_token(token):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            return payload.get("sub")
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    @app.errorhandler(Exception)
    def handle_exception(e):
        app.logger.error("An error occurred", exc_info=e)
        return jsonify({"error": str(e)}), 500

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not Found", "message": "The requested URL was not found on the server."}), 404

    @app.before_request
    def load_user():
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "") if auth_header else None
        if not token:
            g.user = None
            return
        user_id = decode_token(token)
        if not user_id:
            g.user = None
            return
        try:
            g.user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        except Exception as e:
            app.logger.error(f"Error loading user: {e}")
            g.user = None

    @app.before_request
    def make_user_datetimes_aware():
        user = getattr(g, 'user', None)
        if user is None:
            return

        trial_start = user.get('trial_start')
        if trial_start and trial_start.tzinfo is None:
            user['trial_start'] = trial_start.replace(tzinfo=timezone.utc)

    @app.route('/api/auth/refresh-token', methods=['POST'])
    def refresh_token():
        data = request.get_json()
        refresh_token = data.get('token')

        if not refresh_token:
            return jsonify({"error": "Refresh token required"}), 400

        try:
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get('sub')
            if not user_id:
                raise jwt.InvalidTokenError("Invalid token payload")

            user = mongo.db.users.find_one({'_id': ObjectId(user_id)})

            if not user:
                return jsonify({"error": "User not found"}), 404

            new_access_token = create_jwt(user)
            # Optional: implement refresh token rotation here
            new_refresh_token = refresh_token

            return jsonify({
                "accessToken": new_access_token,
                "refreshToken": new_refresh_token
            })

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Refresh token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid refresh token"}), 401
        except Exception as e:
            return jsonify({"error": "Refresh token error", "details": str(e)}), 500

    @app.route('/api/stations', methods=['GET'])
    def get_stations():
        return jsonify(STATIONS_DATA)

    @app.route('/api/nearest-station', methods=['GET'])
    def nearest_station():
        try:
            lat = float(request.args.get('lat'))
            lon = float(request.args.get('lon'))
            province_code = request.args.get('province')
            print(f"Received request for nearest station for coordinates: Lat: {lat}, Lon: {lon}, Province: {province_code}")
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid latitude, longitude, or province code."}), 400
        city_name = request.args.get('city_name', '').strip()

        def find_station_by_name_and_province(city_name, province, stations):
            if not city_name:
                return None
            city_name_clean = city_name.lower().replace(' ', '')
            for station in stations:
                station_name_field = (station.get('stationName') or station.get('name') or '').lower().replace(' ', '')
                if city_name_clean in station_name_field and station.get('province', '').upper() == province.upper():
                    return station
            return None

        preferred_station = find_station_by_name_and_province(city_name, province_code, STATIONS_DATA)
        if preferred_station and str(preferred_station.get('stationId')) in IDF_DATA:
            distance_km = haversine(lat, lon, float(preferred_station['lat']), float(preferred_station['lon']))
            preferred_station['distance_km'] = round(distance_km, 2)
            print(f"Preferred station match by city: {preferred_station.get('stationId')}, Name: {(preferred_station.get('stationName') or preferred_station.get('name') or '')}")
            return jsonify(preferred_station)

        candidate_stations = [s for s in STATIONS_DATA if extract_province_code(s.get('province', '')) == province_code]

        if not candidate_stations:
            print(f"No stations found matching province code '{province_code}'. Falling back to all stations.")
            candidate_stations = STATIONS_DATA

        sorted_stations = sorted(candidate_stations, key=lambda s: haversine(lat, lon, float(s.get('lat', 0)), float(s.get('lon', 0))))

        for station in sorted_stations:
            station_id = str(station.get('stationId'))
            if station_id in IDF_DATA:
                distance_km = haversine(lat, lon, float(station.get('lat', 0)), float(station.get('lon', 0)))
                station['distance_km'] = round(distance_km, 2)
                print(f"Nearest station with IDF data found: {station_id}, Name: {station.get('name')}, Distance: {station['distance_km']} km")
                return jsonify(station)
            else:
                print(f"Station {station_id} is nearby but has no IDF data.")

        return jsonify({"error": "No nearby station with IDF data found."}), 404

    @app.route('/api/idf/curves', methods=['GET'])
    @require_trial_access
    def idf_curves():
        try:
            stationId = request.args.get('stationId')
            print(f"Received request for IDF curves for station ID: {stationId}")
            if not stationId:
                return jsonify({"error": "Missing 'stationId' parameter"}), 400
            idf_station_data = IDF_DATA.get(stationId)
            if not idf_station_data:
                print(f"IDF data not found for this station ID: {stationId}")
                return jsonify({"error": "IDF data not found for this station."}), 404

            processed_data = []
            for entry in idf_station_data:
                duration_str = entry.get('duration')
                duration_in_minutes = duration_to_minutes(duration_str)
                if duration_in_minutes is not None and duration_in_minutes > 0:
                    data_point = {'duration': duration_in_minutes}
                    for rp in ['2', '5', '10', '25', '50', '100']:
                        depth = entry.get(rp)
                        if depth is not None:
                            try:
                                intensity = float(depth) / (duration_in_minutes / 60.0)
                                data_point[rp] = intensity
                            except (ValueError, TypeError):
                                continue
                    if len(data_point) > 1:
                        processed_data.append(data_point)

            processed_data.sort(key=lambda x: x['duration'])
            return jsonify({"data": processed_data})

        except Exception as e:
            app.logger.error(f"Error processing IDF curves: {e}")
            return jsonify({"error": "Internal server error occurred."}), 500

    @app.route('/')
    def index():
        return {"message": "Backend service is running"}, 200

    @app.route('/api/contact', methods=['GET', 'POST'])
    def get_contact_submissions():
        if request.method == 'GET':
            submissions = list(mongo.db.contacts.find({}, {'_id': 0}))
            return jsonify(submissions)
        if request.method == 'POST':
            app.logger.info("POST /api/contact started")
            data = request.get_json()
            app.logger.info(f"Data received: {data}")
            if not data:
                return jsonify({"error": "Invalid JSON data"}), 400
            name = data.get('name')
            email = data.get('email')
            message = data.get('message')
            if not name or not email or not message:
                return jsonify({"error": "Missing fields in submission"}), 400
            contact_doc = {
                "name": name,
                "email": email,
                "message": message,
                "date": datetime.now(timezone.utc)
            }
            mongo.db.contacts.insert_one(contact_doc)
            return jsonify({"status": "success", "message": "Submission received"}), 201

    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        user = mongo.db.users.find_one({"username": username})
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({"error": "Invalid username or password"}), 401

        payload = {
            'sub': username,
            'exp': datetime.now(timezone.utc) + timedelta(hours=1)
        }
        token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({"token": token, "user": {"username": username}}), 200

    @app.route('/api/register', methods=['POST'])
    def register():
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
        
        if mongo.db.users.find_one({'username': username}):
            return jsonify({"error": "Username already taken"}), 409

        password_hash = generate_password_hash(password, method='pbkdf2:sha256')
        now = datetime.now(timezone.utc)
        trial_days = 7
        trial_start = now
        trial_end = now + timedelta(days=trial_days)
        user_doc = {
            "username": username,
            "password_hash": password_hash,
            "role": "user",
            "trial_active": True,
            "trial_start": trial_start,
            "trial_end": trial_end,
            "trial_days": trial_days
        }
        mongo.db.users.insert_one(user_doc)
        return jsonify({"message": "Registration successful"}), 201
    # @app.route('/api/user/profile', methods=['GET'])
    # @jwt_required()
    # def user_profile():
    #     current_user = get_jwt_identity()
    #     user = mongo.db.users.find_one({'username': current_user}, {'_id': 0, 'password': 0})
    #     if not user:
    #         return jsonify({"error": "User not found"}), 404
    #     return jsonify(user), 200
    return app
    
if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 10000))
    print(app.url_map)
    #app.run(debug=True, threaded=True, port=port)
    app.run(host="0.0.0.0", port=port)
