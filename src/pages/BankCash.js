import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";

const BankCash = () => {
  const [banks, setBanks] = useState(["Cash", "Equity Bank", "Stanbic Bank"]);
  const [transactions, setTransactions] = useState([]);
  const [newTxn, setNewTxn] = useState({
    type: "Deposit",
    account: "Equity Bank",
    amount: "",
    date: "",
    description: "",
  });
  const [newBank, setNewBank] = useState("");
  const [loading, setLoading] = useState(true);

  const txnCollection = collection(db, "transactions");

  // 🔹 Fetch transactions from Firestore
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(txnCollection);
      const txnList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTransactions(txnList);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // 🔹 Handle form input
  const handleChange = (e) => {
    setNewTxn({ ...newTxn, [e.target.name]: e.target.value });
  };

  // 🔹 Add new transaction
  const addTransaction = async (e) => {
    e.preventDefault();
    if (!newTxn.amount || !newTxn.account) return;

    try {
      const txnData = {
        ...newTxn,
        amount: parseFloat(newTxn.amount),
        date: newTxn.date || new Date().toISOString().split("T")[0],
      };

      await addDoc(txnCollection, txnData);
      await fetchTransactions();
      setNewTxn({
        type: "Deposit",
        account: "Equity Bank",
        amount: "",
        date: "",
        description: "",
      });
      alert("✅ Transaction added successfully!");
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("❌ Failed to add transaction!");
    }
  };

  // 🔹 Get current balance for each account
  const getBalance = (account) => {
    let balance = 0;
    transactions.forEach((t) => {
      if (t.account === account) {
        balance += t.type === "Deposit" ? parseFloat(t.amount) : -parseFloat(t.amount);
      }
    });
    return balance.toFixed(2);
  };

  // 🔹 Chart data
  const data = banks.map((bank) => ({
    name: bank,
    balance: parseFloat(getBalance(bank)),
  }));

  // 🔹 Generate PDF report
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("Bank & Cash Summary Report", 20, 20);
    let y = 40;
    banks.forEach((bank) => {
      doc.text(`${bank}: $${getBalance(bank)}`, 20, y);
      y += 10;
    });
    doc.save("bank_report.pdf");
  };

  return (
    <div className="bank-cash-page">
      <h2>🏦 Bank & Cash Management</h2>

      {/* Add New Bank Section */}
      <div className="add-bank-section">
        <h4>Add New Bank</h4>
        <div className="add-bank-form">
          <input
            type="text"
            placeholder="Enter bank name (e.g. Absa Bank)"
            value={newBank}
            onChange={(e) => setNewBank(e.target.value)}
          />
          <button
            onClick={() => {
              if (newBank.trim() && !banks.includes(newBank.trim())) {
                setBanks([...banks, newBank.trim()]);
                setNewBank("");
              }
            }}
          >
            Add Bank
          </button>
        </div>
      </div>

      {/* Add Transaction */}
      <form onSubmit={addTransaction} className="transaction-form">
        <select name="type" value={newTxn.type} onChange={handleChange}>
          <option value="Deposit">Deposit</option>
          <option value="Withdrawal">Withdrawal</option>
        </select>
        <select name="account" value={newTxn.account} onChange={handleChange}>
          {banks.map((bank, i) => (
            <option key={i} value={bank}>
              {bank}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="amount"
          placeholder="Amount"
          value={newTxn.amount}
          onChange={handleChange}
          required
        />
        <input
          type="date"
          name="date"
          value={newTxn.date}
          onChange={handleChange}
        />
        <input
          type="text"
          name="description"
          placeholder="Description"
          value={newTxn.description}
          onChange={handleChange}
        />
        <button type="submit">Add</button>
      </form>

      {/* Balances Section */}
      <div className="balances">
        <h4>💰 Account Balances</h4>
        {banks.map((bank, i) => (
          <p key={i}>
            {bank === "Cash" ? "💵" : "🏦"} {bank}:{" "}
            <strong>${getBalance(bank)}</strong>
          </p>
        ))}
      </div>

      {/* Chart */}
      <div className="chart-section">
        <h4>📊 Balance Overview</h4>
        {loading ? (
          <p>Loading chart...</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="balance" fill="#007bff" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* PDF Report */}
      <div className="pdf-section">
        <button onClick={generatePDF}>📄 Download Report (PDF)</button>
      </div>
    </div>
  );
};

export default BankCash;
