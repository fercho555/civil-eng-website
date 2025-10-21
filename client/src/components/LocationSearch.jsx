import React, { useState } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

const LocationSearch = ({ onLocationSelect }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_PLACES_API_KEY,
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState(null);

  const getProvinceCode = (place) => {
    const addressComponents = place.address_components || [];
    for (const component of addressComponents) {
      if (component.types.includes('administrative_area_level_1')) {
        return component.short_name;
      }
    }
    return null;
  };

  const onLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = async () => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();

    if (!place.geometry || !place.geometry.location) {
      onLocationSelect(null, '');
      return;
    }

    const lat = place.geometry.location.lat();
    const lon = place.geometry.location.lng();
    const placeName = place.formatted_address || place.name || '';
    const provinceCode = getProvinceCode(place);

    if (!provinceCode || (provinceCode !== 'ON' && provinceCode !== 'QC')) {
      onLocationSelect(null, placeName);
      return;
    }

    try {
      const res = await fetch(`/api/nearest-station?lat=${lat}&lon=${lon}&province=${provinceCode}`);
      if (!res.ok) throw new Error(`Failed to load nearest station: ${res.status}`);
      const nearestStation = await res.json();
      onLocationSelect(nearestStation, placeName);
    } catch (err) {
      console.error('Error fetching nearest station:', err);
      onLocationSelect(null, placeName);
    }
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  return (
    <div className="location-search-container mb-8 w-full max-w-md">
      <label htmlFor="autocomplete-input" className="block text-sm text-gray-600 mb-1">
        Location
      </label>
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <input
          id="autocomplete-input"
          type="text"
          placeholder="Start typing your location"
          className="w-full border rounded px-3 py-2"
        />
      </Autocomplete>
    </div>
  );
};

export default LocationSearch;
