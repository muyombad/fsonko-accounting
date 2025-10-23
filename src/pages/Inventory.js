import React, { useState, useEffect } from "react";
import { Button, Modal, Form, Table, Spinner, Alert } from "react-bootstrap";
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../services/productService";

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    price: "",
    quantity: "",
  });

  // Load products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const result = await getAllProducts();
      if (result.success) {
        setProducts(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  // Handle form input
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Save new or updated product
  const handleSave = async () => {
    if (!form.name || !form.price || !form.quantity) {
      setError("All fields are required!");
      return;
    }
    setLoading(true);
    setError("");
    let result;
    if (selectedProduct) {
      result = await updateProduct(selectedProduct.id, form);
    } else {
      result = await addProduct(form);
    }

    if (result.success) {
      setShowModal(false);
      const updatedList = await getAllProducts();
      setProducts(updatedList.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  // Delete product
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      setLoading(true);
      const result = await deleteProduct(id);
      if (result.success) {
        setProducts(products.filter((p) => p.id !== id));
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
  };

  // Open modal for new or existing product
  const openModal = (product = null) => {
    setSelectedProduct(product);
    if (product) {
      setForm({
        name: product.name,
        price: product.price,
        quantity: product.quantity,
      });
    } else {
      setForm({ name: "", price: "", quantity: "" });
    }
    setShowModal(true);
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Inventory Management</h3>

      {error && <Alert variant="danger">{error}</Alert>}

      <Button variant="primary" onClick={() => openModal()}>
        Add Product
      </Button>

      {loading && (
        <div className="mt-3 text-center">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && (
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, index) => (
              <tr key={p.id}>
                <td>{index + 1}</td>
                <td>{p.name}</td>
                <td>{p.price}</td>
                <td>{p.quantity}</td>
                <td>{p.price * p.quantity}</td>
                <td>
                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => openModal(p)}
                    className="me-2"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(p.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedProduct ? "Edit Product" : "Add Product"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="name" className="mb-3">
              <Form.Label>Product Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="price" className="mb-3">
              <Form.Label>Price</Form.Label>
              <Form.Control
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="quantity" className="mb-3">
              <Form.Label>Quantity</Form.Label>
              <Form.Control
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Inventory;
