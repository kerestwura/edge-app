import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import TraderDNA from '../components/TraderDNA';
import { Loader2, Sparkles, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid } from 'recharts';

const tooltipStyle = { background: 'hsl(240,6%,6.5%)', border: '1px solid hsl(240,6%,14%)', borderRadius: 6, fontSize: 12 };

const Insights = () => {
    const [dna, setDna] = useState(null);
    const [insights, setInsights] = useState(null);
    const [explanation, setExplanation] = useState(null);
    const [reflections, setReflections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [genExpl, setGenExpl] = useState(false);
    const [genRefl, setGenRefl] = useState(false);

    useEffect(() => {
        Promise.all([api.get('/dna'), api.get('/trades/insights'), api.get('/ai/reflections')])
            .then(([d,i,r]) => { setDna(d.data); setInsights(i.data); setReflections(r.data); })
            .catch(console.error).finally(() => setLoading(false));
    }, []);

    const genExp = async () => { if(!dna?.scores)return; setGenExpl(true); try{const{data}=await api.post('/ai/dna-explanation',{scores:dna.scores});setExplanation(data);}catch(e){console.error(e);}finally{setGenExpl(false);} };
    const genRef = async () => { setGenRefl(true); try{const{data}=await api.post('/ai/weekly-reflection');setReflections(p=>[data,...p]);}catch(e){console.error(e);}finally{setGenRefl(false);} };

    if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    const sessionData = insights?.session_performance ? Object.entries(insights.session_performance).map(([k,v])=>({name:k,...v})) : [];
    const setupData = insights?.setup_stats ? Object.entries(insights.setup_stats).map(([k,v])=>({name:k,...v})).sort((a,b)=>b.total_pnl-a.total_pnl) : [];

    return (
        <div className="space-y-6 animate-fade-up" data-testid="insights-page">
            <div>
                <h1 className="font-heading text-[22px] font-bold tracking-tight">Insights</h1>
                <p className="text-[13px] text-muted-foreground mt-0.5">Behavioral analysis and performance patterns</p>
            </div>

            {/* Key Metrics */}
            {insights && (insights.best_setup || insights.most_damaging_emotion) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
                    {insights.best_setup && <div className="premium-card p-4 !border-profit/15" data-testid="insight-best-setup"><span className="text-[9px] uppercase tracking-[0.18em] text-profit font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3"/>Best Setup</span><p className="font-heading text-[15px] font-bold mt-1.5">{insights.best_setup.name}</p><p className="text-[10px] text-muted-foreground mt-1">{insights.best_setup.count} trades · {insights.best_setup.win_rate}% WR · <span className="font-mono text-profit">${insights.best_setup.total_pnl}</span></p></div>}
                    {insights.worst_setup && <div className="premium-card p-4 !border-loss/15" data-testid="insight-worst-setup"><span className="text-[9px] uppercase tracking-[0.18em] text-loss font-medium flex items-center gap-1"><TrendingDown className="w-3 h-3"/>Worst Setup</span><p className="font-heading text-[15px] font-bold mt-1.5">{insights.worst_setup.name}</p><p className="text-[10px] text-muted-foreground mt-1">{insights.worst_setup.count} trades · {insights.worst_setup.win_rate}% WR · <span className="font-mono text-loss">${insights.worst_setup.total_pnl}</span></p></div>}
                    {insights.most_damaging_emotion && <div className="premium-card p-4" data-testid="insight-damaging-emotion"><span className="text-[9px] uppercase tracking-[0.18em] text-loss font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Damaging Emotion</span><p className="font-heading text-[15px] font-bold mt-1.5 capitalize">{insights.most_damaging_emotion}</p><p className="text-[10px] text-muted-foreground mt-1">Most frequent in losing trades</p></div>}
                    {insights.top_mistake && <div className="premium-card p-4" data-testid="insight-top-mistake"><span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Top Mistake</span><p className="font-heading text-[15px] font-bold mt-1.5">{insights.top_mistake}</p><p className="text-[10px] text-muted-foreground mt-1">Most repeated error</p></div>}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left: DNA + Session Chart */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="premium-card-glow p-5 animate-glow">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-heading text-[14px] font-bold">Trader DNA</h2>
                            <button onClick={genExp} disabled={genExpl} className="flex items-center gap-1 text-[10px] text-primary hover:text-accent font-medium disabled:opacity-50 transition-colors" data-testid="analyze-dna-btn">
                                {genExpl?<Loader2 className="w-3 h-3 animate-spin"/>:<Sparkles className="w-3 h-3"/>} AI Analysis
                            </button>
                        </div>
                        <TraderDNA scores={dna?.scores} explanations={dna?.explanations} size={240} showExplanations />
                    </div>
                    {explanation && (
                        <div className="premium-card !border-primary/20 p-5 animate-fade-in" data-testid="dna-explanation">
                            <h3 className="text-[9px] uppercase tracking-[0.18em] text-primary font-semibold mb-2.5 flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Insights</h3>
                            <p className="text-[12px] leading-relaxed text-foreground/80 mb-3">{explanation.overall_summary}</p>
                            {explanation.strengths?.length>0&&<div className="mb-2">{explanation.strengths.map((s,i)=><p key={i} className="text-[11px] text-foreground/60"><span className="text-profit">+</span> {s}</p>)}</div>}
                            {explanation.improvements?.length>0&&<div className="mb-2">{explanation.improvements.map((s,i)=><p key={i} className="text-[11px] text-foreground/60"><span className="text-loss">-</span> {s}</p>)}</div>}
                            {explanation.tip&&<div className="pt-2 border-t border-border/50"><p className="text-[11px] text-primary"><span className="font-semibold">Tip:</span> {explanation.tip}</p></div>}
                        </div>
                    )}
                    {sessionData.length > 0 && (
                        <div className="premium-card p-5">
                            <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4 flex items-center gap-1"><BarChart3 className="w-3 h-3"/> Session P&L</h3>
                            <ResponsiveContainer width="100%" height={170}>
                                <BarChart data={sessionData}>
                                    <XAxis dataKey="name" tick={{fill:'hsl(240,5%,55%)',fontSize:10}} axisLine={false} tickLine={false}/>
                                    <YAxis tick={{fill:'hsl(240,5%,55%)',fontSize:10}} axisLine={false} tickLine={false}/>
                                    <Tooltip contentStyle={tooltipStyle}/>
                                    <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4EC2E1"/><stop offset="100%" stopColor="#9F70E1"/></linearGradient></defs>
                                    <Bar dataKey="pnl" fill="url(#barGrad)" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Right: Setups + Reflections */}
                <div className="lg:col-span-7 space-y-4">
                    {setupData.length > 0 && (
                        <div className="premium-card p-5">
                            <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">Setup Performance</h3>
                            <div className="space-y-2.5">
                                {setupData.map(s => (
                                    <div key={s.name} className="flex items-center gap-3" data-testid={`setup-stat-${s.name}`}>
                                        <span className="text-[12px] font-medium w-28 truncate">{s.name}</span>
                                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full ${s.total_pnl>=0?'bg-profit':'bg-loss'}`} style={{width:`${Math.min(100,s.win_rate)}%`}}/></div>
                                        <span className="font-mono text-[10px] text-muted-foreground w-12 text-right">{s.win_rate}%</span>
                                        <span className={`font-mono text-[11px] w-16 text-right font-bold ${s.total_pnl>=0?'text-profit':'text-loss'}`}>${s.total_pnl}</span>
                                        <span className="text-[9px] text-muted-foreground/60 w-10 text-right">{s.count}t</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {insights?.confidence_vs_outcome?.length > 3 && (
                        <div className="premium-card p-5">
                            <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">Confidence vs Outcome</h3>
                            <ResponsiveContainer width="100%" height={180}>
                                <ScatterChart><CartesianGrid stroke="hsl(240,6%,14%)" strokeDasharray="3 3"/>
                                    <XAxis dataKey="confidence" name="Confidence" tick={{fill:'hsl(240,5%,55%)',fontSize:10}} domain={[1,10]} axisLine={false}/>
                                    <YAxis dataKey="pnl" name="P&L" tick={{fill:'hsl(240,5%,55%)',fontSize:10}} axisLine={false}/>
                                    <Tooltip contentStyle={tooltipStyle}/><Scatter data={insights.confidence_vs_outcome} fill="#9F70E1"/>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="premium-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-heading text-[14px] font-bold">Weekly Reflections</h2>
                            <button onClick={genRef} disabled={genRefl} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-[11px] font-semibold rounded-md hover:brightness-110 disabled:opacity-50 transition-all" data-testid="generate-reflection-btn">
                                {genRefl?<Loader2 className="w-3 h-3 animate-spin"/>:<RefreshCw className="w-3 h-3"/>}{genRefl?'Generating...':'Generate'}
                            </button>
                        </div>
                        {reflections.length===0?(
                            <div className="text-center py-10"><p className="text-muted-foreground text-[13px]">No reflections yet. Log trades and generate your first weekly reflection.</p></div>
                        ):(
                            <div className="space-y-3">
                                {reflections.slice(0,5).map((r,i)=>(
                                    <div key={r.id||i} className={`premium-card p-4 ${i===0?'!border-primary/20':''}`} data-testid={`reflection-${i}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-muted-foreground font-mono">{new Date(r.created_at).toLocaleDateString()}</span>
                                            <div className="flex gap-2 items-center">
                                                {r.trades_count!=null&&<span className="chip chip-default text-[9px]">{r.trades_count}t</span>}
                                                {r.total_pnl!=null&&<span className={`font-mono text-[11px] font-bold ${r.total_pnl>=0?'text-profit':'text-loss'}`}>{r.total_pnl>=0?'+':''}${r.total_pnl?.toFixed(2)}</span>}
                                            </div>
                                        </div>
                                        <p className="text-[12px] leading-relaxed text-foreground/80 mb-2">{r.summary}</p>
                                        {r.recommendation&&<p className="text-[11px] text-primary/80 border-t border-border/50 pt-2"><span className="font-semibold">Focus:</span> {r.recommendation}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Insights;
