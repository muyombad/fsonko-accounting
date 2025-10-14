import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Form } from "react-bootstrap";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { db } from "../firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function Reports() {
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);

  // 🔹 Fetch transactions from Firestore
  useEffect(() => {
    const fetchData = async () => {
      const txnRef = collection(db, "transactions");
      const snapshot = await getDocs(txnRef);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      setFiltered(data);
    };
    fetchData();
  }, []);

  // 🔹 Filter transactions by date range
  const filterByDate = () => {
    if (!dateRange.from || !dateRange.to) {
      setFiltered(transactions);
      return;
    }

    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    const filteredData = transactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate >= from && tDate <= to;
    });
    setFiltered(filteredData);
  };

  // 🔹 Calculate totals
  const income = filtered
    .filter((t) => t.type === "Deposit" || t.type === "Income")
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const expenses = filtered
    .filter((t) => t.type === "Withdrawal" || t.type === "Expense")
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const profit = income - expenses;

  // 🔹 Monthly summary for bar chart
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const incomeByMonth = Array(12).fill(0);
  const expensesByMonth = Array(12).fill(0);

  filtered.forEach((t) => {
    const m = new Date(t.date).getMonth();
    if (t.type === "Deposit" || t.type === "Income") incomeByMonth[m] += parseFloat(t.amount);
    if (t.type === "Withdrawal" || t.type === "Expense") expensesByMonth[m] += parseFloat(t.amount);
  });

  const barData = {
    labels: months,
    datasets: [
      {
        label: "Income",
        data: incomeByMonth,
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
      {
        label: "Expenses",
        data: expensesByMonth,
        backgroundColor: "rgba(255, 99, 132, 0.6)",
      },
    ],
  };

  // 🔹 Expense breakdown for pie chart
  const categoryTotals = {};
  filtered
    .filter((t) => t.type === "Withdrawal" || t.type === "Expense")
    .forEach((t) => {
      const cat = t.category || "Other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(t.amount);
    });

  const pieData = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        data: Object.values(categoryTotals),
        backgroundColor: [
          "rgba(255, 99, 132, 0.7)",
          "rgba(54, 162, 235, 0.7)",
          "rgba(255, 206, 86, 0.7)",
          "rgba(75, 192, 192, 0.7)",
          "rgba(153, 102, 255, 0.7)",
        ],
      },
    ],
  };

  return (
    <Container fluid className="mt-4">
      <Row className="align-items-center mb-4">
        <Col><h2>📊 Financial Reports</h2></Col>
        <Col className="text-end">
          <Form className="d-flex gap-2 justify-content-end">
            <Form.Control
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            />
            <Form.Control
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            />
            <Button variant="primary" onClick={filterByDate}>
              Generate
            </Button>
          </Form>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="shadow-sm border-success border-start border-4">
            <Card.Body>
              <Card.Title>Total Income</Card.Title>
              <h3 className="text-success">${income.toLocaleString()}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-danger border-start border-4">
            <Card.Body>
              <Card.Title>Total Expenses</Card.Title>
              <h3 className="text-danger">${expenses.toLocaleString()}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-primary border-start border-4">
            <Card.Body>
              <Card.Title>Net Profit</Card.Title>
              <h3 className="text-primary">${profit.toLocaleString()}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="g-4">
        <Col md={8}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Income vs Expenses (Monthly)</Card.Title>
              <Bar data={barData} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Expense Breakdown</Card.Title>
              {Object.keys(categoryTotals).length > 0 ? (
                <Pie data={pieData} />
              ) : (
                <p>No expense data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
