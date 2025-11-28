import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Form,
  Row,
  Col,
  Modal,
  Table,
  Spinner,
  Badge,
} from "react-bootstrap";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { FaBell } from "react-icons/fa";
import { getAuth } from "firebase/auth";
import jsPDF from "jspdf";

const ExportPage = () => {
  const auth = getAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  // View Exports modal
  const [showExportsModal, setShowExportsModal] = useState(false);
  const [exportsData, setExportsData] = useState([]);
  const [loadingExports, setLoadingExports] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [approveLoadingId, setApproveLoadingId] = useState(null);

  // View Single Export modal
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [singleExport, setSingleExport] = useState(null);

  // Pending Exports
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingList, setPendingList] = useState([]);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Load current Firebase user
  useEffect(() => {
    const user = auth.currentUser;
    if (user) setCurrentUser(user);
  }, []);

  //-------------------------------------------
  // LOAD CLIENT LIST
  //-------------------------------------------
  const loadClients = async () => {
    const snap = await getDocs(collection(db, "clients"));
    let list = [];
    snap.forEach((c) => {
      list.push({ id: c.id, ...c.data() });
    });
    setClients(list);
  };

  //-------------------------------------------
  // LOAD PENDING EXPORT COUNTS
  //-------------------------------------------
  const loadPendingExports = async () => {
    let totalPending = 0;
    let pendingArr = [];

    const clientsSnap = await getDocs(collection(db, "clients"));

    for (const c of clientsSnap.docs) {
      const q1 = query(
        collection(db, "export", c.id, "data"),
        where("status", "==", "pending")
      );

      const snap = await getDocs(q1);
      snap.forEach((d) => {
        totalPending++;
        pendingArr.push({
          id: d.id,
          customerId: c.id,
          customerName: c.data().company,
          ...d.data(),
        });
      });
    }

    setPendingList(pendingArr);
    setPendingCount(totalPending);
  };

  useEffect(() => {
    loadClients();
    loadPendingExports();
  }, []);

  //-------------------------------------------
  // SUBMIT EXPORT ENTRY
  //-------------------------------------------
  const submitExport = async () => {
    if (!selectedClient || !quantity) {
      alert("Please select customer and enter quantity.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "export", selectedClient, "data"), {
        quantity: Number(quantity),
        weight: weight ? Number(weight) : null,
        status: "pending",
        c_user: "",
        createdAt: new Date(),
      });

      setQuantity("");
      setWeight("");
      setSelectedClient("");

      await loadPendingExports();
      alert("Export saved successfully.");
    } catch (err) {
      console.error("Error saving export", err);
      alert("Failed to save export.");
    } finally {
      setSaving(false);
    }
  };

  //-------------------------------------------
  // LOAD EXPORTS BY DATE RANGE
  //-------------------------------------------
  const loadExports = async () => {
    if (!dateFrom || !dateTo) {
      alert("Select date range");
      return;
    }

    setLoadingExports(true);

    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);

    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    let allExports = [];

    for (const c of clients) {
      const q1 = query(
        collection(db, "export", c.id, "data"),
        where("createdAt", ">=", from),
        where("createdAt", "<=", to)
      );

      const snap = await getDocs(q1);

      snap.forEach((d) => {
        allExports.push({
          id: d.id,
          customerId: c.id,
          customerName: c.company,
          ...d.data(),
        });
      });
    }

    allExports.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return a.createdAt.toDate() - b.createdAt.toDate();
    });

    setExportsData(allExports);
    setLoadingExports(false);
  };

  //-------------------------------------------
  // OPEN SINGLE EXPORT DETAILS
  //-------------------------------------------
  const openSingleExport = (exp) => {
    setSingleExport(exp);
    setShowSingleModal(true);
  };

  //-------------------------------------------
  // APPROVE PENDING EXPORT
  //-------------------------------------------
  const approveExport = async (exp) => {
    setApproveLoadingId(exp.id);

    try {
      await updateDoc(doc(db, "export", exp.customerId, "data", exp.id), {
        status: "approved",
        c_user: currentUser
          ? currentUser.displayName || currentUser.email
          : "Unknown",
      });

      await loadPendingExports();
      alert("Export approved.");
    } catch (err) {
      console.error(err);
      alert("Failed to approve.");
    } finally {
      setApproveLoadingId(null);
    }
  };

  // -------------------------------------------
