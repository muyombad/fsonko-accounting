import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/ledgers" element={<Ledgers />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/bankcash" element={<BankCash />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/invoices" element={<Invoices />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
