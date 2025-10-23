import React, { useEffect, useState } from "react";
import { Table, Button, Form, Modal, Spinner, Alert } from "react-bootstrap";
import {
  getAllInvoices,
  addInvoice,
  updateInvoice,
  deleteInvoice,
} from "../services/invoiceService";

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    clientName: "",
    amount: "",
    date: "",
    status: "Unpaid",
    description: "",
  });
  const [editingId, setEditingId] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    const res = await getAllInvoices();
    if (res.success) setInvoices(res.data);
    else setError(res.error);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientName || !formData.amount || !formData.date) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    const res = editingId
      ? await updateInvoice(editingId, formData)
      : await addInvoice(formData);

    if (!res.success) setError(res.error);
    else {
      setShowModal(false);
      fetchInvoices();
      setFormData({
        clientName: "",
        amount: "",
        date: "",
        status: "Unpaid",
        description: "",
      });
      setEditingId(null);
    }
    setLoading(false);
  };

  const handleEdit = (invoice) => {
    setFormData(invoice);
    setEditingId(invoice.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    setLoading(true);
    const res = await deleteInvoice(id);
    if (!res.success) setError(res.error);
    fetchInvoices();
    setLoading(false);
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0
  );

  return (
    <div className="container mt-4">
      <h3>Invoices</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Form.Control
          style={{ width: "250px" }}
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button onClick={() => setShowModal(true)}>Add Invoice</Button>
      </div>

      {loading ? (
        <div className="text-center my-4">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Amount (UGX)</th>
              <th>Date</th>
              <th>Status</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoiceNumber}</td>
                <td>{inv.clientName}</td>
                <td>{inv.amount}</td>
                <td>{inv.date}</td>
                <td>{inv.status}</td>
                <td>{inv.description}</td>
                <td>
                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => handleEdit(inv)}
                    className="me-2"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(inv.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <h5 className="text-end mt-3">Total: UGX {totalAmount.toLocaleString()}</h5>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? "Edit Invoice" : "Add Invoice"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Client Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.clientName}
                onChange={(e) =>
                  setFormData({ ...formData, clientName: e.target.value })
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option>Paid</option>
                <option>Unpaid</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Invoices;