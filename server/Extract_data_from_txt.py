import re
import json
import os

def parse_txt_to_json(file_path):
    """
    Parses a single ECCC .txt file to extract station metadata and IDF data.
    """
    try:
        with open(file_path, 'r', encoding='latin-1') as f:
            lines = f.readlines()
    except UnicodeDecodeError:
        print(f"Error decoding file: {file_path}. Trying 'utf-8'.")
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
    content = "".join(lines)

    # --- Step 1: Extract Station Metadata ---
    station_name, province, station_id = None, None, None
    for line in lines:
        line = line.strip()
        station_info_regex = re.compile(r'(.+?)\s+([A-Z ]{2,})\s+([\dA-Z]{5,8})\s*$')
        #station_info_regex = re.compile(r'(.+?)\s+([A-Z]{2,})\s+([\dA-Z]{7})\s*$')
        station_match = station_info_regex.search(line)
        if station_match:
            station_name = station_match.group(1).strip()
            province = station_match.group(2).strip()
            station_id = station_match.group(3).strip()
            # Normalize BC province
            if province == "BRITISH COLUMBIA":
                province = "BC"
            break
    
    if not all([station_name, province, station_id]):
        print("Could not parse station info; sample lines:")
        for line in lines[:10]:
            print(line.strip())
        print(f"Error: Could not find station info in {file_path}")
        return None

    # Regex for latitude and longitude
    lat_lon_regex = re.compile(
        r"Latitude:\s*(\d+)\s*(\d+\.?\d*?)'\s*([NS])\s*Longitude:\s*(\d+)\s*(\d+\.?\d*?)'\s*([EW])"
    )
    lat_lon_match = lat_lon_regex.search(content)

    if not lat_lon_match:
        print(f"Error: Could not find lat/lon in {file_path}")
        return None

    # Convert degrees and minutes to decimal degrees
    lat_deg, lat_min, lat_dir, lon_deg, lon_min, lon_dir = lat_lon_match.groups()
    lat_decimal = float(lat_deg) + float(lat_min) / 60
    lon_decimal = float(lon_deg) + float(lon_min) / 60

    if lat_dir == 'S':
        lat_decimal *= -1
    if lon_dir == 'W':
        lon_decimal *= -1
    
    # --- Step 2: Extract IDF Data (Table 2a) ---
    idf_data = []

    # Find the block for Table 2a
    table_2a_regex = re.compile(r"Table 2a.*?(?=\bTable)", re.DOTALL)
    table_block_match = table_2a_regex.search(content)

    if not table_block_match:
        print(f"Warning: Could not find IDF data (Table 2a) in {file_path}. Skipping IDF data extraction.")
        return {
            "stationName": station_name, "province": province, "stationId": station_id,
            "lat": lat_decimal, "lon": lon_decimal, "idf_data": []
        }

    table_content = table_block_match.group(0)
    
    # Find the header line within the isolated block
    header_line_match = re.search(r'Duration.*yr/ans', table_content, re.DOTALL)
    
    if header_line_match:
        header_line = header_line_match.group(0)
        
        # IMPROVED: Extract return periods by finding all numbers in the header line
        return_periods = re.findall(r"(\d+)", header_line)

        # Get the data lines that follow the header
        data_content = table_content[header_line_match.end():]
        data_lines = data_content.strip().split('\n')
        
        # Regex to capture the duration and the rest of the line
        data_row_regex = re.compile(r"^\s*(.+?)\s+([\d\.\s-].*)$")

        for line in data_lines:
            line = line.strip()
            # Skip non-data lines
            if not line or '---' in line or 'Année' in line or '#' in line or line.startswith('+/-') or line.isspace():
                continue
            
            match = data_row_regex.match(line)
            if match:
                duration_str = match.group(1).strip()
                values_str = match.group(2).strip()
                
                # Split the values string by any whitespace
                values = values_str.split()

                # Remove the last value if it's an extra column
                if len(values) > len(return_periods):
                    values = values[:-1] # Remove the last element
                
                if len(values) == len(return_periods):
                    entry = {'duration': duration_str}
                    for i, rp in enumerate(return_periods):
                        try:
                            # Convert to float, or set to None if it's a hyphen
                            entry[rp] = float(values[i]) if values[i] != '-' else None
                        except (ValueError, IndexError):
                            entry[rp] = None
                    idf_data.append(entry)
                else:
                    print(f"Mismatch in column count on line: {line.strip()}")

    # --- Step 3: Combine and Return a Single JSON Object ---
    return {
        "stationName": station_name,
        "province": province,
        "stationId": station_id,
        "lat": lat_decimal,
        "lon": lon_decimal,
        "idf_data": idf_data
    }

# --- Example Usage (rest of the script) ---
def create_master_json(source_folder, output_file):
    all_stations_data = []
    
    for filename in os.listdir(source_folder):
        if filename.endswith(".txt"):
            file_path = os.path.join(source_folder, filename)
            station_json = parse_txt_to_json(file_path)
            if station_json:
                all_stations_data.append(station_json)
                
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_stations_data, f, indent=4)
        
    print(f"Successfully created {output_file} with {len(all_stations_data)} stations.")

# Set your source and output paths
source_folder = r'C:\Users\moses\civil-eng-website\server\data\NS\NS_txt_files'
output_file = r'C:\Users\moses\civil-eng-website\server\data\NS\master_stations_enriched_validated.json'

create_master_json(source_folder, output_file)