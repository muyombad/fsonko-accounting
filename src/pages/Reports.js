import React, { useState } from "react";
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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function Reports() {
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const income = 4800;
  const expenses = 3000;
  const profit = income - expenses;

  const barData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [
      {
        label: "Income",
        data: [1200, 1500, 900, 800, 1400],
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
      {
        label: "Expenses",
        data: [700, 800, 500, 600, 400],
        backgroundColor: "rgba(255, 99, 132, 0.6)",
      },
    ],
  };

  const pieData = {
    labels: ["Rent", "Salaries", "Utilities", "Supplies"],
    datasets: [
      {
        data: [1200, 900, 400, 500],
        backgroundColor: [
          "rgba(255, 99, 132, 0.7)",
          "rgba(54, 162, 235, 0.7)",
          "rgba(255, 206, 86, 0.7)",
          "rgba(75, 192, 192, 0.7)",
        ],
      },
    ],
  };

  return (
    <Container fluid className="mt-4">
      <Row className="align-items-center mb-4">
        <Col><h2>Financial Reports</h2></Col>
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
            <Button variant="primary">Generate</Button>
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
              <Pie data={pieData} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
