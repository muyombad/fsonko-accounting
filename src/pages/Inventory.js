import React, { useState, useEffect } from "react";
import "./Inventory.css";
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    unitPrice: "",
    stock: "",
  });
  const [loading, setLoading] = useState(true);

  const productsCollection = collection(db, "inventory");

  // 🔹 Fetch products from Firestore
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(productsCollection);
      const productList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 🔹 Handle input change
  const handleChange = (e) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  };

  // 🔹 Add product to Firestore
  const addProduct = async (e) => {
    e.preventDefault();
    const { name, category, unitPrice, stock } = newProduct;
    if (!name || !category || !unitPrice || !stock) return;

    const productData = {
      name,
      category,
      unitPrice: parseFloat(unitPrice),
      stock: parseInt(stock),
    };

    try {
      await addDoc(productsCollection, productData);
      await fetchProducts(); // Refresh list
      setNewProduct({ name: "", category: "", unitPrice: "", stock: "" });
      alert("✅ Product added successfully!");
    } catch (error) {
      console.error("Error adding product:", error);
      alert("❌ Failed to add product!");
    }
  };

  // 🔹 Delete a product
  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, "inventory", id));
      await fetchProducts();
      alert("🗑️ Product deleted!");
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("❌ Failed to delete product!");
    }
  };

  return (
    <div className="inventory-page">
      <h2>📦 Inventory Management</h2>

      <form className="inventory-form" onSubmit={addProduct}>
        <input
          type="text"
          name="name"
          placeholder="Product Name"
          value={newProduct.name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="category"
          placeholder="Category"
          value={newProduct.category}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="unitPrice"
          placeholder="Unit Price"
          value={newProduct.unitPrice}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="stock"
          placeholder="Stock Quantity"
          value={newProduct.stock}
          onChange={handleChange}
          required
        />
        <button type="submit">Add Product</button>
      </form>

      {loading ? (
        <p>Loading inventory...</p>
      ) : products.length === 0 ? (
        <p>No products in inventory yet.</p>
      ) : (
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Unit Price</th>
              <th>Stock</th>
              <th>Total Value</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>${p.unitPrice}</td>
                <td>{p.stock}</td>
                <td>${(p.unitPrice * p.stock).toFixed(2)}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => deleteProduct(p.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Inventory;
