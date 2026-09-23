import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './dev/debugHooks';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
