import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button, Image } from "react-bootstrap";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function Settings() {
  const [companyData, setCompanyData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    logo: "",
  });

  // 🔹 Fetch saved settings from Firestore
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "company"));
        if (settingsDoc.exists()) {
          setCompanyData(settingsDoc.data());
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompanyData({ ...companyData, [name]: value });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCompanyData({ ...companyData, logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // 🔹 Save or update settings in Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "settings", "company"), companyData);
      alert("✅ Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("❌ Failed to save settings. Check console for details.");
    }
  };

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col><h2>Settings</h2></Col>
      </Row>

      <Row className="g-4">
        <Col md={6}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title className="mb-3">Company Details</Card.Title>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Company Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={companyData.name}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={companyData.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="text"
                    name="phone"
                    value={companyData.phone}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    type="text"
                    name="address"
                    value={companyData.address}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Button type="submit" variant="primary" className="w-100 mt-2">
                  Save Settings
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Company Logo Section */}
        <Col md={6}>
          <Card className="shadow-sm border-0">
            <Card.Body className="text-center">
              <Card.Title className="mb-3">Company Logo</Card.Title>
              {companyData.logo ? (
                <Image
                  src={companyData.logo}
                  alt="Company Logo"
                  rounded
                  style={{ width: "150px", height: "150px", objectFit: "cover", marginBottom: "1rem" }}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center border rounded"
                  style={{ width: "150px", height: "150px", margin: "0 auto 1rem" }}
                >
                  <span className="text-muted">No Logo</span>
                </div>
              )}
              <Form.Group controlId="formFile" className="mb-3">
                <Form.Control type="file" accept="image/*" onChange={handleLogoUpload} />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
