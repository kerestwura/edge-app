import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import AuthCallback from '@/pages/AuthCallback';
import Dashboard from '@/pages/Dashboard';
import NewTrade from '@/pages/NewTrade';
import VoiceTrade from '@/pages/VoiceTrade';
import Journal from '@/pages/Journal';
import TradeDetail from '@/pages/TradeDetail';
import Insights from '@/pages/Insights';
import Profile from '@/pages/Profile';
import '@/App.css';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }
    if (user === false || user === null) return <Navigate to="/login" replace />;
    return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user && user !== false) return <Navigate to="/" replace />;
    return children;
};

function AppRouter() {
    const location = useLocation();
    if (location.hash?.includes('session_id=')) {
        return <AuthCallback />;
    }
    return (
        <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/new-trade" element={<ProtectedRoute><NewTrade /></ProtectedRoute>} />
            <Route path="/voice-trade" element={<ProtectedRoute><VoiceTrade /></ProtectedRoute>} />
            <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
            <Route path="/trade/:id" element={<ProtectedRoute><TradeDetail /></ProtectedRoute>} />
            <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRouter />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
