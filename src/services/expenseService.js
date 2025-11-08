import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
} from "firebase/firestore";

const collectionName = "expenses";

// ✅ Add Expense Transaction
export const addExpense = async ({ accountName, description, amount }) => {
  try {
    // Check if the account already exists
    const q = query(collection(db, collectionName));
    const snapshot = await getDocs(q);
    let existingAccount = null;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.accountName === accountName) {
        existingAccount = { id: docSnap.id, ...data };
      }
    });

    // Create new transaction entry
    const newTransaction = {
      description,
      amount: Number(amount),
      date: new Date().toISOString(),
    };

    if (existingAccount) {
      // Update existing account
      const updatedTransactions = [
        ...(existingAccount.transactions || []),
        newTransaction,
      ];
      await updateDoc(doc(db, collectionName, existingAccount.id), {
        transactions: updatedTransactions,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new expense account
      await addDoc(collection(db, collectionName), {
        accountName,
        transactions: [newTransaction],
        createdAt: serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding expense:", error);
    return { success: false, error: error.message };
  }
};

// ✅ Get All Expense Accounts
export const getAllExpenses = async () => {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const data = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return { success: false, error: error.message };
  }
};
