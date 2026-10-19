import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './dev/debugHooks';
import App from './App';
import { startSocialService } from './ui/online/mode';

// chunk 8 (REL-025) — in the players' build with a project configured, Social runs on the Supabase service
startSocialService();

createRoot(document.getElementById('root')!).render(<App />);
