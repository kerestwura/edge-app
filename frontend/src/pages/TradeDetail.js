import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, Trash2, ArrowUpRight, ArrowDownRight, Check, X } from 'lucide-react';

const TradeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trade, setTrade] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    useEffect(() => { api.get(`/trades/${id}`).then(r => setTrade(r.data)).catch(() => navigate('/journal')).finally(() => setLoading(false)); }, [id, navigate]);

    const handleDelete = async () => { setDeleting(true); try { await api.delete(`/trades/${id}`); navigate('/journal'); } catch(e){console.error(e);} finally{setDeleting(false);} };

    if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    if (!trade) return null;

    const isProfit = (trade.pnl || 0) >= 0;

    return (
        <div className="max-w-4xl mx-auto animate-fade-up" data-testid="trade-detail-page">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="back-btn">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Header */}
            <div className="premium-card p-6 mb-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-1.5 h-14 rounded-full ${isProfit ? 'bg-profit' : 'bg-loss'}`} />
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="font-heading text-[22px] font-bold">{trade.symbol}</h1>
                                <span className={`chip ${trade.direction === 'long' ? 'chip-profit' : 'chip-loss'} uppercase font-bold`}>{trade.direction}</span>
                                <span className="chip chip-default uppercase text-[9px]">{trade.market_type}</span>
                                {trade.timeframe && <span className="chip chip-default font-mono">{trade.timeframe}</span>}
                                {trade.session && <span className="chip chip-default">{trade.session}</span>}
                            </div>
                            <p className="text-[12px] text-muted-foreground mt-1.5">
                                {trade.setup_type && <span className="text-primary font-medium">{trade.setup_type}</span>}
                                {trade.entry_time ? ` · ${new Date(trade.entry_time).toLocaleString()}` : ` · ${new Date(trade.created_at).toLocaleString()}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className={`font-mono text-[28px] font-bold flex items-center gap-1 ${isProfit ? 'text-profit' : 'text-loss'}`} data-testid="trade-pnl">
                                {isProfit ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}${Math.abs(trade.pnl || 0).toFixed(2)}
                            </p>
                            <div className="flex gap-3 justify-end mt-0.5">
                                {trade.pnl_percent !== 0 && <span className={`font-mono text-[12px] ${isProfit ? 'text-profit/70' : 'text-loss/70'}`}>{trade.pnl_percent > 0 ? '+' : ''}{trade.pnl_percent?.toFixed(2)}%</span>}
                                {trade.pnl_r ? <span className={`font-mono text-[12px] ${isProfit ? 'text-profit/70' : 'text-loss/70'}`}>{trade.pnl_r > 0 ? '+' : ''}{trade.pnl_r}R</span> : null}
                            </div>
                        </div>
                        <button onClick={() => setShowDelete(true)} className="p-2 text-muted-foreground/50 hover:text-loss transition-colors rounded-md hover:bg-loss/5" data-testid="delete-trade-btn"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Execution Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
                {[['Entry',trade.entry_price],['Exit',trade.exit_price],['Stop Loss',trade.stop_loss],['Take Profit',trade.take_profit],['Size',trade.position_size],['Risk',trade.risk?`$${trade.risk}`:null],['Fees',trade.fees]].map(([l,v]) => (
                    <div key={l} className="premium-card p-3">
                        <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{l}</p>
                        <p className="font-mono text-[15px] font-bold mt-1.5">{v != null ? (typeof v === 'number' ? v.toFixed(2) : v) : '—'}</p>
                    </div>
                ))}
            </div>

            {/* Self-Assessment */}
            {(trade.confidence_score != null || trade.followed_plan != null) && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    {trade.confidence_score != null && <div className="premium-card p-3.5 text-center"><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Confidence</p><p className="font-mono text-xl font-bold text-primary mt-1">{trade.confidence_score}/10</p></div>}
                    {trade.discipline_score != null && <div className="premium-card p-3.5 text-center"><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Discipline</p><p className="font-mono text-xl font-bold text-primary mt-1">{trade.discipline_score}/10</p></div>}
                    {trade.focus_score != null && <div className="premium-card p-3.5 text-center"><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Focus</p><p className="font-mono text-xl font-bold text-primary mt-1">{trade.focus_score}/10</p></div>}
                    {trade.followed_plan != null && (
                        <div className={`premium-card p-3.5 text-center ${trade.followed_plan ? '!border-profit/20' : '!border-loss/20'}`}>
                            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Plan</p>
                            <p className={`text-[14px] font-semibold mt-2 flex items-center justify-center gap-1 ${trade.followed_plan ? 'text-profit' : 'text-loss'}`}>
                                {trade.followed_plan ? <><Check className="w-4 h-4" /> Followed</> : <><X className="w-4 h-4" /> Not Followed</>}
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 mb-5">
                {/* Emotions */}
                <div className="premium-card p-5">
                    <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">Emotions</h3>
                    {['emotions_before', 'emotions_during', 'emotions_after'].map(phase => (
                        trade[phase]?.length > 0 && (
                            <div key={phase} className="mb-3">
                                <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-1.5 font-medium">{phase.replace('emotions_', '')}</p>
                                <div className="flex flex-wrap gap-1.5">{trade[phase].map((e, i) => <span key={i} className="chip chip-selected">{e}</span>)}</div>
                            </div>
                        )
                    ))}
                    {![...(trade.emotions_before||[]),...(trade.emotions_during||[]),...(trade.emotions_after||[])].length && <p className="text-[13px] text-muted-foreground">No emotions tagged</p>}
                </div>

                {/* Mistakes + Rules */}
                <div className="premium-card p-5">
                    <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">Mistakes & Rules</h3>
                    {trade.mistake_tags?.length > 0 && <div className="mb-3"><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-1.5 font-medium">Mistakes</p><div className="flex flex-wrap gap-1.5">{trade.mistake_tags.map((m,i)=><span key={i} className="chip chip-loss">{m}</span>)}</div></div>}
                    {trade.rules_followed?.length > 0 && <div className="mb-3"><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-1.5 font-medium">Followed</p><div className="flex flex-wrap gap-1.5">{trade.rules_followed.map((r,i)=><span key={i} className="chip chip-profit">{r}</span>)}</div></div>}
                    {trade.rules_broken?.length > 0 && <div><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-1.5 font-medium">Broken</p><div className="flex flex-wrap gap-1.5">{trade.rules_broken.map((r,i)=><span key={i} className="chip chip-loss">{r}</span>)}</div></div>}
                </div>
            </div>

            {(trade.reasoning || trade.notes || trade.lesson_learned) && (
                <div className="premium-card p-5 space-y-4">
                    {trade.reasoning && <div><h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">Reasoning</h3><p className="text-[13px] leading-relaxed text-foreground/80" data-testid="trade-reasoning">{trade.reasoning}</p></div>}
                    {trade.lesson_learned && <div className="pt-3 border-t border-border/50"><h3 className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold mb-2">Lesson Learned</h3><p className="text-[13px] leading-relaxed text-foreground/80" data-testid="trade-lesson">{trade.lesson_learned}</p></div>}
                    {trade.notes && <div className="pt-3 border-t border-border/50"><h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">Notes</h3><p className="text-[13px] leading-relaxed text-foreground/80" data-testid="trade-notes">{trade.notes}</p></div>}
                </div>
            )}

            {showDelete && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" data-testid="delete-confirm-modal">
                    <div className="premium-card p-7 max-w-sm w-full mx-4">
                        <h3 className="font-heading text-lg font-bold mb-1.5">Delete Trade</h3>
                        <p className="text-[13px] text-muted-foreground mb-6">This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-loss/10 text-loss font-semibold py-2.5 rounded-md border border-loss/20 hover:bg-loss/20 disabled:opacity-50 text-[13px]" data-testid="confirm-delete-btn">{deleting?'Deleting...':'Delete'}</button>
                            <button onClick={() => setShowDelete(false)} className="flex-1 bg-secondary text-foreground font-medium py-2.5 rounded-md border border-border text-[13px]" data-testid="cancel-delete-btn">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TradeDetail;
