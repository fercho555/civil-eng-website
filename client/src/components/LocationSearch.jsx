import React, { useRef, useState } from 'react';
import { StandaloneSearchBox, useLoadScript } from '@react-google-maps/api';

const libraries = ['places'];

const LocationSearch = ({ onLocationSelect }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: "AIzaSyB00aH1ZJGW_PtQhKj6DtOZqh_veQuKAro",
        libraries,
    });

    const searchBoxRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');

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

    const handlePlaceSelected = () => {
        const places = searchBoxRef.current.getPlaces();
        const place = places && places.length > 0 ? places[0] : null;

        if (!place || !place.geometry || !place.geometry.location) {
            console.error("No valid place geometry found for the selected location.");
            return;
        }

        const lat = place.geometry.location.lat();
        const lon = place.geometry.location.lng();
        const placeName = place.formatted_address || place.name;
        
        const provinceCode = getProvinceCode(place);

        if (!provinceCode || (provinceCode !== 'ON' && provinceCode !== 'QC')) {
            console.error("Selected location is not in Ontario or Quebec. Please select a location within these provinces.");
            onLocationSelect(null, placeName);
            return;
        }

        console.log(`Searching for nearest station to: ${placeName} at coordinates Lat: ${lat}, Lon: ${lon}, Province: ${provinceCode}`);

        fetch(`/api/nearest-station?lat=${lat}&lon=${lon}&province=${provinceCode}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to load nearest station data: ${res.status}`);
                }
                return res.json();
            })
            .then(nearestStation => {
                onLocationSelect(nearestStation, placeName);
            })
            .catch(err => {
                console.error("Error fetching nearest station:", err);
                onLocationSelect(null, placeName);
            });
    };

    if (loadError) return <div>Error loading maps</div>;
    if (!isLoaded) return <div>Loading Maps...</div>;

    return (
        <div className="location-search-container mb-8 w-full max-w-md">
            <StandaloneSearchBox
                onLoad={ref => searchBoxRef.current = ref}
                onPlacesChanged={handlePlaceSelected}
            >
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter a city or address"
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                />
            </StandaloneSearchBox>
        </div>
    );
};

export default LocationSearch;