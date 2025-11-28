// src/services/bankCashService.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// ----------------------------
// GET ALL BANKS
// ----------------------------
export const getBanks = async () => {
  const snap = await getDocs(collection(db, "banks"));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { data };
};

// ----------------------------
// ADD BANK
// ----------------------------
export const addBank = async (bankData) => {
  return await addDoc(collection(db, "banks"), {
    ...bankData,
    closingBalance: Number(bankData.openingBalance) || 0,
    createdAt: serverTimestamp(),
  });
};

// ----------------------------
// UPDATE BANK
// ----------------------------
export const updateBank = async (id, data) => {
  return await updateDoc(doc(db, "banks", id), data);
};

// ----------------------------
// DELETE BANK
// ----------------------------
export const deleteBank = async (id) => {
  return await deleteDoc(doc(db, "banks", id));
};

// ----------------------------
// INTERNAL — UPDATE BALANCE
// ----------------------------
const updateBankBalance = async (bankId, amountChange) => {
  const bankRef = doc(db, "banks", bankId);
  const bankSnap = await getDoc(bankRef);

  if (!bankSnap.exists()) throw new Error("Bank not found!");

  const current = Number(bankSnap.data().closingBalance || 0);
  const updated = current + amountChange;

  await updateDoc(bankRef, {
    closingBalance: updated,
  });
};

// ----------------------------
// GET ALL TRANSACTIONS FOR 1 BANK
// ----------------------------
export const getBankTransactions = async (bankId) => {
  const q = query(
    collection(db, "bankTransactions"),
    where("bankId", "==", bankId),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);
  const createdAt = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { createdAt };
};

// ----------------------------
// GET TRANSACTIONS BY DATE RANGE
// ----------------------------
export const getBankTransactionsByDate = async (bankId, from, to) => {
  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T23:59:59");

  const q = query(
    collection(db, "bankTransactions"),
    where("bankId", "==", bankId),
    where("date", ">=", fromDate),
    where("date", "<=", toDate),
    orderBy("date", "asc")
  );

  const snap = await getDocs(q);
  const createdAt = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { createdAt };
};

// ----------------------------
// ADD TRANSACTION + UPDATE BALANCE
// ----------------------------
export const addBankTransaction = async (tx) => {
  const amount = Number(tx.amount);

  // SAVE TRANSACTION
  await addDoc(collection(db, "bankTransactions"), {
    ...tx,
    amount,
    createdAt: serverTimestamp(),
  });

  // HANDLE BALANCE
  if (tx.transactionType === "Deposit") {
    await updateBankBalance(tx.bankId, amount);
  } else if (tx.transactionType === "Withdrawal") {
    await updateBankBalance(tx.bankId, -amount);
  } else if (tx.transactionType === "Transfer") {
    await updateBankBalance(tx.bankId, -amount); // deduct from source
    await updateBankBalance(tx.transferToBankId, amount); // add to target
  }
};

// ----------------------------
// UPDATE TRANSACTION (adjust bank balance)
// ----------------------------
export const updateTransaction = async (id, newTx) => {
  const txRef = doc(db, "bankTransactions", id);
  const oldSnap = await getDoc(txRef);

  if (!oldSnap.exists()) throw new Error("Transaction not found!");

  const oldTx = oldSnap.data();
  const oldAmount = Number(oldTx.amount);
  const newAmount = Number(newTx.amount);

  // REVERSE OLD TRANSACTION EFFECT
  if (oldTx.transactionType === "Deposit") {
    await updateBankBalance(oldTx.bankId, -oldAmount);
  } else if (oldTx.transactionType === "Withdrawal") {
    await updateBankBalance(oldTx.bankId, oldAmount);
  } else if (oldTx.transactionType === "Transfer") {
    await updateBankBalance(oldTx.bankId, oldAmount);
    await updateBankBalance(oldTx.transferToBankId, -oldAmount);
  }

  // UPDATE THE TRANSACTION DOCUMENT
  await updateDoc(txRef, newTx);

  // APPLY NEW TRANSACTION EFFECT
  if (newTx.transactionType === "Deposit") {
    await updateBankBalance(newTx.bankId, newAmount);
  } else if (newTx.transactionType === "Withdrawal") {
    await updateBankBalance(newTx.bankId, -newAmount);
  } else if (newTx.transactionType === "Transfer") {
    await updateBankBalance(newTx.bankId, -newAmount);
    await updateBankBalance(newTx.transferToBankId, newAmount);
  }
};

// ----------------------------
// DELETE TRANSACTION + REVERSE BALANCE
// ----------------------------
export const deleteTransaction = async (id) => {
  const txRef = doc(db, "bankTransactions", id);
  const snap = await getDoc(txRef);

  if (!snap.exists()) return;

  const tx = snap.data();
  const amount = Number(tx.amount);

  // REVERSE
  if (tx.transactionType === "Deposit") {
    await updateBankBalance(tx.bankId, -amount);
  } else if (tx.transactionType === "Withdrawal") {
    await updateBankBalance(tx.bankId, amount);
  } else if (tx.transactionType === "Transfer") {
    await updateBankBalance(tx.bankId, amount);
    await updateBankBalance(tx.transferToBankId, -amount);
  }

  // DELETE TRANSACTION
  await deleteDoc(txRef);
};
