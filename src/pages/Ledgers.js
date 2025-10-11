import React, { useState, useEffect } from "react";
import "./Ledgers.css";
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

function Ledgers() {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLedger, setNewLedger] = useState({
    name: "",
    type: "Asset",
    balance: "",
  });

  const ledgersCollection = collection(db, "ledgers");

  // 🔹 Fetch ledgers from Firestore
  const fetchLedgers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(ledgersCollection);
      const ledgerList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLedgers(ledgerList);
    } catch (error) {
      console.error("Error fetching ledgers:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLedgers();
  }, []);

  // 🔹 Handle input change
  const handleChange = (e) => {
    setNewLedger({ ...newLedger, [e.target.name]: e.target.value });
  };

  // 🔹 Add new ledger to Firestore
  const handleAddLedger = async (e) => {
    e.preventDefault();
    if (!newLedger.name || newLedger.balance === "") return;

    const ledgerData = {
      name: newLedger.name,
      type: newLedger.type,
      balance: parseFloat(newLedger.balance),
    };

    try {
      await addDoc(ledgersCollection, ledgerData);
      await fetchLedgers(); // refresh list
      setNewLedger({ name: "", type: "Asset", balance: "" });
      alert("✅ Ledger added successfully!");
    } catch (error) {
      console.error("Error adding ledger:", error);
      alert("❌ Failed to add ledger!");
    }
  };

  // 🔹 Delete a ledger
  const handleDeleteLedger = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ledger?")) return;

    try {
      await deleteDoc(doc(db, "ledgers", id));
      await fetchLedgers();
      alert("🗑️ Ledger deleted successfully!");
    } catch (error) {
      console.error("Error deleting ledger:", error);
      alert("❌ Failed to delete ledger!");
    }
  };

  return (
    <div className="ledgers-container">
      <h2>Chart of Accounts</h2>

      {/* Ledger Form */}
      <form className="ledger-form" onSubmit={handleAddLedger}>
        <input
          type="text"
          name="name"
          placeholder="Ledger Name"
          value={newLedger.name}
          onChange={handleChange}
          required
        />
        <select name="type" value={newLedger.type} onChange={handleChange}>
          <option value="Asset">Asset</option>
          <option value="Liability">Liability</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>
        <input
          type="number"
          name="balance"
          placeholder="Opening Balance"
          value={newLedger.balance}
          onChange={handleChange}
          required
        />
        <button type="submit">Add Ledger</button>
      </form>

      {/* Ledger Table */}
      {loading ? (
        <p className="loading-text">Loading ledgers...</p>
      ) : ledgers.length === 0 ? (
        <p className="empty-text">No ledgers added yet.</p>
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ledger Name</th>
              <th>Type</th>
              <th>Balance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {ledgers.map((ledger, index) => (
              <tr key={ledger.id}>
                <td>{index + 1}</td>
                <td>{ledger.name}</td>
                <td>{ledger.type}</td>
                <td
                  className={ledger.balance < 0 ? "negative" : "positive"}
                >
                  {ledger.balance.toLocaleString()}
                </td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteLedger(ledger.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Ledgers;
