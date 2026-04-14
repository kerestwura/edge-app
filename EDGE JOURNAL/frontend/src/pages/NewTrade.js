import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Check } from 'lucide-react';

const SYMBOLS = { futures: ['ES','NQ','MNQ','MES','CL','GC'], forex: ['EUR/USD','GBP/USD','USD/JPY','XAU/USD'], crypto: ['BTCUSDT','ETHUSDT','SOLUSDT'] };
const EMOTIONS = { positive: ['Calm','Confident','Focused','Patient','Disciplined','Grateful'], negative: ['Fear','FOMO','Greed','Revenge','Anxiety','Frustration','Overconfident','Impulsive'] };
const SETUPS = ['Breakout','Pullback','Trend Follow','Mean Reversion','Scalp','Range Trade','Reversal','News'];
const TIMEFRAMES = ['1m','5m','15m','30m','1H','4H','D','W'];
const SESSIONS = ['Pre-Market','New York','London','Asian','Post-Market'];
const MISTAKES = ['Moved stop loss','No stop loss','Overtraded','Oversized position','Revenge trade','FOMO entry','Early exit','Late entry','Ignored plan','Bad R:R','Chased price','Against trend'];

const Chips = ({ options, selected, onChange, variant = 'default' }) => (
    <div className="flex flex-wrap gap-1.5">
        {options.map(o => {
            const active = selected.includes(o);
            const cls = active ? (variant==='profit'?'chip-profit':variant==='loss'?'chip-loss':'chip-selected') : 'chip-default';
            return <button key={o} type="button" onClick={() => onChange(active ? selected.filter(s=>s!==o) : [...selected, o])} className={`chip ${cls}`}>{o}</button>;
        })}
    </div>
);

