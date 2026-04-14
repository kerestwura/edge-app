import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { User, Save, Check } from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({ name:'', default_market:'futures', default_timeframe:'5m', trading_style:'', risk_per_trade:'', max_daily_trades:'', strategies:[] });
    const [ns, setNs] = useState('');

    useEffect(() => {
        api.get('/profile').then(({data:d}) => {
            setForm({ name:d.name||'', default_market:d.profile?.default_market||'futures', default_timeframe:d.profile?.default_timeframe||'5m', trading_style:d.profile?.trading_style||'', risk_per_trade:d.profile?.risk_per_trade||'', max_daily_trades:d.profile?.max_daily_trades||'', strategies:d.profile?.strategies||[] });
        }).catch(console.error).finally(()=>setLoading(false));
    }, []);

    const save = async () => {
        setSaving(true); setSaved(false);
        try { await api.put('/profile', {...form, risk_per_trade:form.risk_per_trade?parseFloat(form.risk_per_trade):null, max_daily_trades:form.max_daily_trades?parseInt(form.max_daily_trades):null}); setSaved(true); setTimeout(()=>setSaved(false),2000); }
        catch(e){console.error(e);} finally{setSaving(false);}
    };

    const addStrat = () => { if(ns.trim()&&!form.strategies.includes(ns.trim())){setForm(f=>({...f,strategies:[...f.strategies,ns.trim()]}));setNs('');} };

    if(loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div>;

    return (
        <div className="max-w-2xl mx-auto animate-fade-up" data-testid="profile-page">
            <h1 className="font-heading text-[22px] font-bold tracking-tight mb-0.5">Profile</h1>
            <p className="text-[13px] text-muted-foreground mb-6">Your preferences and trading settings</p>

            <div className="space-y-4">
                <div className="premium-card p-5">
                    <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4 flex items-center gap-2"><User className="w-3.5 h-3.5"/>Account</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Name</label><input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="premium-input w-full" data-testid="profile-name"/></div>
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Email</label><input type="email" value={user?.email||''} disabled className="premium-input w-full !opacity-50 cursor-not-allowed" data-testid="profile-email"/></div>
                    </div>
                </div>

                <div className="premium-card p-5">
                    <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">Trading Preferences</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Default Market</label><select value={form.default_market} onChange={e=>setForm(f=>({...f,default_market:e.target.value}))} className="premium-input w-full" data-testid="profile-market"><option value="futures">Futures</option><option value="forex">Forex</option><option value="crypto">Crypto</option></select></div>
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Default Timeframe</label><select value={form.default_timeframe} onChange={e=>setForm(f=>({...f,default_timeframe:e.target.value}))} className="premium-input w-full" data-testid="profile-timeframe">{['1m','5m','15m','30m','1H','4H','D','W'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Trading Style</label><select value={form.trading_style} onChange={e=>setForm(f=>({...f,trading_style:e.target.value}))} className="premium-input w-full" data-testid="profile-style"><option value="">Select...</option><option value="scalper">Scalper</option><option value="day_trader">Day Trader</option><option value="swing_trader">Swing Trader</option><option value="position_trader">Position Trader</option></select></div>
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Risk per Trade ($)</label><input type="number" value={form.risk_per_trade} onChange={e=>setForm(f=>({...f,risk_per_trade:e.target.value}))} className="premium-input w-full font-mono" placeholder="200" data-testid="profile-risk"/></div>
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Max Daily Trades</label><input type="number" value={form.max_daily_trades} onChange={e=>setForm(f=>({...f,max_daily_trades:e.target.value}))} className="premium-input w-full font-mono" placeholder="5" data-testid="profile-max-trades"/></div>
                    </div>
                </div>

                <div className="premium-card p-5">
                    <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">My Strategies</h3>
                    <div className="flex gap-2 mb-3">
                        <input type="text" value={ns} onChange={e=>setNs(e.target.value)} placeholder="e.g., Opening Range Breakout" className="premium-input flex-1" data-testid="strategy-input" onKeyDown={e=>{if(e.key==='Enter')addStrat();}}/>
                        <button onClick={addStrat} className="px-3 py-2 bg-primary text-primary-foreground text-[11px] font-semibold rounded-md hover:brightness-110 transition-all" data-testid="add-strategy-btn">Add</button>
                    </div>
                    {form.strategies.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">{form.strategies.map((s,i)=>(
                            <span key={i} className="chip chip-selected">{s}<button onClick={()=>setForm(f=>({...f,strategies:f.strategies.filter((_,j)=>j!==i)}))} className="ml-1 hover:text-foreground">&times;</button></span>
                        ))}</div>
                    ) : <p className="text-[12px] text-muted-foreground">Add strategies to select them when logging trades</p>}
                </div>

                <button onClick={save} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-md hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[14px]" data-testid="save-profile-btn">
                    {saved?<><Check className="w-4 h-4"/>Saved!</>:saving?'Saving...':<><Save className="w-4 h-4"/>Save Profile</>}
                </button>
            </div>
        </div>
    );
};

export default Profile;
