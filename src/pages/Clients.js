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
} from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState(null);
  const [newClient, setNewClient] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    balance: "",
  });

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const data = await getClients();
        setClients(data);
      } catch (error) {
        toast.error("❌ Error loading clients.");
        console.error(error);
      }
      setLoading(false);
    };
    fetchClients();
  }, []);

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClient.name || !newClient.company || !newClient.email) {
      toast.warn("⚠️ Please fill in all required fields!");
      return;
    }

    setLoading(true);
    try {
      await addClient(newClient);
      const updatedClients = await getClients();
      setClients(updatedClients);
      toast.success("✅ Client added successfully!");
      setNewClient({
        name: "",
        company: "",
        email: "",
        phone: "",
        address: "",
        balance: "",
      });
    } catch (error) {
      toast.error("❌ Error adding client.");
      console.error(error);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;

    setLoading(true);
    try {
      await deleteClient(id); // Firestore delete
      const updatedClients = await getClients();
      setClients(updatedClients);
      toast.success("🗑️ Client deleted successfully!");
    } catch (error) {
      toast.error("❌ Error deleting client.");
      console.error(error);
    }
    setLoading(false);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingClient({ ...editingClient, [name]: value });
  };

  const handleUpdateSave = async () => {
    if (!editingClient.name || !editingClient.company || !editingClient.email) {
      toast.warn("⚠️ Please fill in all required fields!");
      return;
    }

    setLoading(true);
    try {
      await updateClient(editingClient.id, editingClient);
      const updatedClients = await getClients();
      setClients(updatedClients);
      setEditingClient(null);
      toast.success("💾 Client updated successfully!");
    } catch (error) {
      toast.error("❌ Error updating client.");
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <Container className="mt-4">
      <ToastContainer position="top-center" autoClose={2000} />
      <h2 className="text-center mb-4 fw-bold">👥 Client Management</h2>

      {/* Add Client Form */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Form onSubmit={handleAddClient}>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Client Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter client name"
                    value={newClient.name}
                    onChange={(e) =>
                      setNewClient({ ...newClient, name: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
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

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter email address"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter phone number"
                    value={newClient.phone}
                    onChange={(e) =>
                      setNewClient({ ...newClient, phone: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter address"
                    value={newClient.address}
                    onChange={(e) =>
                      setNewClient({ ...newClient, address: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Opening Balance</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter balance"
                    value={newClient.balance}
                    onChange={(e) =>
                      setNewClient({ ...newClient, balance: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>

              <Col xs="12" className="text-center mt-3">
                <Button type="submit" variant="primary" className="px-5">
                  ➕ Add Client
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Client List */}
      <Card className="shadow-sm">
        <Card.Body>
          <h5 className="fw-bold mb-3">📋 Client List</h5>

          {loading ? (
            <div className="text-center my-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading clients...</p>
            </div>
          ) : (
            <Table striped bordered hover responsive>
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted">
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
                            <Form.Control
                              name="address"
                              value={editingClient.address}
                              onChange={handleEditChange}
                            />
                          </td>
                          <td>
                            <Form.Control
                              name="balance"
                              type="number"
                              value={editingClient.balance}
                              onChange={handleEditChange}
                            />
                          </td>
                          <td className="text-center">
                            <Button
                              variant="success"
                              size="sm"
                              className="me-2"
                              onClick={handleUpdateSave}
                            >
                              💾 Save
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingClient(null)}
                            >
                              ❌ Cancel
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{client.name}</td>
                          <td>{client.company}</td>
                          <td>{client.email}</td>
                          <td>{client.phone}</td>
                          <td>{client.address}</td>
                          <td>{client.balance}</td>
                          <td className="text-center">
                            <Button
                              variant="warning"
                              size="sm"
                              className="me-2"
                              onClick={() => setEditingClient(client)}
                            >
                              ✏️ Update
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(client.id)}
                            >
                              🗑️ Delete
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
