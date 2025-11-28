// =============================
// BankCash.js (Single File)
// With Firestore CRUD Inside
// =============================
import React, { useEffect, useState } from "react";
import {
  Button,
  Modal,
  Form,
  Spinner,
  Alert,
  Row,
  Col,
  Card
} from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy
} from "firebase/firestore";

import { auth } from "../firebaseConfig";
const db = getFirestore();

// ======================================================
// 🔥 FIRESTORE SERVICE FUNCTIONS (INSIDE SAME FILE)
// ======================================================



// ---------- GET ALL BANKS ----------
const getBanks = async () => {
  const snap = await getDocs(collection(db, "banks"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ---------- ADD BANK ----------
const addBank = async (data) => {
  return await addDoc(collection(db, "banks"), {
    ...data,
    currentBalance: Number(data.openingBalance || 0),
    createdAt: serverTimestamp(),
  });
};

// ---------- UPDATE BANK ----------
const updateBank = async (id, data) => {
  return await updateDoc(doc(db, "banks", id), data);
};

// ---------- DELETE BANK ----------
const deleteBank = async (id) => {
  return await deleteDoc(doc(db, "banks", id));
};

// ---------- GET BANK TRANSACTIONS ----------
const getBankTransactions = async (bankId) => {
  const ref = collection(db, "banks", bankId, "transactions");
  const q = query(ref, orderBy("createdAtClient", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ---------- GET BANK TRANSACTIONS BY DATE ----------
const getBankTransactionsByDate = async (bankId, from, to) => {
  const ref = collection(db, "banks", bankId, "transactions");

  const q = query(
    ref,
    where("createdAtClient", ">=", new Date(from + "T00:00:00")),
    where("createdAtClient", "<=", new Date(to + "T23:59:59")),
    orderBy("createdAtClient", "asc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ======================================================
// 🔥 ADD TRANSACTION (+ updates bank balances)
// ======================================================
const addBankTransaction = async (tx) => {
  const bankRef = doc(db, "banks", tx.bankId);
  const bankSnap = await getDoc(bankRef);

  if (!bankSnap.exists()) throw new Error("Bank not found");

  let currentBalance = bankSnap.data().currentBalance || 0;
  const amount = Number(tx.amount);

  let amountLeft = currentBalance;

  // ----------------------------------
  // Deposit
  // ----------------------------------
  if (tx.transactionType === "Deposit") {
    amountLeft = currentBalance + amount;
    await updateDoc(bankRef, { currentBalance: amountLeft });
  }

  

  // ----------------------------------
  // Withdrawal
  // ----------------------------------
  if (tx.transactionType === "Withdrawal") {
    amountLeft = currentBalance - amount;
    await updateDoc(bankRef, { currentBalance: amountLeft });
  }

  // ----------------------------------
  // Transfer (OUT + IN)
  // ----------------------------------
  if (tx.transactionType === "Transfer") {
    const toBankRef = doc(db, "banks", tx.transferToBankId);

    const toBankSnap = await getDoc(toBankRef);
    const toBankBalance = toBankSnap.data().currentBalance || 0;

    // OUT transaction
    const amountLeftOut = currentBalance - amount;
    await updateDoc(bankRef, { currentBalance: amountLeftOut });

    await addDoc(collection(db, "banks", tx.bankId, "transactions"), {
      bankId: tx.bankId,
      transactionType: "TransferOut",
      amount,
      description: tx.description,
      createdAtClient: serverTimestamp(),
      amountLeft: amountLeftOut,
      transferToBankId: tx.transferToBankId,
    });

    // IN transaction
    const amountLeftIn = toBankBalance + amount;
    await updateDoc(toBankRef, { currentBalance: amountLeftIn });

    await addDoc(collection(db, "banks", tx.transferToBankId, "transactions"), {
      bankId: tx.transferToBankId,
      transactionType: "TransferIn",
      amount,
      description: tx.description,
      createdAtClient: serverTimestamp(),
      amountLeft: amountLeftIn,
      transferFromBankId: tx.bankId,
    });

    return;
  }

  // ----------------------------------
  // WRITE NORMAL TRANSACTION
  // ----------------------------------
  return await addDoc(collection(db, "banks", tx.bankId, "transactions"), {
    ...tx,
    createdAtClient: serverTimestamp(),
    amountLeft,
  });
};

// ======================================================
// 🔥 UPDATE TRANSACTION — NOT SUPPORTED FULLY NOW
// (You should delete + recreate instead)
// ======================================================
const updateTransaction = async () => {
  alert("Editing transactions changes balances. Delete & re-add instead.");
};

// ---------- DELETE TRANSACTION ----------
const deleteTransaction = async (bankId, txId) => {
  return await deleteDoc(doc(db, "banks", bankId, "transactions", txId));
};
// =============================
// Part 2: React Component + UI
// (Place this below Part 1 functions in same file)
// =============================


const BankCash = () => {
  // UI state
  const [banks, setBanks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Statement modal state
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Transaction modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTransaction, setEditTransaction] = useState({
    id: "",
    bankId: "",
    transactionType: "",
    amount: "",
    description: "",
    date: "", // yyyy-mm-dd
    transferToBankId: "",
  });

  // Bank modal
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankToEdit, setBankToEdit] = useState(null);
  const [newBankName, setNewBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  // -----------------------
  // Utility: display createdAtClient as yyyy-mm-dd
  const displayDateYYYYMMDD = (d) => {
  if (!d) return "—";

  let dateObj;

  // Firestore Timestamp (v9)
  if (d?.seconds) {
    dateObj = new Date(d.seconds * 1000);
  }
  // If it's already a JS Date
  else if (d instanceof Date) {
    dateObj = d;
  }
  // If it's an ISO string
  else if (typeof d === "string") {
    dateObj = new Date(d);
  }
  // Anything else → try convert
  else {
    dateObj = new Date(d);
  }

  if (isNaN(dateObj.getTime())) return "—";

  // Format YYYY-MM-DD
  const date = dateObj.toISOString().split("T")[0];

  // Format HH:mm:ss
  const time = dateObj.toTimeString().split(" ")[0];

  return `${date} ${time}`;
};

  // -----------------------
  // Recompute balances & amountLeft for a bank (use openingBalance as starting)
  const recomputeBalances = async (bankId) => {
    try {
      const bankRef = doc(db, "banks", bankId);
      const bankSnap = await getDoc(bankRef);
      if (!bankSnap.exists()) return;

      const bankData = bankSnap.data();
      let balance = Number(bankData.openingBalance || 0);

      // fetch transactions sorted by createdAtClient ascending
      const txRef = collection(db, "banks", bankId, "transactions");
      const q = query(txRef, orderBy("createdAtClient", "asc"));
      const snap = await getDocs(q);

      // iterate and update each tx's amountLeft
      for (const docSnap of snap.docs) {
        const tx = { id: docSnap.id, ...(docSnap.data() || {}) };
        const amt = Number(tx.amount || 0);
        const type = (tx.transactionType || "").toLowerCase();

        if (type === "deposit" || type === "transferin") {
          balance += amt;
        } else if (type === "withdrawal" || type === "transferout") {
          balance -= amt;
        } else {
          // fallback
          if (type.includes("deposit")) balance += amt;
          else if (type.includes("withdrawal")) balance -= amt;
        }

        // update tx doc with computed amountLeft if different or missing
        const txDocRef = doc(db, "banks", bankId, "transactions", tx.id);
        const currentAmountLeft = tx.amountLeft;
        if (currentAmountLeft !== balance) {
          // update amountLeft
          await updateDoc(txDocRef, { amountLeft: balance });
        }
      }

      // after loop, update bank currentBalance
      await updateDoc(bankRef, { currentBalance: balance });
    } catch (e) {
      console.error("recomputeBalances error", e);
    }
  };

  // -----------------------
  // Load banks
  const loadBanks = async () => {
    setLoading(true);
    try {
      const list = await getBanks();
      setBanks(list);
    } catch (e) {
      console.error("loadBanks error", e);
      setError("Failed to load banks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------
  // Open statement modal and ensure amounts are up-to-date
  const openStatementModal = async (bank) => {
      setSelectedBank(bank);
      setShowStatementModal(true);
      setDateFrom("");
      setDateTo("");
      setTransactions([]); // <<< IMPORTANT – empty the table
      setError("");


    try {
      // ensure balances are consistent first
      await recomputeBalances(bank.id);

      // then fetch transactions (ordered by createdAtClient)
      //const txs = await getBankTransactions(bank.id);
      setTransactions([]);
    } catch (e) {
      console.error("openStatementModal error", e);
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };
  
  
  // -----------------------
  // Filter statement by createdAtClient (from/to are yyyy-mm-dd)
  const filterStatement = async () => {
  if (!dateFrom || !dateTo) {
    setError("Please select BOTH Date From and Date To.");
    return;
  }
  setError("");
  setLoading(true);

  try {
    await recomputeBalances(selectedBank.id);

    const txs = await getBankTransactionsByDate(
      selectedBank.id,
      dateFrom,
      dateTo
    );

    setTransactions(txs);
  } catch (e) {
    console.error("filterStatement error", e);
    setError("Failed to filter transactions.");
  } finally {
    setLoading(false);
  }
};

  // -----------------------
  // Save transaction (add)
  const handleSaveTransaction = async () => {
    if (!editTransaction.bankId || !editTransaction.transactionType || !editTransaction.amount) {
      setError("Please fill required fields.");
      return;
    }

    setError("");
    setSaving(true);
    setLoading(true);

    try {
      const payload = {
        bankId: editTransaction.bankId,
        transactionType: editTransaction.transactionType,
        amount: Number(editTransaction.amount),
        description: editTransaction.description || "",
        date: editTransaction.date || displayDateYYYYMMDD(new Date()),
        transferToBankId: editTransaction.transferToBankId || "",
      };

      // Add transaction(s) and update balances inside addBankTransaction function
      await addBankTransaction(payload);

      // If transfer, recompute both banks to ensure amountLeft & currentBalance consistent
      if (payload.transactionType === "Transfer") {
        await recomputeBalances(payload.bankId);
        if (payload.transferToBankId) await recomputeBalances(payload.transferToBankId);
      } else {
        await recomputeBalances(payload.bankId);
      }

      setShowTxModal(false);
      setEditTransaction({
        id: "",
        bankId: "",
        transactionType: "",
        amount: "",
        description: "",
        date: "",
        transferToBankId: "",
      });

      // refresh statement if open for this bank
      if (selectedBank && selectedBank.id === payload.bankId) {
        const txs = await getBankTransactions(selectedBank.id);
        setTransactions(txs);
        // also reload banks to show updated balances
        await loadBanks();
      } else {
        await loadBanks();
      }
    } catch (e) {
      console.error("handleSaveTransaction error", e);
      setError("Failed to save transaction: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  // -----------------------
  // Delete transaction (and recompute)
  const handleDeleteTx = async (tx) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(tx.bankId, tx.id);

      // If transfer, try to delete counterpart by searching related bank transactions with same createdAtClient, amount and relation
      if (tx.transferToBankId) {
        // it was a TransferOut; counterpart should be a TransferIn in transferToBankId
        // attempt to find and delete matching tx in other bank
        const otherTxs = await getBankTransactions(tx.transferToBankId);
        const match = otherTxs.find(
          (o) =>
            Number(o.amount) === Number(tx.amount) &&
            o.transactionType.toLowerCase().includes("transferin") &&
            displayDateYYYYMMDD(o.createdAtClient || o.createdAt || o.createdAtClient) ===
              displayDateYYYYMMDD(tx.createdAtClient || tx.createdAt || tx.createdAtClient)
        );
        if (match) {
          await deleteTransaction(tx.transferToBankId, match.id);
        }
      } else if (tx.transferFromBankId) {
        // it was a TransferIn; counterpart is in transferFromBankId
        const otherTxs = await getBankTransactions(tx.transferFromBankId);
        const match = otherTxs.find(
          (o) =>
            Number(o.amount) === Number(tx.amount) &&
            o.transactionType.toLowerCase().includes("transferout") &&
            displayDateYYYYMMDD(o.createdAtClient || o.createdAt || o.createdAtClient) ===
              displayDateYYYYMMDD(tx.createdAtClient || tx.createdAt || tx.createdAtClient)
        );
        if (match) {
          await deleteTransaction(tx.transferFromBankId, match.id);
        }
      }

      // recompute balances for affected banks
      await recomputeBalances(tx.bankId);
      if (tx.transferToBankId) await recomputeBalances(tx.transferToBankId);
      if (tx.transferFromBankId) await recomputeBalances(tx.transferFromBankId);

      // refresh UI
      if (selectedBank) {
        const txs = await getBankTransactions(selectedBank.id);
        setTransactions(txs);
      }
      await loadBanks();
    } catch (e) {
      console.error("handleDeleteTx error", e);
      setError("Failed to delete transaction.");
    }
  };

  

  // -----------------------
  // Save bank (add or update)
  const handleSaveBank = async () => {
    if (!newBankName.trim()) return alert("Enter bank name");

    try {
      if (bankToEdit?.id) {
        await updateBank(bankToEdit.id, {
          bankName: newBankName,
          accountNumber: accountNumber || "",
        });
      } else {
        setLoading(true);
        // create with openingBalance and set currentBalance = openingBalance
        await addBank({
          bankName: newBankName,
          accountNumber: accountNumber || "",
          openingBalance: Number(openingBalance || 0),
        });
      }

      setShowBankModal(false);
      setNewBankName("");
      setAccountNumber("");
      setOpeningBalance("");
      setBankToEdit(null);

      await loadBanks();
    } catch (e) {
      console.error("handleSaveBank error", e);
      setError("Failed to save bank.");
    }
  };

  const handleDeleteBank = async (bank) => {
    if (!window.confirm("Delete this bank?")) return;
    try {
      // WARNING: this only removes bank doc. Deleting subcollection requires manual batched deletes.
      await deleteBank(bank.id);
      await loadBanks();
    } catch (e) {
      console.error("handleDeleteBank error", e);
      setError("Failed to delete bank.");
    }
  };

  
  // =========================
// PDF Download
// =========================
const downloadPDF = () => {
  if (!transactions || transactions.length === 0) {
    alert("No transactions to export.");
    return;
  }

  const doc = new jsPDF("landscape");

  // ------------------------
  // Add logo at the top
  // ------------------------
  const logoImg = new Image();
  logoImg.src = companyData.logo; // your logo path
  logoImg.onload = () => {
    // Draw logo at the top-left corner
    doc.addImage(logoImg, "PNG", 10, 10, 40, 20); // x, y, width, height

    // ------------------------
    // Header
    // ------------------------
    doc.setFontSize(16);
    doc.text(`${selectedBank.bankName} – Statement`, 60, 20); // shifted right of logo

    doc.setFontSize(12);
    doc.text(`From: ${dateFrom}    To: ${dateTo}`, 60, 28);

    // ------------------------
    // Table
    // ------------------------
    const rows = transactions.map((tx) => [
      displayDateYYYYMMDD(tx.createdAtClient || tx.createdAt),
      tx.description,
      tx.transactionType,
      Number(tx.amount).toLocaleString(),
      Number(tx.amountLeft).toLocaleString(),
    ]);

    // ✅ Use autoTable function, not doc.autoTable
  autoTable(doc, {
    startY: 30,
    head: [["Date", "Description", "Type", "Amount (UGX)", "Amount Left (UGX)"]],
    body: rows,
  });

    // ------------------------
    // Closing Balance
    // ------------------------
    const closingBalance = Number(transactions[transactions.length - 1].amountLeft).toLocaleString();
    doc.text(`Closing Balance: UGX ${closingBalance}`, 14, doc.lastAutoTable.finalY + 10);

    doc.save(`${selectedBank.bankName}_Statement.pdf`);
  };
};


const [companyData, setCompanyData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    logo: "",
  });

  // 🔹 Fetch saved settings from Firestore
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "company"));
        if (settingsDoc.exists()) {
          setCompanyData(settingsDoc.data());
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    fetchSettings();
  }, []);


  // -----------------------
  // Render
  return (
    <div className="container mt-4">
      <h2 className="mb-3">Bank & Cash Management</h2>

      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}

      <Row>
        <Col md={12}>
          <Card style={{ minHeight: "85vh" }}>
            <Card.Header>
              <b>| </b>
              <Button
                size="sm"
                className="float"
                onClick={() => {
                  setShowBankModal(true);
                  setBankToEdit(null);
                  setNewBankName("");
                  setAccountNumber("");
                  setOpeningBalance("");
                  
                }}
              >
                + Add Bank
              </Button>
            </Card.Header>
            <Card.Footer className="text-center">
              <Button
                variant="dark"
                className="px-4"
                onClick={() => {
                  setEditTransaction({
                    id: "",
                    bankId: "",
                    transactionType: "",
                    amount: "",
                    description: "",
                    date: "",
                    transferToBankId: "",
                  });
                  setShowTxModal(true);
                }}
              >
                Make Transaction
              </Button>
            </Card.Footer>

            <Card.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
              {loading ? (
                <div className="text-center">
                  <Spinner />
                </div>
              ) : banks.length === 0 ? (
                <p className="text-center text-muted">No banks found.</p>
              ) : (
                banks.map((bank) => (
                  <div key={bank.id} className="p-3 border mb-3 rounded">
                    <h5 className="m-0">{bank.bankName}</h5>
                    <div className="small text-muted">{bank.accountNumber}</div>
                    <div className="small mt-1">
                     {/*} Opening Balance: UGX {Number(bank.openingBalance || 0).toLocaleString()}*/}
                    </div>
                    <div className="small mb-2">
                      Current Balance: UGX {Number(bank.currentBalance || 0).toLocaleString()}
                    </div>

                    <div className="mt-2 d-flex justify-content-between">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => openStatementModal(bank)}
                      >
                        See Statement
                      </Button>

                      <div>
                        <Button
                          size="sm"
                          variant="warning"
                          className="me-2"
                          onClick={() => {
                            setBankToEdit(bank);
                            setNewBankName(bank.bankName);
                            setAccountNumber(bank.accountNumber || "");
                            setOpeningBalance(bank.openingBalance || 0);
                            setShowBankModal(true);
                          }}
                        >
                          Edit
                        </Button>

                        <Button size="sm" variant="danger" onClick={() => handleDeleteBank(bank)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </Card.Body>

            
          </Card>
        </Col>
      </Row>

      {/* =========================
          Statement Modal
      ========================== */}
      <Modal
        show={showStatementModal}
        onHide={() => setShowStatementModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedBank ? `${selectedBank.bankName} Statement` : "Statement"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Label>Date From</Form.Label>
              <Form.Control
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Date To</Form.Label>
              <Form.Control
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </Col>
          </Row>

          <Button 
  className="w-100 mt-3" 
  onClick={filterStatement} 
  disabled={loading} // disable while loading
>
  {loading ? <Spinner size="sm" /> : "Filter Statement"}
</Button>


          <div className="mt-4">
            {loading ? (
              <div className="text-center">
                <Spinner />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-muted mt-3">No transactions found.</p>
            ) : (
              <>
                <div className="mb-3 fw-bold">
                {/*}  Opening Balance: UGX {Number(getFilteredOpeningBalance(transactions, selectedBank?.openingBalance || 0)).toLocaleString()}
}*/}
                </div>

                <table className="table table-bordered table-striped">
                  <thead className="table-dark">
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th className="text-end">Amount (UGX)</th>
                      <th className="text-end">Amount Left (UGX)</th>
                     {/*} <th>Actions</th>*/}
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{displayDateYYYYMMDD(tx.createdAtClient || tx.createdAt || tx.createdAtClient)}</td>
                        <td>{tx.description}</td>
                        <td>{tx.transactionType}</td>
                        <td className="text-end">{Number(tx.amount).toLocaleString()}</td>
                        <td className="text-end fw-bold">{Number(tx.amountLeft || 0).toLocaleString()}</td>
                     {/*} <td>
                          <Button
                            size="sm"
                            variant="warning"
                            className="me-2"
                            onClick={() => {
                              // prepare editTransaction for user (editing is discouraged)
                              const d = tx.createdAtClient ? new Date(tx.createdAtClient) : new Date();
                              const dateStr = d.toISOString().split("T")[0];

                              setEditTransaction({
                                id: tx.id,
                                bankId: tx.bankId,
                                transactionType:
                                  tx.transactionType === "TransferOut" || tx.transactionType === "TransferIn"
                                    ? "Transfer"
                                    : tx.transactionType,
                                amount: tx.amount,
                                description: tx.description,
                                date: dateStr,
                                transferToBankId: tx.transferToBankId || tx.transferFromBankId || "",
                              });

                              setShowTxModal(true);
                            }}
                          >
                            Edit
                          </Button>

                          <Button size="sm" variant="danger" onClick={() => handleDeleteTx(tx)}>
                            Delete
                          </Button>
                        </td>*/}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-3 fw-bold">
                  Closing Balance: UGX {Number(transactions[transactions.length - 1].amountLeft ).toLocaleString()}
                </div>
              </>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatementModal(false)}>
            Close
          </Button>
          <Button
  variant="success"
  disabled={!dateFrom || !dateTo || transactions.length === 0 || loading} // add loading check
  onClick={downloadPDF}
>
  {loading ? <Spinner size="sm" /> : "Download Statement PDF"}
</Button>


        </Modal.Footer>
      </Modal>

      {/* =========================
          Add / Edit Transaction Modal
      ========================== */}
      <Modal show={showTxModal} onHide={() => setShowTxModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editTransaction.id ? "Edit Transaction" : "Add Transaction"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Label>Bank</Form.Label>
            <Form.Select
              value={editTransaction.bankId}
              onChange={(e) => setEditTransaction({ ...editTransaction, bankId: e.target.value })}
            >
              <option value="">Select Bank</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.bankName}
                </option>
              ))}
            </Form.Select>

            <Form.Label className="mt-2">Type</Form.Label>
            <Form.Select
              value={editTransaction.transactionType}
              onChange={(e) => setEditTransaction({ ...editTransaction, transactionType: e.target.value })}
            >
              <option value="">Select</option>
              <option value="Deposit">Deposit</option>
              <option value="Withdrawal">Withdrawal</option>
              <option value="Transfer">Transfer</option>
            </Form.Select>

            {editTransaction.transactionType === "Transfer" && (
              <>
                <Form.Label className="mt-2">Transfer To Bank</Form.Label>
                <Form.Select
                  value={editTransaction.transferToBankId}
                  onChange={(e) => setEditTransaction({ ...editTransaction, transferToBankId: e.target.value })}
                >
                  <option value="">Choose Bank</option>
                  {banks
                    .filter((b) => b.id !== editTransaction.bankId)
                    .map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName}
                      </option>
                    ))}
                </Form.Select>
              </>
            )}

            <Form.Label className="mt-2">Amount</Form.Label>
            <Form.Control
              type="number"
              value={editTransaction.amount}
              onChange={(e) => setEditTransaction({ ...editTransaction, amount: e.target.value })}
            />

            <Form.Label className="mt-2">Description</Form.Label>
            <Form.Control
              type="text"
              value={editTransaction.description}
              onChange={(e) => setEditTransaction({ ...editTransaction, description: e.target.value })}
            />

           {/*} <Form.Label className="mt-2">Date</Form.Label>
            <Form.Control
              type="date"
              value={editTransaction.date}
              onChange={(e) => setEditTransaction({ ...editTransaction, date: e.target.value })}
            />
            <Form.Text className="text-muted">Date used for createdAtClient and filtering (yyyy-mm-dd)</Form.Text>*/}
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTxModal(false)}>
            Close
          </Button>

          <Button  variant="primary" disabled={loading} onClick={handleSaveTransaction}>
            {loading ? <Spinner size="sm" /> : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* =========================
          Bank Modal
      ========================== */}
      <Modal show={showBankModal} onHide={() => setShowBankModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{bankToEdit ? "Edit Bank" : "Add Bank"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Label>Bank Name</Form.Label>
          <Form.Control value={newBankName} onChange={(e) => setNewBankName(e.target.value)} />

          {!bankToEdit && (
            <>
              <Form.Label className="mt-2">Account Number</Form.Label>
              <Form.Control value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />

              <Form.Label className="mt-2">Opening Balance</Form.Label>
              <Form.Control type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowBankModal(false);
              setBankToEdit(null);
              setNewBankName("");
              setOpeningBalance("");
            }}
          >
            Close
          </Button>

          <Button variant="primary"  disabled={loading}  onClick={handleSaveBank}>
           {loading ? <Spinner size="sm" /> : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BankCash;
