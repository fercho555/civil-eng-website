// File: client/src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Services from './pages/Services.jsx';
import Contact from './pages/Contact.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ProjectWizard from './pages/ProjectWizard';
import MVP_IDFViewer_v2 from './pages/MVP_IDFViewer_v2.jsx';
import TestAutocomplete from './pages/TestAutocomplete.jsx';

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/start" element={<MVP_IDFViewer_v2 />} /> {/* Change this line */}
          <Route path="/idf-viewer" element={<MVP_IDFViewer_v2 />} />
          <Route path="/test-autocomplete" element={<TestAutocomplete />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;




