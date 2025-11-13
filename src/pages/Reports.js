import React, { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Card, Button, Form, Spinner } from "react-bootstrap";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { db } from "../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function Reports() {
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [transactions, setTransactions] = useState([]);
  const [paidInvoices, setPaidInvoices] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef();

  // 🔹 Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all transactions
        const txnSnap = await getDocs(collection(db, "transactions"));
        const txnData = txnSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch all paid invoices from clients
        const clientsSnap = await getDocs(collection(db, "clients"));
        let allPaid = [];

        for (const clientDoc of clientsSnap.docs) {
          const clientId = clientDoc.id;
          const clientName = clientDoc.data().name || "Unknown Client";
          const invRef = collection(db, "clients", clientId, "invoices");
          const invSnap = await getDocs(invRef);

          invSnap.forEach((inv) => {
            const data = inv.data();
            if ((data.Status || data.status) === "Paid") {
              allPaid.push({
                id: inv.id,
                clientId,
                clientName,
                ...data,
              });
            }
          });
        }

        setTransactions(txnData);
        setFilteredTransactions(txnData);
        setPaidInvoices(allPaid);
        setFilteredInvoices(allPaid);
      } catch (err) {
        console.error("Error loading reports:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 🔹 Filter by date
  const filterByDate = () => {
    if (!dateRange.from || !dateRange.to) {
      setFilteredTransactions(transactions);
      setFilteredInvoices(paidInvoices);
      return;
    }

    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    to.setHours(23, 59, 59, 999);

    const filteredTx = transactions.filter((t) => {
      if (!t.createdAt) return false;
      const tDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      return tDate >= from && tDate <= to;
    });

    const filteredInv = paidInvoices.filter((inv) => {
      if (!inv.date) return false;
      const invDate = inv.date?.toDate ? inv.date.toDate() : new Date(inv.date);
      return invDate >= from && invDate <= to;
    });

    setFilteredTransactions(filteredTx);
    setFilteredInvoices(filteredInv);
  };

  // 🔹 Totals
  const incomeFromInvoices = filteredInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.amount || 0),
    0
  );

  // ✅ Supplier Paid Amount (from transactions)
  const totalPaidToSuppliers = filteredTransactions
    .filter((t) => {
      const type = t.type?.toLowerCase();
      const status = (t.status || t.Status || "").toLowerCase();
      return (
        (type === "supplier" || type === "suppliers") &&
        status === "paid"
      );
    })
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  // ✅ Total Expenses = all expense-type + paid supplier transactions
  const expenses = filteredTransactions
    .filter((t) => {
      const type = (t.type || "").toLowerCase();
      const status = (t.status || t.Status || "").toLowerCase();
      return (
        type === "expense" ||
        ((type === "supplier" || type === "suppliers") && status === "paid")
      );
    })
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const totalIncome = incomeFromInvoices;
  const profit = totalIncome - expenses;

  // 🔹 Monthly charts
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const incomeByMonth = Array(12).fill(0);
  const expensesByMonth = Array(12).fill(0);

  // Income per month (paid invoices)
  filteredInvoices.forEach((inv) => {
    if (!inv.amount) return;
    const dateValue = inv.date?.toDate ? inv.date.toDate() : new Date(inv.date);
    const monthIndex = dateValue.getMonth();
    incomeByMonth[monthIndex] += parseFloat(inv.amount);
  });

  // Expenses per month (only paid suppliers or expense type)
  filteredTransactions.forEach((t) => {
    if (!t.amount) return;
    const type = (t.type || "").toLowerCase();
    const status = (t.status || t.Status || "").toLowerCase();
    if (type === "expense" || (type === "supplier" && status === "paid")) {
      const dateValue = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      const monthIndex = dateValue.getMonth();
      expensesByMonth[monthIndex] += parseFloat(t.amount);
    }
  });

  // 🔹 Chart Data
  const barData = {
    labels: months,
    datasets: [
      {
        label: "Income (Paid Invoices)",
        data: incomeByMonth,
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
      {
        label: `Expenses (Including Supplier P.. ${totalPaidToSuppliers} ) `,
        data: expensesByMonth,
        backgroundColor: "rgba(255, 99, 132, 0.6)",
      },
    ],
  };

  // 🔹 Income Breakdown
  const incomeTotals = {};
  filteredInvoices.forEach((inv) => {
    const name = inv.clientName || "Other";
    const amount = parseFloat(inv.amount || 0);
    if (!isNaN(amount)) {
      incomeTotals[name] = (incomeTotals[name] || 0) + amount;
    }
  });

  const expenseTotals = {};
filteredTransactions.forEach((t) => {
  const type = (t.type || "").toLowerCase();
  const status = (t.status || t.Status || "").toLowerCase();

  // Include all "expense" types, and only "supplier" with status = "paid"
  if (type === "expense" || (type === "supplier" && status === "paid")) {
    const category =
      t.account || t.supplier || t.description?.split(" ")[0] || "Other";
    const amount = parseFloat(t.amount || 0);
    if (!isNaN(amount)) {
      expenseTotals[category] = (expenseTotals[category] || 0) + amount;
    }
  }
});


  const sortedIncome = Object.entries(incomeTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const sortedExpenses = Object.entries(expenseTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const incomePie = {
    labels: sortedIncome.map(([name]) => name),
    datasets: [
      {
        data: sortedIncome.map(([_, val]) => val),
        backgroundColor: [
          "rgba(75, 192, 192, 0.8)",
          "rgba(153, 102, 255, 0.8)",
          "rgba(255, 205, 86, 0.8)",
          "rgba(255, 159, 64, 0.8)",
          "rgba(54, 162, 235, 0.8)",
          "rgba(201, 203, 207, 0.8)",
          "rgba(255, 99, 132, 0.8)",
          "rgba(255, 215, 0, 0.8)",
        ],
        borderColor: "#fff",
        borderWidth: 1,
      },
    ],
  };

  const expensePie = {
    labels: sortedExpenses.map(([cat]) => cat),
    datasets: [
      {
        data: sortedExpenses.map(([_, val]) => val),
        backgroundColor: [
          "rgba(255, 99, 132, 0.8)",
          "rgba(255, 159, 64, 0.8)",
          "rgba(255, 205, 86, 0.8)",
          "rgba(75, 192, 192, 0.8)",
          "rgba(54, 162, 235, 0.8)",
          "rgba(153, 102, 255, 0.8)",
          "rgba(201, 203, 207, 0.8)",
          "rgba(255, 215, 0, 0.8)",
        ],
        borderColor: "#fff",
        borderWidth: 1,
      },
    ],
  };

  // 🔹 Download PDF
  const handleDownloadPDF = async () => {
    const input = reportRef.current;
    const canvas = await html2canvas(input, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("Financial_Report.pdf");
  };

  return (
    <Container fluid className="mt-4" ref={reportRef}>
      <Row className="align-items-center mb-4">
        <Col>
          <h2>📊 Financial Reports</h2>
        </Col>
        <Col className="text-end d-flex justify-content-end gap-2">
          <Form className="d-flex gap-2">
            <Form.Control
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            />
            <Form.Control
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            />
            <Button variant="primary" onClick={filterByDate}>
              Generate
            </Button>
          </Form>
          <Button variant="success" onClick={handleDownloadPDF}>
            Download
          </Button>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center mt-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2">Loading reports...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <Row className="g-3 mb-4">
            <Col md={4}>
              <Card className="shadow-sm border-success border-start border-4">
                <Card.Body>
                  <Card.Title>Total Income</Card.Title>
                  <h3 className="text-success">${totalIncome.toLocaleString()}</h3>
                  <p className="text-muted small">
                    Includes ${incomeFromInvoices.toLocaleString()} from Paid Invoices
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow-sm border-danger border-start border-4">
                <Card.Body>
                  <Card.Title>Total Expenses</Card.Title>
                  <h3 className="text-danger">${expenses.toLocaleString()}</h3>
                  <p className="text-muted small">
                    Includes ${totalPaidToSuppliers.toLocaleString()} paid to suppliers
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow-sm border-primary border-start border-4">
                <Card.Body>
                  <Card.Title>Net Profit</Card.Title>
                  <h3 className="text-primary">${profit.toLocaleString()}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Charts */}
          <Row className="g-4">
            <Col md={3}>
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title>Income Breakdown</Card.Title>
                  {Object.keys(incomeTotals).length > 0 ? (
                    <Pie data={incomePie} />
                  ) : (
                    <p>No income data available</p>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title>Income vs Expenses (Monthly)</Card.Title>
                  <Bar data={barData} />
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title>Expense Breakdown</Card.Title>
                  {Object.keys(expenseTotals).length > 0 ? (
                    <Pie data={expensePie} />
                  ) : (
                    <p>No expense data available</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}
