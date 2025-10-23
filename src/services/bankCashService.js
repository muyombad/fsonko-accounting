import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { recordTransactionInLedgers } from "./ledgerService";


const transactionsRef = collection(db, "bank_transactions");

// 🔹 Fetch all transactions for a specific account (index-free)
const fetchAccountTransactions = async (accountName) => {
  try {
    const q = query(
      transactionsRef,
      where("accountName", "==", accountName),
      orderBy("date", "asc")
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Sort locally to ensure consistent order
    docs.sort((a, b) => {
      const da = new Date(a.date || 0);
      const db = new Date(b.date || 0);
      if (da.getTime() === db.getTime()) {
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      }
      return da - db;
    });

    return docs;
  } catch (error) {
    console.error("fetchAccountTransactions error:", error);
    return [];
  }
};

// 🔹 Recalculate running balances for an account
const recalcAndSaveBalances = async (accountName) => {
  try {
    const txs = await fetchAccountTransactions(accountName);
    let running = 0;

    for (const t of txs) {
      const amt = Number(t.amount) || 0;
      if (t.transactionType === "Deposit") running += amt;
      else if (t.transactionType === "Withdrawal") running -= amt;

      const dRef = doc(db, "bank_transactions", t.id);
      await updateDoc(dRef, { balanceAfter: running });
    }

    return { success: true, balance: running };
  } catch (error) {
    console.error("recalcAndSaveBalances error:", error);
    return { success: false, error };
  }
};

// 🔹 Get all transactions (ordered by date, no composite index)
export const getAllTransactions = async () => {
  try {
    const q = query(transactionsRef, orderBy("date", "desc"));
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Sort locally by date descending
    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    return { success: true, data };
  } catch (error) {
    console.error("getAllTransactions error:", error);
    return { success: false, error };
  }
};

// 🔹 Add a new transaction (handles Deposit / Withdrawal / Transfer)
export const addTransaction = async (tx) => {
  try {
    const payload = {
      accountName: tx.accountName,
      transactionType: tx.transactionType,
      amount: Number(tx.amount) || 0,
      date: tx.date || new Date().toISOString().slice(0, 10),
      description: tx.description || "",
      createdAt: serverTimestamp(),
    };

    // 🟡 Handle transfer between accounts
    if (tx.transactionType === "Transfer" && tx.transferToAccount) {
      const withdrawPayload = {
        ...payload,
        transactionType: "Withdrawal",
        description: payload.description
          ? payload.description + " (transfer out)"
          : "Transfer out",
      };

      const depositPayload = {
        ...payload,
        accountName: tx.transferToAccount,
        transactionType: "Deposit",
        description: payload.description
          ? payload.description + " (transfer in)"
          : "Transfer in",
      };

      // Save both sides of the transfer
      const withdrawRef = await addDoc(transactionsRef, withdrawPayload);
      const depositRef = await addDoc(transactionsRef, depositPayload);

      // ✅ Update both ledgers automatically
      await recordTransactionInLedgers({
        id: withdrawRef.id,
        ...withdrawPayload,
      });
      await recordTransactionInLedgers({
        id: depositRef.id,
        ...depositPayload,
      });

      // Recalculate both account balances
      await recalcAndSaveBalances(tx.accountName);
      await recalcAndSaveBalances(tx.transferToAccount);

      return { success: true };
    }

    // 🟢 Regular deposit or withdrawal
    const docRef = await addDoc(transactionsRef, payload);

    // ✅ Update ledger
    await recordTransactionInLedgers({
      id: docRef.id,
      ...payload,
    });

    // ✅ Recalculate account balance
    await recalcAndSaveBalances(tx.accountName);

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("addTransaction error:", error);
    return { success: false, error: error.message };
  }
};
// 🔹 Update existing transaction
export const updateTransaction = async (id, updates) => {
  try {
    const dRef = doc(db, "bank_transactions", id);
    await updateDoc(dRef, { ...updates });

    if (updates.accountName) {
      await recalcAndSaveBalances(updates.accountName);
    }

    return { success: true };
  } catch (error) {
    console.error("updateTransaction error:", error);
    return { success: false, error };
  }
};

// 🔹 Delete transaction and recalc balances
export const deleteTransaction = async (id) => {
  try {
    const allSnap = await getDocs(query(transactionsRef, orderBy("date", "desc")));
    const docToDelete = allSnap.docs.find((d) => d.id === id);

    if (docToDelete) {
      const acct = docToDelete.data().accountName;
      const dRef = doc(db, "bank_transactions", id);
      await deleteDoc(dRef);
      await recalcAndSaveBalances(acct);
      return { success: true };
    } else {
      return { success: false, error: "Transaction not found" };
    }
  } catch (error) {
    console.error("deleteTransaction error:", error);
    return { success: false, error };
  }
};
