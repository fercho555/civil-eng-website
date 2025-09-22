// File: src/components/PricingPage.jsx
import React from 'react';

function PricingPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Pricing Plans</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Basic Plan */}
        <div className="border rounded p-4 shadow hover:shadow-lg transition">
          <h2 className="text-xl font-semibold mb-2">Basic Access</h2>
          <p className="mb-4">One-time fee to access IDF curves and tables for a single location.</p>
          <p className="text-2xl font-bold mb-4">$49 CAD</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Buy Now</button>
        </div>

        {/* Monthly Subscription */}
        <div className="border rounded p-4 shadow hover:shadow-lg transition">
          <h2 className="text-xl font-semibold mb-2">Monthly Subscription</h2>
          <p className="mb-4">Unlimited access to all IDF data for locations across Canada.</p>
          <p className="text-2xl font-bold mb-4">$19 / month CAD</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Subscribe</button>
        </div>

        {/* Annual Subscription */}
        <div className="border rounded p-4 shadow hover:shadow-lg transition">
          <h2 className="text-xl font-semibold mb-2">Annual Subscription</h2>
          <p className="mb-4">Best value! Full access with a 2-month discount compared to monthly.</p>
          <p className="text-2xl font-bold mb-4">$199 / year CAD</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Subscribe</button>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;
