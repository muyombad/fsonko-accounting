// src/services/ledgerService.js
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { toTitleCase, toNumber } from "./helpers";
import { addLedgerEntry, getEntriesForLedger } from "./ledgerEntryService";


const ledgersRef = collection(db, "ledgers");

export const ensureLedger = async (ledgerName, ledgerType = "Asset") => {
  try {
    const niceName = toTitleCase(ledgerName);
    const q = query(ledgersRef, where("name", "==", niceName));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { success: true, id: d.id, data: { id: d.id, ...d.data() } };
    }
    const payload = {
      name: niceName,
      type: ledgerType || "Asset",
      balance: 0,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(ledgersRef, payload);
    return { success: true, id: ref.id, data: payload };
  } catch (error) {
    console.error("ensureLedger error:", error);
    return { success: false, error };
  }
};

export const getAllLedgers = async () => {
  try {
    const q = query(ledgersRef, orderBy("name", "asc"));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, data: list };
  } catch (error) {
    console.error("getAllLedgers error:", error);
    return { success: false, error };
  }
};

export const getLedgerByName = async (ledgerName) => {
  try {
    const niceName = toTitleCase(ledgerName);
    const q = query(ledgersRef, where("name", "==", niceName));
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, error: "Ledger not found" };
    const d = snap.docs[0];
    return { success: true, data: { id: d.id, ...d.data() } };
  } catch (error) {
    console.error("getLedgerByName error:", error);
    return { success: false, error };
  }
};

export const updateLedgerBalance = async (ledgerName, balance) => {
  try {
    const niceName = toTitleCase(ledgerName);
    const q = query(ledgersRef, where("name", "==", niceName));
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, error: "Ledger not found" };
    const d = snap.docs[0];
    const dRef = doc(db, "ledgers", d.id);
    await updateDoc(dRef, { balance });
    return { success: true };
  } catch (error) {
    console.error("updateLedgerBalance error:", error);
    return { success: false, error };
  }
};

export const addEntryToLedger = async (ledgerName, { date, description = "", debit = 0, credit = 0 }) => {
  try {
    const l = await ensureLedger(ledgerName, "Asset");
    if (!l.success) return l;
    const addRes = await addLedgerEntry({
      ledgerName: l.data.name,
      date,
      description,
      debit,
      credit,
    });
    if (!addRes.success) return addRes;

    const entriesRes = await getEntriesForLedger(l.data.name);
    if (!entriesRes.success) return { success: true, id: addRes.id };

    const entries = entriesRes.data;
    const last = entries[entries.length - 1];
    if (last) {
      await updateLedgerBalance(l.data.name, toNumber(last.balanceAfter));
    }
    return { success: true, id: addRes.id };
  } catch (error) {
    console.error("addEntryToLedger error:", error);
    return { success: false, error };
  }
};

export const recordInvoiceInLedgers = async (invoice) => {
  try {
    const ar = await ensureLedger("Accounts Receivable", "Asset");
    const rev = await ensureLedger("Revenue", "Income");
    if (!ar.success || !rev.success) {
      return { success: false, error: "Failed to ensure ledgers" };
    }

    await addEntryToLedger(ar.data.name, {
      date: invoice.date || new Date().toISOString().slice(0, 10),
      description: `Invoice ${invoice.invoiceNumber} - ${invoice.clientName}`,
      debit: toNumber(invoice.amount),
      credit: 0,
    });

    await addEntryToLedger(rev.data.name, {
      date: invoice.date || new Date().toISOString().slice(0, 10),
      description: `Invoice ${invoice.invoiceNumber}`,
      debit: 0,
      credit: toNumber(invoice.amount),
    });

    return { success: true };
  } catch (error) {
    console.error("recordInvoiceInLedgers error:", error);
    return { success: false, error };
  }
};

export const applyPaymentToInvoice = async (invoice, payment) => {
  try {
    const bankLedger = await ensureLedger(payment.accountName, "Asset");
    const ar = await ensureLedger("Accounts Receivable", "Asset");
    if (!bankLedger.success || !ar.success) return { success: false, error: "Failed to create ledgers" };

    await addEntryToLedger(bankLedger.data.name, {
      date: payment.date || new Date().toISOString().slice(0, 10),
      description: `Payment for ${invoice.invoiceNumber}`,
      debit: toNumber(payment.amount),
      credit: 0,
    });

    await addEntryToLedger(ar.data.name, {
      date: payment.date || new Date().toISOString().slice(0, 10),
      description: `Payment applied to ${invoice.invoiceNumber}`,
      debit: 0,
      credit: toNumber(payment.amount),
    });

    return { success: true };
  } catch (error) {
    console.error("applyPaymentToInvoice error:", error);
    return { success: false, error };
  }
};


// ✅ Automatically record a bank/cash transaction & link to invoice if any
export const recordTransactionInLedgers = async (tx) => {
  try {
    // Ensure ledger exists
    const ledgerName = tx.accountName || "Cash at Bank";
    const ledger = await ensureLedger(ledgerName, "Asset");

    // Determine debit or credit
    let debit = 0;
    let credit = 0;
    if (tx.transactionType === "Deposit") {
      debit = Number(tx.amount);
    } else if (tx.transactionType === "Withdrawal") {
      credit = Number(tx.amount);
    }

    // Add ledger entry
    await addEntryToLedger({
      ledgerId: ledger.id,
      ledgerName,
      date: tx.date || new Date().toISOString().slice(0, 10),
      description: tx.description || tx.transactionType,
      debit,
      credit,
    });

    // Update running balance
    const netChange = debit - credit;
    await updateLedgerBalance(ledger.id, netChange);

    console.log(`Ledger updated for ${ledgerName}: ${netChange}`);

    // ✅ Optional: link transaction to an invoice
    if (tx.invoiceId) {
      const invoiceRef = doc(db, "invoices", tx.invoiceId);
      const invoiceSnap = await getDoc(invoiceRef);

      if (invoiceSnap.exists()) {
        console.log(`Applying payment of ${tx.amount} to invoice ${tx.invoiceId}`);
        await applyPaymentToInvoice(tx.invoiceId, tx.amount);
      } else {
        console.warn(`Invoice ${tx.invoiceId} not found.`);
      }
    }
  } catch (error) {
    console.error("recordTransactionInLedgers error:", error);
  }
};
