import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import logger from '@/utils/logger';

const log = logger.ui;

log.info('main.tsx loading...');

const rootElement = document.getElementById('root');
log.info('Root element:', rootElement);

if (rootElement) {
  const root = createRoot(rootElement);
  log.info('Creating root...');
  root.render(<App />);
  log.info('App rendered!');
} else {
  log.error('Root element not found!');
}
