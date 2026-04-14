import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight } from 'lucide-react';

function formatApiError(d) { if(!d)return'Something went wrong.';if(typeof d==='string')return d;if(Array.isArray(d))return d.map(e=>e?.msg||JSON.stringify(e)).join(' ');return String(d); }

const RegisterPage = () => {
    const { register, googleLogin } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
        setError(''); setLoading(true);
        try { await register(email, password, name); navigate('/'); }
        catch (err) { setError(formatApiError(err.response?.data?.detail) || err.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden" data-testid="register-page">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4EC2E1]/[0.03] via-transparent to-[#9F70E1]/[0.03]" />
            <div className="relative z-10 w-full max-w-[400px] px-6 animate-fade-up">
                <div className="flex justify-center mb-10">
                    <img src="/edge-logo.jpg" alt="EDGE" className="h-[72px] w-auto object-contain" draggable={false} data-testid="register-logo" />
                </div>
                <div className="premium-card p-7">
                    <h2 className="font-heading text-xl font-bold mb-0.5">Create account</h2>
                    <p className="text-[13px] text-muted-foreground mb-7">Start mastering your trading psychology</p>
                    {error && <div className="bg-loss/8 border border-loss/15 text-loss text-[13px] p-3 rounded-md mb-5" data-testid="register-error">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div><label className="block text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2 font-medium">Name</label><input type="text" value={name} onChange={e=>setName(e.target.value)} className="premium-input w-full" placeholder="Your name" required data-testid="register-name-input"/></div>
                        <div><label className="block text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2 font-medium">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="premium-input w-full" placeholder="trader@example.com" required data-testid="register-email-input"/></div>
                        <div><label className="block text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2 font-medium">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="premium-input w-full" placeholder="Min 6 characters" required data-testid="register-password-input"/></div>
                        <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-md hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-[14px]" data-testid="register-submit-btn">{loading?'Creating...':'Create Account'}{!loading&&<ArrowRight className="w-4 h-4"/>}</button>
                    </form>
                    <div className="my-7 flex items-center gap-4"><div className="flex-1 h-px bg-border"/><span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">or</span><div className="flex-1 h-px bg-border"/></div>
                    <button onClick={googleLogin} className="w-full premium-card !bg-secondary border-border text-foreground font-medium py-2.5 rounded-md hover:border-primary/30 transition-all flex items-center justify-center gap-2.5 text-[14px]" data-testid="google-register-btn"><svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Continue with Google</button>
                    <p className="text-center text-[13px] text-muted-foreground mt-7">Already have an account? <Link to="/login" className="text-primary hover:text-accent transition-colors font-medium" data-testid="login-link">Sign in</Link></p>
                </div>
            </div>
        </div>
    );
};
export default RegisterPage;
