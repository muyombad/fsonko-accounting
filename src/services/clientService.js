import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";

const clientsCollection = collection(db, "clients");

// 🟢 Create Client
export const addClient = async (client) => {
  try {
    const docRef = await addDoc(clientsCollection, client);
    return { id: docRef.id, ...client };
  } catch (error) {
    console.error("Error adding client:", error);
  }
};

// 🔵 Read Clients
export const getClients = async () => {
  try {
    const snapshot = await getDocs(clientsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching clients:", error);
  }
};

// 🟡 Update Client
export const updateClient = async (id, updatedData) => {
  try {
    const clientDoc = doc(db, "clients", id);
    await updateDoc(clientDoc, updatedData);
  } catch (error) {
    console.error("Error updating client:", error);
  }
};

// 🔴 Delete Client
export const deleteClient = async (id) => {
  try {
    const clientDoc = doc(db, "clients", id);
    await deleteDoc(clientDoc);
  } catch (error) {
    console.error("Error deleting client:", error);
  }
};
