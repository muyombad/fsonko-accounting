import React, { useState } from "react";
import { Table, Button, Modal, Form, Container, Row, Col } from "react-bootstrap";

export default function Transactions() {
  const [showModal, setShowModal] = useState(false);
  const [transactions, setTransactions] = useState([
    { id: 1, date: "2025-10-01", description: "Office Rent", type: "Expense", amount: 500 },
    { id: 2, date: "2025-10-03", description: "Client Payment", type: "Income", amount: 1200 },
    { id: 3, date: "2025-10-05", description: "Stationery", type: "Expense", amount: 80 },
  ]);

  const [formData, setFormData] = useState({
    date: "",
    description: "",
    type: "Income",
    amount: "",
  });

  const handleShow = () => setShowModal(true);
  const handleClose = () => setShowModal(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newTransaction = {
      id: transactions.length + 1,
      ...formData,
      amount: parseFloat(formData.amount),
    };
    setTransactions([newTransaction, ...transactions]);
    setFormData({ date: "", description: "", type: "Income", amount: "" });
    handleClose();
  };

  return (
    <Container fluid className="mt-4">
      <Row className="align-items-center mb-3">
        <Col><h2>Transactions</h2></Col>
        <Col className="text-end">
          <Button variant="primary" onClick={handleShow}>
            + Add Transaction
          </Button>
        </Col>
      </Row>

      <Table striped bordered hover responsive className="shadow-sm">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Description</th>
            <th>Type</th>
            <th>Amount ($)</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.id}</td>
              <td>{tx.date}</td>
              <td>{tx.description}</td>
              <td>
                <span
                  className={`badge ${
                    tx.type === "Income" ? "bg-success" : "bg-danger"
                  }`}
                >
                  {tx.type}
                </span>
              </td>
              <td>{tx.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Add Transaction Modal */}
      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Transaction</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select name="type" value={formData.type} onChange={handleChange}>
                <option>Income</option>
                <option>Expense</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Amount ($)</Form.Label>
              <Form.Control
                type="number"
                name="amount"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100">
              Save Transaction
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
