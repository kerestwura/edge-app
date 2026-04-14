import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Check, ChevronDown } from 'lucide-react';

const SYMBOLS = {
    futures: ['ES', 'NQ', 'MNQ', 'MES', 'CL', 'GC'],
    forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD'],
    crypto: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
};

const EMOTIONS = {
    positive: ['Calm', 'Confident', 'Focused', 'Patient', 'Disciplined', 'Grateful'],
    negative: ['Fear', 'FOMO', 'Greed', 'Revenge', 'Anxiety', 'Frustration', 'Overconfident', 'Impulsive'],
};

const SETUPS = ['Breakout', 'Pullback', 'Trend Follow', 'Mean Reversion', 'Scalp', 'Range Trade', 'Reversal', 'News'];

const EmotionPicker = ({ label, selected, onChange, testId }) => (
    <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{label}</label>
        <div className="flex flex-wrap gap-1.5" data-testid={testId}>
            {EMOTIONS.positive.map(e => (
                <button key={e} type="button" onClick={() => {
                    onChange(selected.includes(e) ? selected.filter(s => s !== e) : [...selected, e]);
                }}
                    className={`px-2 py-1 rounded-sm text-xs font-medium border transition-all ${
                        selected.includes(e) ? 'bg-profit/15 border-profit/40 text-profit' : 'border-border text-muted-foreground hover:border-profit/30 hover:text-profit/70'
                    }`}>{e}</button>
            ))}
            {EMOTIONS.negative.map(e => (
                <button key={e} type="button" onClick={() => {
                    onChange(selected.includes(e) ? selected.filter(s => s !== e) : [...selected, e]);
                }}
                    className={`px-2 py-1 rounded-sm text-xs font-medium border transition-all ${
                        selected.includes(e) ? 'bg-loss/15 border-loss/40 text-loss' : 'border-border text-muted-foreground hover:border-loss/30 hover:text-loss/70'
                    }`}>{e}</button>
            ))}
        </div>
    </div>
);

