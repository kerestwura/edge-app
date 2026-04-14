import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API}/api/auth/me`, { withCredentials: true });
            setUser(data);
        } catch {
            setUser(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (window.location.hash?.includes('session_id=')) {
            setLoading(false);
            return;
        }
        checkAuth();
    }, [checkAuth]);

    const login = async (email, password) => {
        const { data } = await axios.post(`${API}/api/auth/login`, { email, password }, { withCredentials: true });
        setUser(data);
        return data;
    };

    const register = async (email, password, name) => {
        const { data } = await axios.post(`${API}/api/auth/register`, { email, password, name }, { withCredentials: true });
        setUser(data);
        return data;
    };

    const logout = async () => {
        await axios.post(`${API}/api/auth/logout`, {}, { withCredentials: true });
        setUser(false);
    };

    const googleLogin = () => {
        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        const redirectUrl = window.location.origin + '/auth/callback';
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    };

    const processGoogleSession = async (sessionId) => {
        const { data } = await axios.post(`${API}/api/auth/google-session`, { session_id: sessionId }, { withCredentials: true });
        setUser(data);
        return data;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, googleLogin, processGoogleSession, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};
