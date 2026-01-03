// src/pages/dashboard/ReceiverDashboard.jsx
import React, { useEffect, useState } from "react";
import { FaLeaf, FaDrumstickBite, FaPaperPlane } from "react-icons/fa";
import { io } from "socket.io-client";
import ProfileCard from "../../components/ProfileCard";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import ChatLayout from "../../components/chat/ChatLayout";

const API = "http://localhost:5000";

export default function ReceiverDashboard() {
  const { user, token } = useUser();
  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // ✅ Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatPartnerId, setChatPartnerId] = useState(null);

  const fetchFoods = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/food`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFoods(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API}/api/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user || !token) return;

    fetchFoods();
    fetchRequests();
    fetchNotifications();

    const socket = io(API);
    socket.emit("joinRoom", user._id);

    socket.on("newNotification", (data) => {
      setNotifications((prev) => [{ ...data, isRead: false }, ...prev]);
    });

    return () => socket.disconnect();
  }, [user]);

  const requestFood = async (foodId) => {
    try {
      const res = await fetch(`${API}/api/requests/${foodId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: "" }),
      });
      if (!res.ok) throw new Error("Failed to request food");
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const markAsRead = async (id) => {
    await fetch(`${API}/api/notifications/${id}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto mb-6">
        <ProfileCard />
      </div>

      {/* 🔔 Notifications */}
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="font-semibold text-lg"
        >
          🔔 Notifications ({unreadCount})
        </button>

        {showNotifications && (
          <div className="bg-white shadow rounded mt-2 p-3">
            {notifications.length === 0 ? (
              <p>No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-2 border-b cursor-pointer ${
                    !n.isRead ? "font-bold" : ""
                  }`}
                  onClick={() => markAsRead(n._id)}
                >
                  {n.message}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold mb-6">Available Foods</h2>

      {loading ? (
        <p>Loading...</p>
      ) : foods.length === 0 ? (
        <p>No available foods right now</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {foods.map((food) => {
            const myRequest = requests.find(
              (r) => r.foodId && r.foodId._id === food._id
            );

            return (
              <div key={food._id} className="bg-white p-4 rounded-xl shadow">
                {/* Food Image */}
                {food.image && (
                  <img
                    src={`${API}/uploads/${food.image}`}
                    className="h-40 w-full object-cover rounded mb-2"
                    alt={food.title}
                  />
                )}

                {/* Food Title */}
                <h3 className="font-semibold text-lg">{food.title}</h3>

                {/* Food Description */}
                {food.description && <p className="text-sm mb-1">{food.description}</p>}

                {/* Quantity */}
                <p className="text-sm">📦 Quantity: {food.quantity} kg</p>

                {/* Pickup Location */}
                <p className="text-sm">📍 Pickup: {food.pickupLocation}</p>

                {/* Spice Level */}
                {food.spiceLevel && (
                  <p className="text-sm">🌶 Spice Level: {food.spiceLevel}</p>
                )}

                {/* Meat Type for Non-Veg */}
                {food.category === "nonveg" && food.meatType && (
                  <p className="text-sm">
                    🍖 Meat Type: {food.meatType.charAt(0).toUpperCase() + food.meatType.slice(1)}
                  </p>
                )}

                {/* Free or Paid */}
                <p className="text-sm">
                  💲 {food.priceType === "free" ? "Free" : `Paid - $${food.price}`}
                </p>

                {/* Available Date */}
                {food.availableDate && (
                  <p className="text-sm">
                    📅 Available on: {new Date(food.availableDate).toLocaleDateString()}
                  </p>
                )}

                {/* Category Icon */}
                <div className="flex gap-2 mt-2">
                  {food.category === "veg" ? <FaLeaf /> : <FaDrumstickBite />}
                </div>

                {/* Request Button */}
                <button
                  className={`mt-3 flex items-center gap-2 px-4 py-2 rounded
                    ${
                      myRequest
                        ? "bg-gray-400 cursor-not-allowed"
                        : "btn-green"
                    }`}
                  onClick={() => requestFood(food._id)}
                  disabled={!!myRequest}
                >
                  <FaPaperPlane />
                  {myRequest ? myRequest.status.toUpperCase() : "Request Food"}
                </button>

                {/* Chat Button */}
                <button
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded btn-blue"
                  onClick={() => {
                    setChatPartnerId(food.donorId);
                    setShowChat(true);
                  }}
                >
                  💬 Chat with Donor
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ✅ CHAT UI */}
      {showChat && (
        <ChatLayout
          partnerId={chatPartnerId}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
