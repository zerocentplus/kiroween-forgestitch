import React from 'react';
import { createRoot } from 'react-dom/client';
import { IssuePanelApp } from './components/IssuePanelApp';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<IssuePanelApp />);
}
