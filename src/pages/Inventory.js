// src/pages/Inventory.js
import React, { useState, useEffect } from "react";
import {
  Button,
  Modal,
  Form,
  Table,
  Spinner,
  Alert,
  Card,
  Row,
  Col,
  Badge,
  InputGroup,
} from "react-bootstrap";
import { getAllProducts, updateProduct } from "../services/productService";
import { getAllTransactions } from "../services/transactionService";
import {  addTransaction, savePendingStock, getPendingStock, deletePendingStock, deleteTransaction } from "../services/transactionService";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  setDoc
} from "firebase/firestore";
import { db } from "../firebaseConfig";
//import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// PDF libs (make sure these are installed in your project)
// npm i jspdf jspdf-autotable
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * ====== IMPORTANT ======
 * Add your logo Base64 / Data URL here (e.g. 'data:image/png;base64,iVBORw0K...').
 * If you prefer to add the logo manually later, leave this as an empty string.
 */
const companyLogoDataUrl = ""; // <-- PASTE YOUR LOGO DATA URL / BASE64 HERE

const Inventory = () => {
  // core lists & UI
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [activeTab, setActiveTab] = useState("inventory");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // add product modal
  const [showAddProductOnlyModal, setShowAddProductOnlyModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");

  // receive modal & state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [receivedProducts, setReceivedProducts] = useState([
    { productId: "", quantity: 0, price: 0, total: 0 },
  ]);

  const [selectedGRN, setSelectedGRN] = useState(null);
  const [savingTransaction, setSavingTransaction] = useState(false);

  // requests state (product_requests collection)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestItems, setRequestItems] = useState([{ productId: "", quantity: 0 }]);
  const [pendingRequests, setPendingRequests] = useState([]); // pending
  const [rejectedRequests, setRejectedRequests] = useState([]); // rejected
  const [selectedProductRequests, setSelectedProductRequests] = useState(null); // pending for product
  const [selectedRejectedForProduct, setSelectedRejectedForProduct] = useState(null); // rejected for product
  // Product Statement date filter
  const [statementFromDate, setStatementFromDate] = useState("");
  const [statementToDate, setStatementToDate] = useState("");

  const [approving, setApproving] = useState(false);

  // product statement modal
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementProduct, setStatementProduct] = useState(null);
  const [productMovements, setProductMovements] = useState([]);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // reject modal (asks free-text reason)
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectReasonText, setRejectReasonText] = useState("");

  // ----------------------- Load Data -----------------------
  useEffect(() => {
    loadProducts();
    loadSuppliers();
    loadDeliveries();
    loadRequests(); // loads both pending & rejected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const result = await getAllProducts();
      if (result.success) setProducts(result.data);
      else setError(result.error || "Failed to load products");
    } catch (err) {
      console.error(err);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const result = await getAllTransactions();
      if (result.success) {
        const allInvoices = result.data.filter((t) => t.type === "Supplier");
        const supplierNames = [...new Set(allInvoices.map((t) => t.supplier))];
        setSuppliers(supplierNames);
      }
    } catch (err) {
      console.error("loadSuppliers err", err);
    }
  };

  const loadDeliveries = async () => {
    try {
      const snap = await getDocs(collection(db, "supplier_deliveries"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDeliveries(data);
    } catch (err) {
      console.error("loadDeliveries", err);
    }
  };

  // loads both pending and rejected requests
  const loadRequests = async () => {
    try {
      const snap = await getDocs(collection(db, "product_requests"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPendingRequests(data.filter((r) => r.status === "pending"));
      setRejectedRequests(data.filter((r) => r.status === "rejected"));
    } catch (err) {
      console.error("loadRequests", err);
    }
  };

  // ----------------------- Add Product Only -----------------------
  const addProductNameOnly = async () => {
  if (!newProductName.trim()) return alert("Product name is required.");

  try {
    setSavingTransaction(true);

    // 1️⃣ Add product
    const productRef = await addDoc(collection(db, "products"), {
      name: newProductName.trim(),
      quantity: 0,
      price: 0,
      createdAt: serverTimestamp(),
    });

    const productId = productRef.id;

    // 2️⃣ Create matching PRODUCTION doc using SAME PRODUCT ID
    await setDoc(doc(db, "production", productId), {
      productId,
      name: newProductName.trim(),
      totalApproved: 0,
      lastApprovedQty: 0,
      totalProcessed: 0,
      totalRejected: 0,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    });

    setNewProductName("");
    setShowAddProductOnlyModal(false);

    await loadProducts();

    alert("Product added successfully and production initialized!");
  } catch (err) {
    console.error(err);
    alert("Error adding product.");
  } finally {
    setSavingTransaction(false);
  }
};


  // ----------------------- Receive Products -----------------------
  const addRow = () => {
    setReceivedProducts([
      ...receivedProducts,
      { productId: "", quantity: 0, price: 0, total: 0 },
    ]);
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...receivedProducts];
    updated[index][field] = value;

    if (field === "price" || field === "quantity") {
      const price = Number(updated[index].price);
      const qty = Number(updated[index].quantity);
      updated[index].total = price * qty;
    }

    setReceivedProducts(updated);
  };

  const grandTotal = receivedProducts.reduce((sum, p) => sum + (p.total || 0), 0);

  // ----------------------- Generate GRN Number -----------------------
  const generateGRNNumber = () => {
    if (!deliveries || deliveries.length === 0) return "GRN-00001";

    const lastDelivery = deliveries[deliveries.length - 1];
    const lastGRN = lastDelivery?.grnNumber;

    if (!lastGRN) return "GRN-00001";

    const lastNumber = parseInt(lastGRN.split("-")[1]);
    const newNumber = (lastNumber + 1).toString().padStart(5, "0");
    return `GRN-${newNumber}`;
  };

  ///////////////
  const handleSaveReceived = async () => {
  if (!selectedSupplier) {
    setError("Please select a supplier");
    return;
  }

  for (let item of receivedProducts) {
    if (!item.productId || !item.price || !item.quantity) {
      setError("Please fill out all product fields");
      return;
    }
  }

  try {
    setSavingTransaction(true);

    // Generate GRN number but store it pending
    const grnNumber = generateGRNNumber();

    // Save each product as a pending confirmation entry
    for (let item of receivedProducts) {
      const product = products.find((p) => p.id === item.productId);

      await addDoc(collection(db, "pendingStockReceives"), {
        supplier: selectedSupplier,
        grnNumber,
        productId: item.productId,
        productName: product?.name ?? "",
        price: Number(item.price),
        quantity: Number(item.quantity),
        total: Number(item.total),
        note: `Pending GRN ${grnNumber}`,
        createdAt: serverTimestamp(),
      });
    }

    // Reset UI
    setShowReceiveModal(false);
    setSelectedSupplier("");
    setReceivedProducts([{ productId: "", quantity: 0, price: 0, total: 0 }]);

    alert(`Stock saved for confirmation. GRN: ${grnNumber}`);

  } catch (err) {
    console.error(err);
    alert("Error saving pending received products.");
  } finally {
    setSavingTransaction(false);
  }
};



  // ----------------------- Save Received Products -----------------------
  {/*const handleSaveReceived = async () => {
    if (!selectedSupplier) {
      setError("Please select a supplier");
      return;
    }

    for (let item of receivedProducts) {
      if (!item.productId || !item.price || !item.quantity) {
        setError("Please fill out all product fields");
        return;
      }
    }

    try {
      setSavingTransaction(true);

      // create a single GRN number for the whole receiving operation
      const grnNumber = generateGRNNumber();

      for (let item of receivedProducts) {
        const existing = products.find((p) => p.id === item.productId);
        const newQuantity = Number(existing?.quantity ?? 0) + Number(item.quantity);

        // update product quantity (use your helper if available)
        try {
          await updateProduct(item.productId, {
            ...existing,
            quantity: newQuantity,
            price: item.price,
          });
        } catch (err) {
          await updateDoc(doc(db, "products", item.productId), {
            quantity: newQuantity,
            price: item.price,
          });
        }

        // write movement (type: in)
        await addDoc(collection(db, "inventoryMovements"), {
          productId: item.productId,
          type: "in",
          quantity: Number(item.quantity),
          note: `GRN ${grnNumber}`,
          createdAt: serverTimestamp(),
        });
      }

      await addDoc(collection(db, "supplier_deliveries"), {
        supplier: selectedSupplier,
        date: new Date().toISOString().split("T")[0],
        items: receivedProducts.map((item) => {
          const prod = products.find((p) => p.id === item.productId);
          return {
            productId: item.productId,
            productName: prod?.name ?? "",
            price: Number(item.price),
            quantity: Number(item.quantity),
            total: Number(item.total),
          };
        }),
        grandTotal,
        grnNumber,
        createdAt: serverTimestamp(),
      });

      await loadProducts();
      await loadDeliveries();
      await loadRequests(); // update requests counts
      setShowReceiveModal(false);
      setSelectedSupplier("");
      setReceivedProducts([{ productId: "", quantity: 0, price: 0, total: 0 }]);
      alert(`Products received successfully! GRN: ${grnNumber}`);
    } catch (err) {
      console.error(err);
      alert("Error saving received products.");
    } finally {
      setSavingTransaction(false);
    }
  };*/}
  ////////////

  const loadProductStatement = async () => {
  if (!statementProduct) return;
  if (!statementFromDate || !statementToDate) return alert("Please select both dates.");

  setLoadingStatement(true);
  setProductMovements([]);

  try {
    const from = new Date(statementFromDate);
    const to = new Date(statementToDate);
    to.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "inventoryMovements"),
      where("productId", "==", statementProduct.id),
      where("createdAt", ">=", from),
      where("createdAt", "<=", to),
      orderBy("createdAt", "asc")
    );

    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    let balance = 0;
    const withBalance = data.map((m) => {
      if (m.type === "in") balance += Number(m.quantity || 0);
      else if (m.type === "out") balance -= Number(m.quantity || 0);
      return { ...m, balanceAfter: balance };
    });

    setProductMovements(withBalance.reverse()); // newest first
  } catch (err) {
    console.error("Error loading product statement", err);
    alert("Error loading statement");
  } finally {
    setLoadingStatement(false);
  }
};


  // ----------------------- Ledger -----------------------
  const computeLedger = () => {
    const ledger = {};
    deliveries.forEach((d) => {
      if (!ledger[d.supplier]) ledger[d.supplier] = 0;
      ledger[d.supplier] += d.grandTotal ?? 0;
    });
    return ledger;
  };
  const supplierLedger = computeLedger();

  // ----------------------- Request handling -----------------------
  const addRequestRow = () => {
    setRequestItems([...requestItems, { productId: "", quantity: 0 }]);
  };

  const handleRequestRowChange = (index, field, value) => {
    const tmp = [...requestItems];
    tmp[index][field] = field === "quantity" ? Number(value) : value;
    setRequestItems(tmp);
  };

  const submitRequests = async () => {
  try {
    // validation
    for (const r of requestItems) {
      if (!r.productId || !r.quantity || r.quantity <= 0) {
        alert("Please select product and enter a quantity greater than 0 for all request rows.");
        return;
      }
    }

    // 🔥 CHECK IF REQUESTED QTY > AVAILABLE STOCK
    for (const r of requestItems) {
      const prod = products.find((p) => p.id === r.productId);
      const inStock = Number(prod?.quantity || 0);

      if (Number(r.quantity) > inStock) {
        alert(
          `ERROR: You are requesting ${r.quantity} units of "${prod.name}" but only ${inStock} are in stock.`
        );
        return; // ❌ stop submission
      }
    }

    setSavingTransaction(true);

    for (const r of requestItems) {
      await addDoc(collection(db, "product_requests"), {
        productId: r.productId,
        quantity: Number(r.quantity),
        status: "pending",
        createdAt: serverTimestamp(),
      });
    }

    setShowRequestModal(false);
    setRequestItems([{ productId: "", quantity: 0 }]);
    await loadRequests();
    alert("Request(s) submitted successfully.");
  } catch (err) {
    console.error("Error submitting requests", err);
    alert("Failed to submit requests.");
  } finally {
    setSavingTransaction(false);
  }
};


  // Approve all pending requests for the selected product
  //import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const approveAllForProduct = async (productId) => {
  try {
    setApproving(true);

    const toApprove = pendingRequests.filter((r) => r.productId === productId);
    if (!toApprove.length) {
      alert("No pending requests for this product.");
      setApproving(false);
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) {
      alert("Product not found.");
      setApproving(false);
      return;
    }

    const totalRequested = toApprove.reduce(
      (s, r) => s + (Number(r.quantity) || 0),
      0
    );

    let oldStock = Number(prod.quantity || 0);
    let newStock = oldStock - totalRequested;
    let shortfall = 0;

    if (newStock < 0) {
      shortfall = Math.abs(newStock);
      newStock = 0;
    }

    const approvedAmount = totalRequested - shortfall;

    // UPDATE STOCK
    await updateDoc(doc(db, "products", productId), {
      quantity: newStock,
    });

    // UPDATE PRODUCTION COLLECTION
    const productionRef = doc(db, "production", productId);
    const existingProd = await getDoc(productionRef);

    if (existingProd.exists()) {
      await updateDoc(productionRef, {
        totalApproved:
          (existingProd.data().totalApproved || 0) + approvedAmount,
        lastApprovedQty: approvedAmount,
        lastUpdated: serverTimestamp(),
      });
    } else {
      await setDoc(productionRef, {
        productId,
        totalApproved: approvedAmount,
        lastApprovedQty: approvedAmount,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
    }

    // ⭐ ADD SUBCOLLECTION TRANSACTION
    const subRef = collection(db, "production", productId, "transactions");
    await addDoc(subRef, {
      type: "approve-all",
      quantity: "-",
      requested: totalRequested,
      shortfall,
      oldStock,
      balanceAfter: (existingProd.data().totalApproved || 0) + approvedAmount,
      createdAt: serverTimestamp(),
    });

    // MARK REQUESTS APPROVED
    for (const r of toApprove) {
      await updateDoc(doc(db, "product_requests", r.id), {
        status: "approved",
        approvedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "inventoryMovements"), {
        productId: r.productId,
        type: "out",
        quantity: Number(r.quantity),
        note: `Approved request ${r.id}`,
        requestId: r.id,
        createdAt: serverTimestamp(),
      });
    }

    await loadProducts();
    await loadRequests();
    setSelectedProductRequests(null);

    alert(`Approved ${approvedAmount} units.`);
  } catch (err) {
    console.error("Error approving requests", err);
    alert("Failed to approve requests.");
  } finally {
    setApproving(false);
  }
};




  // Approve single request
const approveSingleRequest = async (request) => {
  try {
    setApproving(true);

    const prod = products.find((p) => p.id === request.productId);
    if (!prod) {
      alert("Product not found.");
      setApproving(false);
      return;
    }

    const qty = Number(request.quantity || 0);

    let oldStock = Number(prod.quantity || 0);
    let newStock = oldStock - qty;
    let shortfall = 0;

    if (newStock < 0) {
      shortfall = Math.abs(newStock);
      newStock = 0;
    }

    const approvedAmount = qty - shortfall;

    // UPDATE PRODUCT STOCK
    await updateDoc(doc(db, "products", prod.id), {
      quantity: newStock,
    });

    // UPDATE PRODUCTION MAIN COLLECTION
    const productionRef = doc(db, "production", request.productId);
    const existing = await getDoc(productionRef);

    if (existing.exists()) {
      await updateDoc(productionRef, {
        totalApproved:
          (existing.data().totalApproved || 0) + approvedAmount,
        lastApprovedQty: approvedAmount,
        lastUpdated: serverTimestamp(),
      });
    } else {
      await setDoc(productionRef, {
        productId: request.productId,
        totalApproved: approvedAmount,
        lastApprovedQty: approvedAmount,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
    }

    // ⭐ ADD SUBCOLLECTION TRANSACTION
    const subRef = collection(
      db,
      "production",
      request.productId,
      "transactions"
    );

    await addDoc(subRef, {
      type: "approve-single",
      quantity: "-",
      requestId: request.id,
      requested: qty,
      shortfall,
      oldStock,
      balanceAfter: (existing.data().totalApproved || 0) + approvedAmount,
      createdAt: serverTimestamp(),
    });

    // UPDATE REQUEST
    await updateDoc(doc(db, "product_requests", request.id), {
      status: "approved",
      approvedAt: serverTimestamp(),
    });

    // MOVEMENT LOG
    await addDoc(collection(db, "inventoryMovements"), {
      productId: request.productId,
      type: "out",
      quantity: approvedAmount,
      note: `Approved request ${request.id}`,
      requestId: request.id,
      createdAt: serverTimestamp(),
    });

    await loadProducts();
    await loadRequests();
    setSelectedProductRequests(null);

    alert(`Approved ${approvedAmount}`);
  } catch (err) {
    console.error("Error approving single request", err);
    alert("Failed to approve request.");
  } finally {
    setApproving(false);
    
  }
};




  // ----------------------- Reject handling -----------------------
  const openRejectModal = (request) => {
    setRejectingRequest(request);
    setRejectReasonText("");
    setShowRejectReasonModal(true);
  };

  const submitReject = async () => {
    if (!rejectingRequest) return;
    try {
      if (!rejectReasonText.trim()) {
        alert("Please enter a reason for rejection.");
        return;
      }

      await updateDoc(doc(db, "product_requests", rejectingRequest.id), {
        status: "rejected",
        reason: rejectReasonText,
        rejectedAt: serverTimestamp(),
      });

      // reload
      await loadRequests();
      setShowRejectReasonModal(false);
      setRejectingRequest(null);
      alert("Request rejected.");
    } catch (err) {
      console.error("Error rejecting", err);
      alert("Failed to reject request.");
    }
  };

  // ----------------------- Product Statement (movements) -----------------------
  const openProductStatement = async (product) => {
    setStatementProduct(product);
    setShowStatementModal(true);
    setProductMovements([]);
    setLoadingStatement(true);

    try {
      // Firestore index safe approach: order by createdAt and filter in JS
      const q = query(collection(db, "inventoryMovements"), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);

      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((m) => m.productId === product.id);

      // compute running balance
      let balance = 0;
      const withBalance = data.map((m) => {
        if (m.type === "in") balance += Number(m.quantity || 0);
        else if (m.type === "out") balance -= Number(m.quantity || 0);
        return {
          ...m,
          balanceAfter: balance,
        };
      });

      // newest first for display
      setProductMovements(withBalance.reverse());
    } catch (err) {
      console.error("Error loading product statement", err);
    } finally {
      // Reset everything
         setProductMovements([]);
         setStatementFromDate(""); 
         setStatementToDate("");
         setLoadingStatement(false);
      
    }
  };

  // view rejected requests for a product
  const openRejectedRequestsForProduct = (product) => {
    const list = rejectedRequests.filter((r) => r.productId === product.id);
    setSelectedRejectedForProduct(list);
  };

  // ----------------------- PDF Generation -----------------------
  const downloadStatementPDF = async () => {
  if (!statementProduct) return alert("No product selected.");

  if (!statementFromDate || !statementToDate) {
    return alert("Please select both From and To dates.");
  }

  const from = new Date(statementFromDate);
  const to = new Date(statementToDate);
  // include entire day for To date
  to.setHours(23, 59, 59, 999);

  // Filter movements by date
  const filteredMovements = productMovements.filter((m) => {
    const mDate = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
    return mDate >= from && mDate <= to;
  });

  if (!filteredMovements.length) return alert("No movements found in selected date range.");

  // Prepare table rows
  const rows = filteredMovements
    .slice() // oldest first
    .reverse()
    .map((m) => {
      const dateText = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : m.createdAt || "";
      const typeText = m.type === "in" ? "Received" : m.type === "out" ? "Issued/Approved" : m.type;
      const qtyText = m.type === "in" ? `+${m.quantity}` : `-${m.quantity}`;
      return [dateText, typeText, qtyText, m.balanceAfter, m.note || ""];
    });

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginLeft = 40;
  let cursor = 40;

  // Add logo if exists
  if (companyLogoDataUrl) {
    try {
      doc.addImage(companyLogoDataUrl, "PNG", marginLeft, cursor, 120, 40);
    } catch (e) {
      try { doc.addImage(companyLogoDataUrl, "JPEG", marginLeft, cursor, 120, 40); } catch {}
    }
  }

  const headerX = marginLeft + (companyLogoDataUrl ? 140 : 0);
  doc.setFontSize(14);
  doc.text("F SONKO UGANGA Ltd.", headerX, cursor + 20);
  doc.setFontSize(11);
  doc.text(`Product Statement - ${statementProduct.name}`, headerX, cursor + 40);
  doc.setFontSize(10);
  doc.text(`Current Stock: ${statementProduct.quantity ?? 0}`, headerX, cursor + 56);
  doc.text(`From: ${statementFromDate} To: ${statementToDate}`, headerX, cursor + 70);

  cursor += 90;

  autoTable(doc,{
    startY: cursor,
    head: [["Date", "Type", "Qty", "Balance", "Note"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 144, 255], textColor: 255 },
    didParseCell: function (data) {
      if (data.section === "body") {
        const qtyCell = data.row.raw[2];
        if (qtyCell.startsWith("+")) data.cell.styles.textColor = [0, 128, 0];
        else if (qtyCell.startsWith("-")) data.cell.styles.textColor = [200, 0, 0];
      }
    },
    margin: { left: marginLeft, right: 40 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 100 },
      2: { cellWidth: 60 },
      3: { cellWidth: 60 },
      4: { cellWidth: 180 },
    },
  });

  const finalY = doc.lastAutoTable.finalY || cursor + 20;
  doc.setFontSize(10);
  doc.text("Received By: ____________________", marginLeft, finalY + 40);
  doc.text("Authorized By: ____________________", marginLeft + 260, finalY + 40);

  const fileName = `ProductStatement_${statementProduct.name.replace(/\s+/g, "_")}_${statementFromDate}_to_${statementToDate}.pdf`;
  doc.save(fileName);
};


  // ----------------------- GRN Modal -----------------------
  const GRNModal = ({ delivery, onClose }) => {
    const printGRN = () => window.print();
    return (
      <Modal show={!!delivery} onHide={onClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Goods Received Note (GRN)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2>My Company Ltd.</h2>
            <h4>Goods Received Note</h4>
          </div>
          <div className="d-flex justify-content-between mb-3">
            <div>
              <strong>Supplier:</strong> {delivery?.supplier}
              <br />
              <strong>Date:</strong> {delivery?.date}
            </div>
            <div>
              <strong>GRN No:</strong> {delivery?.grnNumber}
            </div>
          </div>
          <Table bordered>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {delivery?.items?.map((i, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{i.productName}</td>
                  <td>{i.price}</td>
                  <td>{i.quantity}</td>
                  <td>{i.total}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <h5 style={{ textAlign: "right" }}>Grand Total: {delivery?.grandTotal}</h5>
          <div className="d-flex justify-content-between mt-5">
            <div>
              <strong>Received By:</strong> ______________________
            </div>
            <div>
              <strong>Authorized By:</strong> ______________________
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={printGRN}>
            Print GRN
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // ----------------------- Render -----------------------
  return (
    <div className="container mt-4">
      {savingTransaction && (
        <div className="text-center mb-3">
          <Spinner animation="border" /> Saving...
        </div>
      )}

      {/* Tabs */}
      <div className="d-flex mb-3 gap-2">
        <Button onClick={() => setActiveTab("inventory")}>Inventory</Button>
        <Button onClick={() => setActiveTab("deliveries")}>Supplier Deliveries</Button>
        <Button onClick={() => setActiveTab("ledger")}>Suppliers Ledger</Button>
      </div>

      {/* Inventory Tab */}
      {activeTab === "inventory" && (
        <>
          <div className="d-flex mb-3 gap-2 align-items-center">
            <Button variant="primary" onClick={() => setShowAddProductOnlyModal(true)}>
              Add Product
            </Button>

            <Button variant="success" onClick={() => setShowReceiveModal(true)}>
              Receive Products
            </Button>

            <Button variant="warning" onClick={() => setShowRequestModal(true)}>
              Request Items
            </Button>

            <div style={{ marginLeft: "auto" }}>
              <InputGroup>
                <Form.Control placeholder="Search products..." onChange={(e) => {
                  const q = e.target.value.toLowerCase();
                  // simple client-side filter: reduce products shown in blocks & table
                  if (!q) loadProducts();
                  else setProducts((prev) => prev.filter(p => p.name.toLowerCase().includes(q)));
                }} />
                <Button variant="outline-secondary" onClick={() => loadProducts()}>Reset</Button>
              </InputGroup>
            </div>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          {/* ----------------- PRODUCT BLOCKS (Option 2 style) ----------------- */}
          <div className="mb-4">
            <Row xs={1} sm={2} md={3} lg={4} className="g-3">
              {products.map((p) => {
                const pendingForProduct = pendingRequests
                  .filter((r) => r.productId === p.id)
                  .reduce((s, r) => s + (Number(r.quantity) || 0), 0);

                const rejectedCountForProduct = rejectedRequests.filter((r) => r.productId === p.id).length;

                return (
                  <Col key={p.id}>
                    <Card
                      className="h-100 shadow-sm"
                      style={{ cursor: "pointer", borderRadius: 10 }}
                      onClick={() => openProductStatement(p)}
                    >
                      <Card.Body>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div>
                            <Card.Title style={{ marginBottom: 6, fontSize: 16 }}>{p.name}</Card.Title>
                            <Card.Text style={{ marginBottom: 4, fontSize: 14 }}>
                              Stock: <strong>{p.quantity ?? 0}</strong>
                            </Card.Text>
                            <div style={{ marginTop: 8, fontSize: "0.9rem" }}>
                              {pendingForProduct > 0 && <Badge bg="warning" text="dark" className="me-2">🔔 Pending: {pendingForProduct}</Badge>}
                              {rejectedCountForProduct > 0 && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation(); // prevent opening statement
                                    openRejectedRequestsForProduct(p);
                                  }}
                                >
                                  ❌ Rejected: {rejectedCountForProduct}
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* If there are pending requests, show a small button to open approve modal without clicking whole card */}
                          {pendingForProduct > 0 && (
                            <div>
                              <Button
                                variant="light"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // prevent opening statement
                                  setSelectedProductRequests(pendingRequests.filter((r) => r.productId === p.id));
                                }}
                              >
                                Open Requests
                              </Button>
                            </div>
                          )}
                        </div>
                        
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>

          {/* Inventory Table 
          {loading ? (
            <div className="text-center mt-3">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table striped bordered hover className="mt-3">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name (click name for statement)</th>
                  <th>Stock Quantity</th>
                  <th>Price</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => (
                  <tr key={p.id}>
                    <td>{idx + 1}</td>
                    <td style={{ cursor: "pointer", color: "#0d6efd" }} onClick={() => openProductStatement(p)}>
                      {p.name}
                    </td>
                    <td>{p.quantity ?? 0}</td>
                    <td>{p.price ?? 0}</td>
                    <td>{(p.price ?? 0) * (p.quantity ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}*/}
        </>
      )}

      {/* Supplier Deliveries Tab */}
      {activeTab === "deliveries" && (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>#</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>GRN No</th>
              <th>Grand Total</th>
              <th>GRN</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d, idx) => (
              <tr key={d.id}>
                <td>{idx + 1}</td>
                <td>{d.supplier}</td>
                <td>{d.date}</td>
                <td>{d.grnNumber}</td>
                <td>{d.grandTotal}</td>
                <td>
                  <Button size="sm" onClick={() => setSelectedGRN(d)}>View GRN</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Suppliers Ledger Tab */}
      {activeTab === "ledger" && (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Total Delivered Amount</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(supplierLedger).map(([supplier, total], idx) => (
              <tr key={idx}>
                <td>{supplier}</td>
                <td>{total}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Receive Products Modal */}
      <Modal show={showReceiveModal} onHide={() => setShowReceiveModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Receive Products from Supplier</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Select Supplier</Form.Label>
            <Form.Select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
              <option value="">-- Select Supplier --</option>
              {suppliers.map((s, i) => (
                <option key={i} value={s}>
                  {s}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Table bordered>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price Received</th>
                <th>Quantity</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {receivedProducts.map((row, index) => (
                <tr key={index}>
                  <td>
                    <Form.Select value={row.productId} onChange={(e) => handleRowChange(index, "productId", e.target.value)}>
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Form.Select>
                  </td>
                  <td>
                    <Form.Control type="number" value={row.price} onChange={(e) => handleRowChange(index, "price", e.target.value)} />
                  </td>
                  <td>
                    <Form.Control type="number" value={row.quantity} onChange={(e) => handleRowChange(index, "quantity", e.target.value)} />
                  </td>
                  <td>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Button variant="success" onClick={addRow}>
            + Add Another Product
          </Button>
          <h5 className="mt-3 text-end">Grand Total: {grandTotal}</h5>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReceiveModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveReceived} disabled={savingTransaction}>
            {savingTransaction ? "Saving..." : "Save Received Stock"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Request Items Modal */}
      <Modal show={showRequestModal} onHide={() => setShowRequestModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Request Items</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table bordered>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity Needed</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {requestItems.map((row, i) => (
                <tr key={i}>
                  <td style={{ minWidth: "220px" }}>
                    <Form.Select value={row.productId} onChange={(e) => handleRequestRowChange(i, "productId", e.target.value)}>
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Form.Select>
                  </td>
                  <td>
                    <Form.Control type="number" min={1} value={row.quantity} onChange={(e) => handleRequestRowChange(i, "quantity", e.target.value)} />
                  </td>
                  <td>
                    <Button variant="danger" size="sm" onClick={() => setRequestItems(requestItems.filter((_, idx) => idx !== i))}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Button variant="success" onClick={addRequestRow}>+ Add More</Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRequestModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={submitRequests} disabled={savingTransaction}>
            {savingTransaction ? "Submitting..." : "Submit Request(s)"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Approve Requests Modal (per product) */}
      <Modal show={!!selectedProductRequests} onHide={() => setSelectedProductRequests(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Approve Requests</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!selectedProductRequests ? (
            <div>No requests</div>
          ) : (
            <>
              {selectedProductRequests.map((req) => {
                const prod = products.find((p) => p.id === req.productId) || {};
                // format createdAt if firebase timestamp
                let createdAtText = "";
                try {
                  if (req.createdAt?.toDate) createdAtText = req.createdAt.toDate().toString();
                  else createdAtText = req.createdAt ? new Date(req.createdAt).toString() : "";
                } catch (e) {
                  createdAtText = req.createdAt || "";
                }

                return (
                  <div key={req.id} className="border rounded p-2 mb-2">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>{prod.name || "Unknown product"}</strong>
                        <div>Requested: {req.quantity}</div>
                        <div>Requested At: {createdAtText}</div>
                        <div>Request ID: {req.id}</div>
                      </div>
                      <div>
                        <div>Current Stock: {prod.quantity ?? "—"}</div>
                        <div className="d-flex gap-2 mt-2">
                          <Button variant="success" size="sm" onClick={() => approveSingleRequest(req)} disabled={approving}>
                            {approving ? "Approving..." : "Approve This"}
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => openRejectModal(req)} disabled={approving}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedProductRequests(null)}>Close</Button>
          <Button
            variant="success"
            onClick={() => approveAllForProduct(selectedProductRequests?.[0]?.productId)}
            disabled={approving}
          >
            {approving ? "Approving..." : "Approve All"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Rejected Requests Modal for a product */}
      <Modal show={!!selectedRejectedForProduct} onHide={() => setSelectedRejectedForProduct(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Rejected Requests</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!selectedRejectedForProduct || !selectedRejectedForProduct.length ? (
            <div>No rejected requests for this product.</div>
          ) : (
            selectedRejectedForProduct.map((r) => {
              let createdAtText = "";
              try {
                if (r.createdAt?.toDate) createdAtText = r.createdAt.toDate().toString();
                else createdAtText = r.createdAt ? new Date(r.createdAt).toString() : "";
              } catch (e) {
                createdAtText = r.createdAt || "";
              }
              return (
                <div key={r.id} className="border rounded p-2 mb-2">
                  <div><strong>Qty:</strong> {r.quantity}</div>
                  <div><strong>Requested At:</strong> {createdAtText}</div>
                  <div><strong>Rejected At:</strong> {r.rejectedAt?.toDate ? r.rejectedAt.toDate().toString() : r.rejectedAt || "—"}</div>
                  <div><strong>Reason:</strong> {r.reason || "—"}</div>
                  <div><strong>Request ID:</strong> {r.id}</div>
                </div>
              );
            })
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedRejectedForProduct(null)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal show={showRejectReasonModal} onHide={() => setShowRejectReasonModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reject Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Reason for rejection (free text)</Form.Label>
            <Form.Control as="textarea" rows={4} value={rejectReasonText} onChange={(e) => setRejectReasonText(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectReasonModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={submitReject}>Reject Request</Button>
        </Modal.Footer>
      </Modal>

      {/* Product Statement Modal (movements) */}
      {/* Product Statement Modal */}
<Modal
  show={showStatementModal}
  onHide={() => setShowStatementModal(false)}
  size="lg"
  centered
>
  <Modal.Header closeButton>
    <Modal.Title>Product Statement - {statementProduct?.name}</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Row className="mb-3">
      <Col md={5}>
        <Form.Group>
          <Form.Label>From Date</Form.Label>
          <Form.Control
            type="date"
            value={statementFromDate}
            onChange={(e) => setStatementFromDate(e.target.value)}
          />
        </Form.Group>
      </Col>
      <Col md={5}>
        <Form.Group>
          <Form.Label>To Date</Form.Label>
          <Form.Control
            type="date"
            value={statementToDate}
            onChange={(e) => setStatementToDate(e.target.value)}
          />
        </Form.Group>
      </Col>
      <Col md={2} className="d-flex align-items-end">
        <Button
          variant="primary"
          onClick={loadProductStatement}
          disabled={!statementFromDate || !statementToDate}
        >
          Load
        </Button>
      </Col>
    </Row>

    {loadingStatement ? (
      <div className="text-center">
        <Spinner animation="border" />
      </div>
    ) : productMovements.length ? (
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Qty</th>
            <th>Balance</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {productMovements.map((m, idx) => (
            <tr key={idx}>
              <td>{m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : m.createdAt}</td>
              <td>{m.type === "in" ? "Received" : "Issued/Approved"}</td>
              <td style={{ color: m.type === "in" ? "green" : "red" }}>
                {m.type === "in" ? `+${m.quantity}` : `-${m.quantity}`}
              </td>
              <td>{m.balanceAfter}</td>
              <td>{m.note || ""}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    ) : (
      <p className="text-center text-muted">Select both dates and click Load to view statement</p>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowStatementModal(false)}>
      Close
    </Button>
    <Button
      variant="primary"
      onClick={downloadStatementPDF}
      disabled={!statementFromDate || !statementToDate || !productMovements.length}
    >
      Download PDF
    </Button>
  </Modal.Footer>
</Modal>


      {/* Add Product Only Modal */}
      <Modal show={showAddProductOnlyModal} onHide={() => setShowAddProductOnlyModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Product</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Product Name</Form.Label>
              <Form.Control type="text" placeholder="Enter product name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddProductOnlyModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={addProductNameOnly} disabled={savingTransaction}>
            {savingTransaction ? "Saving..." : "Save Product"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* GRN Modal */}
      {selectedGRN && <GRNModal delivery={selectedGRN} onClose={() => setSelectedGRN(null)} />}
    </div>
  );
};

export default Inventory;
