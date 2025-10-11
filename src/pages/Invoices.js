import React, { useState } from "react";
import "./Invoices.css";

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [newInvoice, setNewInvoice] = useState({
    client: "",
    transaction: "",
    amount: "",
    date: "",
  });

  const handleChange = (e) => {
    setNewInvoice({ ...newInvoice, [e.target.name]: e.target.value });
  };

  const addInvoice = (e) => {
    e.preventDefault();
    setInvoices([...invoices, { ...newInvoice, id: Date.now() }]);
    setNewInvoice({ client: "", transaction: "", amount: "", date: "" });
  };

  return (
    <div className="invoices-page">
      <h2>🧾 Invoices</h2>

      <form className="invoice-form" onSubmit={addInvoice}>
        <input
          type="text"
          name="client"
          placeholder="Client Name"
          value={newInvoice.client}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="transaction"
          placeholder="Transaction ID"
          value={newInvoice.transaction}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="amount"
          placeholder="Amount"
          value={newInvoice.amount}
          onChange={handleChange}
          required
        />
        <input
          type="date"
          name="date"
          value={newInvoice.date}
          onChange={handleChange}
          required
        />
        <button type="submit">Add Invoice</button>
      </form>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Transaction</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.client}</td>
              <td>{inv.transaction}</td>
              <td>${inv.amount}</td>
              <td>{inv.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Invoices;
