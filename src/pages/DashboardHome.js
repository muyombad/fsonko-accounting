import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Spinner } from "react-bootstrap";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { doc, getDoc, addDoc, updateDoc, collection } from "firebase/firestore";
import { db } from "../firebaseConfig"; // ✅ Use existing Firestore instance

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DashboardHome() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // 🔹 Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const docRef = doc(db, "dashboard", "summary");
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setDashboardData(snapshot.data());
        } else {
          console.warn("No dashboard data found in Firestore!");
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  // 🔹 Handle new transaction add
  const handleAddTransaction = async () => {
    try {
      setAdding(true);

      // Example transaction data — you can replace this with a real form later
      const newTransaction = {
        type: "income", // or 'expense'
        amount: Math.floor(Math.random() * 1000) + 100, // random value
        description: "New transaction",
        date: new Date().toISOString(),
      };

      // Add to "transactions" collection
      await addDoc(collection(db, "transactions"), newTransaction);

      // Optionally update the dashboard summary totals
      const dashboardRef = doc(db, "dashboard", "summary");
      const updatedTotals = {
        totalIncome:
          (dashboardData?.totalIncome || 0) +
          (newTransaction.type === "income" ? newTransaction.amount : 0),
        totalExpenses:
          (dashboardData?.totalExpenses || 0) +
          (newTransaction.type === "expense" ? newTransaction.amount : 0),
        clients: dashboardData?.clients || 18,
        pendingInvoices: dashboardData?.pendingInvoices || 5,
      };

      await updateDoc(dashboardRef, updatedTotals);
      setDashboardData(updatedTotals);

      alert("✅ Transaction added successfully!");
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("❌ Failed to add transaction!");
    } finally {
      setAdding(false);
    }
  };

  const income = dashboardData?.totalIncome || 25000;
  const expenses = dashboardData?.totalExpenses || 12400;
  const clients = dashboardData?.clients || 18;
  const pendingInvoices = dashboardData?.pendingInvoices || 5;

  const data = {
    labels: dashboardData?.months || ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Income",
        data: dashboardData?.incomeData || [1200, 1900, 3000, 5000, 2000, 3000],
        backgroundColor: "rgba(75,192,192,0.6)",
      },
      {
        label: "Expenses",
        data:
          dashboardData?.expenseData || [800, 1500, 2000, 4000, 1500, 2500],
        backgroundColor: "rgba(255,99,132,0.6)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Income vs Expenses" },
    },
  };

  return (
    <Container fluid className="mt-4">
      <h2 className="mb-4">Welcome back, David 👋</h2>

      {loading ? (
        <div className="text-center mt-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <Row className="g-4 mb-4">
            <Col md={3}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Total Income</Card.Title>
                  <h3 className="text-success">${income.toLocaleString()}</h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Total Expenses</Card.Title>
                  <h3 className="text-danger">${expenses.toLocaleString()}</h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Clients</Card.Title>
                  <h3>{clients}</h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Pending Invoices</Card.Title>
                  <h3>{pendingInvoices}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Chart Section */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <Bar data={data} options={options} />
            </Card.Body>
          </Card>

          {/* Quick Actions */}
          <Row className="g-3">
            <Col md={6}>
              <Button
                variant="primary"
                className="w-100 py-3"
                onClick={handleAddTransaction}
                disabled={adding}
              >
                {adding ? (
                  <>
                    <Spinner
                      animation="border"
                      size="sm"
                      className="me-2"
                    />{" "}
                    Adding...
                  </>
                ) : (
                  "+ Add New Transaction"
                )}
              </Button>
            </Col>
            <Col md={6}>
              <Button variant="outline-secondary" className="w-100 py-3">
                Generate Report
              </Button>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}
