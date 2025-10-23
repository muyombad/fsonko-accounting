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
import { recordInvoiceInLedgers } from "./ledgerService";


const collectionName = "invoices";

// Generate monthly invoice number: INV-YYYY-MM-001
const generateInvoiceNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `INV-${year}-${month}-`;

  try {
    const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return `${prefix}001`;

    const latest = querySnapshot.docs[0].data().invoiceNumber;
    if (!latest.startsWith(prefix)) return `${prefix}001`;

    const lastNumber = parseInt(latest.split("-")[3] || "0");
    const nextNumber = String(lastNumber + 1).padStart(3, "0");
    return `${prefix}${nextNumber}`;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    return `${prefix}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
  }
};

export const getAllInvoices = async () => {
  try {
    const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const addInvoice = async (invoiceData) => {
  try {
    // 1️⃣ Generate unique invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // 2️⃣ Add invoice to Firestore
    const docRef = await addDoc(collection(db, collectionName), {
      ...invoiceData,
      invoiceNumber,
      status: "Unpaid",
      createdAt: serverTimestamp(),
    });

    // 3️⃣ Auto-update ledgers
    await recordInvoiceInLedgers({
      id: docRef.id,
      ...invoiceData,
      invoiceNumber,
    });

    // 4️⃣ Return success
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding invoice:", error.message);
    return { success: false, error: error.message };
  }
};

export const updateInvoice = async (id, updatedData) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, updatedData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteInvoice = async (id) => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};