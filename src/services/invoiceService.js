// src/services/invoiceService.js
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

const invoicesRef = collection(db, "invoices");

// ✅ Get all invoices
export const getAllInvoices = async () => {
  try {
    const q = query(invoicesRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const invoices = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, data: invoices };
  } catch (error) {
    console.error("getAllInvoices error:", error);
    return { success: false, error: error.message };
  }
};

// ✅ Add new invoice
export const addInvoice = async (invoice) => {
  try {
    const payload = {
      ...invoice,
      status: invoice.status || "Unpaid",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(invoicesRef, payload);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("addInvoice error:", error);
    return { success: false, error: error.message };
  }
};

// ✅ Update invoice
export const updateInvoice = async (invoiceId, updates) => {
  try {
    const invoiceDoc = doc(db, "invoices", invoiceId);
    await updateDoc(invoiceDoc, { ...updates, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error("updateInvoice error:", error);
    return { success: false, error: error.message };
  }
};

// ✅ Delete invoice
export const deleteInvoice = async (invoiceId) => {
  try {
    const invoiceDoc = doc(db, "invoices", invoiceId);
    await deleteDoc(invoiceDoc);
    return { success: true };
  } catch (error) {
    console.error("deleteInvoice error:", error);
    return { success: false, error: error.message };
  }
};
