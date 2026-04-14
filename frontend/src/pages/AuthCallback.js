import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
    const { processGoogleSession } = useAuth();
    const navigate = useNavigate();
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const hash = window.location.hash;
        const sessionId = new URLSearchParams(hash.substring(1)).get('session_id');

        if (sessionId) {
            processGoogleSession(sessionId)
                .then(() => navigate('/', { replace: true }))
                .catch(() => navigate('/login', { replace: true }));
        } else {
            navigate('/login', { replace: true });
        }
    }, [processGoogleSession, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background" data-testid="auth-callback">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">Authenticating...</p>
            </div>
        </div>
    );
};

export default AuthCallback;
