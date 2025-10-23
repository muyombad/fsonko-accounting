// src/pages/Ledgers.js
import React, { useEffect, useState } from "react";
import { Table, Button, Form, Spinner, Alert, Modal } from "react-bootstrap";
import { getAllLedgers, ensureLedger } from "../services/ledgerService";
import { getEntriesForLedger } from "../services/ledgerEntryService";

const Ledgers = () => {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entryLoading, setEntryLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLedger, setNewLedger] = useState({ name: "", type: "Asset" });

  const loadLedgers = async () => {
    setLoading(true);
    const res = await getAllLedgers();
    if (res.success) setLedgers(res.data || []);
    else setError(res.error || "Failed to load ledgers");
    setLoading(false);
  };

  useEffect(() => {
    loadLedgers();
  }, []);

  const loadEntries = async (ledgerName) => {
    setEntryLoading(true);
    setSelectedLedger(ledgerName);
    const res = await getEntriesForLedger(ledgerName);
    if (res.success) setEntries(res.data || []);
    else setError(res.error || "Failed to load entries");
    setEntryLoading(false);
  };

  const handleCreateLedger = async () => {
    if (!newLedger.name) {
      setError("Ledger name required");
      return;
    }
    setError("");
    setLoading(true);
    const res = await ensureLedger(newLedger.name, newLedger.type);
    setLoading(false);
    if (res.success) {
      setShowCreateModal(false);
      setNewLedger({ name: "", type: "Asset" });
      loadLedgers();
    } else {
      setError(res.error || "Failed to create ledger");
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Ledgers</h4>
        <div>
          <Button onClick={() => setShowCreateModal(true)}>New Ledger</Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center"><Spinner animation="border" /></div>
      ) : (
        <>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Ledger</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.length === 0 ? (
                <tr><td colSpan="4" className="text-center text-muted">No ledgers found.</td></tr>
              ) : ledgers.map(l => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td>{l.type}</td>
                  <td>{Number(l.balance || 0).toFixed(2)}</td>
                  <td>
                    <Button size="sm" variant="primary" className="me-2" onClick={() => loadEntries(l.name)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {selectedLedger && (
            <div className="mt-3">
              <h5>Entries for: {selectedLedger}</h5>
              {entryLoading ? (
                <div className="text-center"><Spinner animation="border" /></div>
              ) : entries.length === 0 ? (
                <div className="text-muted">No entries for this ledger yet.</div>
              ) : (
                <Table striped bordered responsive>
                  <thead><tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance After</th></tr></thead>
                  <tbody>
                    {entries.map(r => (
                      <tr key={r.id}>
                        <td>{r.date}</td>
                        <td>{r.description}</td>
                        <td>{Number(r.debit || 0).toFixed(2)}</td>
                        <td>{Number(r.credit || 0).toFixed(2)}</td>
                        <td>{Number(r.balanceAfter || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          )}
        </>
      )}

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton><Modal.Title>New Ledger</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Ledger Name</Form.Label>
            <Form.Control value={newLedger.name} onChange={(e) => setNewLedger({...newLedger, name: e.target.value})} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Type</Form.Label>
            <Form.Select value={newLedger.type} onChange={(e) => setNewLedger({...newLedger, type: e.target.value})}>
              <option>Asset</option>
              <option>Liability</option>
              <option>Equity</option>
              <option>Income</option>
              <option>Expense</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateLedger}>Create</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Ledgers;