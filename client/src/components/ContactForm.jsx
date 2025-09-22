import React, { useState } from 'react';
import axios from 'axios';

function ContactForm() {
  const [formData, setFormData] = useState({name: '', email: '', message: '', sendCopy: false});
  const [feedback, setFeedback] = useState('');

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFeedback('Sending...');

    try {
      const response = await axios.post('http://localhost:5000/api/contact', formData, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.status === 201) {
        setFeedback('Message sent successfully!');
      } else {
        setFeedback('Unexpected response status: ' + response.status);
      }
    } catch (error) {
      console.error('POST error:', error);
      setFeedback('Something went wrong. Try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="contact-form max-w-md mx-auto p-4 border rounded shadow-sm bg-white">
      <div className="mb-4">
        <label htmlFor="name" className="block mb-1 font-semibold">Name</label>
        <input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Name"
          required
          className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="email" className="block mb-1 font-semibold">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
          required
          className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="message" className="block mb-1 font-semibold">Message</label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Message"
          required
          rows="4"
          className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4 flex items-center">
        <input
          id="sendCopy"
          name="sendCopy"
          type="checkbox"
          checked={formData.sendCopy}
          onChange={handleChange}
          className="mr-2"
        />
        <label htmlFor="sendCopy" className="font-semibold cursor-pointer">Send me a copy</label>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition"
      >
        Send
      </button>
      {feedback && <p className="mt-4 text-center text-gray-700">{feedback}</p>}
    </form>
  );
}

export default ContactForm;
