import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Sidebar from "./components/Sidebar";
import DashboardHome from "./pages/DashboardHome";
import Transactions from "./pages/Transactions";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Ledgers from "./pages/Ledgers";
import Invoices from "./pages/Invoices";
import Inventory from "./pages/Inventory";
import BankCash from "./pages/BankCash";
import PrivateRoute from "./components/PrivateRoute";
import Production from "./pages/Production";
import ExportPage from "./pages/Export";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
            <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
            <Route path="/ledgers" element={<PrivateRoute><Ledgers /></PrivateRoute>} />
            <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
            <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
            <Route path="/production" element={<PrivateRoute><Production /></PrivateRoute>} />
            <Route path="/exports" element={<PrivateRoute><ExportPage /></PrivateRoute>} />
            <Route path="/bankcash" element={<PrivateRoute><BankCash /></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