const NewTrade = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [mt, setMt] = useState('futures');
    const [f, setF] = useState({ symbol:'ES', direction:'long', entry_price:'', exit_price:'', stop_loss:'', take_profit:'', position_size:'1', risk:'', fees:'0', reasoning:'', setup_type:'', notes:'', lesson_learned:'', status:'closed', entry_time:'', exit_time:'', timeframe:'', session:'', confidence_score:5, discipline_score:5, focus_score:5, followed_plan:true });
    const [eb, setEb] = useState([]); const [ed, setEd] = useState([]); const [ea, setEa] = useState([]);
    const [mistakes, setMistakes] = useState([]);
    const [rf, setRf] = useState([]); const [rb, setRb] = useState([]); const [ri, setRi] = useState('');
    const [cs, setCs] = useState('');
    const [error, setError] = useState('');
    const [showMore, setShowMore] = useState(false);

    const u = (k, v) => setF(p => ({...p, [k]: v}));
    const syms = SYMBOLS[mt] || [];

    const submit = async (e) => {
        e.preventDefault();
        if (!f.entry_price) { setError('Entry price is required'); return; }
        setError(''); setLoading(true);
        try {
            const payload = { ...f, symbol: cs || f.symbol, market_type: mt === 'custom' ? 'custom' : mt,
                entry_price: parseFloat(f.entry_price), exit_price: f.exit_price ? parseFloat(f.exit_price) : null,
                stop_loss: f.stop_loss ? parseFloat(f.stop_loss) : null, take_profit: f.take_profit ? parseFloat(f.take_profit) : null,
                position_size: parseFloat(f.position_size) || 1, risk: f.risk ? parseFloat(f.risk) : null, fees: parseFloat(f.fees) || 0,
                emotions_before: eb, emotions_during: ed, emotions_after: ea, mistake_tags: mistakes, rules_followed: rf, rules_broken: rb };
            const { data } = await api.post('/trades', payload);
            navigate(`/trade/${data.id}`);
        } catch (err) { setError(err.response?.data?.detail || 'Failed to save'); }
        finally { setLoading(false); }
    };

    const addRule = (type) => { if (!ri.trim()) return; if (type==='f') setRf([...rf, ri.trim()]); else setRb([...rb, ri.trim()]); setRi(''); };

    return (
        <div className="max-w-3xl mx-auto animate-fade-up" data-testid="new-trade-page">
            <h1 className="font-heading text-[20px] lg:text-[22px] font-bold tracking-tight mb-0.5">Log Trade</h1>
            <p className="text-[12px] lg:text-[13px] text-muted-foreground mb-5 lg:mb-6">Fill essentials and save. Add details anytime.</p>
            {error && <div className="bg-loss/8 border border-loss/15 text-loss text-[13px] p-3 rounded-md mb-4" data-testid="trade-error">{error}</div>}

            <form onSubmit={submit} className="space-y-4">
                {/* Instrument + Direction */}
                <div className="premium-card p-5 space-y-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.keys(SYMBOLS).map(m => (
                            <button key={m} type="button" onClick={() => { setMt(m); u('symbol', SYMBOLS[m][0]); setCs(''); }}
                                className={`chip ${mt===m?'chip-selected':'chip-default'} uppercase tracking-wider`} data-testid={`market-${m}`}>{m}</button>
                        ))}
                        <button type="button" onClick={() => { setMt('custom'); setCs(''); }}
                            className={`chip ${mt==='custom'?'chip-selected':'chip-default'} uppercase tracking-wider`} data-testid="market-custom">Custom</button>
                        <span className="w-px h-4 bg-border mx-0.5" />
                        {mt !== 'custom' && syms.map(s => (
                            <button key={s} type="button" onClick={() => { u('symbol', s); setCs(''); }}
                                className={`chip font-mono font-bold ${f.symbol === s && !cs ? 'chip-selected' : 'chip-default'}`} data-testid={`symbol-${s}`}>{s}</button>
                        ))}
                        <input type="text" placeholder="Custom..." value={cs} onChange={e => setCs(e.target.value.toUpperCase())}
                            className="premium-input !py-1 !px-2 text-[12px] font-mono w-20" data-testid="custom-symbol-input" />
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => u('direction','long')} className={`flex-1 py-2.5 rounded-md text-[13px] font-bold transition-all ${f.direction==='long' ? 'bg-profit/10 text-profit border border-profit/25' : 'bg-secondary text-muted-foreground border border-border'}`} data-testid="direction-long">LONG</button>
                        <button type="button" onClick={() => u('direction','short')} className={`flex-1 py-2.5 rounded-md text-[13px] font-bold transition-all ${f.direction==='short' ? 'bg-loss/10 text-loss border border-loss/25' : 'bg-secondary text-muted-foreground border border-border'}`} data-testid="direction-short">SHORT</button>
                    </div>
                </div>

                {/* Prices */}
                <div className="premium-card p-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[['entry_price','Entry *'],['exit_price','Exit'],['stop_loss','Stop Loss'],['take_profit','Take Profit'],['position_size','Size'],['risk','Risk $'],['fees','Fees']].map(([k,l]) => (
                            <div key={k}><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">{l}</label>
                            <input type="number" step="any" value={f[k]} onChange={e=>u(k,e.target.value)} className="premium-input w-full font-mono text-[13px]" placeholder="0" data-testid={`input-${k}`}/></div>
                        ))}
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Status</label>
                            <div className="flex gap-1.5">{['closed','open'].map(s => <button key={s} type="button" onClick={()=>u('status',s)} className={`flex-1 py-1.5 rounded-md text-[11px] font-medium capitalize ${f.status===s?'chip-selected border border-primary/30':'bg-secondary text-muted-foreground border border-border'}`} data-testid={`status-${s}`}>{s}</button>)}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Entry Time</label><input type="datetime-local" value={f.entry_time} onChange={e=>u('entry_time',e.target.value)} className="premium-input w-full text-[13px]" data-testid="input-entry-time"/></div>
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Exit Time</label><input type="datetime-local" value={f.exit_time} onChange={e=>u('exit_time',e.target.value)} className="premium-input w-full text-[13px]" data-testid="input-exit-time"/></div>
                    </div>
                </div>

                {/* Setup + TF + Session */}
                <div className="premium-card p-5 space-y-3">
                    <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2 font-medium">Setup</label><Chips options={SETUPS} selected={f.setup_type?[f.setup_type]:[]} onChange={a=>u('setup_type',a[a.length-1]||'')}/></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2 font-medium">Timeframe</label><div className="flex flex-wrap gap-1.5">{TIMEFRAMES.map(t=><button key={t} type="button" onClick={()=>u('timeframe',f.timeframe===t?'':t)} className={`chip font-mono ${f.timeframe===t?'chip-selected':'chip-default'}`} data-testid={`tf-${t}`}>{t}</button>)}</div></div>
                        <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2 font-medium">Session</label><div className="flex flex-wrap gap-1.5">{SESSIONS.map(s=><button key={s} type="button" onClick={()=>u('session',f.session===s?'':s)} className={`chip ${f.session===s?'chip-selected':'chip-default'}`} data-testid={`session-${s.toLowerCase().replace(/\s/g,'-')}`}>{s}</button>)}</div></div>
                    </div>
                </div>

                {/* Psychology */}
                <div className="premium-card p-5 space-y-3">
                    <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Psychology</h3>
                    <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-1.5 font-medium">Before</label><Chips options={[...EMOTIONS.positive,...EMOTIONS.negative]} selected={eb} onChange={setEb}/></div>
                    <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-1.5 font-medium">During</label><Chips options={[...EMOTIONS.positive,...EMOTIONS.negative]} selected={ed} onChange={setEd}/></div>
                    <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-1.5 font-medium">After</label><Chips options={[...EMOTIONS.positive,...EMOTIONS.negative]} selected={ea} onChange={setEa}/></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        {[['Confidence','confidence_score'],['Discipline','discipline_score'],['Focus','focus_score']].map(([l,k])=>(
                            <div key={k}><div className="flex justify-between mb-1"><span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">{l}</span><span className="font-mono text-[11px] text-primary font-bold">{f[k]}</span></div>
                            <input type="range" min="1" max="10" value={f[k]} onChange={e=>u(k,parseInt(e.target.value))} className="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer accent-primary" data-testid={`score-${l.toLowerCase()}`}/></div>
                        ))}
                    </div>
                    <button type="button" onClick={()=>u('followed_plan',!f.followed_plan)} className={`chip ${f.followed_plan?'chip-profit':'chip-loss'} text-[12px] px-3 py-1.5`} data-testid="followed-plan-btn">
                        {f.followed_plan ? <><Check className="w-3 h-3"/> Followed Plan</> : <>&times; Did NOT Follow Plan</>}
                    </button>
                </div>

                {/* Mistakes */}
                <div className="premium-card p-5">
                    <label className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 font-semibold">Mistakes</label>
                    <Chips options={MISTAKES} selected={mistakes} onChange={setMistakes} variant="loss" />
                </div>

                {/* Advanced */}
                <button type="button" onClick={()=>setShowMore(!showMore)} className="text-[12px] text-primary hover:text-accent font-medium transition-colors" data-testid="toggle-advanced">{showMore?'Hide':'Show'} Notes & Rules</button>
                {showMore && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="premium-card p-5 space-y-3">
                            <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Reasoning</label><textarea value={f.reasoning} onChange={e=>u('reasoning',e.target.value)} rows={2} className="premium-input w-full resize-none" placeholder="Why did you take this trade?" data-testid="input-reasoning"/></div>
                            <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Lesson Learned</label><textarea value={f.lesson_learned} onChange={e=>u('lesson_learned',e.target.value)} rows={2} className="premium-input w-full resize-none" placeholder="What did you learn?" data-testid="input-lesson"/></div>
                            <div><label className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 font-medium">Notes</label><textarea value={f.notes} onChange={e=>u('notes',e.target.value)} rows={2} className="premium-input w-full resize-none" placeholder="Additional notes..." data-testid="input-notes"/></div>
                        </div>
                        <div className="premium-card p-5 space-y-2">
                            <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Rules</h3>
                            <div className="flex gap-2"><input type="text" value={ri} onChange={e=>setRi(e.target.value)} placeholder="e.g., Waited for confirmation" className="premium-input flex-1" data-testid="rule-input" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addRule('f');}}}/><button type="button" onClick={()=>addRule('f')} className="chip chip-profit px-3">Followed</button><button type="button" onClick={()=>addRule('b')} className="chip chip-loss px-3">Broken</button></div>
                            {rf.length>0&&<div className="flex flex-wrap gap-1.5">{rf.map((r,i)=><span key={i} className="chip chip-profit"><Check className="w-3 h-3"/>{r}<button type="button" onClick={()=>setRf(rf.filter((_,j)=>j!==i))} className="ml-1">&times;</button></span>)}</div>}
                            {rb.length>0&&<div className="flex flex-wrap gap-1.5">{rb.map((r,i)=><span key={i} className="chip chip-loss">&times; {r}<button type="button" onClick={()=>setRb(rb.filter((_,j)=>j!==i))} className="ml-1">&times;</button></span>)}</div>}
                        </div>
                    </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-md hover:brightness-110 transition-all disabled:opacity-50 text-[14px]" data-testid="submit-trade-btn">{loading ? 'Saving...' : 'Save Trade'}</button>
            </form>
        </div>
    );
};

export default NewTrade;
