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
  getDoc,
} from "firebase/firestore";

/**
 * Refactored client service
 * - Returns consistent objects: { success: boolean, data, error }
 * - Adds createdAt / updatedAt timestamps
 * - Exposes: addClient, getClients, getClientById, updateClient, deleteClient
 */

const clientsCollectionRef = collection(db, "clients");

/**
 * Create a new client
 * @param {Object} client - client data
 */
export const addClient = async (client) => {
  try {
    const payload = {
      ...client,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(clientsCollectionRef, payload);
    return { success: true, data: { id: docRef.id, ...client } };
  } catch (error) {
    console.error("addClient error:", error);
    return { success: false, error };
  }
};

/**
 * Get all clients (ordered by createdAt desc)
 */
export const getClients = async () => {
  try {
    const q = query(clientsCollectionRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const clients = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, data: clients };
  } catch (error) {
    console.error("getClients error:", error);
    return { success: false, error };
  }
};

/**
 * Get single client by id
 */
export const getClientById = async (id) => {
  try {
    const docRef = doc(db, "clients", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return { success: false, error: "Not found" };
    return { success: true, data: { id: snap.id, ...snap.data() } };
  } catch (error) {
    console.error("getClientById error:", error);
    return { success: false, error };
  }
};

/**
 * Update client by id
 */
export const updateClient = async (id, updates) => {
  try {
    const clientDoc = doc(db, "clients", id);
    await updateDoc(clientDoc, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("updateClient error:", error);
    return { success: false, error };
  }
};

/**
 * Delete client by id
 */
export const deleteClient = async (id) => {
  try {
    const clientDoc = doc(db, "clients", id);
    await deleteDoc(clientDoc);
    return { success: true };
  } catch (error) {
    console.error("deleteClient error:", error);
    return { success: false, error };
  }
};