// File: src/Home.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading user info...</div>;
  }

  if (user) {
    console.log('[Home.jsx] Redirecting to /start...');
    return <Navigate to="/start" replace />;
  }

  return (
    <motion.div
      className="p-4"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="text-2xl font-bold">Welcome to Our Civil Engineering Practice</h2>
      <p className="mt-4">
        We provide structural design, permit drawings, grading plans, and more — tailored for residential and commercial projects.
      </p>
      <div className="id-feature-info bg-yellow-100 p-4 rounded my-6 border border-yellow-400">
        <h3 className="text-lg font-semibold mb-2">New Feature: IDF Curves and Tables</h3>
        <p>
          Explore detailed Intensity-Duration-Frequency (IDF) curves and tables for any location in Canada.  
          Access to this powerful tool requires a subscription or a one-time fee.  
          Please visit the <a href="/pricing" className="text-blue-600 underline">Pricing</a> page for more information.
        </p>
      </div>
    </motion.div>
  );
}

export default Home;
