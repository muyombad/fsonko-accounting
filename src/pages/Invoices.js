import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Form,
  Modal,
  Spinner,
  Alert,
  Badge,
} from "react-bootstrap";
import { FaBell } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";
import logo from "../assets/bg.png"; // optional - will be ignored if not present

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    clientId: "",
    clientName: "",
    amount: "",
    date: "",
    Status: "Unpaid",
    description: "",
  });
  const [editingId, setEditingId] = useState(null);

  const companyName = "F SONKO UGANDA LIMITED";
  const companyLogo = logo
  //  "https://upload.wikimedia.org/wikipedia/commons/a/ab/Logo_TV_2015.png"; // Replace this with your actual logo URL

  // Fetch clients
  const fetchClients = async () => {
    try {
      const snap = await getDocs(collection(db, "clients"));
      const clientList = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClients(clientList);
    } catch (err) {
      console.error(err);
      setError("Failed to load clients");
    }
  };

  // Fetch invoices from all client subcollections
  const fetchAllClientInvoices = async () => {
    setLoading(true);
    setError("");
    try {
      const clientsRef = collection(db, "clients");
      const clientsSnap = await getDocs(clientsRef);
      let allInvoices = [];

      for (const clientDoc of clientsSnap.docs) {
        const clientId = clientDoc.id;
        const clientData = clientDoc.data();
        const invoicesRef = collection(db, "clients", clientId, "invoices");
        const q = query(invoicesRef, orderBy("createdAt", "desc"));
        const invoicesSnap = await getDocs(q);

        invoicesSnap.forEach((inv) => {
          allInvoices.push({
            id: inv.id,
            clientId,
            clientName: clientData.name,
            ...inv.data(),
          });
        });
      }

      // Sort unpaid first, then by most recent
      allInvoices.sort((a, b) => {
        if (a.Status === "Unpaid" && b.Status === "Paid") return -1;
        if (a.Status === "Paid" && b.Status === "Unpaid") return 1;
        return new Date(b.date) - new Date(a.date);
      });

      setInvoices(allInvoices);
    } catch (err) {
      console.error(err);
      setError("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchAllClientInvoices();
  }, []);

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleEdit = (invoice) => {
    setFormData(invoice);
    setEditingId(invoice.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientId) {
      setError("Please select a client");
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      if (editingId) {
        const invoiceRef = doc(
          db,
          "clients",
          formData.clientId,
          "invoices",
          editingId
        );
        await updateDoc(invoiceRef, {
          ...formData,
          updatedAt: now.toISOString(),
        });
      } else {
        const invoicesRef = collection(
          db,
          "clients",
          formData.clientId,
          "invoices"
        );
        await addDoc(invoicesRef, {
          ...formData,
          createdAt: now.toISOString(),
          date: now.toISOString(),
        });
      }

      setShowModal(false);
      setEditingId(null);
      setFormData({
        clientId: "",
        clientName: "",
        amount: "",
        date: "",
        Status: "Unpaid",
        description: "",
      });
      await fetchAllClientInvoices();
    } catch (err) {
      console.error(err);
      setError("Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (invoice) => {
    if (!window.confirm("Delete this invoice?")) return;
    setLoading(true);
    try {
      const invoiceRef = doc(
        db,
        "clients",
        invoice.clientId,
        "invoices",
        invoice.id
      );
      await deleteDoc(invoiceRef);
      await fetchAllClientInvoices();
    } catch (err) {
      console.error(err);
      setError("Failed to delete invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (invoice) => {
    setLoading(true);
    try {
      const invoiceRef = doc(
        db,
        "clients",
        invoice.clientId,
        "invoices",
        invoice.id
      );
      await updateDoc(invoiceRef, { Status: "Paid" });
      await fetchAllClientInvoices();
    } catch (err) {
      console.error(err);
      setError("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF
  const handleGeneratePDF = () => {
    const docPDF = new jsPDF();

    docPDF.addImage(companyLogo, "PNG", 10, 10, 25, 25);
    docPDF.setFontSize(16);
    docPDF.text(companyName, 40, 20);
    docPDF.setFontSize(12);
    docPDF.text("Invoice Document", 40, 28);

    docPDF.setLineWidth(0.5);
    docPDF.line(10, 35, 200, 35);

    const { invoiceNumber, clientName, amount, date, Status, description } =
      formData;

    docPDF.text(`Invoice Number: ${invoiceNumber || "N/A"}`, 14, 50);
    docPDF.text(`Client: ${clientName || "N/A"}`, 14, 58);
    docPDF.text(`Status: ${Status}`, 14, 66);
    docPDF.text(`Date: ${formatDateTime(date)}`, 14, 74);

    autoTable(docPDF, {
      startY: 85,
      head: [["Description", "Amount (UGX)"]],
      body: [[description || "—", Number(amount).toLocaleString()]],
    });

    docPDF.setFontSize(10);
    docPDF.text(
      "Thank you for doing business with us!",
      14,
      docPDF.lastAutoTable.finalY + 10
    );

    docPDF.save(`Invoice_${invoiceNumber || clientName}.pdf`);
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.Status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unpaidInvoices = invoices.filter((inv) => inv.Status === "Unpaid");
  const totalAmount = filteredInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0
  );

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Invoices</h3>
        <div className="d-flex align-items-center gap-3">
          <div
            style={{ position: "relative", cursor: "pointer" }}
            onClick={() => setShowUnpaidModal(true)}
          >
            <FaBell size={24} color={unpaidInvoices.length > 0 ? "orange" : "gray"} />
            {unpaidInvoices.length > 0 && (
              <Badge
                bg="danger"
                pill
                style={{ position: "absolute", top: "-5px", right: "-10px" }}
              >
                {unpaidInvoices.length}
              </Badge>
            )}
          </div>
          <Form.Control
            style={{ width: "250px" }}
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

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
              <th>Date & Time</th>
              <th>Status</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoiceNumber || inv.id.slice(0, 6)}</td>
                <td>{inv.clientName}</td>
                <td>{Number(inv.amount).toLocaleString()}</td>
                <td>{formatDateTime(inv.date)}</td>
                <td>
                  <Badge bg={inv.Status === "Paid" ? "success" : "warning"}>
                    {inv.Status}
                  </Badge>
                </td>
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
                    onClick={() => handleDelete(inv)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <h5 className="text-end mt-3">
        Total: UGX {totalAmount.toLocaleString()}
      </h5>

      {/* 🔹 Edit / Add Invoice Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? "Edit Invoice" : "Add Invoice"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            {/* Client */}
            <Form.Group className="mb-3">
              <Form.Label>Client</Form.Label>
              <Form.Select
                value={formData.clientId}
                onChange={(e) => {
                  const client = clients.find((c) => c.id === e.target.value);
                  setFormData({
                    ...formData,
                    clientId: client?.id || "",
                    clientName: client?.name || "",
                  });
                }}
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* Amount */}
            <Form.Group className="mb-3">
              <Form.Label>Amount (UGX)</Form.Label>
              <Form.Control
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </Form.Group>

            {/* Status (Editable) */}
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={formData.Status}
                onChange={(e) =>
                  setFormData({ ...formData, Status: e.target.value })
                }
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
              </Form.Select>
            </Form.Group>

            {/* Description */}
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </Form.Group>

            {/* Buttons */}
            <div className="d-flex justify-content-between align-items-center">
              <Button type="submit" disabled={loading}>
                {editingId ? "Update" : "Add"} Invoice
              </Button>

              {/* PDF Button only appears when editing */}
              {editingId && (
                <Button variant="success" onClick={handleGeneratePDF}>
                 Re-Generate Invoice
                </Button>
              )}
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* 🔔 Unpaid Invoices Modal */}
      <Modal
        show={showUnpaidModal}
        onHide={() => setShowUnpaidModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Unpaid Invoices</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {unpaidInvoices.length === 0 ? (
            <p className="text-muted text-center">No unpaid invoices 🎉</p>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Date & Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {unpaidInvoices.map((inv, idx) => (
                  <tr key={inv.id}>
                    <td>{idx + 1}</td>
                    <td>{inv.invoiceNumber || inv.id.slice(0, 6)}</td>
                    <td>{inv.clientName}</td>
                    <td>{Number(inv.amount).toLocaleString()}</td>
                    <td>{formatDateTime(inv.date)}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="success"
                        disabled={loading}
                        onClick={() => handleMarkAsPaid(inv)}
                      >
                        Mark as Paid
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Invoices;
