// src/pages/Suppliers.js
import React, { useEffect, useState } from "react";
import {
  Button,
  Modal,
  Form,
  Table,
  Spinner,
  Alert,
  Card,
} from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getAllTransactions, addTransaction } from "../services/transactionService";
import { auth } from "../firebaseConfig";
import logo from "../assets/bg.png"; // 🖼️ Company logo
import { FaBell } from "react-icons/fa";
import { Badge } from "react-bootstrap";



import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";








const Suppliers = () => {

  //-------
  // Inside your main component (e.g., Invoices.js)
const [showUnpaidModal, setShowUnpaidModal] = useState(false);
const [unpaidInvoices, setUnpaidInvoices] = useState([]);
const [updating, setUpdating] = useState(false);
  //------
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);

  // 🆕 Master report modal state
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [masterDateFrom, setMasterDateFrom] = useState("");
  const [masterDateTo, setMasterDateTo] = useState("");

  const [supplierForm, setSupplierForm] = useState({ name: "" });
  const [invoiceForm, setInvoiceForm] = useState({
    supplier: "",
    description: "",
    invoiceNumber: "",
    amount: "",
  });

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const companyName = "F SONKO UGANDA LTD"; // 🏢 Update to your company name

  // 🟢 Fetch all supplier invoices
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getAllTransactions();
      if (result.success) {
        const allInvoices = result.data.filter((t) => t.type === "Supplier");
        setInvoices(allInvoices);
        const supplierNames = [...new Set(allInvoices.map((t) => t.supplier))];
        setSuppliers(supplierNames);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // 🟡 Add supplier
  const handleAddSupplier = async () => {
    if (!supplierForm.name.trim()) {
      setError("Please enter supplier name");
      return;
    }
    if (suppliers.includes(supplierForm.name.trim())) {
      setError("Supplier already exists");
      return;
    }
    setSavingSupplier(true);
    await new Promise((r) => setTimeout(r, 500));
    setSuppliers([...suppliers, supplierForm.name.trim()]);
    setSupplierForm({ name: "" });
    setShowSupplierModal(false);
    setSavingSupplier(false);
  };

  ///--------
  // 🔔 Open modal when bell is clicked
const handleBellClick = (supplier) => {
  const supplierUnpaid = invoices.filter(
    (inv) => inv.supplier === supplier && inv.status !== "Paid"
  );
  setSelectedSupplier(supplier);
  setUnpaidInvoices(supplierUnpaid);
  setShowUnpaidModal(true);
};

// 💳 Pay invoice (update Firestore)
const handlePayInvoice = async (invoiceId) => {
  try {
    setUpdating(true);
    const invoiceRef = doc(db, "transactions", invoiceId);
    await updateDoc(invoiceRef, { status: "Paid" });

    // Update UI instantly
    setUnpaidInvoices((prev) =>
      prev.filter((inv) => inv.id !== invoiceId)
    );

    // Also update parent state if needed
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId ? { ...inv, status: "Paid" } : inv
      )
    );
  } catch (err) {
    console.error("Error updating status:", err);
  } finally {
    setUpdating(false);
  }
};
  //------

  // 🟠 Add invoice (capture username)
  const handleAddInvoice = async () => {
    const { supplier, description,invoiceNumber, amount } = invoiceForm;
    if (!supplier || !description || !amount) {
      setError("Please fill all fields");
      return;
    }

    const currentUser =
      auth.currentUser?.displayName || auth.currentUser?.email || "Unknown User";

    setSavingInvoice(true);
    const result = await addTransaction({
      ...invoiceForm,
      type: "Supplier",
      status: "Not Paid",
      createdBy: currentUser,
    });

    if (result.success) {
      const refreshed = await getAllTransactions();
      const allInvoices = refreshed.data.filter((t) => t.type === "Supplier");
      setInvoices(allInvoices);
      setInvoiceForm({ supplier: "", description: "",invoiceNumber:"", amount: "" });
      setShowInvoiceModal(false);
    } else {
      setError(result.error);
    }
    setSavingInvoice(false);
  };

  // 💰 Supplier totals
  const getSupplierTotal = (supplier) =>
    invoices
      .filter((i) => i.supplier === supplier)
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const grandTotal = invoices.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  );

  const handleViewStatement = (supplier) => {
    setSelectedSupplier(supplier);
    setDateFrom("");
    setDateTo("");
    setShowStatementModal(true);
  };

  // 🧮 Filter invoices by date
  const supplierInvoices = selectedSupplier
    ? invoices
        .filter((i) => i.supplier === selectedSupplier)
        .filter((i) => {
          if (!dateFrom && !dateTo) return true;
          const txDate = i.createdAt
            ? new Date(i.createdAt.seconds * 1000)
            : new Date(i.date);
          const from = dateFrom ? new Date(dateFrom) : null;
          const to = dateTo ? new Date(dateTo) : null;
          if (from && txDate < from) return false;
          if (to && txDate > to) return false;
          return true;
        })
    : [];

  // 🧾 Utility: Add logo + header to PDF
  const addPdfHeader = (doc, title) => {
    try {
      doc.addImage(logo, "PNG", 14, 10, 20, 20); // logo on left
    } catch (err) {
      console.warn("⚠️ Logo could not be added:", err);
    }
    doc.setFontSize(16);
    doc.text(companyName, 105, 20, { align: "center" }); // center name
    doc.setDrawColor(180);
    doc.line(10, 32, 200, 32); // horizontal line
    doc.setFontSize(13);
    if (title) doc.text(title, 14, 40);
  };

  // 📄 Download Supplier Statement PDF (blocked if no date selected)
  const handleDownloadPDF = () => {
  if (!selectedSupplier) return;
  if (!dateFrom || !dateTo) {
    setError("Please select both 'From' and 'To' dates before downloading.");
    return;
  }

  const doc = new jsPDF();
  addPdfHeader(doc, `Supplier Statement - ${selectedSupplier}`);

  const from = new Date(dateFrom).toLocaleString();
  const to = new Date(dateTo).toLocaleString();

  doc.setFontSize(11);
  doc.text(`Period: ${from} → ${to}`, 14, 48);

  const formatDateTime = (timestamp) => {
    const date = new Date(
      timestamp?.seconds ? timestamp.seconds * 1000 : timestamp
    );
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // 🔍 Filter by supplier and date range
  const filtered = invoices
    .filter((i) => i.supplier === selectedSupplier)
    .filter((e) => {
      const expenseDate = e.createdAt
        ? new Date(e.createdAt.seconds * 1000)
        : new Date(e.date);
      return expenseDate >= new Date(dateFrom) && expenseDate <= new Date(dateTo);
    });

  if (filtered.length === 0) {
    setError("No invoices found for this date range.");
    return;
  }

  // 🧾 Add table with Status column
  autoTable(doc, {
    head: [["#", "Description", "Amount", "Date & Time", "Status", "Entered By"]],
    body: filtered.map((i, idx) => [
      idx + 1,
      i.description,
      `$${Number(i.amount).toLocaleString()}`,
      i.createdAt ? formatDateTime(i.createdAt) : "—",
      i.status || "Not Paid",
      i.createdBy || "—",
    ]),
    startY: 54,
    styles: { fontSize: 10 },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      2: { halign: "right", cellWidth: 30 },
      4: { halign: "center", cellWidth: 25 },
    },
  });

  // 💰 Total unpaid only
  const unpaidTotal = filtered
    .filter((i) => i.status !== "Paid")
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Total Unpaid: $${unpaidTotal.toLocaleString()}`,
    14,
    doc.lastAutoTable.finalY + 10
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Generated by F Sonko Accounting", 14, doc.lastAutoTable.finalY + 20);

  doc.save(`${selectedSupplier}_statement.pdf`);
};


  // 🔷 Master Report download (filtered by masterDateFrom/masterDateTo)
  const handleDownloadMasterReport = () => {
  if (!masterDateFrom || !masterDateTo) {
    setError("Please select both 'From' and 'To' dates before downloading master report.");
    return;
  }

  const from = new Date(masterDateFrom);
  const to = new Date(masterDateTo);
  const doc = new jsPDF();
  addPdfHeader(doc, "Master Supplier Report (All Suppliers)");

  doc.setFontSize(11);
  doc.text(`Period: ${from.toLocaleString()} → ${to.toLocaleString()}`, 14, 48);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 54);

  let startY = 60;
  let grandFilteredTotal = 0;

  const formatDateTime = (timestamp) => {
    const date = new Date(
      timestamp?.seconds ? timestamp.seconds * 1000 : timestamp
    );
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  suppliers.forEach((s, index) => {
    // Filter invoices for this supplier and date range
    const supplierInvoicesFiltered = invoices.filter((inv) => {
      if (inv.supplier !== s) return false;
      const invDate = inv.createdAt
        ? new Date(inv.createdAt.seconds * 1000)
        : new Date(inv.date);
      return invDate >= from && invDate <= to;
    });

    if (supplierInvoicesFiltered.length === 0) return;

    // 🧾 Supplier section header
    autoTable(doc, {
      head: [[`${index + 1}. ${s}`, "", "", "", "", ""]],
      startY,
      theme: "plain",
      styles: { fontStyle: "bold", fontSize: 12 },
    });

    // 🧮 Add supplier invoices with Status
    autoTable(doc, {
      head: [["#", "Description", "Amount", "Date & Time", "Status", "Entered By"]],
      body: supplierInvoicesFiltered.map((i, idx) => [
        idx + 1,
        i.description,
        `$${Number(i.amount).toLocaleString()}`,
        i.createdAt ? formatDateTime(i.createdAt) : "—",
        i.status || "Not Paid",
        i.createdBy || "—",
      ]),
      startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 2 : startY + 6,
      styles: { fontSize: 9 },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        2: { halign: "right", cellWidth: 30 },
        4: { halign: "center", cellWidth: 25 },
      },
    });

    // 💰 Subtotal (only unpaid)
    const subtotal = supplierInvoicesFiltered
      .filter((inv) => inv.status !== "Paid")
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    grandFilteredTotal += subtotal;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Subtotal (Unpaid for ${s}): $${subtotal.toLocaleString()}`,
      14,
      doc.lastAutoTable.finalY + 8
    );

    startY = doc.lastAutoTable.finalY + 16;
  });

  // 🧾 Grand Total (Unpaid Only)
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Grand Total (Unpaid Only): $${grandFilteredTotal.toLocaleString()}`,
    14,
    startY + 4
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Generated by F Sonko Accounting", 14, startY + 14);

  doc.save(`Master_Supplier_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};


  return (
    <div className="container mt-4">
      <h3 className="mb-4">Suppliers</h3>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}

      <div className="d-flex gap-3 mb-3">
        <Button variant="success" onClick={() => setShowInvoiceModal(true)}>
          + Add Invoice
        </Button>
        
      </div>

      {loading ? (
        <div className="text-center mt-3">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Supplier</th>
                    <th>Total Purchases</th>
                    <th>Action</th>
                  </tr>
                </thead>
                      <tbody>
  {suppliers.length === 0 ? (
    <tr>
      <td colSpan="4" className="text-center text-muted">
        No suppliers added yet
      </td>
    </tr>
  ) : (
    suppliers.map((s, i) => {
      // 🧮 Count unpaid invoices for this supplier
      const unpaidCount = invoices.filter(
        (inv) => inv.supplier === s && inv.status !== "Paid"
      ).length;

      return (
        <tr key={i}>
          <td>{i + 1}</td>
          <td>{s}</td>
          <td>${getSupplierTotal(s).toLocaleString()}</td>
          <td>
            <div className="d-flex align-items-center gap-2">
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => handleViewStatement(s)}
              >
                View
              </Button>
              
              

              {/* 🔔 Bell icon showing unpaid invoices count */}
              {/* 🔔 Bell icon button showing unpaid invoices count */}
<Button
  variant="outline-warning"
  size="sm"
  onClick={() => handleBellClick(s)}
  style={{
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    padding: 0,
  }}
>
  <FaBell color="orange" size={18} />
  {unpaidCount > 0 && (
    <Badge
      bg="danger"
      pill
      style={{
        position: "absolute",
        top: "-6px",
        right: "-6px",
        fontSize: "0.6rem",
         }}
         >
         {unpaidCount}
    </Badge>
  )}
</Button>

            </div>
          </td>
        </tr>
      );
    })
  )}
</tbody>

              </Table>
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0 mt-4">
  <Card.Body>
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
      {/* 🏷️ Grand Total Purchases */}
      <h5 className="mb-0">
        💰 Grand Total Purchases: ${grandTotal.toLocaleString()}
      </h5>

      {/* 💵 Grand Total Paid */}
      <h5 className="mb-0 text-success">
        ✅ Grand Total Paid: $
        {invoices
          .filter((i) => i.status === "Paid")
          .reduce((sum, i) => sum + Number(i.amount || 0), 0)
          .toLocaleString()}
      </h5>

      {/* 💸 Grand Total Unpaid */}
      <h5 className="mb-0 text-danger">
        💸 Grand Total Unpaid: $
        {invoices
          .filter((i) => i.status !== "Paid")
          .reduce((sum, i) => sum + Number(i.amount || 0), 0)
          .toLocaleString()}
      </h5>
    </div>

    <hr />

    <div className="d-flex gap-3 mb-3">
      <Button variant="success" onClick={() => setShowInvoiceModal(true)}>
        + Add Invoice
      </Button>
      <Button variant="primary" onClick={() => setShowSupplierModal(true)}>
        + Add Supplier
      </Button>
      <Button variant="outline-success" onClick={() => setShowMasterModal(true)}>
        📊 Master Report
      </Button>
    </div>
  </Card.Body>
         </Card>


        </>
      )}

      {/* Add Supplier Modal */}
      <Modal show={showSupplierModal} onHide={() => setShowSupplierModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Supplier</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Supplier Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Nile Distributors"
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSupplierModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddSupplier} disabled={savingSupplier}>
            {savingSupplier ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" /> Saving...
              </>
            ) : (
              "Save Supplier"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Invoice Modal */}
      <Modal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Invoice</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Supplier</Form.Label>
              <Form.Select
                value={invoiceForm.supplier}
                onChange={(e) =>
                  setInvoiceForm({ ...invoiceForm, supplier: e.target.value })
                }
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s, i) => (
                  <option key={i} value={s}>
                    {s}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Invoice Description</Form.Label>
              <Form.Control
                type="text"
                value={invoiceForm.description}
                onChange={(e) =>
                  setInvoiceForm({
                    ...invoiceForm,
                    description: e.target.value,
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Invoice Number</Form.Label>
              <Form.Control
                type="text"
                value={invoiceForm.invoiceNumber}
                onChange={(e) =>
                  setInvoiceForm({
                    ...invoiceForm,
                    invoiceNumber: e.target.value,
                  })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                value={invoiceForm.amount}
                onChange={(e) =>
                  setInvoiceForm({ ...invoiceForm, amount: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleAddInvoice}
            disabled={savingInvoice}
          >
            {savingInvoice ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" /> Saving...
              </>
            ) : (
              "Save Invoice"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Supplier Statement Modal */}
      {/* Supplier Statement Modal */}
<Modal
  show={showStatementModal}
  onHide={() => setShowStatementModal(false)}
  size="lg"
  centered
>
  <Modal.Header closeButton>
    <Modal.Title>{selectedSupplier} Statement</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form className="d-flex gap-3 mb-3">
      <Form.Group>
        <Form.Label>From</Form.Label>
        <Form.Control
          type="datetime-local"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
      </Form.Group>

      <Form.Group>
        <Form.Label>To</Form.Label>
        <Form.Control
          type="datetime-local"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </Form.Group>

      <div className="d-flex align-items-end">
        <Button
          variant="outline-secondary"
          onClick={handleDownloadPDF}
          disabled={!dateFrom || !dateTo}
        >
          Download PDF
        </Button>
      </div>
    </Form>

    {supplierInvoices.length === 0 ? (
      <p className="text-muted">No invoices recorded for this supplier.</p>
    ) : (
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Date & Time</th>
            <th>Status</th>
            <th>Entered By</th>
          </tr>
        </thead>
        <tbody>
          {supplierInvoices.map((i, index) => (
            <tr key={i.id || index}>
              <td>{index + 1}</td>
              <td>{i.description}</td>
              <td>${Number(i.amount).toLocaleString()}</td>
              <td>
                {i.createdAt
                  ? new Date(i.createdAt.seconds * 1000).toLocaleString()
                  : "—"}
              </td>
              <td>
                <span
                  className={`badge ${
                    i.status === "Paid" ? "bg-success" : "bg-danger"
                  }`}
                >
                  {i.status || "Not Paid"}
                </span>
              </td>
              <td>{i.createdBy || "—"}</td>
            </tr>
          ))}

          {/* 🧮 Show total of unpaid invoices only */}
          <tr className="fw-bold">
            <td colSpan="2">Total Unpaid</td>
            <td colSpan="4">
              $
              {supplierInvoices
                .filter((i) => i.status !== "Paid")
                .reduce((sum, i) => sum + Number(i.amount || 0), 0)
                .toLocaleString()}
            </td>
          </tr>
        </tbody>
      </Table>
    )}
  </Modal.Body>
</Modal>


      {/* Master Report Modal */}
      <Modal show={showMasterModal} onHide={() => setShowMasterModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Master Supplier Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className="d-flex flex-wrap gap-3">
            <Form.Group>
              <Form.Label>From (Date & Time)</Form.Label>
              <Form.Control
                type="datetime-local"
                value={masterDateFrom}
                onChange={(e) => setMasterDateFrom(e.target.value)}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>To (Date & Time)</Form.Label>
              <Form.Control
                type="datetime-local"
                value={masterDateTo}
                onChange={(e) => setMasterDateTo(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMasterModal(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={() => {
              handleDownloadMasterReport();
              setShowMasterModal(false);
            }}
            disabled={!masterDateFrom || !masterDateTo}
          >
            Download Master PDF
          </Button>
        </Modal.Footer>
      </Modal>


      <Modal
  show={showUnpaidModal}
  onHide={() => setShowUnpaidModal(false)}
  size="lg"
  centered
>
  <Modal.Header closeButton>
    <Modal.Title>
      Unpaid Invoices — {selectedSupplier || "Supplier"}
    </Modal.Title>
  </Modal.Header>

  <Modal.Body>
    {updating && (
      <div className="text-center mb-3">
        <Spinner animation="border" size="sm" /> Paying... Cliant.....
      </div>
    )}

    {unpaidInvoices.length === 0 ? (
      <p className="text-center text-muted mb-0">All invoices are paid ✅</p>
    ) : (
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Invoice Number</th>
            <th>Description</th>
            <th>Amount (UGX)</th>
            <th>Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {unpaidInvoices.map((inv, idx) => (
            <tr key={inv.id}>
              <td>{idx + 1}</td>
              <td>{inv.invoiceNumber || "—"}</td>
              <td>{inv.description}</td>
              <td>{Number(inv.amount).toLocaleString()}</td>
              <td>
                {new Date(
                  inv.date?.seconds ? inv.date.seconds * 1000 : inv.date
                ).toLocaleString()}
              </td>
              <td style={{ color: "red", fontWeight: "bold" }}>
                {inv.status || "Not Paid"}
              </td>
              <td>
                <Button
                  size="sm"
                  variant="success"
                  disabled={updating}
                  onClick={() => handlePayInvoice(inv.id)}
                >
                  PAY
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    )}
  </Modal.Body>

  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowUnpaidModal(false)}>
      Close
    </Button>
  </Modal.Footer>
</Modal>

    </div>
  );
};

export default Suppliers;
