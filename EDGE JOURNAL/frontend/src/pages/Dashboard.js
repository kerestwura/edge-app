import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import TraderDNA from '../components/TraderDNA';
import { TrendingUp, TrendingDown, Target, BarChart3, PenLine, Mic, ArrowUpRight, ArrowDownRight, Zap, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const StatCard = ({ label, value, prefix = '', suffix = '', isPositive, icon: Icon }) => (
    <div className="premium-card p-4" data-testid={`stat-${label.toLowerCase().replace(/[\s\/]/g, '-')}`}>
        <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{label}</span>
            {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/50" strokeWidth={1.5} />}
        </div>
        <p className={`font-mono text-[22px] font-bold leading-none ${isPositive === true ? 'text-profit' : isPositive === false ? 'text-loss' : 'text-foreground'}`}>
            {prefix}{typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: value % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 }) : value}{suffix}
        </p>
    </div>
);

const EquityCurveTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="premium-card !bg-[hsl(240,6%,6.5%)] p-3 !border-primary/20 shadow-xl">
            <p className="text-[10px] text-muted-foreground font-mono mb-1">{d.date}</p>
            <p className={`font-mono text-[14px] font-bold ${d.cumulative_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {d.cumulative_pnl >= 0 ? '+' : ''}${d.cumulative_pnl?.toFixed(2)}
            </p>
            {d.pnl !== 0 && (
                <p className={`font-mono text-[10px] mt-0.5 ${d.pnl >= 0 ? 'text-profit/60' : 'text-loss/60'}`}>
                    Trade: {d.pnl >= 0 ? '+' : ''}${d.pnl?.toFixed(2)} · {d.symbol}
                </p>
            )}
        </div>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [dna, setDna] = useState(null);
    const [equityData, setEquityData] = useState(null);
    const [equityPeriod, setEquityPeriod] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.get('/trades/stats'), api.get('/dna'), api.get('/trades/equity-curve?period=all')])
            .then(([s, d, e]) => {
                setStats(s.data);
                setDna(d.data);
                setEquityData(e.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (loading) return;
        api.get(`/trades/equity-curve?period=${equityPeriod}`)
            .then(r => setEquityData(r.data))
            .catch(console.error);
    }, [equityPeriod, loading]);

    const equityCurveColor = useMemo(() => {
        if (!equityData?.length) return '#818CF8';
        const last = equityData[equityData.length - 1]?.cumulative_pnl || 0;
        return last >= 0 ? '#34D399' : '#FB7185';
    }, [equityData]);

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const hasTrades = stats?.total_trades > 0;
    const hasEquityData = equityData && equityData.length > 0;

    return (
        <div className="space-y-5" data-testid="dashboard-page">
            {/* Header */}
            <div className="flex items-center justify-between animate-fade-up">
                <div>
                    <h1 className="font-heading text-[20px] lg:text-[22px] font-bold tracking-tight">Dashboard</h1>
                    <p className="text-[12px] lg:text-[13px] text-muted-foreground mt-0.5">Your trading performance at a glance</p>
                </div>
                <div className="hidden sm:flex gap-2">
                    <button onClick={() => navigate('/new-trade')} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[13px] font-semibold rounded-md hover:brightness-110 transition-all" data-testid="quick-log-btn">
                        <PenLine className="w-3.5 h-3.5" /> New Trade
                    </button>
                    <button onClick={() => navigate('/voice-trade')} className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border text-foreground text-[13px] font-medium rounded-md hover:border-primary/30 transition-all" data-testid="voice-log-btn">
                        <Mic className="w-3.5 h-3.5" /> Voice
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children" data-testid="stats-grid">
                <StatCard label="Total P&L" value={stats?.total_pnl || 0} prefix="$" isPositive={stats?.total_pnl > 0 ? true : stats?.total_pnl < 0 ? false : undefined} icon={stats?.total_pnl >= 0 ? TrendingUp : TrendingDown} />
                <StatCard label="Win Rate" value={stats?.win_rate || 0} suffix="%" icon={Target} />
                <StatCard label="Avg R" value={stats?.avg_r || 0} suffix="R" isPositive={stats?.avg_r > 0 ? true : stats?.avg_r < 0 ? false : undefined} icon={Zap} />
                <StatCard label="Trades" value={stats?.total_trades || 0} icon={BarChart3} />
            </div>

            {/* P&L Equity Curve — ALWAYS VISIBLE */}
            <div className="premium-card p-5 animate-fade-up" data-testid="equity-curve-card">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="font-heading text-[14px] font-bold">P&L Equity Curve</h2>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Cumulative performance over time</p>
                    </div>
                    <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5" data-testid="equity-period-toggle">
                        {[['7d', '7D'], ['30d', '30D'], ['all', 'All']].map(([val, label]) => (
                            <button key={val} onClick={() => setEquityPeriod(val)}
                                className={`px-3 py-1 rounded text-[11px] font-medium transition-all ${
                                    equityPeriod === val
                                        ? 'bg-primary/15 text-primary'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                data-testid={`equity-${val}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {hasEquityData ? (
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={equityData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                            <defs>
                                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={equityCurveColor} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={equityCurveColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="hsl(240,6%,11%)" strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: 'hsl(240,5%,45%)', fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }}
                                axisLine={false} tickLine={false}
                                tickFormatter={v => { const d = new Date(v); return `${d.getMonth()+1}/${d.getDate()}`; }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fill: 'hsl(240,5%,45%)', fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }}
                                axisLine={false} tickLine={false}
                                tickFormatter={v => `$${v}`}
                                width={55}
                            />
                            <Tooltip content={<EquityCurveTooltip />} cursor={{ stroke: 'hsl(240,6%,20%)', strokeWidth: 1 }} />
                            <Area
                                type="monotone"
                                dataKey="cumulative_pnl"
                                stroke={equityCurveColor}
                                strokeWidth={2}
                                fill="url(#equityGradient)"
                                dot={false}
                                activeDot={{ r: 4, fill: equityCurveColor, stroke: 'hsl(240,10%,3.9%)', strokeWidth: 2 }}
                                animationDuration={800}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    /* Empty state — always visible */
                    <div className="flex flex-col items-center justify-center h-[200px] text-center" data-testid="equity-curve-empty">
                        <div className="relative w-full h-[120px] mb-4 overflow-hidden rounded-md">
                            <svg className="w-full h-full opacity-[0.08]" viewBox="0 0 800 120" preserveAspectRatio="none">
                                <defs><linearGradient id="emptyGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4EC2E1"/><stop offset="100%" stopColor="#9F70E1"/></linearGradient></defs>
                                <path d="M0,100 C100,90 200,80 300,70 C400,55 500,45 600,50 C700,55 800,30 800,30" fill="none" stroke="url(#emptyGrad)" strokeWidth="2" strokeDasharray="6 4" />
                                <path d="M0,100 C100,90 200,80 300,70 C400,55 500,45 600,50 C700,55 800,30 L800,120 L0,120 Z" fill="url(#emptyGrad)" fillOpacity="0.15" />
                            </svg>
                        </div>
                        <p className="text-[13px] text-muted-foreground">Your equity curve will appear after your first trade</p>
                        <button onClick={() => navigate('/new-trade')} className="text-[12px] text-primary hover:text-accent font-medium mt-2 transition-colors">
                            Log a trade to get started
                        </button>
                    </div>
                )}
            </div>

            {/* Secondary insights */}
            {hasTrades && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger-children">
                    {stats.best_setup && (
                        <div className="premium-card p-4" data-testid="best-setup-card">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-profit font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Best Setup</span>
                            <p className="font-heading text-base font-bold mt-2">{stats.best_setup.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">{stats.best_setup.trades} trades · {stats.best_setup.win_rate}% WR · <span className="font-mono text-profit">${stats.best_setup.pnl}</span></p>
                        </div>
                    )}
                    {stats.most_common_mistake && (
                        <div className="premium-card p-4" data-testid="common-mistake-card">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-loss font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Top Mistake</span>
                            <p className="font-heading text-base font-bold mt-2">{stats.most_common_mistake}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">Most frequent error pattern</p>
                        </div>
                    )}
                    {Object.keys(stats.emotional_summary || {}).length > 0 && (
                        <div className="premium-card p-4" data-testid="emotional-summary-card">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Top Emotions</span>
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {Object.entries(stats.emotional_summary).slice(0, 5).map(([e, c]) => (
                                    <span key={e} className="chip chip-selected capitalize">{e} <span className="text-muted-foreground">({c})</span></span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main: DNA + Recent Trades */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 stagger-children">
                <div className="lg:col-span-5 premium-card-glow p-5 lg:p-6 animate-glow">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="font-heading text-[15px] font-bold">Trader DNA</h2>
                        <span className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{background:'linear-gradient(135deg,#4EC2E1,#9F70E1)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Behavioral Profile</span>
                    </div>
                    <TraderDNA scores={dna?.scores} explanations={dna?.explanations} size={240} showExplanations />
                </div>

                <div className="lg:col-span-7 premium-card p-5 lg:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-heading text-[15px] font-bold">Recent Trades</h2>
                        {hasTrades && <button onClick={() => navigate('/journal')} className="text-[11px] text-primary hover:text-accent transition-colors font-medium" data-testid="view-all-trades-btn">View All</button>}
                    </div>
                    {!hasTrades ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <img src="https://static.prod-images.emergentagent.com/jobs/63bdea9c-5c8c-4528-8282-b6838df57281/images/6e5b20bc4313c33fa8ff8aa248146080f4ca104212f0d92dceb288ef4dcc83f4.png" alt="" className="w-40 opacity-30 mb-5" />
                            <p className="text-muted-foreground text-[13px] mb-2">No trades logged yet</p>
                            <button onClick={() => navigate('/new-trade')} className="text-primary text-[13px] hover:text-accent font-medium transition-colors" data-testid="start-logging-btn">Log your first trade</button>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {stats.recent_trades?.slice(0, 7).map((t) => (
                                <button key={t.id} onClick={() => navigate(`/trade/${t.id}`)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 rounded-md transition-all duration-150 text-left group"
                                    data-testid={`trade-row-${t.id}`}>
                                    <div className={`w-[3px] h-7 rounded-full ${t.pnl >= 0 ? 'bg-profit' : 'bg-loss'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[13px] font-bold text-foreground">{t.symbol}</span>
                                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${t.direction === 'long' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>{t.direction}</span>
                                            {t.timeframe && <span className="text-[9px] text-muted-foreground font-mono">{t.timeframe}</span>}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.setup_type || '—'}{t.session ? ` · ${t.session}` : ''}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-mono text-[13px] font-bold flex items-center gap-0.5 ${t.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                            {t.pnl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}${Math.abs(t.pnl).toFixed(2)}
                                        </p>
                                        {t.pnl_r ? <p className="font-mono text-[10px] text-muted-foreground">{t.pnl_r > 0 ? '+' : ''}{t.pnl_r}R</p> : null}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
