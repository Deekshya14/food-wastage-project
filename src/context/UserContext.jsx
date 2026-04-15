// src/context/UserContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Load user and token from localStorage on first render
 useEffect(() => {
  const savedToken = localStorage.getItem("token");
  if (!savedToken) return;

  fetch("http://localhost:5000/api/users/me", {
    headers: { Authorization: `Bearer ${savedToken}` }
  })
    .then(res => {
      if (!res.ok) throw new Error();
      return res.json();
    })
    .then(user => {
      setUser(user);
      setToken(savedToken);
    })
    .catch(() => logout());
}, []);


  const login = (userData, userToken) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userToken);
    setUser(userData);
    setToken(userToken);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  };

  return (
    <UserContext.Provider value={{ user, token, login, logout, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook for easier use
export function useUser() {
  return useContext(UserContext);
}