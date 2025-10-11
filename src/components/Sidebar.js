import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) setIsOpen(false);
      else setIsOpen(true);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Mobile toggle button */}
      {isMobile && (
        <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
          ☰
        </button>
      )}

      <div className={`sidebar ${isOpen ? "open" : "closed"} ${isMobile ? "mobile" : ""}`}>
        <div className="sidebar-header">
          <h2>{isOpen ? "F-Sonko Ltd" : "FS"}</h2>
          {!isMobile && (
            <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? "←" : "→"}
            </button>
          )}
        </div>

        <ul onClick={() => isMobile && setIsOpen(false)}>
          <li><Link to="/">🏠 {isOpen && "Dashboard"}</Link></li>
          <li><Link to="/transactions">💳 {isOpen && "Transactions"}</Link></li>
          <li><Link to="/clients">👥 {isOpen && "Clients"}</Link></li>
          <li><Link to="/ledgers">📚 {isOpen && "Ledgers"}</Link></li>
          <li><Link to="/inventory">📦 {isOpen && "Inventory"}</Link></li>
          <li><Link to="/bankcash">🏦 {isOpen && "Bank & Cash"}</Link></li>
          <li><Link to="/invoices">🧾 {isOpen && "Invoices"}</Link></li>
          <li><Link to="/reports">📊 {isOpen && "Reports"}</Link></li>
          <li><Link to="/settings">⚙️ {isOpen && "Settings"}</Link></li>
        </ul>
      </div>
    </>
  );
};

export default Sidebar;
