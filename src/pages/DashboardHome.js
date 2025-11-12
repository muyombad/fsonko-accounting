import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Spinner, Form } from "react-bootstrap";
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
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DashboardHome() {
  const [dashboardData, setDashboardData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    clients: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    months: [],
    incomeData: [],
    expenseData: [],
  });
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    let txData = [];
    let clientData = [];
    let pendingData = [];
    let paidData = [];
    const unsubscribers = [];

    const updateDashboard = () => {
      // Filter transactions by date range (if both dates selected)
      let filteredTx = txData;
      if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        filteredTx = txData.filter((doc) => {
          const txDate = doc.data().date ? new Date(doc.data().date) : null;
          return txDate && txDate >= from && txDate <= to;
        });
      }

      const totalIncome = filteredTx
        .filter((tx) => tx.data().transactionType === "Deposit")
        .reduce((sum, tx) => sum + Number(tx.data().amount || 0), 0);

      const totalExpenses = filteredTx
        .filter((tx) => tx.data().transactionType === "Withdrawal")
        .reduce((sum, tx) => sum + Number(tx.data().amount || 0), 0);

      const monthlyIncome = Array(12).fill(0);
      const monthlyExpenses = Array(12).fill(0);

      filteredTx.forEach((doc) => {
        const tx = doc.data();
        const amount = Number(tx.amount || 0);
        const monthIndex = tx.date ? new Date(tx.date).getMonth() : 0;
        if (tx.transactionType === "Deposit") monthlyIncome[monthIndex] += amount;
        if (tx.transactionType === "Withdrawal") monthlyExpenses[monthIndex] += amount;
      });

      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];

      setDashboardData({
        totalIncome,
        totalExpenses,
        clients: clientData.length,
        pendingInvoices: pendingData.length,
        paidInvoices: paidData.length,
        months,
        incomeData: monthlyIncome,
        expenseData: monthlyExpenses,
      });

      setLoading(false);
    };

    // Listen to bank transactions
    unsubscribers.push(
      onSnapshot(collection(db, "bank_transactions"), (snapshot) => {
        txData = snapshot.docs;
        updateDashboard();
      })
    );

    // Listen to clients and their invoices
    unsubscribers.push(
      onSnapshot(collection(db, "clients"), (snapshot) => {
        clientData = snapshot.docs;
        pendingData = [];
        paidData = [];

        snapshot.docs.forEach((clientDoc) => {
          const clientId = clientDoc.id;
          const clientName = clientDoc.data().name || "";

          // Pending invoices
          const unpaidQuery = query(
            collection(db, "clients", clientId, "invoices"),
            where("Status", "==", "Unpaid")
          );
          unsubscribers.push(
            onSnapshot(unpaidQuery, (invSnap) => {
              pendingData = pendingData.filter((inv) => inv.clientId !== clientId);
              invSnap.forEach((inv) => {
                pendingData.push({ id: inv.id, clientId, clientName, ...inv.data() });
              });
              updateDashboard();
            })
          );

          // Paid invoices
          const paidQuery = query(
            collection(db, "clients", clientId, "invoices"),
            where("Status", "==", "Paid")
          );
          unsubscribers.push(
            onSnapshot(paidQuery, (invSnap) => {
              paidData = paidData.filter((inv) => inv.clientId !== clientId);
              invSnap.forEach((inv) => {
                paidData.push({ id: inv.id, clientId, clientName, ...inv.data() });
              });
              updateDashboard();
            })
          );
        });

        updateDashboard();
      })
    );

    return () => unsubscribers.forEach((unsub) => unsub && unsub());
  }, [fromDate, toDate]); // re-run when date range changes

  const chartData = {
    labels: dashboardData.months,
    datasets: [
      {
        label: "Income",
        data: dashboardData.incomeData,
        backgroundColor: "rgba(75,192,192,0.6)",
      },
      {
        label: "Expenses",
        data: dashboardData.expenseData,
        backgroundColor: "rgba(255,99,132,0.6)",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Income vs Expenses (Live)" },
    },
  };

  return (
    <Container fluid className="mt-4">
      <h2 className="mb-4">Welcome back, David 👋</h2>

      {/* Date Filter Section */}
      <Card className="shadow-sm border-0 mb-4 p-3">
        <Row className="align-items-end g-3">
          <Col md={4}>
            <Form.Group controlId="fromDate">
              <Form.Label>From Date</Form.Label>
              <Form.Control
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="toDate">
              <Form.Label>To Date</Form.Label>
              <Form.Control
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Button
              variant="secondary"
              className="w-100 py-2"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
            >
              Reset Filter
            </Button>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div className="text-center mt-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2">Loading live dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Stats Section */}
          <Row className="g-4 mb-4">
            <Col md={3}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Total Income</Card.Title>
                  <h3 className="text-success">
                    ${dashboardData.totalIncome.toLocaleString()}
                  </h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Total Expenses</Card.Title>
                  <h3 className="text-danger">
                    ${dashboardData.totalExpenses.toLocaleString()}
                  </h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={2}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Clients</Card.Title>
                  <h3>{dashboardData.clients}</h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={2}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Pending Invoices</Card.Title>
                  <h3>{dashboardData.pendingInvoices}</h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={2}>
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <Card.Title>Paid Invoices</Card.Title>
                  <h3>{dashboardData.paidInvoices}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Chart Section */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <Bar data={chartData} options={chartOptions} />
            </Card.Body>
          </Card>

          {/* Actions Section */}
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