const QuickTrade = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [marketType, setMarketType] = useState('futures');
    const [form, setForm] = useState({
        symbol: 'ES', direction: 'long', entry_price: '', exit_price: '', stop_loss: '', take_profit: '',
        position_size: '1', fees: '0', reasoning: '', setup_type: '', notes: '',
        status: 'closed', entry_time: '', exit_time: '',
    });
    const [emotionsBefore, setEmotionsBefore] = useState([]);
    const [emotionsDuring, setEmotionsDuring] = useState([]);
    const [emotionsAfter, setEmotionsAfter] = useState([]);
    const [rulesFollowed, setRulesFollowed] = useState([]);
    const [rulesBroken, setRulesBroken] = useState([]);
    const [ruleInput, setRuleInput] = useState('');
    const [error, setError] = useState('');
    const [customSymbol, setCustomSymbol] = useState('');

    const update = (field, value) => setForm(f => ({ ...f, [field]: value }));
    const currentSymbols = SYMBOLS[marketType] || [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.entry_price) { setError('Entry price is required'); return; }
        setError('');
        setLoading(true);
        try {
            const payload = {
                ...form,
                symbol: customSymbol || form.symbol,
                market_type: marketType,
                entry_price: parseFloat(form.entry_price),
                exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
                stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : null,
                take_profit: form.take_profit ? parseFloat(form.take_profit) : null,
                position_size: parseFloat(form.position_size) || 1,
                fees: parseFloat(form.fees) || 0,
                emotions_before: emotionsBefore,
                emotions_during: emotionsDuring,
                emotions_after: emotionsAfter,
                rules_followed: rulesFollowed,
                rules_broken: rulesBroken,
            };
            const { data } = await api.post('/trades', payload);
            navigate(`/trade/${data.id}`);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save trade');
        } finally {
            setLoading(false);
        }
    };

    const addRule = (type) => {
        if (!ruleInput.trim()) return;
        if (type === 'followed') setRulesFollowed([...rulesFollowed, ruleInput.trim()]);
        else setRulesBroken([...rulesBroken, ruleInput.trim()]);
        setRuleInput('');
    };

    return (
        <div className="max-w-4xl mx-auto fade-in" data-testid="quick-trade-page">
            <h1 className="font-heading text-2xl font-bold tracking-tight mb-1">Quick Trade Log</h1>
            <p className="text-sm text-muted-foreground mb-6">Log a trade in seconds</p>

            {error && <div className="bg-loss/10 border border-loss/20 text-loss text-sm p-3 rounded-sm mb-4" data-testid="trade-error">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Market & Symbol */}
                <div className="bg-card border border-border rounded-sm p-5 space-y-4">
                    <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Instrument</h3>
                    <div className="flex gap-2">
                        {Object.keys(SYMBOLS).map(mt => (
                            <button key={mt} type="button" onClick={() => { setMarketType(mt); setForm(f => ({...f, symbol: SYMBOLS[mt][0]})); setCustomSymbol(''); }}
                                className={`px-3 py-1.5 rounded-sm text-xs font-medium uppercase tracking-wider transition-all ${
                                    marketType === mt ? 'bg-accent/15 text-accent border border-accent/30' : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'
                                }`} data-testid={`market-${mt}`}>{mt}</button>
                        ))}
                        <button type="button" onClick={() => { setMarketType('custom'); setCustomSymbol(''); }}
                            className={`px-3 py-1.5 rounded-sm text-xs font-medium uppercase tracking-wider transition-all ${
                                marketType === 'custom' ? 'bg-accent/15 text-accent border border-accent/30' : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'
                            }`} data-testid="market-custom">Custom</button>
                    </div>
                    <div className="flex gap-3">
                        {marketType !== 'custom' ? (
                            <div className="flex flex-wrap gap-1.5">
                                {currentSymbols.map(s => (
                                    <button key={s} type="button" onClick={() => { update('symbol', s); setCustomSymbol(''); }}
                                        className={`px-3 py-1.5 rounded-sm text-xs font-mono font-semibold transition-all ${
                                            form.symbol === s && !customSymbol ? 'bg-accent/15 text-accent border border-accent/30' : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'
                                        }`} data-testid={`symbol-${s}`}>{s}</button>
                                ))}
                            </div>
                        ) : null}
                        <input type="text" placeholder="Custom symbol..." value={customSymbol}
                            onChange={e => setCustomSymbol(e.target.value.toUpperCase())}
                            className="bg-input border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
                            data-testid="custom-symbol-input" />
                    </div>
                </div>

                {/* Direction & Status */}
                <div className="bg-card border border-border rounded-sm p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Direction</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => update('direction', 'long')}
                                    className={`flex-1 py-2 rounded-sm text-sm font-semibold transition-all ${
                                        form.direction === 'long' ? 'bg-profit/15 text-profit border border-profit/30' : 'bg-secondary text-muted-foreground border border-border'
                                    }`} data-testid="direction-long">LONG</button>
                                <button type="button" onClick={() => update('direction', 'short')}
                                    className={`flex-1 py-2 rounded-sm text-sm font-semibold transition-all ${
                                        form.direction === 'short' ? 'bg-loss/15 text-loss border border-loss/30' : 'bg-secondary text-muted-foreground border border-border'
                                    }`} data-testid="direction-short">SHORT</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Status</label>
                            <div className="flex gap-2">
                                {['closed', 'open'].map(s => (
                                    <button key={s} type="button" onClick={() => update('status', s)}
                                        className={`flex-1 py-2 rounded-sm text-sm font-medium capitalize transition-all ${
                                            form.status === s ? 'bg-accent/15 text-accent border border-accent/30' : 'bg-secondary text-muted-foreground border border-border'
                                        }`} data-testid={`status-${s}`}>{s}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prices */}
                <div className="bg-card border border-border rounded-sm p-5">
                    <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-4">Price Data</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            ['entry_price', 'Entry Price *'],
                            ['exit_price', 'Exit Price'],
                            ['stop_loss', 'Stop Loss'],
                            ['take_profit', 'Take Profit'],
                            ['position_size', 'Position Size'],
                            ['fees', 'Fees'],
                        ].map(([field, label]) => (
                            <div key={field}>
                                <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{label}</label>
                                <input type="number" step="any" value={form[field]} onChange={e => update(field, e.target.value)}
                                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="0.00" data-testid={`input-${field}`} />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Entry Time</label>
                            <input type="datetime-local" value={form.entry_time} onChange={e => update('entry_time', e.target.value)}
                                className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                data-testid="input-entry-time" />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Exit Time</label>
                            <input type="datetime-local" value={form.exit_time} onChange={e => update('exit_time', e.target.value)}
                                className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                data-testid="input-exit-time" />
                        </div>
                    </div>
                </div>

                {/* Setup Type */}
                <div className="bg-card border border-border rounded-sm p-5">
                    <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Setup Type</label>
                    <div className="flex flex-wrap gap-1.5">
                        {SETUPS.map(s => (
                            <button key={s} type="button" onClick={() => update('setup_type', form.setup_type === s ? '' : s)}
                                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
                                    form.setup_type === s ? 'bg-accent/15 text-accent border border-accent/30' : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'
                                }`} data-testid={`setup-${s.toLowerCase().replace(/\s/g, '-')}`}>{s}</button>
                        ))}
                    </div>
                </div>

                {/* Emotions */}
                <div className="bg-card border border-border rounded-sm p-5 space-y-4">
                    <EmotionPicker label="Emotions Before Trade" selected={emotionsBefore} onChange={setEmotionsBefore} testId="emotions-before" />
                    <EmotionPicker label="Emotions During Trade" selected={emotionsDuring} onChange={setEmotionsDuring} testId="emotions-during" />
                    <EmotionPicker label="Emotions After Trade" selected={emotionsAfter} onChange={setEmotionsAfter} testId="emotions-after" />
                </div>

                {/* Rules */}
                <div className="bg-card border border-border rounded-sm p-5 space-y-3">
                    <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Rules</h3>
                    <div className="flex gap-2">
                        <input type="text" value={ruleInput} onChange={e => setRuleInput(e.target.value)}
                            placeholder="e.g., Waited for confirmation"
                            className="flex-1 bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            data-testid="rule-input" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRule('followed'); }}} />
                        <button type="button" onClick={() => addRule('followed')}
                            className="px-3 py-2 bg-profit/10 text-profit text-xs font-medium rounded-sm border border-profit/20 hover:bg-profit/20" data-testid="add-rule-followed">Followed</button>
                        <button type="button" onClick={() => addRule('broken')}
                            className="px-3 py-2 bg-loss/10 text-loss text-xs font-medium rounded-sm border border-loss/20 hover:bg-loss/20" data-testid="add-rule-broken">Broken</button>
                    </div>
                    {rulesFollowed.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">{rulesFollowed.map((r, i) => (
                            <span key={i} className="px-2 py-1 bg-profit/10 text-profit text-xs rounded-sm border border-profit/20 flex items-center gap-1">
                                <Check className="w-3 h-3" />{r}
                                <button type="button" onClick={() => setRulesFollowed(rulesFollowed.filter((_, j) => j !== i))} className="ml-1 hover:text-foreground">&times;</button>
                            </span>
                        ))}</div>
                    )}
                    {rulesBroken.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">{rulesBroken.map((r, i) => (
                            <span key={i} className="px-2 py-1 bg-loss/10 text-loss text-xs rounded-sm border border-loss/20 flex items-center gap-1">
                                &times; {r}
                                <button type="button" onClick={() => setRulesBroken(rulesBroken.filter((_, j) => j !== i))} className="ml-1 hover:text-foreground">&times;</button>
                            </span>
                        ))}</div>
                    )}
                </div>

                {/* Notes */}
                <div className="bg-card border border-border rounded-sm p-5 space-y-4">
                    <div>
                        <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Reasoning / Analysis</label>
                        <textarea value={form.reasoning} onChange={e => update('reasoning', e.target.value)} rows={3}
                            className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            placeholder="Why did you take this trade?" data-testid="input-reasoning" />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Additional Notes</label>
                        <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2}
                            className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            placeholder="Any other notes..." data-testid="input-notes" />
                    </div>
                </div>

                <button type="submit" disabled={loading}
                    className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                    data-testid="submit-trade-btn">
                    {loading ? 'Saving...' : 'Save Trade'}
                </button>
            </form>
        </div>
    );
};

export default QuickTrade;
