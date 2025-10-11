import React, { useState } from "react";
import "./Inventory.css";

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    unitPrice: "",
    stock: "",
  });

  const handleChange = (e) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  };

  const addProduct = (e) => {
    e.preventDefault();
    setProducts([...products, { ...newProduct, id: Date.now() }]);
    setNewProduct({ name: "", category: "", unitPrice: "", stock: "" });
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

      <table className="inventory-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Unit Price</th>
            <th>Stock</th>
            <th>Total Value</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Inventory;