// DOWNLOAD ALL FILTERED EXPORT MOVEMENTS
// -------------------------------------------
const downloadMovementsPDF = () => {
  if (exportsData.length === 0) {
    alert("No exported movements to download.");
    return;
  }

  const doc = new jsPDF("p", "pt", "a4");

  doc.setFontSize(16);
  doc.text("Export Movements Report", 40, 40);

  doc.setFontSize(12);
  doc.text(`From: ${dateFrom}`, 40, 70);
  doc.text(`To: ${dateTo}`, 300, 70);

  let y = 110;

  doc.setFontSize(11);
  doc.text("Date", 40, y);
  doc.text("Customer", 160, y);
  doc.text("Qty", 300, y);
  doc.text("Weight", 350, y);
  doc.text("Status", 420, y);

  y += 20;

  exportsData.forEach((item) => {
    if (y > 750) {
      doc.addPage();
      y = 60;
    }

    doc.text(
      item.createdAt?.toDate().toLocaleString() || "---",
      40,
      y
    );
    doc.text(item.customerName || "---", 160, y);
    doc.text(String(item.quantity || "---"), 300, y);
    doc.text(String(item.weight || "---"), 350, y);
    doc.text(
      item.status === "pending"
        ? "Pending"
        : `Approved by ${item.c_user || "---"}`,
      420,
      y
    );

    y += 20;
  });

  doc.save("export_movements_report.pdf");
};


  //-------------------------------------------
  // PDF DOWNLOAD FUNCTION
  //-------------------------------------------
  const downloadSingleExport = () => {
    if (!singleExport) return;

    const docFile = new jsPDF();

    docFile.setFontSize(14);
    docFile.text("Export Details", 10, 10);
    docFile.text(`Customer: ${singleExport.customerName}`, 10, 20);
    docFile.text(`Quantity: ${singleExport.quantity}`, 10, 30);
    docFile.text(`Weight: ${singleExport.weight || "N/A"}`, 10, 40);
    docFile.text(
      `Status: ${
        singleExport.status === "pending"
          ? "Pending"
          : `Approved by ${singleExport.c_user || "---"}`
      }`,
      10,
      50
    );
    docFile.text(
      `Date: ${singleExport.createdAt?.toDate().toLocaleString()}`,
      10,
      60
    );

    docFile.save(`export_${singleExport.id}.pdf`);
  };

  //-------------------------------------------
  // OPEN VIEW EXPORTS MODAL
  //-------------------------------------------
  const openViewExportsModal = () => {
    setExportsData([]);
    setDateFrom("");
    setDateTo("");
    setSingleExport(null);
    setShowExportsModal(true);
  };

  //-------------------------------------------
  // RENDER PAGE
  //-------------------------------------------
  return (
    <div className="container mt-4">
      {/* PENDING EXPORTED GOODS CARD */}
      <Card
        className="p-3 shadow-sm mb-3"
        style={{ cursor: "pointer", borderLeft: "5px solid orange" }}
        onClick={() => setShowPendingModal(true)}
      >
        <h5 className="d-flex align-items-center gap-2">
          <FaBell size={24} color="orange" />
          Pending Exports
          <Badge bg="danger">{pendingCount}</Badge>
        </h5>
      </Card>

      {/* EXPORT ENTRY CARD */}
      <Card className="p-3 shadow-sm">
        <h4>Export Goods</h4>

        <Row className="mt-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label>Customer</Form.Label>
              <Form.Select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">-- Select Customer --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label>Quantity *</Form.Label>
              <Form.Control
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label>Weight (optional)</Form.Label>
              <Form.Control
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        <div className="mt-3 d-flex gap-2">
          <Button onClick={submitExport} disabled={saving}>
            {saving ? <Spinner size="sm" /> : "Export Goods"}
          </Button>

          <Button
            variant="secondary"
            onClick={openViewExportsModal}
            disabled={saving}
          >
            View Exports
          </Button>
        </div>
      </Card>

      {/* PENDING EXPORTS MODAL */}
      <Modal show={showPendingModal} onHide={() => setShowPendingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Pending Export Goods</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table bordered hover>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Qty</th>
                <th>Weight</th>
                <th>Date</th>
                <th>Approve</th>
              </tr>
            </thead>
            <tbody>
              {pendingList.map((p) => (
                <tr key={p.id}>
                  <td>{p.customerName}</td>
                  <td>{p.quantity}</td>
                  <td>{p.weight || "---"}</td>
                  <td>{p.createdAt?.toDate().toLocaleString()}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="success"
                      disabled={approveLoadingId === p.id}
                      onClick={() => approveExport(p)}
                    >
                      {approveLoadingId === p.id ? (
                        <Spinner size="sm" />
                      ) : (
                        "Approve"
                      )}
                    </Button>
                  </td>
                </tr>
              ))}

              {pendingList.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">
                    No pending exports.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      {/* VIEW EXPORTS MODAL */}
      <Modal show={showExportsModal} onHide={() => setShowExportsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Export Movements</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col>
              <Form.Label>From</Form.Label>
              <Form.Control
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </Col>
            <Col>
              <Form.Label>To</Form.Label>
              <Form.Control
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </Col>
            <Col md={3} className="d-flex align-items-end">
              <Button onClick={loadExports} disabled={loadingExports}>
                {loadingExports ? <Spinner size="sm" /> : "Load"}
              </Button>
            </Col>
          </Row>
          

          <Table bordered hover className="mt-3">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Qty</th>
                <th>Weight</th>
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {exportsData.map((e) => (
                <tr key={e.id}>
                  <td>{e.createdAt?.toDate().toLocaleString()}</td>
                  <td>{e.customerName}</td>
                  <td>{e.quantity}</td>
                  <td>{e.weight || "---"}</td>
                  <td>
                    {e.status === "pending"
                      ? "Pending"
                      : `Approved by ${e.c_user || "---"}`}
                  </td>

                  <td>
                    <Button size="sm" onClick={() => openSingleExport(e)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}

              {exportsData.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center">
                    No exports found.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          {exportsData.length > 0 && (
  <div className="d-flex justify-content-end mt-3">
    <Button variant="success" onClick={downloadMovementsPDF}>
      Download Movements
    </Button>
  </div>
)}

        </Modal.Body>
      </Modal>

      {/* VIEW SINGLE EXPORT */}
      <Modal show={showSingleModal} onHide={() => setShowSingleModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Export Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {singleExport && (
            <>
              <p>
                <b>Customer:</b> {singleExport.customerName}
              </p>
              <p>
                <b>Quantity:</b> {singleExport.quantity}
              </p>
              <p>
                <b>Weight:</b> {singleExport.weight || "N/A"}
              </p>
              <p>
                <b>Status:</b>{" "}
                {singleExport.status === "pending"
                  ? "Pending"
                  : `Approved by ${singleExport.c_user || "---"}`}
              </p>
              <p>
                <b>Date:</b>{" "}
                {singleExport.createdAt?.toDate().toLocaleString()}
              </p>

              <div className="d-flex gap-2">
                <Button variant="primary" onClick={() => window.print()}>
                  Print
                </Button>

                <Button variant="success" onClick={downloadSingleExport}>
                  Download
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default ExportPage;
