import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

const productsRef = collection(db, "products");

export const addProduct = async (product) => {
  try {
    const payload = { ...product, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const docRef = await addDoc(productsRef, payload);
    return { success: true, data: { id: docRef.id, ...product } };
  } catch (error) {
    console.error("addProduct error:", error);
    return { success: false, error };
  }
};

export const getAllProducts = async () => {
  try {
    const q = query(productsRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, data: products };
  } catch (error) {
    console.error("getProducts error:", error);
    return { success: false, error };
  }
};

export const updateProduct = async (id, updates) => {
  try {
    const d = doc(db, "products", id);
    await updateDoc(d, { ...updates, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error("updateProduct error:", error);
    return { success: false, error };
  }
};

export const deleteProduct = async (id) => {
  try {
    const d = doc(db, "products", id);
    await deleteDoc(d);
    return { success: true };
  } catch (error) {
    console.error("deleteProduct error:", error);
    return { success: false, error };
  }
};