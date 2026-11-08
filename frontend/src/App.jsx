import useCeejayController from './controllers/useCeejayController';
import CeejayPage from './pages/CeejayPage';
import './App.css';

export default function App() {
  const controller = useCeejayController();
  return <CeejayPage controller={controller} />;
}
