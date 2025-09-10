/* global __google_maps_api_key */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// To make the app functional, please replace 'YOUR_API_KEY' with your actual Google Maps API key.
// Example: const GOOGLE_MAPS_API_KEY = 'AIzaSyB-C1...';
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_PLACES_API_KEY || '';

// const GOOGLE_MAPS_API_KEY = typeof __google_maps_api_key !== 'undefined' ? __google_maps_api_key : 'AIzaSyD4ngcsdvF7gXdLiYb8UPpSWEhixiIpe4g';
const API_BASE_URL = 'http://127.0.0.1:5000/api';

const DownloadIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
  </svg>
);

const CloseIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucude-x">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const MapPinIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin">
    <path d="M12 18s-2.5-3.5-2.5-5.5a2.5 2.5 0 0 1 5 0c0 2-2.5 5.5-2.5 5.5z"/>
    <circle cx="12" cy="12" r="2.5"/>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
  </svg>
);

const SearchIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

const allReturnPeriods = ['2', '5', '10', '25', '50', '100'];

const MVP_IDFViewer_v2 = () => {
  const [station, setStation] = useState(null);
  const [idfData, setIDFData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStationInfoVisible, setIsStationInfoVisible] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [selectedReturnPeriods, setSelectedReturnPeriods] = useState(['2', '5', '10']);
  const [place, setPlace] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const autocompleteRef = useRef(null);
  const autocompleteInputRef = useRef(null);
  const chartDataRef = useRef(null);

  // This useEffect ensures the Google Maps script is loaded only once and correctly.
  useEffect(() => {
    let isMounted = true;
    const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script';

    // Check if the script tag already exists in the document's head to prevent duplicate loads.
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existingScript) {
      console.log("Google Maps script tag already exists. Assuming script is loading or loaded.");
      if (isMounted) {
        setScriptLoaded(true);
      }
      return;
    }

    // Check if the script is already loaded via the window object, even if the tag is not present.
    if (window.google?.maps?.places) {
      console.log("Google Maps script already loaded via window object. Setting scriptLoaded to true.");
      if (isMounted) {
        setScriptLoaded(true);
      }
      return;
    }

    // If not loaded, create and append the script element.
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    
    script.onload = () => {
      if (isMounted) {
        console.log("Google Maps script loaded successfully.");
        setScriptLoaded(true);
      }
    };
    
    script.onerror = () => {
      if (isMounted) {
        console.error('Failed to load Google Maps script.');
        setError('Failed to load Google Maps script. Check your API key.');
      }
    };
    
    document.head.appendChild(script);

    return () => {
      isMounted = false;
      // No need to remove the script tag, as other components might need it.
    };
  }, []);

  // This useEffect initializes Autocomplete only after the script has successfully loaded.
  useEffect(() => {
    if (scriptLoaded && autocompleteInputRef.current) {
      // Use a short delay to ensure the places library is fully available
      const initAutocomplete = () => {
        if (window.google?.maps?.places) {
          console.log("Initializing Autocomplete.");
          // Create and store the autocomplete instance in a ref
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            autocompleteInputRef.current,
            {
              types: ['(cities)'],
              componentRestrictions: { country: 'ca' }
            }
          );
    
          // Attach the listener and update the state when a place is selected
          autocompleteRef.current.addListener('place_changed', () => {
            const selectedPlace = autocompleteRef.current.getPlace();
            console.log("Place selected:", selectedPlace);
            setPlace(selectedPlace);
          });
        } else {
          // If the library is not yet ready, try again after a short delay
          setTimeout(initAutocomplete, 100);
        }
      };
      
      initAutocomplete();

      // Cleanup function to remove the listener and instance on component unmount
      return () => {
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
          autocompleteRef.current = null;
        }
      };
    }
  }, [scriptLoaded, setPlace]);

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    setError(null);
    setIDFData([]);
    setStation(null);
    setShowChart(false);
    setIsStationInfoVisible(false);
    setLoading(true);

    if (!place || !place.geometry) {
      setError('Please select a valid location from the dropdown.');
      setLoading(false);
      return;
    }

    const lat = place.geometry.location.lat();
    const lon = place.geometry.location.lng();
    let provinceCode = '';

    if (place.address_components) {
      for (const component of place.address_components) {
        if (component.types.includes('administrative_area_level_1')) {
          provinceCode = component.short_name;
          break;
        }
      }
    }

    if (!provinceCode) {
      setError('Could not determine the province for the selected location.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/nearest-station?lat=${lat}&lon=${lon}&province=${provinceCode}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to find nearest station.');
      }
      const nearestStation = await response.json();
      setStation(nearestStation);
      setIsStationInfoVisible(true);
      console.log('Found nearest station:', nearestStation);

      const idfResponse = await fetch(`${API_BASE_URL}/idf/curves?stationId=${nearestStation.stationId}`);
      if (!idfResponse.ok) {
        const errorData = await idfResponse.json();
        throw new Error(errorData.error || 'Failed to fetch IDF data.');
      }
      const idfJson = await idfResponse.json();
      console.log('Raw IDF data from API:', idfJson.data);

      const processedData = idfJson.data.map((item, index) => {
        console.log(`Processing item ${index}:`, item);
        let durationInMinutes = 0;
        
        // First, check if the duration is a number.
        if (typeof item.duration === 'number') {
          console.log(`- Duration is a number: ${item.duration}`);
          durationInMinutes = item.duration;
        } else {
          // If not a number, fall back to the string parsing logic.
          const durationString = String(item.duration);
          console.log(`- Duration is a string: "${durationString}". Attempting to parse.`);
          if (durationString.includes('min')) {
            durationInMinutes = parseInt(durationString.replace(' min', ''), 10);
          } else if (durationString.includes('h')) {
            durationInMinutes = parseInt(durationString.replace(' h', ''), 10) * 60;
          } else if (durationString.includes('d')) {
            durationInMinutes = parseInt(durationString.replace(' d', ''), 10) * 24 * 60;
          }
        }
        
        console.log(`- Converted to minutes: ${durationInMinutes}`);

        // Skip data points with non-positive duration, as they will break the log scale
        if (durationInMinutes <= 0) {
          console.log(`- Skipping item ${index} due to non-positive duration.`);
          return null;
        }

        const newItem = { duration: durationInMinutes };
        let hasValidData = false;
        
        allReturnPeriods.forEach(period => {
          const value = parseFloat(item[period]);
          if (!isNaN(value)) {
            newItem[period] = value;
            hasValidData = true;
          } else {
            console.log(`- Item ${index}: Value for return period "${period}" is not a number.`);
          }
        });
        
        if (!hasValidData) {
          console.log(`- Skipping item ${index} because no valid numerical IDF values were found.`);
          return null;
        }

        console.log(`- Successfully processed item ${index}:`, newItem);
        return newItem;
      }).filter(Boolean); // Filter out any null items

      const sortedData = processedData.sort((a, b) => a.duration - b.duration);

      console.log('Final processed and sorted data for chart:', sortedData);
      
      if (sortedData.length > 0) {
        setIDFData(sortedData);
        chartDataRef.current = sortedData;
        setShowChart(true);
      } else {
        setError('No valid IDF curve data could be found for this station. The data may be missing or malformed.');
        setShowChart(false);
      }

    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [place]);

  const handleCheckboxChange = useCallback((event) => {
    const { value, checked } = event.target;
    setSelectedReturnPeriods((prev) => {
      let newPeriods;
      if (checked) {
        if (!prev.includes(value)) {
          newPeriods = [...prev, value];
        } else {
          newPeriods = prev;
        }
      } else {
        newPeriods = prev.filter((p) => p !== value);
      }
      // Sort the array numerically to ensure the legend order is correct
      return newPeriods.sort((a, b) => parseInt(a) - parseInt(b));
    });
  }, []);

  const handleDownload = useCallback(() => {
    if (chartDataRef.current) {
      const dataStr = JSON.stringify(chartDataRef.current, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `idf_data_${station.stationId}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [station]);

  const getLineColor = (period) => {
    const colors = {
      '2': '#03a9f4',
      '5': '#4caf50',
      '10': '#ffc107',
      '25': '#ff5722',
      '50': '#9c27b0',
      '100': '#e91e63'
    };
    return colors[period] || '#000000';
  };

  const getLineDash = (period) => {
    if (period === '2' || period === '5') {
      return null;
    }
    return '5 5';
  };

  const formatDurationLabel = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else if (minutes === 1440) {
      return `24 hr`;
    } else if (minutes < 1440) {
      const hours = minutes / 60;
      return `${hours} h`;
    } else {
      const days = minutes / 1440;
      return `${days} d`;
    }
  };

  const formatTooltipLabel = (value) => {
    return `Duration: ${formatDurationLabel(value)}`;
  };
  
  const yAxisDomain = useMemo(() => {
    if (!idfData || idfData.length === 0) {
      return [0, 'auto'];
    }
    let maxIntensity = 0;
    idfData.forEach(item => {
      allReturnPeriods.forEach(period => {
        if (item[period] && !isNaN(item[period]) && item[period] > maxIntensity) {
          maxIntensity = item[period];
        }
      });
    });

    const upperLimit = Math.ceil(maxIntensity / 10) * 10;
    const lowerLimit = 1;
    return [lowerLimit, upperLimit];
  }, [idfData]);


  if (!scriptLoaded) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="flex items-center text-blue-600">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading Maps...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white p-6 sm:p-8 lg:p-10 rounded-2xl shadow-xl flex flex-col md:flex-row gap-6">

        {/* Left Side: Search and Controls */}
        <div className="w-full md:w-1/3 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">IDF Viewer</h1>
            <MapPinIcon className="text-gray-600 text-3xl" />
          </div>

          <p className="text-gray-600">
            Enter a location to find the nearest weather station and its Intensity-Duration-Frequency (IDF) curves.
          </p>
          

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
              <input
                ref={autocompleteInputRef}
                type="text"
                id="location"
                placeholder="e.g., Montreal, QC"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Searching...</span>
                </div>
              ) : (
                <>
                  <SearchIcon className="mr-2 h-5 w-5" />
                  <span>Find Station</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {isStationInfoVisible && station && (
            <div className="bg-gray-100 p-4 rounded-md mt-4 shadow">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-700">Station Found</h3>
                <button onClick={() => setIsStationInfoVisible(false)}>
                  <CloseIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                </button>
              </div>
              <p className="text-gray-600">
                <strong className="text-gray-800">ID:</strong> {station.stationId}
              </p>
              <p className="text-gray-600">
                <strong className="text-gray-800">Name:</strong> {station.stationName || station.name || ''}
              </p>
              <p className="text-gray-600">
                <strong className="text-gray-800">Latitude:</strong> {station.lat}
              </p>
              <p className="text-gray-600">
                <strong className="text-gray-800">Longitude:</strong> {station.lon}
              </p>
                <p className="text-gray-600">
                <strong className="text-gray-800">Distance:</strong> {station.distance_km} km
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Chart and Checkbox Controls. Hidden until a search is successful. */}
        {showChart && (
          <div className="w-full md:w-2/3 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">IDF Curves</h2>
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!idfData.length}
              >
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download Data
              </button>
            </div>

            <div className="flex flex-wrap gap-4 mb-4">
              {allReturnPeriods.map((period) => (
                <label key={period} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    value={period}
                    checked={selectedReturnPeriods.includes(period)}
                    onChange={handleCheckboxChange}
                    className="rounded-md text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{period} Year</span>
                </label>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={idfData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="duration"
                    label={{ value: 'Duration (min)', position: 'insideBottom', offset: -5 }}
                    tick={{ fontSize: 12 }}
                    scale="log"
                    ticks={[1, 2, 5, 10, 15, 30, 60, 120, 360, 720, 1440]}
                    tickFormatter={formatDurationLabel}
                    domain={['dataMin', 'dataMax']}
                  />
                  <YAxis
                    label={{ value: 'Intensity (mm/h)', angle: -90, position: 'insideLeft', offset: 15 }}
                    tick={{ fontSize: 12 }}
                    scale="log"
                    domain={yAxisDomain}
                  />
                  <Tooltip labelFormatter={formatTooltipLabel} />
                  <Legend verticalAlign="bottom" height={36} />
                  {allReturnPeriods.map(period => selectedReturnPeriods.includes(period) && (
                    <Line
                      key={period}
                      type="monotone"
                      dataKey={period}
                      stroke={getLineColor(period)}
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray={getLineDash(period)}
                      isAnimationActive={false}
                      name={`${period}-Year`}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MVP_IDFViewer_v2;

