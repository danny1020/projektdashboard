import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import BoardDetail from './components/BoardDetail';
import StatsDashboard from './components/StatsDashboard';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const LegacyStatsRedirect = () => {
  const { boardId } = useParams();
  return <Navigate to={`/board/${boardId}/analysis`} replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/boards" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/dashboard" element={<Navigate to="/boards" replace />} />
        <Route path="/board/:id" element={<PrivateRoute><BoardDetail /></PrivateRoute>} />
        <Route path="/board/:boardId/analysis" element={<PrivateRoute><StatsDashboard /></PrivateRoute>} />
        <Route path="/dashboard/:boardId" element={<LegacyStatsRedirect />} />
        <Route path="*" element={<Navigate to="/boards" />} />
      </Routes>
    </Router>
  );
}

export default App;
