import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('main.tsx loading...');

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  const root = createRoot(rootElement);
  console.log('Creating root...');
  root.render(<App />);
  console.log('App rendered!');
} else {
  console.error('Root element not found!');
}
