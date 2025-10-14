import React, { useState, useEffect } from "react";
import "./Invoices.css";
import { db } from "../firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [newInvoice, setNewInvoice] = useState({
    client: "",
    transaction: "",
    amount: "",
    date: "",
  });
  const [loading, setLoading] = useState(true);

  const invoicesCollection = collection(db, "invoices");

  // 🔹 Fetch invoices from Firestore
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(invoicesCollection);
      const invoiceList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInvoices(invoiceList);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // 🔹 Handle form input change
  const handleChange = (e) => {
    setNewInvoice({ ...newInvoice, [e.target.name]: e.target.value });
  };

  // 🔹 Add invoice to Firestore
  const addInvoice = async (e) => {
    e.preventDefault();
    const { client, transaction, amount, date } = newInvoice;
    if (!client || !transaction || !amount || !date) return;

    const invoiceData = {
      client,
      transaction,
      amount: parseFloat(amount),
      date,
    };

    try {
      await addDoc(invoicesCollection, invoiceData);
      await fetchInvoices(); // refresh table
      setNewInvoice({ client: "", transaction: "", amount: "", date: "" });
      alert("✅ Invoice added successfully!");
    } catch (error) {
      console.error("Error adding invoice:", error);
      alert("❌ Failed to add invoice!");
    }
  };

  // 🔹 Delete invoice
  const deleteInvoice = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await deleteDoc(doc(db, "invoices", id));
      await fetchInvoices();
      alert("🗑️ Invoice deleted!");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("❌ Failed to delete invoice!");
    }
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

      {loading ? (
        <p>Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <p>No invoices yet.</p>
      ) : (
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Transaction</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.client}</td>
                <td>{inv.transaction}</td>
                <td>${inv.amount}</td>
                <td>{inv.date}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => deleteInvoice(inv.id)}
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
};

export default Invoices;
