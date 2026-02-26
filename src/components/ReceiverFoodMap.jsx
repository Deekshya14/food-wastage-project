import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaTag, FaWeightHanging, FaMapMarkerAlt } from "react-icons/fa";

// --- FIX LEAFLET MARKER ICONS ---
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function ReceiverFoodMap({ foods, onRequest, API }) {
  // Default center: Kathmandu
  const center = [27.7172, 85.3240];

  return (
    <div className="h-[600px] w-full rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white relative z-0">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {foods.map((food) => {
          // Only show markers for food that has coordinates
          if (!food.location?.coordinates) return null;

          const [lng, lat] = food.location.coordinates;

          return (
            <Marker key={food._id} position={[lat, lng]}>
              <Popup className="custom-popup">
                <div className="w-56 p-1 font-sans">
                  {/* Food Image */}
                  <img
                    src={`${API}/uploads/${food.image}`}
                    alt={food.title}
                    className="w-full h-28 object-cover rounded-xl mb-3 shadow-sm"
                  />

                  {/* Food Info */}
                  <h4 className="font-black text-slate-800 text-sm mb-1 truncate">
                    {food.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-3">
                    <FaMapMarkerAlt className="text-blue-500" /> {food.location.address}
                  </p>

                  <div className="flex justify-between items-center mb-4">
                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[10px] font-black">
                      {food.priceType === "free" ? "FREE" : `Rs ${food.price}`}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                      <FaWeightHanging /> {food.weight}kg
                    </span>
                  </div>

                  {/* Request Action */}
                  <button
                    onClick={() => onRequest(food._id)}
                    className="w-full py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-600 transition-all shadow-md active:scale-95"
                  >
                    Request Food
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}