// src/services/ledgerEntryService.js
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { toNumber } from "./helpers";

const ledgerEntriesRef = collection(db, "ledger_entries");

export const addLedgerEntry = async (entry) => {
  try {
    const ledgerName = entry.ledgerName;
    const q = query(
      ledgerEntriesRef,
      where("ledgerName", "==", ledgerName),
      orderBy("date", "asc")
    );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => {
      const da = new Date(a.date || 0);
      const db = new Date(b.date || 0);
      if (da.getTime() === db.getTime()) {
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      }
      return da - db;
    });

    let running = 0;
    for (const r of rows) {
      running += toNumber(r.debit) - toNumber(r.credit);
    }

    const debit = toNumber(entry.debit);
    const credit = toNumber(entry.credit);
    const newBalance = running + debit - credit;

    const payload = {
      ledgerName,
      date: entry.date || new Date().toISOString().slice(0, 10),
      description: entry.description || "",
      debit,
      credit,
      balanceAfter: newBalance,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(ledgerEntriesRef, payload);
    return { success: true, id: docRef.id, data: payload };
  } catch (error) {
    console.error("addLedgerEntry error:", error);
    return { success: false, error };
  }
};

export const getEntriesForLedger = async (ledgerName) => {
  try {
    const q = query(
      ledgerEntriesRef,
      where("ledgerName", "==", ledgerName),
      orderBy("date", "asc")
    );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => {
      const da = new Date(a.date || 0);
      const db = new Date(b.date || 0);
      if (da.getTime() === db.getTime()) {
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      }
      return da - db;
    });
    return { success: true, data: rows };
  } catch (error) {
    console.error("getEntriesForLedger error:", error);
    return { success: false, error };
  }
};