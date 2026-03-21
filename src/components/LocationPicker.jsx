import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet default icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function LocationPicker({ selectedPos, setSelectedPos, setSelectedAddress }) {
  


  // 📍 THIS IS THE FIX: A helper to move the map view
  function RecenterMap({ position }) {
    const map = useMap();
    useEffect(() => {
      if (position) {
        map.setView(position, 13, { animate: true }); // Moves the camera to the new spot
      }
    }, [position]);
    return null;
  }


  function ClickHandler() {
    useMapEvents({
      async click(e) {
        const { lat, lng } = e.latlng;
        setSelectedPos([lat, lng]);

        try {
          // Fetch address from OpenStreetMap (Free)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          
          if (data && data.address) {
            // Logic to pick a "short but clear" name
            const shortAddress = 
              data.address.amenity || 
              data.address.road || 
              data.address.suburb || 
              data.address.city || 
              "Selected Location";
            
            setSelectedAddress(shortAddress);
          }
        } catch (err) {
          console.error("Geocoding failed:", err);
        }
      },
    });
    return null;
  }

  return (
    <div className="h-64 w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200">
      <MapContainer center={selectedPos} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RecenterMap position={selectedPos} />
        <Marker position={selectedPos} />
        <ClickHandler />
      </MapContainer>
    </div>
  );
}