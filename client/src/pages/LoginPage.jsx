import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      console.log('Login response user:', data.user);
      if (res.ok) {
        // Save token to localStorage for later API calls
        if(data.token) {  // Ensure token exists in response
          localStorage.setItem('token', data.token);
        } else {
          console.warn('Warning: No token returned from login API');
        }
        // Call context login with user and token
        login(data.user, data.token);
        navigate('/start'); // Redirect after login success
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
      console.error(err);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 border rounded mt-10">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label className="block mb-1">
          Username:
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full border px-2 py-1 mb-3 rounded"
          />
        </label>
        <label className="block mb-1">
          Password:
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border px-2 py-1 mb-3 rounded"
            autoComplete="current-password"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowPassword(prev => !prev)}
          className="mb-3 px-2 py-1 bg-gray-200 rounded"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
