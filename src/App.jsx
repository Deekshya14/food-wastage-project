// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";


// layouts
import ReceiverLayout from "./layouts/receiver/ReceiverLayout";
import DonorLayout from "./layouts/donor/DonorLayout";
import AdminLayout from "./layouts/admin/AdminLayout";

// pages
import ReceiverDashboard from "./pages/dashboard/ReceiverDashboard";
import DonorDashboard from "./pages/dashboard/DonorDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

function App(){
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />

        {/* Receiver protected */}
        <Route element={<ProtectedRoute allowedRoles={["receiver"]} />}>
          <Route path="/dashboard/receiver" element={<ReceiverLayout />}>
            <Route index element={<ReceiverDashboard />} />
          </Route>
        </Route>

        {/* Donor protected */}
        <Route element={<ProtectedRoute allowedRoles={["donor"]} />}>
          <Route path="/dashboard/donor" element={<DonorLayout />}>
            <Route index element={<DonorDashboard />} />
          </Route>
        </Route>

        {/* Admin protected */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/dashboard/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            {/* You can add nested admin routes: /dashboard/admin/users etc */}
          </Route>
        </Route>

        <Route path="*" element={<div className="p-8">404 - Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;
