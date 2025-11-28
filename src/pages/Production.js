import React, { useEffect, useState } from "react";
import {
  Card,
  Spinner,
  Row,
  Col,
  Badge,
  Button,
  Modal,
  Form,
} from "react-bootstrap";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Production = () => {
  const [productionList, setProductionList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // PROCESSING STATES
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedProdForProcess, setSelectedProdForProcess] = useState(null);
  const [processQty, setProcessQty] = useState("");
  const [processing, setProcessing] = useState(false);

  // STATEMENT STATES
  const [showDateModal, setShowDateModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedProductForStatement, setSelectedProductForStatement] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementRecords, setStatementRecords] = useState([]);

  useEffect(() => {
    loadProducts();
    loadProduction();
  }, []);

  const loadProducts = async () => {
    try {
      const snap = await getDocs(collection(db, "products"));
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("loadProducts error:", err);
    }
  };

  const loadProduction = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "production"));
      setProductionList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("loadProduction error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (productId) => {
    const prod = products.find((p) => p.id === productId);
    return prod ? prod.name : "—";
  };

  // OPEN PROCESS MODAL
  const openProcessModal = (item) => {
    setSelectedProdForProcess(item);
    setProcessQty("");
    setShowProcessModal(true);
  };

  // PROCESS PRODUCTION
  const processProduction = async () => {
    if (!processQty || Number(processQty) <= 0) {
      return alert("Enter valid quantity");
    }

    const qty = Number(processQty);
    const current = selectedProdForProcess.totalApproved;

    if (qty > current) return alert("Not enough stock!");

    try {
      setProcessing(true);

      const docRef = doc(db, "production", selectedProdForProcess.id);
      await updateDoc(docRef, {
        totalApproved: current - qty,
        lastUpdated: serverTimestamp(),
      });

      await addDoc(
        collection(db, "production", selectedProdForProcess.id, "transactions"),
        {
          type: "processed",
          productId: selectedProdForProcess.productId,
          quantity: qty,
          lastApprovedQty: selectedProdForProcess.lastApprovedQty || "-",
          balanceAfter: current - qty,
          createdAt: serverTimestamp(),
        }
      );

      setShowProcessModal(false);
      loadProduction();
    } catch (err) {
      console.error("process error:", err);
      alert("Failed to process");
    } finally {
      setProcessing(false);
    }
  };

  // LOAD STATEMENT (FIXED)
  const loadStatement = async () => {
  try {
    if (!selectedProductForStatement) return;

    setStatementLoading(true);

    // Normalize dates
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0); // start of day

    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999); // end of day

    const q1 = query(
      collection(db, "production", selectedProductForStatement.id, "transactions"),
      where("createdAt", ">=", from),
      where("createdAt", "<=", to)
    );

    const snap = await getDocs(q1);

    let data = [];
    snap.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });

    // Sort oldest → newest
    data.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return a.createdAt.seconds - b.createdAt.seconds;
    });

    setStatementRecords(data);
  } catch (err) {
    console.error("Error loading statement", err);
    alert("Failed to load statement.");
  } finally {
    setStatementLoading(false);
  }
};


  // DOWNLOAD PDF
  const downloadPDF = () => {
    const doc = new jsPDF("p", "pt", "a4");

    doc.setFontSize(18);
    doc.text(" Production Statement Report", 40, 40);

    doc.setFontSize(12);
    doc.text(
      `Product: ${getProductName(selectedProductForStatement.productId)}`,
      40,
      65
    );
    doc.text(`Date From: ${dateFrom}`, 40, 80);
    doc.text(`Date To: ${dateTo}`, 40, 95);

    autoTable(doc, {
      startY: 120,
      head: [["Date", "Prossed Quantity", "Approved Quantity", "Balance Stock"]],
      body: statementRecords.map((rec) => [
        rec.createdAt.toDate().toLocaleString(),
        rec.quantity,
        rec.lastApprovedQty,
        rec.balanceAfter,
      ]),
    });

    doc.save(`Production_Statement_${dateFrom}_to_${dateTo}.pdf`);
  };

  return (
    <div className="container mt-4">
      <h3>Production Overview</h3>
      <p className="text-muted">Total approved stock per product</p>

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Row>
          {productionList.map((p) => {
            const dt = p.lastUpdated?.toDate
              ? p.lastUpdated.toDate().toLocaleString()
              : "—";

            return (
              <Col md={4} lg={3} sm={6} xs={12} key={p.id} className="mb-3">
                <Card className="p-3 shadow-sm">
                  <h5>{getProductName(p.productId)}</h5>

                  <p className="mb-1 text-muted">In Production:</p>
                  <h4>
                    <Badge bg="primary">{p.totalApproved}</Badge>
                  </h4>

                  <p className="mb-1 text-muted">Last Approved Qty:</p>
                  <h5>
                    <Badge bg="success">{p.lastApprovedQty}</Badge>
                  </h5>

                  <hr />

                  <small className="text-muted">
                    Last Updated:<br /> {dt}
                  </small>

                  <div className="mt-3">
                    <Button
                      variant="outline-primary"
                      className="w-100 mb-2"
                      onClick={() => {
                        setSelectedProductForStatement(p);
                        setDateFrom("");
                        setDateTo("");
                        setStatementRecords([]);
                        setShowDateModal(true);
                      }}
                    >
                      📄 View Statement
                    </Button>

                    <Button
                      variant="success"
                      className="w-100"
                      onClick={() => openProcessModal(p)}
                    >
                      ⚙️ Process Product
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* DATE MODAL */}
      <Modal show={showDateModal} onHide={() => setShowDateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Select Date Range</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedProductForStatement && (
            <>
              <p><strong>Product:</strong> {getProductName(selectedProductForStatement.productId)}</p>

              <Form.Group className="mb-3">
                <Form.Label>Date From</Form.Label>
                <Form.Control
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Date To</Form.Label>
                <Form.Control
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDateModal(false)}>
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setShowDateModal(false);
              setShowStatementModal(true);
            }}
            disabled={!dateFrom || !dateTo}
          >
            Continue
          </Button>
        </Modal.Footer>
      </Modal>

      {/* STATEMENT MODAL */}
      <Modal
        show={showStatementModal}
        onHide={() => setShowStatementModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Production Statement</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p><strong>Product:</strong> {getProductName(selectedProductForStatement?.productId)}</p>

          <Button
            className="mt-2 w-100"
            onClick={loadStatement}
            disabled={statementLoading}
          >
            {statementLoading ? "Loading..." : "Load Statement"}
          </Button>

          <hr />

          {statementRecords.length > 0 ? (
            <>
              <Button className="mb-3" onClick={downloadPDF}>
                📄 Download PDF
              </Button>

              <table className="table table-bordered table-striped">
                <thead className="table-primary">
                  <tr>
                    <th>Date</th>
                    <th> Processed Quantity</th>
                    <th>Approved Quantity</th>
                    <th>Balance Stock</th>
                  </tr>
                </thead>

                <tbody>
                  {statementRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td>{rec.createdAt?.toDate().toLocaleString()}</td>
                      <td>{rec.quantity?? "-"}</td>
                      <td>{rec.requested?? "-"}</td>
                      <td>{rec.balanceAfter?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-center text-muted">
              No data yet — click <strong>Load Statement</strong>.
            </p>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatementModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* PROCESS MODAL */}
      <Modal show={showProcessModal} onHide={() => setShowProcessModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Process Production</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedProdForProcess && (
            <>
              <p><strong>Product:</strong> {getProductName(selectedProdForProcess.productId)}</p>
              <p><strong>Available:</strong> {selectedProdForProcess.totalApproved}</p>

              <Form.Group>
                <Form.Label>Quantity to Process</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={processQty}
                  onChange={(e) => setProcessQty(e.target.value)}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProcessModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={processProduction} disabled={processing}>
            {processing ? "Processing..." : "Process"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Production;
