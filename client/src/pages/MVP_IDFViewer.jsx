import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = 'http://127.0.0.1:5000/api';

// IMPORTANT: Please replace this with your actual Google Maps API Key
const GOOGLE_MAPS_API_KEY = "AIzaSyB00aH1ZJGW_PtQhKj6DtOZqh_veQuKAro";
const GOOGLE_MAPS_SCRIPT_URL = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;


const IdfTable = ({ data }) => {
  if (!data || data.length === 0) {
    return null;
  }

  const columns = ['Duration', '2', '5', '10', '25', '50', '100'];

  const getDurationLabel = (durationInMinutes) => {
    if (durationInMinutes < 60) return `${durationInMinutes} min`;
    const hours = durationInMinutes / 60;
    return `${hours} hr`;
  };

  return (
    <div className="overflow-x-auto my-8">
      <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            {columns.map(col => (
              <th key={col} className="px-4 py-2 border-b-2 text-left font-semibold text-gray-700">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-b border-gray-200">{getDurationLabel(row.duration)}</td>
              {['2', '5', '10', '25', '50', '100'].map(rp => (
                <td key={rp} className="px-4 py-2 border-b border-gray-200">{row[rp].toFixed(2)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const IdfChart = ({ stationId, stationName }) => {
  const [chartData, setChartData] = useState({ datasets: [] });
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!stationId) {
        setChartData({ datasets: [] });
        setTableData([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const idfResponse = await fetch(`${API_URL}/idf/curves?stationId=${String(stationId)}`);
        if (!idfResponse.ok) {
          throw new Error('IDF data not found');
        }
        const { data: idfData } = await idfResponse.json();
        
        if (idfData.length === 0) {
          throw new Error('No data points available for this station.');
        }

        setTableData(idfData);
        
        const datasets = ['2', '5', '10', '25', '50', '100'].map(rp => ({
          label: `${rp}-year RP`,
          data: idfData.map(d => ({ x: d.duration, y: d[rp] })),
          borderColor: getLineColor(rp),
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          tension: 0.1,
          pointBackgroundColor: getLineColor(rp),
          pointRadius: 5,
          hidden: false,
        }));

        setChartData({
          datasets,
        });

      } catch (e) {
        console.error("Error fetching IDF data:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [stationId]);

  const getLineColor = (rp) => {
    switch (rp) {
      case '2': return '#2196F3';
      case '5': return '#4CAF50';
      case '10': return '#FFEB3B';
      case '25': return '#FF9800';
      case '50': return '#F44336';
      case '100': return '#9C27B0';
      default: return '#ccc';
    }
  };

  const getDurationLabel = (duration) => {
    const commonDurations = [5, 10, 15, 30, 60, 120, 360, 720, 1440];
    if (commonDurations.includes(duration)) {
        if (duration < 60) return `${duration} min`;
        const hours = duration / 60;
        return `${hours} hr`;
    }
    return '';
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      title: { display: true, text: `Intensity-Duration-Frequency (IDF) Curves for ${stationName}` },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const duration = context.parsed.x;
            const durationLabel = getDurationLabel(duration) || `${(duration / 60).toFixed(2)} hr`;
            return `${label}: ${value.toFixed(2)} mm/h at ${durationLabel}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'logarithmic',
        title: { display: true, text: 'Duration' },
        ticks: {
          callback: function(value, index, ticks) {
            // Only show ticks for common durations to avoid clutter
            const commonDurations = [5, 10, 15, 30, 60, 120, 360, 720, 1440];
            if (commonDurations.includes(value)) {
                return getDurationLabel(value);
            }
            return '';
          }
        },
      },
      y: {
        type: 'logarithmic',
        title: { display: true, text: 'Rainfall Intensity (mm/h)' },
      },
    },
  };

  if (loading) {
    return <p className="text-center text-blue-600 font-medium">Loading IDF data...</p>;
  }
  if (error) {
    return <p className="text-center text-red-600 font-medium mb-4">{error}</p>;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full h-96 mb-8">
        <Line options={options} data={chartData} />
      </div>
      <IdfTable data={tableData} />
    </div>
  );
};

const LocationSearch = ({ onLocationSelect }) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const existingScript = document.getElementById('google-maps-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = GOOGLE_MAPS_SCRIPT_URL;
      script.async = true;
      script.id = 'google-maps-script';
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        setError('Failed to load Google Maps script. Check your API key.');
        setScriptLoaded(false);
      };
      document.head.appendChild(script);
    } else {
      setScriptLoaded(true);
    }

    return () => {
      const script = document.getElementById('google-maps-script');
      if (script) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (scriptLoaded && window.google && inputRef.current && !initialized) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['(cities)'],
        componentRestrictions: { country: 'ca' },
      });

      autocompleteRef.current.addListener('place_changed', () => {
        setError('');
        const place = autocompleteRef.current.getPlace();

        if (!place || !place.geometry || !place.geometry.location) {
          setError("No valid location selected. Please try again.");
          return;
        }

        const lat = place.geometry.location.lat();
        const lon = place.geometry.location.lng();
        const placeName = place.formatted_address || place.name;
        const provinceCode = getProvinceCode(place);

        if (!provinceCode) {
          setError("Selected location does not have a valid province. Please try another location.");
          onLocationSelect(null, placeName);
          return;
        }

        onLocationSelect({ lat, lon, provinceCode, placeName });
      });

      setInitialized(true);
    }
  }, [scriptLoaded, onLocationSelect, initialized]);

  const getProvinceCode = (place) => {
    const addressComponents = place.address_components;
    if (addressComponents) {
      for (const component of addressComponents) {
        if (component.types.includes('administrative_area_level_1')) {
          return component.short_name;
        }
      }
    }
    return null;
    };

  if (!scriptLoaded) {
    return <div className="text-blue-600">Loading Maps...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error loading maps: {error}</div>;
  }

  return (
    <div className="location-search-container mb-8 w-full">
      <input
        ref={inputRef}
        type="text"
        placeholder="Enter a city or address"
        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
      />
    </div>
  );
};


const MVP_IDFViewer = () => {
  const [selectedStation, setSelectedStation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLocationSelect = async (locationData) => {
    if (!locationData) {
      setSelectedStation(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { lat, lon, provinceCode, placeName } = locationData;
      const response = await fetch(`${API_URL}/nearest-station?lat=${lat}&lon=${lon}&province=${provinceCode}`);

      if (!response.ok) {
        throw new Error("Could not find a station for the given location.");
      }

      const nearestStation = await response.json();
      setSelectedStation(nearestStation);
      setLocationName(nearestStation.name);

    } catch (e) {
      setError(e.message);
      setSelectedStation(null);
      setLocationName('');
    } finally {
      setLoading(false);
    }
  };

  const showApiKeyNote = GOOGLE_MAPS_API_KEY === "YOUR_API_KEY_HERE";

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <div className="container mx-auto p-6 max-w-4xl">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">IDF Curves Viewer</h1>
          <p className="text-lg text-gray-600">Explore rainfall intensity-duration-frequency data for Canadian stations.</p>
        </header>

        <main className="bg-white p-8 rounded-2xl shadow-xl">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Find IDF Data by Location</h2>
            {showApiKeyNote && (
              <p className="text-red-600 font-medium mb-4">
                **NOTE: Please replace "YOUR_API_KEY_HERE" in the code with your Google Maps API Key for location search to work.**
              </p>
            )}
            <LocationSearch onLocationSelect={handleLocationSelect} />
          </div>

          {loading && <p className="text-center text-blue-600 font-medium">Searching for nearest station...</p>}
          {error && <p className="text-center text-red-600 font-medium">{error}</p>}

          {selectedStation && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">Data for {locationName}</h2>
              <IdfChart stationId={selectedStation.stationId} stationName={selectedStation.name} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MVP_IDFViewer;
