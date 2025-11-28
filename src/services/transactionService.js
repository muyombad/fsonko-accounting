import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
const transactionsRef = collection(db, "transactions");


export const addTransaction = async (tx) => {
  try {
    const payload = { ...tx, createdAt: serverTimestamp() };
    const docRef = await addDoc(transactionsRef, payload);
    return { success: true, data: { id: docRef.id, ...tx } };
  } catch (error) {
    console.error("addTransaction error:", error);
    return { success: false, error };
  }
};

export const getAllTransactions = async () => {
  try {
    const q = query(transactionsRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, data: txs };
  } catch (error) {
    console.error("getTransactions error:", error);
    return { success: false, error };
  }
};

export const deleteTransaction = async (id) => {
  try {
    const d = doc(db, "transactions", id);
    await deleteDoc(d);
    return { success: true };
  } catch (error) {
    console.error("deleteTransaction error:", error);
    return { success: false, error };
  }
};

// pending stock collection
const pendingStockRef = collection(db, "pendingStockReceives");

export const savePendingStock = async (data) => {
  try {
    const payload = { ...data, createdAt: serverTimestamp() };
    const r = await addDoc(pendingStockRef, payload);
    return { success: true, id: r.id };
  } catch (err) {
    console.error("savePendingStock error:", err);
    return { success: false, error: err };
  }
};

export const getPendingStock = async () => {
  try {
    const q = query(pendingStockRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getPendingStock error:", err);
    return [];
  }
};

export const deletePendingStock = async (id) => {
  try {
    await deleteDoc(doc(db, "pendingStockReceives", id));
    return true;
  } catch (err) {
    console.error("deletePendingStock error:", err);
    return false;
  }
};



export const confirmPendingStock = async (pendingItem, products) => {
  try {
    const { id: pendingId, supplier, items, grandTotal, pendingNumber } = pendingItem;

    // 1️⃣ UPDATE PRODUCT STOCK + WRITE MOVEMENTS
    for (let item of items) {

      const product = products.find(p => p.id === item.productId);
      const newQuantity = Number(product?.quantity ?? 0) + Number(item.quantity);

      // update product stock
      await updateDoc(doc(db, "products", item.productId), {
        quantity: newQuantity,
        price: Number(item.price)
      });

      // write inventory movement
      await addDoc(collection(db, "inventoryMovements"), {
        productId: item.productId,
        type: "in",
        quantity: Number(item.quantity),
        note: `GRN ${pendingNumber}`,
        createdAt: serverTimestamp()
      });
    }

    // 2️⃣ SAVE THE DELIVERY (like your old code)
    const deliveryRef = await addDoc(collection(db, "supplier_deliveries"), {
      supplier,
      items,
      grandTotal,
      grnNumber: pendingNumber.replace("PEND-", "GRN-"),
      createdAt: serverTimestamp(),
    });

    // 3️⃣ SAVE AS INVOICE
    await addDoc(collection(db, "supplier_invoices"), {
      supplier,
      items,
      amount: grandTotal,
      status: "Paid",              // or "Pending" as you prefer
      relatedGRN: pendingNumber,
      deliveryId: deliveryRef.id,
      createdAt: serverTimestamp(),
    });

    // 4️⃣ MARK PENDING AS COMPLETED
    await updateDoc(doc(db, "pending_stock", pendingId), {
      status: "completed",
      completedAt: serverTimestamp()
    });

    return { success: true };
  } catch (err) {
    console.error("confirmPendingStock error:", err);
    return { success: false, error: err };
  }
};

