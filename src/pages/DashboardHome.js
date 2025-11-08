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
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DashboardHome() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let txData = [];
    let clientData = [];
    let pendingData = [];
    let paidData = [];
    const unsubscribers = [];

    const updateDashboard = () => {
      try {
        let totalIncome = 0;
        let totalExpenses = 0;
        const monthlyIncome = Array(12).fill(0);
        const monthlyExpenses = Array(12).fill(0);

        txData.forEach((doc) => {
          const tx = doc.data();
          const amount = Number(tx.amount) || 0;
          const date = tx.date ? new Date(tx.date) : new Date();
          const monthIndex = date.getMonth();

          if (tx.transactionType === "Deposit") {
            totalIncome += amount;
            monthlyIncome[monthIndex] += amount;
          } else if (tx.transactionType === "Withdrawal") {
            totalExpenses += amount;
            monthlyExpenses[monthIndex] += amount;
          }
        });

        const clients = clientData.length;
        const pendingInvoices = pendingData.length;
        const paidInvoices = paidData.length;

        const months = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];

        setDashboardData({
          totalIncome,
          totalExpenses,
          clients,
          pendingInvoices,
          paidInvoices,
          months,
          incomeData: monthlyIncome,
          expenseData: monthlyExpenses,
        });
        setLoading(false);
      } catch (err) {
        console.error("Error updating dashboard:", err);
      }
    };

    // 🔹 Listen to Bank Transactions
    const unsubTx = onSnapshot(collection(db, "bank_transactions"), (snapshot) => {
      txData = snapshot.docs;
      updateDashboard();
    });
    unsubscribers.push(unsubTx);

    // 🔹 Listen to Clients
    const unsubClients = onSnapshot(collection(db, "clients"), (snapshot) => {
      clientData = snapshot.docs;
      updateDashboard();
    });
    unsubscribers.push(unsubClients);

    // 🔹 Listen to Pending Invoices
    const unsubPending = onSnapshot(
      query(collection(db, "invoices"), where("status", "==", "Unpaid")),
      (snapshot) => {
        pendingData = snapshot.docs;
        updateDashboard();
      }
    );
    unsubscribers.push(unsubPending);

    // 🔹 Listen to Paid Invoices
    const unsubPaid = onSnapshot(
      query(collection(db, "invoices"), where("status", "==", "Paid")),
      (snapshot) => {
        paidData = snapshot.docs;
        updateDashboard();
      }
    );
    unsubscribers.push(unsubPaid);

    // Cleanup listeners when component unmounts
    return () => unsubscribers.forEach((unsub) => unsub && unsub());
  }, []);

  // 🔹 Chart Data
  const data = {
    labels: dashboardData?.months || [],
    datasets: [
      {
        label: "Income",
        data: dashboardData?.incomeData || [],
        backgroundColor: "rgba(75,192,192,0.6)",
      },
      {
        label: "Expenses",
        data: dashboardData?.expenseData || [],
        backgroundColor: "rgba(255,99,132,0.6)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Income vs Expenses (Live)" },
    },
  };

  return (
    <Container fluid className="mt-4">
      <h2 className="mb-4">Welcome back, David 👋</h2>

      {loading ? (
        <div className="text-center mt-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2">Loading live dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <Row className="g-4 mb-4">
            <Col md={3}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Total Income</Card.Title>
                  <h3 className="text-success">
                    ${dashboardData?.totalIncome?.toLocaleString() || 0}
                  </h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Total Expenses</Card.Title>
                  <h3 className="text-danger">
                    ${dashboardData?.totalExpenses?.toLocaleString() || 0}
                  </h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={2}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Clients</Card.Title>
                  <h3>{dashboardData?.clients || 0}</h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={2}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Pending Invoices</Card.Title>
                  <h3>{dashboardData?.pendingInvoices || 0}</h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={2}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Paid Invoices</Card.Title>
                  <h3>{dashboardData?.paidInvoices || 0}</h3>
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

          {/* Actions */}
          <Row className="g-3">
            <Col md={6}>
              <Button variant="primary" className="w-100 py-3">
                + Add New Transaction
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
