// File: client/src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Services from './pages/Services.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import MvpIdfViewerV2 from './pages/MvpIdfViewerV2.jsx';
import TestAutocomplete from './pages/TestAutocomplete.jsx';
import { PrivateRoute } from './components/PrivateRoute';
import LoginPage from './pages/LoginPage.jsx';
import ContactForm from './components/ContactForm';
import { AdminRoute } from './components/AdminRoute';
import PricingPage from './components/PricingPage';

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<ContactForm />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/test-autocomplete" element={<TestAutocomplete />} />
          <Route path="/idf-viewer" element={<MvpIdfViewerV2 />} />

          {/* Protected Routes */}
          <Route
            path="/start"
            element={
              <PrivateRoute>
                <MvpIdfViewerV2 />
              </PrivateRoute>
            }
          />

          {/* Only for Admins */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;


