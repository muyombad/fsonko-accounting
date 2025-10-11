import React from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DashboardHome() {
  const data = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Income",
        data: [1200, 1900, 3000, 5000, 2000, 3000],
        backgroundColor: "rgba(75,192,192,0.6)",
      },
      {
        label: "Expenses",
        data: [800, 1500, 2000, 4000, 1500, 2500],
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

      {/* Summary Cards */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title>Total Income</Card.Title>
              <h3 className="text-success">$25,000</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title>Total Expenses</Card.Title>
              <h3 className="text-danger">$12,400</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title>Clients</Card.Title>
              <h3>18</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title>Pending Invoices</Card.Title>
              <h3>5</h3>
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
    </Container>
  );
}
