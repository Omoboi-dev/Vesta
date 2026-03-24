import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import VaultDashboard from './components/vault-dashboard/VaultDashboard';

/* 
  ATTENTION AGENTS: 
  1. DO NOT remove existing imports.
  2. Add your feature import in the "TEAM IMPORTS" section.
  3. Add your <Route> inside the <Routes> block.
*/

// --- TEAM IMPORTS START ---
import { SignIn } from './components/Sign/sign';
import AgentPermissions from './components/agent-permissions';
// --- TEAM IMPORTS END ---

export default function App() {
  const { isConnected } = useAccount();

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={isConnected ? <VaultDashboard /> : <SignIn />} 
        />
        
        <Route 
          path="/sign-in" 
          element={!isConnected ? <SignIn /> : <Navigate to="/" replace />} 
        />

        {/* --- TEAM ROUTES START --- */}
        <Route 
          path="/agent-permissions" 
          element={isConnected ? <AgentPermissions /> : <SignIn />} 
        />
        {/* --- TEAM ROUTES END --- */}

        {/* Catch-all redirect to / */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
