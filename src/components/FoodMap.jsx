import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FaUtensils, FaExternalLinkAlt } from 'react-icons/fa';

// Standard Leaflet Icon Fix
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const API = "http://localhost:5000";

export default function FoodMap({ foods, onSelectFood }) {
  // Default center (Kathmandu)
  const center = [27.7172, 85.3240];

  return (
    <div className="h-[500px] w-full rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white mb-8">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {foods.map((food) => {
          // Ensure coordinates exist before placing marker
          if (!food.location?.coordinates) return null;
          
          return (
            <Marker 
              key={food._id} 
              position={[food.location.coordinates[1], food.location.coordinates[0]]}
            >
              <Popup className="custom-popup">
                <div className="p-1 w-48">
                  {food.image && (
                    <img 
                      src={`${API}/uploads/${food.image}`} 
                      alt={food.title} 
                      className="w-full h-24 object-cover rounded-xl mb-2" 
                    />
                  )}
                  <h3 className="font-black text-slate-800 text-sm truncate">{food.title}</h3>
                  <p className="text-[10px] text-gray-500 mb-2 font-bold uppercase italic">
                    {food.location.address}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                      food.priceType === 'free' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {food.priceType === 'free' ? 'FREE' : `RS ${food.price}`}
                    </span>
                    
                    <button 
                      onClick={() => onSelectFood(food)}
                      className="bg-slate-900 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <FaExternalLinkAlt size={10} />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}