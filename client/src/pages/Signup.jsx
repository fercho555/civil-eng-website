import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';    
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    

    try {
      
      const res = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        alert('Registration successful! Please log in.');
        navigate('/login');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl mb-4">Sign Up</h2>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <input
        type="text"
        required
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="mb-3 w-full p-2 border rounded"
      />
      <input
        type="password"
        required
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-3 w-full p-2 border rounded"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
      >
        {loading ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
}

export default Signup;