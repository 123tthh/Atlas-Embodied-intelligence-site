import { createRoot } from 'react-dom/client';
import Atlas from '../app/ui/Atlas';
import '../app/globals.css';
import '../app/directory.css';
import '../app/world-map.css';
import '../app/regional.css';

createRoot(document.getElementById('root')!).render(<Atlas user={null} />);
