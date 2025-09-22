import React, { useEffect, useState } from 'react';
import { safeFetchJSON } from '../utils/safeFetchJSON'; // if you use the safeFetch wrapper

function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        setLoading(true);
        setError(null);
        // Use safeFetchJSON or native fetch below:
        const data = await safeFetchJSON('http://localhost:5000/api/contact');
        // If not using safeFetchJSON:
        // const response = await fetch('http://localhost:5000/api/contact');
        // if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        // const data = await response.json();
        setSubmissions(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch submissions');
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSubmissions();
  }, []);

  if (loading) return <div>Loading submissions...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Message', 'Date'];
    const rows = submissions.map(s =>
      [s.name, s.email, s.message, new Date(s.date).toLocaleString()]
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'submissions.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      <div className="mb-4 text-right">
        <button onClick={downloadCSV} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Name</th>
              <th className="border px-4 py-2 text-left">Email</th>
              <th className="border px-4 py-2 text-left">Message</th>
              <th className="border px-4 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{sub.name}</td>
                <td className="border px-4 py-2">{sub.email}</td>
                <td className="border px-4 py-2">{sub.message}</td>
                <td className="border px-4 py-2">{new Date(sub.date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {submissions.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No submissions found.</p>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
