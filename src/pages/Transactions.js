import React, { useState, useEffect } from "react";
import { Button, Modal, Form, Table, Spinner, Alert } from "react-bootstrap";
import {
  getAllTransactions,
  addTransaction,
  deleteTransaction,
} from "../services/transactionService";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "Income",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getAllTransactions();
      if (result.success) {
        setTransactions(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!form.description || !form.amount) {
      setError("Please fill all fields");
      return;
    }

    setLoading(true);
    const result = await addTransaction(form);
    if (result.success) {
      setShowModal(false);
      const refreshed = await getAllTransactions();
      setTransactions(refreshed.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      setLoading(true);
      const result = await deleteTransaction(id);
      if (result.success) {
        setTransactions(transactions.filter((t) => t.id !== id));
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Transactions</h3>

      {error && <Alert variant="danger">{error}</Alert>}

      <Button variant="primary" onClick={() => setShowModal(true)}>
        Add Transaction
      </Button>

      {loading && (
        <div className="text-center mt-3">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && (
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, index) => (
              <tr key={t.id}>
                <td>{index + 1}</td>
                <td>{t.description}</td>
                <td>{t.amount}</td>
                <td>{t.type}</td>
                <td>
                  {t.createdAt
                    ? new Date(t.createdAt.seconds * 1000).toLocaleString()
                    : "—"}
                </td>
                <td>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(t.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Transaction</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="description" className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                name="description"
                value={form.description}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="amount" className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="type" className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Transactions;
