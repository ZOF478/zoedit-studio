import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {I18nProvider} from './i18n.tsx';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Zoedit Studio root element was not found.');
}

// #root already contains a fully styled dark splash. React replaces that markup
// atomically on the first commit, so there is no intermediate white paint or shift.
createRoot(container).render(
  <I18nProvider>
    <App />
  </I18nProvider>,
);
