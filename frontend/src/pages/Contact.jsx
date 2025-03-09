import React from 'react';
import { assets } from '../assets/assets';

const Contact = () => {

  const handleSubmit = () => {
    alert('Form submitted successfully!');
  };

  return (
    <div className="bg-gray-50 py-16 px-4 sm:px-8">
      <div className="container mx-auto flex items-center flex-col lg:flex-row">
        {/* Left side image */}
        <div className="flex-1 text-center lg:text-left lg:w-1/2 mb-10 lg:mb-0">
          <img
            src={assets.contact_image}
            alt="Contact"
            className="w-full max-w-md mx-auto rounded-lg shadow-lg"
          />
        </div>

        {/* Right side form and contact info */}
        <div className="flex-1 lg:w-1/2 text-center lg:text-left">
          {/* Heading Section */}
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6 relative">
            Contact <span className="text-blue-500 blur-text">US</span>
          </h2>
          <p className="text-lg text-gray-600 mb-10">
            We’re here to help! Reach out with any questions, concerns, or feedback. We’d love to hear from you.
          </p>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-lg shadow-lg mx-auto w-full max-w-md">
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-gray-700 font-medium">Your Name</label>
                <input
                  type="text"
                  id="name"
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-gray-700 font-medium">Your Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-gray-700 font-medium">Your Message</label>
                <textarea
                  id="message"
                  placeholder="Enter your message"
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2"
                  required
                />
              </div>
              <div className="text-center">
                <button
                  onClick={handleSubmit}
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>

          {/* Contact Information */}
          <div className="mt-10 text-lg text-gray-600">
            <p>If you prefer, you can reach us through the following ways:</p>
            <ul className="mt-4">
              <li className="mb-3">
                <strong>Phone:</strong> +1 800 123 4567
              </li>
              <li className="mb-3">
                <strong>Email:</strong> support@mediconnect.com
              </li>
              <li className="mb-3">
                <strong>Address:</strong> 1234 Health St, Wellness City, HC 12345
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
