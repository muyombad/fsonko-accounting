import React, { useState } from "react";
import "./Ledgers.css";

function Ledgers() {
  const [ledgers, setLedgers] = useState([
    { id: 1, name: "Cash", type: "Asset", balance: 1500 },
    { id: 2, name: "Sales", type: "Income", balance: 8000 },
    { id: 3, name: "Office Expenses", type: "Expense", balance: -500 },
  ]);

  const [newLedger, setNewLedger] = useState({
    name: "",
    type: "Asset",
    balance: "",
  });

  const handleChange = (e) => {
    setNewLedger({ ...newLedger, [e.target.name]: e.target.value });
  };

  const handleAddLedger = (e) => {
    e.preventDefault();
    if (!newLedger.name || newLedger.balance === "") return;
    const updatedLedgers = [
      ...ledgers,
      { id: ledgers.length + 1, ...newLedger, balance: parseFloat(newLedger.balance) },
    ];
    setLedgers(updatedLedgers);
    setNewLedger({ name: "", type: "Asset", balance: "" });
  };

  return (
    <div className="ledgers-container">
      <h2>Chart of Accounts</h2>
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

      <table className="ledger-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Ledger Name</th>
            <th>Type</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {ledgers.map((ledger) => (
            <tr key={ledger.id}>
              <td>{ledger.id}</td>
              <td>{ledger.name}</td>
              <td>{ledger.type}</td>
              <td
                className={ledger.balance < 0 ? "negative" : "positive"}
              >
                {ledger.balance.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Ledgers;
