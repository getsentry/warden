import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app.js';
import { createDashboardRuntime } from './api.js';
import { RuntimeProvider } from './runtime.js';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Dashboard root is missing.');
const runtime = createDashboardRuntime();
const root = createRoot(container);
root.render(
  <RuntimeProvider runtime={runtime}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </RuntimeProvider>,
);
window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  root.unmount();
  void runtime.dispose();
});
