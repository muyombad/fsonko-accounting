import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Spinner, Alert, InputGroup, FormControl } from "react-bootstrap";
import { getAllTransactions, addTransaction, updateTransaction, deleteTransaction } from "../services/bankCashService";

const BankCash = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    accountName: "",
    transactionType: "Deposit",
    amount: "",
    date: "",
    description: "",
    transferToAccount: ""
  });
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await getAllTransactions();
    if (res.success) setTransactions(res.data);
    else setError(res.error);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ accountName: "", transactionType: "Deposit", amount: "", date: "", description: "", transferToAccount: "" });
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({ ...t, transferToAccount: t.transferToAccount || "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.accountName || !form.amount || !form.date) {
      setError("Please fill account, amount and date");
      return;
    }
    setSaving(true);
    const res = editing ? await updateTransaction(editing.id, form) : await addTransaction(form);
    if (res.success) {
      setShowModal(false);
      load();
    } else {
      setError(res.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    const res = await deleteTransaction(id);
    if (res.success) load();
    else setError(res.error || "Failed to delete");
  };

  const filtered = transactions.filter(t => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (t.accountName && t.accountName.toLowerCase().includes(q)) ||
           (t.transactionType && t.transactionType.toLowerCase().includes(q)) ||
           (t.description && t.description.toLowerCase().includes(q));
  });

  const totals = filtered.reduce((acc, t) => {
    const amt = Number(t.amount) || 0;
    if (t.transactionType === "Deposit") acc.deposits += amt;
    else if (t.transactionType === "Withdrawal") acc.withdrawals += amt;
    return acc;
  }, { deposits: 0, withdrawals: 0 });

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Bank & Cash</h4>
        <div>
          <Button variant="primary" onClick={openNew}>New Transaction</Button>
        </div>
      </div>

      {error && <Alert variant="danger">{String(error)}</Alert>}

      <div className="d-flex mb-2 gap-2">
        <InputGroup style={{ maxWidth: 360 }}>
          <FormControl placeholder="Search by account, type or description" value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
      </div>

      {loading ? <div className="text-center"><Spinner animation="border" /></div> : (
        <>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.accountName}</td>
                  <td>{t.transactionType}</td>
                  <td>{Number(t.amount).toFixed(2)}</td>
                  <td>{t.balanceAfter != null ? Number(t.balanceAfter).toFixed(2) : "-"}</td>
                  <td>{t.description}</td>
                  <td>
                    <Button size="sm" variant="warning" className="me-2" onClick={() => openEdit(t)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(t.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="d-flex justify-content-between mt-2">
            <div>Total Deposits: <strong>{totals.deposits.toFixed(2)}</strong></div>
            <div>Total Withdrawals: <strong>{totals.withdrawals.toFixed(2)}</strong></div>
            <div>Net Balance: <strong>{(totals.deposits - totals.withdrawals).toFixed(2)}</strong></div>
          </div>
        </>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton><Modal.Title>{editing ? "Edit Transaction" : "New Transaction"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-2"><Form.Label>Account Name</Form.Label><Form.Control value={form.accountName} onChange={(e) => setForm({...form, accountName: e.target.value})} /></Form.Group>
            <Form.Group className="mb-2"><Form.Label>Type</Form.Label>
              <Form.Select value={form.transactionType} onChange={(e) => setForm({...form, transactionType: e.target.value})}>
                <option>Deposit</option>
                <option>Withdrawal</option>
                <option>Transfer</option>
              </Form.Select>
            </Form.Group>
            {form.transactionType === "Transfer" && (
              <Form.Group className="mb-2"><Form.Label>Transfer To Account</Form.Label><Form.Control value={form.transferToAccount} onChange={(e) => setForm({...form, transferToAccount: e.target.value})} /></Form.Group>
            )}
            <Form.Group className="mb-2"><Form.Label>Amount</Form.Label><Form.Control type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} /></Form.Group>
            <Form.Group className="mb-2"><Form.Label>Date</Form.Label><Form.Control type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} /></Form.Group>
            <Form.Group className="mb-2"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></Form.Group>
            {saving && <div className="text-center"><Spinner animation="border" /></div>}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BankCash;