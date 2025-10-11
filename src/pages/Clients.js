import React, { useState } from "react";
import { Table, Button, Modal, Form, Container, Row, Col } from "react-bootstrap";

export default function Clients() {
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState([
    { id: 1, name: "John Doe", email: "john@example.com", phone: "0772000111", company: "JD Logistics" },
    { id: 2, name: "Sarah Smith", email: "sarah@example.com", phone: "0703555888", company: "Smith Enterprises" },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  const handleShow = () => setShowModal(true);
  const handleClose = () => setShowModal(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newClient = {
      id: clients.length + 1,
      ...formData,
    };
    setClients([newClient, ...clients]);
    setFormData({ name: "", email: "", phone: "", company: "" });
    handleClose();
  };

  return (
    <Container fluid className="mt-4">
      <Row className="align-items-center mb-3">
        <Col><h2>Clients</h2></Col>
        <Col className="text-end">
          <Button variant="primary" onClick={handleShow}>
            + Add Client
          </Button>
        </Col>
      </Row>

      <Table striped bordered hover responsive className="shadow-sm">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Company</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.id}</td>
              <td>{client.name}</td>
              <td>{client.email}</td>
              <td>{client.phone}</td>
              <td>{client.company}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Add Client Modal */}
      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Client</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter client name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter client email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter phone number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Company</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter company name"
                name="company"
                value={formData.company}
                onChange={handleChange}
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100">
              Save Client
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
