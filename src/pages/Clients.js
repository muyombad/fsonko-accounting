import React, { useState, useEffect } from "react";
import {
  addClient,
  getClients,
  updateClient,
  deleteClient,
} from "../services/clientService";
import {
  Container,
  Row,
  Col,
  Table,
  Button,
  Form,
  Card,
  Spinner,
  Alert,
} from "react-bootstrap";

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newClient, setNewClient] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
  });

  const [editingClient, setEditingClient] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    const res = await getClients();
    if (res.success) {
      setClients(res.data || []);
      setError(null);
    } else {
      setError(res.error || "Failed to load clients");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddClient = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await addClient(newClient);
    setSaving(false);
    if (res.success) {
      setNewClient({ name: "", company: "", email: "", phone: "" });
      fetchClients();
    } else {
      setError(res.error || "Failed to add client");
    }
  };

  const startEdit = (client) => {
    setEditingClient({ ...client });
  };

  const cancelEdit = () => setEditingClient(null);

  const handleEditChange = (e) => {
    setEditingClient({ ...editingClient, [e.target.name]: e.target.value });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    const { id: cid, ...updates } = editingClient;
    const res = await updateClient(id, updates);
    setSaving(false);
    if (res.success) {
      setEditingClient(null);
      fetchClients();
    } else {
      setError(res.error || "Failed to update client");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    const res = await deleteClient(id);
    if (res.success) {
      fetchClients();
    } else {
      setError(res.error || "Failed to delete client");
    }
  };

  return (
    <Container className="mt-4">
      <Card>
        <Card.Header>
          <h5>Clients</h5>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{String(error)}</Alert>}

          <Form onSubmit={handleAddClient}>
            <Row>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter client name"
                    value={newClient.name}
                    onChange={(e) =>
                      setNewClient({ ...newClient, name: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Company *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter company name"
                    value={newClient.company}
                    onChange={(e) =>
                      setNewClient({ ...newClient, company: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter email"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter phone"
                    value={newClient.phone}
                    onChange={(e) =>
                      setNewClient({ ...newClient, phone: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mt-3">
              <Col>
                <Button type="submit" disabled={saving}>
                  {saving ? <Spinner animation="border" size="sm" /> : "Add Client"}
                </Button>
              </Col>
            </Row>
          </Form>

          <hr />

          {loading ? (
            <div className="text-center">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      No clients added yet.
                    </td>
                  </tr>
                ) : (
                  clients.map((client, index) => (
                    <tr key={client.id}>
                      <td>{index + 1}</td>
                      {editingClient && editingClient.id === client.id ? (
                        <>
                          <td>
                            <Form.Control
                              name="name"
                              value={editingClient.name}
                              onChange={handleEditChange}
                            />
                          </td>
                          <td>
                            <Form.Control
                              name="company"
                              value={editingClient.company}
                              onChange={handleEditChange}
                            />
                          </td>
                          <td>
                            <Form.Control
                              name="email"
                              value={editingClient.email}
                              onChange={handleEditChange}
                            />
                          </td>
                          <td>
                            <Form.Control
                              name="phone"
                              value={editingClient.phone}
                              onChange={handleEditChange}
                            />
                          </td>
                          <td>
                            <Button
                              size="sm"
                              onClick={() => saveEdit(client.id)}
                              disabled={saving}
                            >
                              Save
                            </Button>{' '}
                            <Button size="sm" variant="secondary" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{client.name}</td>
                          <td>{client.company}</td>
                          <td>{client.email}</td>
                          <td>{client.phone}</td>
                          <td>
                            <Button size="sm" onClick={() => startEdit(client)}>
                              Edit
                            </Button>{' '}
                            <Button size="sm" variant="danger" onClick={() => handleDelete(client.id)}>
                              Delete
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Clients;