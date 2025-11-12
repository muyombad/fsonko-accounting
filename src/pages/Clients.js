// src/pages/Clients.js
import React, { useEffect, useState } from "react";
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
  Modal,
} from "react-bootstrap";
import {
  addClient,
  getClients,
} from "../services/clientService";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../assets/bg.png"; // optional - will be ignored if not present
import { OverlayTrigger, Tooltip } from "react-bootstrap";


const COMPANY_NAME = "F SONKO UGANDA LTD"; // change if needed

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);

  // Add company form
  const [companyForm, setCompanyForm] = useState({ name: "", company: "", email: "", phone: "" });
  const [savingCompany, setSavingCompany] = useState(false);

  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: "",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 16),
    invoiceNumber: "",
  });
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Statement
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // fetch clients
  const fetchClients = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getClients();
      if (res.success) setClients(res.data || []);
      else setError(res.error || "Failed to load clients");
    } catch (err) {
      console.error(err);
      setError("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Add Company
  const handleAddCompany = async () => {
    if (!companyForm.name.trim()) {
      setError("Company name is required");
      return;
    }
    setSavingCompany(true);
    try {
      const payload = {
        name: companyForm.name.trim(),
        company: companyForm.company?.trim() || "",
        email: companyForm.email?.trim() || "",
        phone: companyForm.phone?.trim() || "",
        createdAt: serverTimestamp(),
      };
      const res = await addClient(payload);
      if (!res.success) throw new Error(res.error || "Failed to add company");
      await fetchClients();
      setCompanyForm({ name: "", company: "", email: "", phone: "" });
      setShowAddCompanyModal(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add company");
    } finally {
      setSavingCompany(false);
    }
  };

  // Invoice helpers
  const genInvoiceNumber = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return `INV-${y}${m}${day}-${rand}`;
  };

  const openInvoiceModal = () => {
    setInvoiceForm({
      clientId: "",
      description: "",
      amount: "",
      date: new Date().toISOString().slice(0, 16),
      invoiceNumber: genInvoiceNumber(),
    });
    setShowInvoiceModal(true);
  };

  const handleSaveInvoice = async () => {
    if (!invoiceForm.clientId) {
      setError("Select a company to invoice");
      return;
    }
    if (!invoiceForm.description || !invoiceForm.amount) {
      setError("Fill description and amount");
      return;
    }

    setSavingInvoice(true);
    try {
      const currentUser = auth?.currentUser?.displayName || auth?.currentUser?.email || "Unknown";
      const invoicesRef = collection(db, "clients", invoiceForm.clientId, "invoices");
      const payload = {
        invoiceNumber: invoiceForm.invoiceNumber || genInvoiceNumber(),
        description: invoiceForm.description,
        amount: Number(invoiceForm.amount),
        Status: "Unpaid",
        date: invoiceForm.date || new Date().toISOString(),
        type: "invoice",
        createdAt: serverTimestamp(),
        createdBy: currentUser,
      };
       await addDoc(collection(db, "invoices"), {
        clientName: clients.find(c => c.id === invoiceForm.clientId)?.name || "Unknown",
        invoiceNumber: invoiceForm.invoiceNumber || genInvoiceNumber(),
        description: invoiceForm.description,
        amount: Number(invoiceForm.amount),
        date: invoiceForm.date || new Date().toISOString(),
        type: "invoice",
        createdAt: serverTimestamp(),
        createdBy: currentUser,
        status: "Unpaid",
          });

      await addDoc(invoicesRef, payload);

      // reload invoices for selected client if it's the same
      if (selectedClient?.id === invoiceForm.clientId) {
        await loadInvoicesForClient(selectedClient);
      }

      // close and download invoice PDF
      setShowInvoiceModal(false);
      // small delay to ensure data propagation (optional)
      setTimeout(() => printInvoicePDF(payload, clients.find(c => c.id === invoiceForm.clientId)), 300);

      // refresh clients (in case any derived totals depend on invoices list)
      await fetchClients();
    } catch (err) {
      console.error(err);
      setError("Failed to save invoice");
    } finally {
      setSavingInvoice(false);
    }
  };

  // Load invoices for a client
  const loadInvoicesForClient = async (client) => {
    if (!client?.id) return;
    setInvLoading(true);
    setClientInvoices([]);
    try {
      const invoicesRef = collection(db, "clients", client.id, "invoices");
      const q = query(invoicesRef, orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // compute running balance
      let running = 0;
      const withRunning = docs.map(it => {
        running += Number(it.amount || 0);
        return { ...it, runningBalance: running };
      });
      setClientInvoices(withRunning);
    } catch (err) {
      console.error(err);
      setError("Failed to load invoices");
    } finally {
      setInvLoading(false);
    }
  };

  const openStatement = async (client) => {
    setSelectedClient(client);
    setDateFrom("");
    setDateTo("");
    await loadInvoicesForClient(client);
    setShowStatementModal(true);
  };

  // Format helper
  const formatDateTime = (timestampOrString) => {
    const d = timestampOrString?.seconds ? new Date(timestampOrString.seconds * 1000) : new Date(timestampOrString);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const filteredClientInvoices = clientInvoices.filter(inv => {
    if (!dateFrom && !dateTo) return true;
    const txDate = inv.createdAt ? new Date(inv.createdAt.seconds * 1000) : new Date(inv.date);
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    if (from && txDate < from) return false;
    if (to && txDate > to) return false;
    return true;
  });

  // PDF helpers
  const addPdfHeader = (doc, title) => {
    try {
      if (logo) doc.addImage(logo, "PNG", 14, 10, 24, 24);
    } catch (err) {
      // ignore missing logo
    }
    doc.setFontSize(16);
    doc.text(COMPANY_NAME, 105, 20, { align: "center" });
    doc.setDrawColor(180);
    doc.line(10, 36, 200, 36);
    if (title) {
      doc.setFontSize(13);
      doc.text(title, 14, 44);
    }
  };

  const printInvoicePDF = (invoicePayload, client) => {
  if (!client) return;

  const docPDF = new jsPDF({ unit: "mm", format: "a4" });
  const companyName = "F Sonko Accounting";
  const companyLogo = logo; // Assuming you have 'logo' imported or defined somewhere

  const { invoiceNumber, amount, date, Status, description } = invoicePayload;

  // 🏢 Company Info
  try {
    if (companyLogo) docPDF.addImage(companyLogo, "PNG", 15, 10, 25, 25);
  } catch (e) {
    console.warn("Logo load failed:", e);
  }

  docPDF.setFont("helvetica", "bold");
  docPDF.setFontSize(18);
  docPDF.text(companyName, 45, 20);

  docPDF.setFont("helvetica", "normal");
  docPDF.setFontSize(10);
  docPDF.text("Kampala, Uganda", 45, 26);
  docPDF.text("Email: info@fsonkoaccounting.com", 45, 31);
  docPDF.text("Tel: +256 700 000 000", 45, 36);

  // Line separator
  docPDF.setLineWidth(0.5);
  docPDF.line(15, 42, 195, 42);

  // 🧾 Invoice Header
  docPDF.setFontSize(14);
  docPDF.setFont("helvetica", "bold");
  docPDF.text("INVOICE", 15, 50);

  docPDF.setFontSize(10);
  docPDF.setFont("helvetica", "normal");
  docPDF.text(`Invoice Number: ${invoiceNumber || "N/A"}`, 140, 50);
  docPDF.text(
    `Issue Date: ${formatDateTime(date || invoicePayload.createdAt)}`,
    140,
    56
  );
  docPDF.text(`Status: ${Status || "Unpaid"}`, 140, 62);

  // 👤 Client Info
  docPDF.setFont("helvetica", "bold");
  docPDF.text("Bill To:", 15, 60);
  docPDF.setFont("helvetica", "normal");
  docPDF.text(`${client.name || "N/A"}`, 15, 66);
  docPDF.text(`${client.company || "Kampala, Uganda"}`, 15, 71);
  if (client.email) docPDF.text(`Email: ${client.email}`, 15, 76);
  if (client.phone) docPDF.text(`Tel: ${client.phone}`, 15, 81);

  // 🧾 Invoice Table
  autoTable(docPDF, {
    startY: 90,
    head: [["Description", "Amount (UGX)"]],
    body: [
      [
        description || "—",
        Number(amount).toLocaleString(),
      ],
    ],
    theme: "grid",
    styles: {
      halign: "left",
      valign: "middle",
    },
    headStyles: {
      fillColor: [41, 128, 185], // blue
      textColor: 255,
      fontSize: 11,
    },
    bodyStyles: {
      fontSize: 10,
    },
  });

  // 💰 Totals
  const finalY = docPDF.lastAutoTable.finalY + 10;
  docPDF.setFont("helvetica", "bold");
  docPDF.text("Total Amount:", 120, finalY);
  docPDF.setFont("helvetica", "normal");
  docPDF.text(`UGX ${Number(amount).toLocaleString()}`, 175, finalY, {
    align: "right",
  });

  // 🕒 Footer
  const now = new Date().toLocaleString();
  docPDF.setFontSize(10);
  docPDF.setTextColor(100);
  docPDF.text(
    "Thank you for choosing F Sonko Accounting.",
    15,
    finalY + 20
  );
  docPDF.text(
    "Please make payment within 7 days from the invoice date.",
    15,
    finalY + 26
  );
  docPDF.text(`Generated on: ${now}`, 15, finalY + 32);

  // Signature line
  docPDF.line(15, finalY + 45, 80, finalY + 45);
  docPDF.text("Authorized Signature", 15, finalY + 50);

  // 📄 Save
  docPDF.save(`Invoice_${invoiceNumber || client.name}.pdf`);
};



  const downloadStatementPDF = () => {
    if (!selectedClient) return;
    const doc = new jsPDF();
    addPdfHeader(doc, `Statement - ${selectedClient.name}`);

    const fromText = dateFrom ? new Date(dateFrom).toLocaleString() : "Start";
    const toText = dateTo ? new Date(dateTo).toLocaleString() : "Present";
    doc.setFontSize(11);
    doc.text(`Period: ${fromText} → ${toText}`, 14, 48);

    const body = filteredClientInvoices.map((inv, i) => [
      i + 1,
      inv.invoiceNumber || "-",
      inv.description,
      Number(inv.amount).toLocaleString(),
      inv.Status || "N/A",
      formatDateTime(inv.createdAt || inv.date),
      Number(inv.runningBalance || inv.amount).toLocaleString(),
    ]);

    autoTable(doc, {
      head: [["#", "Inv #", "Description", "Amount", "Status", "Date & Time", "Balance"]],
      body,
      startY: 56,
    });

    const total = filteredClientInvoices
  .filter(x => (x.Status || x.status || "").toLowerCase() !== "paid")
  .reduce((s, x) => s + Number(x.amount || 0), 0);

    doc.text(`Total (Unpaid Only): ${total.toLocaleString()}`, 14, doc.lastAutoTable.finalY + 10);

    doc.save(`${selectedClient.name}_statement.pdf`);
  };

  // UI: compute total invoiced per client for table display
  const getClientTotal = (clientId) => {
    const invs = invoicesForAllClientsCache(); // helper below
    const filtered = invs.filter(i => i.clientId === clientId);
    return filtered.reduce((s, x) => s + Number(x.amount || 0), 0);
  };

  // We'll cache all invoices by reading every client's invoices when needed.
  // For simplicity, derive from clientInvoices if currently selected; otherwise collect none.
  // (If you want totals across all clients, consider a dedicated collection like "clientInvoices" at root)
  function invoicesForAllClientsCache() {
    // If we have selectedClient invoices, map to include clientId
    // but we don't keep a global invoices list currently. So return empty array.
    // This means getClientTotal will return 0 unless you implement a root-level invoices collection.
    return [];
  }

  return (
    <Container className="mt-4">
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col><h5>Clients</h5></Col>
            <Col className="text-end">
              <Button variant="primary" className="me-2" onClick={() => setShowAddCompanyModal(true)}>
                + Add Company
              </Button>
              <Button variant="success" onClick={openInvoiceModal}>
                🧾 Invoice Client
              </Button>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body>
           {error && (
  <Alert variant="danger" onClose={() => setError("")} dismissible>
    {typeof error === "string" ? error : error.message || String(error)}
  </Alert>
)}


          {loading ? (
            <div className="text-center"><Spinner animation="border" /></div>
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
                  <tr><td colSpan="6" className="text-center text-muted">No clients added yet.</td></tr>
                ) : clients.map((client, idx) => (
                  <tr key={client.id}>
                    <td>{idx + 1}</td>
                    <td>{client.name}</td>
                    <td>{client.company}</td>
                    <td>{client.email}</td>
                    <td>{client.phone}</td>
                    <td>
                      <Button size="sm" variant="outline-primary" onClick={() => openStatement(client)}>View Statement</Button>
                      {/* edit/delete removed per request */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add Company Modal */}
      <Modal show={showAddCompanyModal} onHide={() => setShowAddCompanyModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Add Company</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Name *</Form.Label>
              <Form.Control value={companyForm.name} onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Company</Form.Label>
              <Form.Control value={companyForm.company} onChange={(e) => setCompanyForm({...companyForm, company: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control value={companyForm.email} onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Phone</Form.Label>
              <Form.Control value={companyForm.phone} onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddCompanyModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddCompany} disabled={savingCompany}>
            {savingCompany ? <Spinner size="sm" animation="border" /> : "Save Company"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Invoice Modal */}
      <Modal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Invoice Client</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Select Client</Form.Label>
              <Form.Select
                value={invoiceForm.clientId}
                onChange={(e) => setInvoiceForm({...invoiceForm, clientId: e.target.value})}
              >
                <option value="">-- Select Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{`${c.name} — ${c.company || "No Company"}`}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Description</Form.Label>
              <Form.Control value={invoiceForm.description} onChange={(e) => setInvoiceForm({...invoiceForm, description: e.target.value})} />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Amount</Form.Label>
              <Form.Control type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({...invoiceForm, amount: e.target.value})} />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Date & Time</Form.Label>
              <Form.Control type="datetime-local" value={invoiceForm.date} onChange={(e) => setInvoiceForm({...invoiceForm, date: e.target.value})} />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Invoice No.</Form.Label>
              <Form.Control value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNumber: e.target.value})} />
              <Form.Text className="text-muted">Auto-generated but you can edit</Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
          <Button variant="success" onClick={handleSaveInvoice} disabled={savingInvoice}>
            {savingInvoice ? <Spinner size="sm" animation="border" /> : "Generate Invoice"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Statement Modal */}
      <Modal show={showStatementModal} onHide={() => setShowStatementModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{selectedClient?.name} Statement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className="d-flex gap-3 mb-3">
            <Form.Group>
              <Form.Label>From</Form.Label>
              <Form.Control type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </Form.Group>

            <Form.Group>
              <Form.Label>To</Form.Label>
              <Form.Control type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </Form.Group>

            <div className="d-flex align-items-end ms-auto">
              <OverlayTrigger
  placement="top"
  overlay={
    (!dateFrom || !dateTo)
      ? <Tooltip>Please select both dates first</Tooltip>
      : <></>
  }
>
  <span className="d-inline-block">
    <Button
      variant="outline-secondary"
      onClick={downloadStatementPDF}
      disabled={!dateFrom || !dateTo}
      style={!dateFrom || !dateTo ? { pointerEvents: "none" } : {}}
    >
      Download PDF
    </Button>
  </span>
</OverlayTrigger>

            </div>
          </Form>

          {invLoading ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : filteredClientInvoices.length === 0 ? (
            <p className="text-muted">No invoices for this client in the selected range.</p>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Inv #</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                  <th>Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientInvoices.map((inv, i) => (
                  <tr key={inv.id || i}>
                    <td>{i + 1}</td>
                    <td>{inv.invoiceNumber || "-"}</td>
                    <td>{inv.description}</td>
                    <td>{Number(inv.amount).toLocaleString()}</td>
                    <td>{inv.Status || "N/A"}</td>
                    <td>{formatDateTime(inv.createdAt || inv.date)}</td>
                    <td>{Number(inv.runningBalance || inv.amount).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="fw-bold">
  <td colSpan="3">Total (Unpaid Only)</td>
  <td colSpan="3">
    {Number(
      filteredClientInvoices
        .filter(x => (x.Status || x.status || "").toLowerCase() !== "paid")
        .reduce((s, x) => s + Number(x.amount || 0), 0)
    ).toLocaleString()}
  </td>
</tr>

              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}
