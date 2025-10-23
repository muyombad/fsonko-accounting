import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
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