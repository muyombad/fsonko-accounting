import React, { useState, useEffect } from "react";
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

const Expenses = () => {
  const [accounts, setAccounts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [masterDateFrom, setMasterDateFrom] = useState("");
  const [masterDateTo, setMasterDateTo] = useState("");


  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);

  const [accountForm, setAccountForm] = useState({ name: "" });
  const [expenseForm, setExpenseForm] = useState({
    account: "",
    description: "",
    amount: "",
  });

  const [selectedAccount, setSelectedAccount] = useState(null);

  // 🌀 Added: Local loading states for buttons
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getAllTransactions();
      if (result.success) {
        const allExpenses = result.data.filter((t) => t.type === "Expense");
        setExpenses(allExpenses);
        const accNames = [...new Set(allExpenses.map((t) => t.account))];
        setAccounts(accNames);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Add new expense account
  const handleAddAccount = async () => {
    if (!accountForm.name.trim()) {
      setError("Please enter account name");
      return;
    }
    if (accounts.includes(accountForm.name.trim())) {
      setError("Account already exists");
      return;
    }

    setSavingAccount(true); // 🌀 Start spinner

    // Simulate slight delay for UX (optional)
    await new Promise((r) => setTimeout(r, 500));

    setAccounts([...accounts, accountForm.name.trim()]);
    setAccountForm({ name: "" });
    setShowAccountModal(false);
    setSavingAccount(false); // 🌀 Stop spinner
  };

  // Add new expense
  const handleAddExpense = async () => {
    const { account, description, amount } = expenseForm;
    if (!account || !description || !amount) {
      setError("Please fill all fields");
      return;
    }

    setSavingExpense(true); // 🌀 Start spinner

    const result = await addTransaction({
      ...expenseForm,
      type: "Expense",
    });

    if (result.success) {
      const refreshed = await getAllTransactions();
      const allExpenses = refreshed.data.filter((t) => t.type === "Expense");
      setExpenses(allExpenses);
      setExpenseForm({ account: "", description: "", amount: "" });
      setShowExpenseModal(false);
    } else {
      setError(result.error);
    }

    setSavingExpense(false); // 🌀 Stop spinner
  };

  const getAccountTotal = (account) =>
    expenses
      .filter((e) => e.account === account)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const grandTotal = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  const handleViewStatement = (account) => {
    setSelectedAccount(account);
    setDateFrom("");
    setDateTo("");
    setShowStatementModal(true);
  };

    const accountExpenses = selectedAccount
  ? expenses
      .filter((e) => e.account === selectedAccount)
      .filter((e) => {
        if (!dateFrom && !dateTo) return true;
        const txDate = e.createdAt
          ? new Date(e.createdAt.seconds * 1000)
          : new Date(e.date);
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from && txDate < from) return false;
        if (to && txDate > to) return false;
        return true;
      })
  : [];

  // handle manster report
      const handleDownloadMasterReport = () => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Master Expense Report (All Accounts)", 14, 15);
  doc.setFontSize(11);

  const from = masterDateFrom ? new Date(masterDateFrom) : null;
  const to = masterDateTo ? new Date(masterDateTo) : null;
  const rangeText = `${from ? from.toLocaleString() : "Start"} → ${
    to ? to.toLocaleString() : "Present"
  }`;
  doc.text(`Period: ${rangeText}`, 14, 23);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

  let startY = 38;
  let grandTotalFiltered = 0;

  accounts.forEach((acc, index) => {
    const accExpenses = expenses.filter((e) => {
      if (e.account !== acc) return false;
      const date = e.createdAt
        ? new Date(e.createdAt.seconds * 1000)
        : new Date(e.date);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });

    if (accExpenses.length === 0) return;

    const tableData = accExpenses.map((e, i) => [
      i + 1,
      e.description,
      `$${Number(e.amount).toLocaleString()}`,
      e.createdAt
        ? new Date(e.createdAt.seconds * 1000).toLocaleString()
        : "—",
    ]);

    autoTable(doc, {
      head: [[`${index + 1}. ${acc}`, "", "", ""]],
      startY,
    });

    autoTable(doc, {
      head: [["#", "Description", "Amount", "Date & Time"]],
      body: tableData,
      startY: doc.lastAutoTable.finalY + 2,
    });

    const total = accExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    doc.text(
      `Subtotal (${acc}): $${total.toLocaleString()}`,
      14,
      doc.lastAutoTable.finalY + 8
    );
    grandTotalFiltered += total;
    startY = doc.lastAutoTable.finalY + 16;
  });

  doc.setFontSize(13);
  doc.text(
    `Grand Total (Filtered): $${grandTotalFiltered.toLocaleString()}`,
    14,
    startY + 4
  );

  doc.save(`Master_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};



/// handle PDF Download////////////////////////
    const handleDownloadPDF = () => {
  if (!selectedAccount) return;

  const doc = new jsPDF();
  const accountName = selectedAccount;
  const from = dateFrom || "Start";
  const to = dateTo || "Present";

  doc.setFontSize(14);
  doc.text(`Expense Statement - ${accountName}`, 14, 15);
  doc.setFontSize(11);
  doc.text(`Period: ${from} to ${to}`, 14, 23);

  const filtered = accountExpenses.filter((e) => {
    const expenseDate = new Date(
      e.createdAt?.seconds ? e.createdAt.seconds * 1000 : e.createdAt
    );
    return (
      (!dateFrom || expenseDate >= new Date(dateFrom)) &&
      (!dateTo || expenseDate <= new Date(dateTo))
    );
  });

  // 🕒 Format date and time neatly
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

  const tableData = filtered.map((e, i) => [
    i + 1,
    e.description,
    `$${Number(e.amount).toLocaleString()}`,
    e.createdAt ? formatDateTime(e.createdAt) : "—",
  ]);

  autoTable(doc, {
    head: [["#", "Description", "Amount", "Date & Time"]],
    body: tableData,
    startY: 30,
  });

  const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  doc.text(
    `Total: $${total.toLocaleString()}`,
    14,
    doc.lastAutoTable.finalY + 10
  );

  doc.save(`${accountName}_statement.pdf`);
};



  return (
    <div className="container mt-4">
      <h3 className="mb-4">Expense Accounts</h3>
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="d-flex gap-3 mb-3">
        <Button variant="success" onClick={() => setShowExpenseModal(true)}>
          + Add Expense
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
                    <th>Account Name</th>
                    <th>Total Expense</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center text-muted">
                        No accounts available
                      </td>
                    </tr>
                  ) : (
                    accounts.map((acc, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{acc}</td>
                        <td>${getAccountTotal(acc).toLocaleString()}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleViewStatement(acc)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0 mt-4">
             <Card.Body>
  <h5>💰 Grand Total of All Expenses: ${grandTotal.toLocaleString()}</h5>
  <div className="d-flex gap-2 mt-2">
    <Button variant="primary" onClick={() => setShowAccountModal(true)}>
      + Add Expense Account
    </Button>
    <Button variant="outline-success" onClick={() => setShowMasterModal(true)}>
      📊 Download Master Report
    </Button>
  </div>
</Card.Body>


          </Card>
          
        </>
      )}

      {/* Add Account Modal */}
      <Modal show={showAccountModal} onHide={() => setShowAccountModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Expense Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="accountName" className="mb-3">
              <Form.Label>Account Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Transport"
                value={accountForm.name}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, name: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAccountModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddAccount}
            disabled={savingAccount}
          >
            {savingAccount ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" /> Saving...
              </>
            ) : (
              "Save Account"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Expense Modal */}
      <Modal show={showExpenseModal} onHide={() => setShowExpenseModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Expense</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="accountSelect" className="mb-3">
              <Form.Label>Select Account</Form.Label>
              <Form.Select
                name="account"
                value={expenseForm.account}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, account: e.target.value })
                }
              >
                <option value="">-- Select Account --</option>
                {accounts.map((acc, i) => (
                  <option key={i} value={acc}>
                    {acc}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="description" className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                name="description"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    description: e.target.value,
                  })
                }
              />
            </Form.Group>

            <Form.Group controlId="amount" className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                name="amount"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, amount: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExpenseModal(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleAddExpense}
            disabled={savingExpense}
          >
            {savingExpense ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" /> Saving...
              </>
            ) : (
              "Save Expense"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Statement Modal (unchanged) */}
      <Modal
        show={showStatementModal}
        onHide={() => setShowStatementModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{selectedAccount} Account Statement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className="d-flex gap-3 mb-3 flex-wrap">
  <Form.Group controlId="dateFrom">
    <Form.Label>From (Date & Time)</Form.Label>
    <Form.Control
      type="datetime-local"
      value={dateFrom}
      onChange={(e) => setDateFrom(e.target.value)}
    />
  </Form.Group>

  <Form.Group controlId="dateTo">
    <Form.Label>To (Date & Time)</Form.Label>
    <Form.Control
      type="datetime-local"
      value={dateTo}
      onChange={(e) => setDateTo(e.target.value)}
    />
  </Form.Group>

  <div className="d-flex align-items-end">
    <Button variant="outline-secondary" onClick={handleDownloadPDF}>
      Download PDF
    </Button>
  </div>
          </Form>


          {accountExpenses.length === 0 ? (
            <p className="text-muted">No expenses recorded for this account.</p>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
  {accountExpenses.map((e, i) => {
    const formattedDateTime = e.createdAt
      ? new Date(e.createdAt.seconds * 1000).toLocaleString() // 👈 date + time
      : "—";

    return (
      <tr key={e.id}>
        <td>{i + 1}</td>
        <td>{e.description}</td>
        <td>${Number(e.amount).toLocaleString()}</td>
        <td>{formattedDateTime}</td>
      </tr>
    );
  })}

  <tr className="fw-bold">
    <td colSpan="2">Total</td>
    <td colSpan="2">
      ${getAccountTotal(selectedAccount).toLocaleString()}
    </td>
  </tr>
</tbody>

            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatementModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Master Report Modal */}
<Modal
  show={showMasterModal}
  onHide={() => setShowMasterModal(false)}
  centered
>
  <Modal.Header closeButton>
    <Modal.Title>Download Master Report</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form className="d-flex flex-wrap gap-3">
      <Form.Group controlId="masterDateFrom">
        <Form.Label>From (Date & Time)</Form.Label>
        <Form.Control
          type="datetime-local"
          value={masterDateFrom}
          onChange={(e) => setMasterDateFrom(e.target.value)}
        />
      </Form.Group>

      <Form.Group controlId="masterDateTo">
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
    >
      Download PDF
    </Button>
  </Modal.Footer>
</Modal>

    </div>
  );
};

export default Expenses;
