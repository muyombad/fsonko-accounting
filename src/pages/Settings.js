import React, { useState } from "react";
import { Container, Row, Col, Card, Form, Button, Image } from "react-bootstrap";

export default function Settings() {
  const [companyData, setCompanyData] = useState({
    name: "F-Sonko Ltd",
    email: "info@fsonko.com",
    phone: "+256700000000",
    address: "Kyengera, Uganda",
    logo: "",
  });

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

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("✅ Settings saved successfully!");
    console.log("Saved Data:", companyData);
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
