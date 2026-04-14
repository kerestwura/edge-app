import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Journal = () => {
    const navigate = useNavigate();
    const [trades, setTrades] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ market_type: '', direction: '', symbol: '' });
    const [page, setPage] = useState(0);
    const limit = 20;

    const fetchTrades = async () => {
        setLoading(true);
        try {
            const params = { limit, skip: page * limit, sort: '-created_at' };
            Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
            const { data } = await api.get('/trades', { params });
            setTrades(data.trades); setTotal(data.total);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTrades(); }, [page, filters]); // eslint-disable-line

    const totalPages = Math.ceil(total / limit);
    const hasFilters = Object.values(filters).some(v => v);

    return (
        <div className="animate-fade-up" data-testid="journal-page">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="font-heading text-[20px] lg:text-[22px] font-bold tracking-tight">Trade Journal</h1>
                    <p className="text-[12px] lg:text-[13px] text-muted-foreground mt-0.5">{total} trades</p>
                </div>
                <button onClick={() => navigate('/new-trade')} className="px-3 lg:px-4 py-2 bg-primary text-primary-foreground text-[12px] lg:text-[13px] font-semibold rounded-md hover:brightness-110 transition-all" data-testid="new-trade-btn">+ New Trade</button>
            </div>

            {/* Filters */}
            <div className="premium-card p-2.5 lg:p-3 mb-4 flex items-center gap-1.5 lg:gap-2 flex-wrap" data-testid="journal-filters">
                <div className="flex items-center premium-input !py-1.5 !px-2.5 gap-1.5 w-28 lg:w-36">
                    <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <input type="text" placeholder="Symbol..." value={filters.symbol}
                        onChange={e => { setFilters(f => ({...f, symbol: e.target.value})); setPage(0); }}
                        className="bg-transparent text-[12px] lg:text-[13px] text-foreground focus:outline-none w-full" data-testid="filter-symbol" />
                </div>
                {['futures', 'forex', 'crypto'].map(mt => (
                    <button key={mt} onClick={() => { setFilters(f => ({...f, market_type: f.market_type === mt ? '' : mt})); setPage(0); }}
                        className={`chip ${filters.market_type === mt ? 'chip-selected' : 'chip-default'} uppercase tracking-wider`} data-testid={`filter-${mt}`}>{mt}</button>
                ))}
                {['long', 'short'].map(d => (
                    <button key={d} onClick={() => { setFilters(f => ({...f, direction: f.direction === d ? '' : d})); setPage(0); }}
                        className={`chip ${filters.direction === d ? (d==='long'?'chip-profit':'chip-loss') : 'chip-default'} uppercase tracking-wider`} data-testid={`filter-${d}`}>{d}</button>
                ))}
                {hasFilters && <button onClick={() => { setFilters({ market_type:'', direction:'', symbol:'' }); setPage(0); }} className="text-[11px] text-primary hover:text-accent ml-1 font-medium" data-testid="clear-filters">Clear</button>}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : trades.length === 0 ? (
                <div className="premium-card p-16 text-center"><p className="text-muted-foreground text-[13px] mb-2">No trades found</p><button onClick={() => navigate('/new-trade')} className="text-primary text-[13px] font-medium">Log a trade</button></div>
            ) : (
                <>
                    {/* Desktop table — hidden on mobile */}
                    <div className="premium-card overflow-hidden hidden lg:block">
                        <table className="w-full" data-testid="trades-table">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Symbol','Side','Entry','Exit','Size','P&L','R','Setup','Session','Date'].map(h => (
                                        <th key={h} className="text-left text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold px-4 py-3">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {trades.map(t => (
                                    <tr key={t.id} onClick={() => navigate(`/trade/${t.id}`)}
                                        className="border-b border-border/40 hover:bg-secondary/30 cursor-pointer transition-colors duration-100"
                                        data-testid={`journal-row-${t.id}`}>
                                        <td className="px-4 py-3"><span className="font-mono text-[13px] font-bold">{t.symbol}</span></td>
                                        <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase ${t.direction === 'long' ? 'text-profit' : 'text-loss'}`}>{t.direction}</span></td>
                                        <td className="px-4 py-3 font-mono text-[12px]">{t.entry_price?.toFixed(2) || '—'}</td>
                                        <td className="px-4 py-3 font-mono text-[12px]">{t.exit_price?.toFixed(2) || '—'}</td>
                                        <td className="px-4 py-3 font-mono text-[12px]">{t.position_size}</td>
                                        <td className="px-4 py-3">
                                            <span className={`font-mono text-[12px] font-bold flex items-center gap-0.5 ${t.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                                {t.pnl >= 0 ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}${Math.abs(t.pnl||0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{t.pnl_r ? `${t.pnl_r}R` : '—'}</td>
                                        <td className="px-4 py-3 text-[11px] text-muted-foreground">{t.setup_type || '—'}</td>
                                        <td className="px-4 py-3 text-[11px] text-muted-foreground">{t.session || '—'}</td>
                                        <td className="px-4 py-3 text-[11px] text-muted-foreground font-mono">{t.entry_time ? new Date(t.entry_time).toLocaleDateString() : new Date(t.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile card list — hidden on desktop */}
                    <div className="lg:hidden space-y-2" data-testid="trades-mobile-list">
                        {trades.map(t => (
                            <button key={t.id} onClick={() => navigate(`/trade/${t.id}`)}
                                className="premium-card p-3.5 w-full text-left transition-colors hover:bg-secondary/30"
                                data-testid={`journal-row-${t.id}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-1 h-10 rounded-full ${t.pnl >= 0 ? 'bg-profit' : 'bg-loss'}`} />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[14px] font-bold">{t.symbol}</span>
                                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${t.direction === 'long' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>{t.direction}</span>
                                                {t.timeframe && <span className="text-[9px] text-muted-foreground font-mono">{t.timeframe}</span>}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {t.setup_type || '—'}{t.session ? ` · ${t.session}` : ''} · {t.entry_time ? new Date(t.entry_time).toLocaleDateString() : new Date(t.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-mono text-[14px] font-bold flex items-center gap-0.5 ${t.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                            {t.pnl >= 0 ? <ArrowUpRight className="w-3.5 h-3.5"/> : <ArrowDownRight className="w-3.5 h-3.5"/>}
                                            ${Math.abs(t.pnl||0).toFixed(2)}
                                        </p>
                                        {t.pnl_r ? <p className="font-mono text-[10px] text-muted-foreground">{t.pnl_r > 0 ? '+' : ''}{t.pnl_r}R</p> : null}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-[11px] text-muted-foreground">Page {page + 1} of {totalPages}</p>
                            <div className="flex gap-2">
                                <button disabled={page===0} onClick={() => setPage(p=>p-1)} className="chip chip-default disabled:opacity-30" data-testid="prev-page">Prev</button>
                                <button disabled={page>=totalPages-1} onClick={() => setPage(p=>p+1)} className="chip chip-default disabled:opacity-30" data-testid="next-page">Next</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Journal;
