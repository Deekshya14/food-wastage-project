// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import { UserProvider } from "./context/UserContext";
import Chat from "./pages/dashboard/Chat";
import PaymentSuccess from "./pages/PaymentSuccess";

// layouts
import ReceiverLayout from "./layouts/receiver/ReceiverLayout";
import DonorLayout from "./layouts/donor/DonorLayout";
import AdminLayout from "./layouts/admin/AdminLayout";

// pages
import ReceiverDashboard from "./pages/dashboard/ReceiverDashboard";
import DonorDashboard from "./pages/dashboard/DonorDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <UserProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />

          {/* Receiver protected */}
          <Route element={<ProtectedRoute allowedRoles={["receiver"]} />}>
            <Route path="/dashboard/receiver" element={<ReceiverLayout />}>
              <Route index element={<ReceiverDashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="chat/:userId" element={<Chat />} />
            </Route>
          </Route>

          {/* Donor protected */}
          <Route element={<ProtectedRoute allowedRoles={["donor"]} />}>
            <Route path="/dashboard/donor" element={<DonorLayout />}>
              <Route index element={<DonorDashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="chat/:userId" element={<Chat />} />
            </Route>
          </Route>

          {/* Admin protected */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/dashboard/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          {/* Payment success - outside all protected routes */}
          <Route path="/payment/success" element={<PaymentSuccess />} />

          <Route path="*" element={<div className="p-8">404 - Not Found</div>} />
        </Routes>
      </UserProvider>
    </Router>
  );
}

export default App;
