import re
import json
import os
import math
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='../build', static_url_path='/')
CORS(app) # Enable CORS for all routes

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

# Global data structures to be populated
IDF_DATA = {}
STATIONS_DATA_BY_PROVINCE = {}
STATIONS_DATA = []

def load_data():
    """Dynamically loads station and IDF data from all provincial subdirectories."""
    print("--- Starting data loading process ---")
    
    loaded_provinces = []
    
    # Iterate through each subdirectory in the data directory
    for province_code in os.listdir(DATA_DIR):
        province_path = os.path.join(DATA_DIR, province_code)
        
        if os.path.isdir(province_path):
            stations_file_path = os.path.join(province_path, 'master_stations_enriched_validated.json')
            #idf_file_path = os.path.join(province_path, 'idf_data_by_station.json')
            # Use corrected IDF data file if exists; fallback to original
            corrected_idf_file_path = os.path.join(province_path, 'idf_data_by_station_corrected.json')
            original_idf_file_path = os.path.join(province_path, 'idf_data_by_station.json')
            try:
                # Load station data
                if os.path.exists(stations_file_path):
                    with open(stations_file_path, 'r', encoding='utf-8') as f:
                        stations = json.load(f)
                        STATIONS_DATA_BY_PROVINCE[province_code] = stations
                        STATIONS_DATA.extend(stations)
                        print(f"Loaded {len(stations)} stations for {province_code}.")
                else:
                    print(f"Warning: Station data file not found for {province_code} at {stations_file_path}")
                    continue

                # Load IDF data: prefer corrected keys file if available
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
                with open(corrected_idf_file_path, 'r', encoding='utf-8') as f:
                    idf_data_raw = json.load(f)
                    
                    # Check if keys are simple station IDs (corrected file) or complex keys
                sample_key = next(iter(idf_data_raw))
                if sample_key.isalnum():
                    # Corrected file: simple keys are station IDs directly
                    for station_id, idf_data in idf_data_raw.items():
                        IDF_DATA[station_id] = idf_data
                else:
                    # Original file: keys are complex, use regex to parse station ID
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
    R = 6371 # Radius of Earth in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
    
@app.route('/api/stations', methods=['GET'])
def get_stations():
    return jsonify(STATIONS_DATA)

@app.route('/api/nearest-station', methods=['GET'])
def nearest_station():
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        # We no longer need the province code for filtering, but we keep it to maintain the API contract
        province_code = request.args.get('province') 
        
        print(f"Received request for nearest station for coordinates: Lat: {lat}, Lon: {lon}, Province: {province_code}")
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid latitude, longitude, or province code."}), 400
    city_name = request.args.get('city_name', '').strip()  # This must be passed from the frontend!

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
    # Search the entire STATIONS_DATA list, which contains stations from all provinces
    #sorted_stations = sorted(STATIONS_DATA, key=lambda s: haversine(lat, lon, float(s.get('lat', 0)), float(s.get('lon', 0))))
    candidate_stations = [
    s for s in STATIONS_DATA
        if extract_province_code(s.get('province', '')) == province_code
    ]
    # If no candidates found, fall back to all stations (or you can return error here)
    if not candidate_stations:
        print(f"No stations found matching province code '{province_code}'. Falling back to all stations.")
        candidate_stations = STATIONS_DATA
    sorted_stations = sorted(candidate_stations, key=lambda s: haversine(lat, lon, float(s.get('lat', 0)), float(s.get('lon', 0))))
    for station in sorted_stations:
        station_id = str(station.get('stationId'))
        # Debugging: check if the station ID exists in our loaded IDF data
        if station_id in IDF_DATA:
            distance_km = haversine(lat, lon, float(station.get('lat', 0)), float(station.get('lon', 0)))
            station['distance_km'] = round(distance_km, 2)
            print(f"Nearest station with IDF data found: {station_id}, Name: {station.get('name')}, Distance: {station['distance_km']} km")
            return jsonify(station)
        else:
            print(f"Station {station_id} is nearby but has no IDF data.")
            
    return jsonify({"error": "No nearby station with IDF data found."}), 404

@app.route('/api/idf/curves', methods=['GET'])
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
                            # FIX: Calculate intensity in mm/h from depth (mm)
                            intensity = float(depth) / (duration_in_minutes / 60.0)
                            data_point[rp] = intensity
                        except (ValueError, TypeError):
                            continue
                
                if len(data_point) > 1:
                    processed_data.append(data_point)

        # Sort the processed data by duration before returning
        processed_data.sort(key=lambda x: x['duration'])
        
        return jsonify({"data": processed_data})

    except Exception as e:
        print(f"An error occurred while processing IDF curves: {e}")
        return jsonify({"error": "An internal server error occurred."}), 500

@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)