import { addSupplierDelivery } from "../services/supplierDeliveryService";
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

// inside Inventory component...
const handleSaveReceived = async () => {
  if (!selectedSupplier) {
    setError("Please select a supplier");
    return;
  }

  // Save delivery record first
  const deliveryData = {
    supplier: selectedSupplier,
    date: new Date().toISOString().split("T")[0],
    grandTotal: grandTotal,
    items: receivedProducts.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: prod.name,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
      };
    }),
  };

  const result = await addSupplierDelivery(deliveryData);

  if (result.success) {
    // update product stock
    for (let item of receivedProducts) {
      const existing = products.find((p) => p.id === item.productId);
      const newQuantity = Number(existing.quantity) + Number(item.quantity);

      await updateProduct(item.productId, {
        ...existing,
        quantity: newQuantity,
        price: item.price,
      });
    }

    await loadProducts();

    // redirect to GRN page
    navigate(`/grn/${result.id}`);

    // reset modal
    setShowModal(false);
    setSelectedSupplier("");
    setReceivedProducts([{ productId: "", quantity: 0, price: 0, total: 0 }]);
  }
};
