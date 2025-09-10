import json
import os
import re
import unicodedata

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(__file__)
BASE_DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')

PROVINCES_TO_PROCESS = ['ON', 'QC', 'AB', 'BC', 'SK', 'MB', 'NB', 'NL', 'NS']

# Example alias map for known station name variants
ALIAS_MAP = {
    'sherbrooke a': 'sherbrooke',
    'montreal st hubert a': 'montreal st hubert',
    'baie comeau a': 'baie comeau',
    'lourdes de blanc sablon a': 'lourdes de blanc sablon',
    'charlevoix (mrc)': 'charlevoix',
    'gagnon a': 'gagnon',
    'havre saint pierre a': 'havre saint pierre',
    'natashquan a': 'natashquan',
    'iles de la madeleine': 'iles de la madeleine',
    'la pocatiere': 'la pocatiere',
    'bagotville a': 'bagotville',
    'roberval a': 'roberval',
    'la baie': 'la baie',
    'la tuque': 'la tuque',
    'la grande riviere a': 'la grande riviere',
    'la sarre': 'la sarre',
    'matagami a': 'matagami',
    'val d or': 'val d or',
    'kuujjuaq a': 'kuujjuaq',
    # Add more aliases here as needed
}

def normalize_name(name):
    """Normalize station names for matching."""
    if not name:
        return ''
    # Remove accents
    name = unicodedata.normalize('NFKD', name)
    name = ''.join([c for c in name if not unicodedata.combining(c)])
    # Lowercase
    name = name.lower()
    # Remove extra punctuation and replace underscores/hyphens with spaces
    name = re.sub(r'[\(\)\[\]\.\,]', '', name)
    name = name.replace('_', ' ').replace('-', ' ')
    # Remove trailing designators like ' a', ' b', or year spans e.g. ' (1963-1991)'
    name = re.sub(r'\s+[ab]\b', '', name)
    name = re.sub(r'\s*\(\d{4}.*\)', '', name)
    # Collapse multiple spaces to one
    name = ' '.join(name.split())
    # Apply alias map
    if name in ALIAS_MAP:
        name = ALIAS_MAP[name]
    return name

def fix_keys_for_province(province_code):
    province_dir = os.path.join(BASE_DATA_DIR, province_code)
    stations_file = os.path.join(province_dir, 'master_stations_enriched_validated.json')
    idf_file = os.path.join(province_dir, 'idf_data_by_station.json')
    output_file = os.path.join(province_dir, 'idf_data_by_station_corrected.json')

    print(f"\n--- Processing data for {province_code} ---")

    try:
        print(f"Loading stations data from: {stations_file}")
        with open(stations_file, 'r', encoding='utf-8') as f:
            stations_data = json.load(f)

        # Build lookup with normalized names
        station_id_lookup = {}
        for station in stations_data:
            if 'stationId' in station:
                normalized = normalize_name(station.get('normalizedName', '') or station.get('name', ''))
                station_id_lookup[normalized] = str(station['stationId'])
        print(f"Created lookup table with {len(station_id_lookup)} entries.")

        print(f"Loading raw IDF data from: {idf_file}")
        with open(idf_file, 'r', encoding='utf-8') as f:
            idf_data = json.load(f)

        corrected_idf_data = {}
        processed_count = 0
        fixed_count = 0

        key_regex = re.compile(rf'_(?:{province_code})_([0-9A-Z]+)_(.*)')

        print(f"Processing and correcting IDF data keys for {province_code}...")
        for old_key, data in idf_data.items():
            processed_count += 1
            match = key_regex.search(old_key)
            if match:
                old_id = match.group(1)
                raw_name = match.group(2)
                normalized_name = normalize_name(raw_name)

                # Look up corrected ID
                correct_id = station_id_lookup.get(normalized_name)

                # Fallback: old_id in stationId list
                station_ids = [str(s['stationId']) for s in stations_data if 'stationId' in s]
                if not correct_id and old_id in station_ids:
                    correct_id = old_id

                if correct_id:
                    corrected_idf_data[correct_id] = data
                    fixed_count += 1
                else:
                    print(f"Warning: Could not find matching station for '{normalized_name}' or ID '{old_id}'. Skipped key: {old_key}")
            else:
                print(f"Warning: Could not parse station ID from key: {old_key}")

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(corrected_idf_data, f, indent=2)

        print(f"Processed {processed_count} IDF keys.")
        print(f"Successfully fixed {fixed_count} keys and saved to: {output_file}")

    except FileNotFoundError as e:
        print(f"Error: Required file not found. Please ensure the path is correct: {e}")
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse a JSON file. Please check for syntax errors: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during processing: {e}")

if __name__ == "__main__":
    print("--- Starting IDF Data Key Correction ---")
    for province_code in PROVINCES_TO_PROCESS:
        fix_keys_for_province(province_code)
    print("\n--- All provinces processed. Script finished. ---")
