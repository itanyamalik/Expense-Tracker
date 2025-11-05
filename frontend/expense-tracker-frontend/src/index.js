import React from 'react';
import { createRoot } from 'react-dom/client';

// Import the Tailwind CSS styles
import './index.css';

// Import the components from App.jsx
import { App, AuthProvider } from './App.jsx';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element. Make sure your public/index.html has <div id='root'></div>");
}