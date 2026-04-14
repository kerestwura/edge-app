import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Mic, Square, Loader2, Check, Edit3, RotateCcw } from 'lucide-react';

const VoiceTrade = () => {
    const navigate = useNavigate();
    const [recording, setRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [parsedTrade, setParsedTrade] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState('record');
    const [error, setError] = useState('');
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRec = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mr; chunksRef.current = [];
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = handleComplete; mr.start(); setRecording(true); setError('');
        } catch { setError('Microphone access denied.'); }
    };

    const stopRec = () => {
        if (mediaRecorderRef.current?.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
        setRecording(false);
    };

    const handleComplete = async () => {
        setProcessing(true); setStep('processing');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const fd = new FormData(); fd.append('file', blob, 'recording.webm');
        try {
            const tr = await api.post('/ai/transcribe', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setTranscript(tr.data.text);
            const pr = await api.post('/ai/parse-trade', { text: tr.data.text });
            if (pr.data.error) { setError('Could not parse trade data.'); setStep('record'); }
            else { setParsedTrade(pr.data); setStep('review'); }
        } catch (e) { setError(e.response?.data?.detail || 'Processing failed.'); setStep('record'); }
        finally { setProcessing(false); }
    };

    const saveTrade = async () => {
        if (!parsedTrade) return; setSaving(true);
        try {
            const p = { ...parsedTrade, entry_price: parseFloat(parsedTrade.entry_price)||0, exit_price: parsedTrade.exit_price?parseFloat(parsedTrade.exit_price):null, stop_loss: parsedTrade.stop_loss?parseFloat(parsedTrade.stop_loss):null, take_profit: parsedTrade.take_profit?parseFloat(parsedTrade.take_profit):null, position_size: parseFloat(parsedTrade.position_size)||1, fees: parseFloat(parsedTrade.fees)||0 };
            const { data } = await api.post('/trades', p); navigate(`/trade/${data.id}`);
        } catch (e) { setError(e.response?.data?.detail || 'Failed to save.'); }
        finally { setSaving(false); }
    };

    const reset = () => { setStep('record'); setTranscript(''); setParsedTrade(null); setError(''); };

    return (
        <div className="max-w-3xl mx-auto animate-fade-up" data-testid="voice-trade-page">
            <h1 className="font-heading text-[20px] lg:text-[22px] font-bold tracking-tight mb-0.5">Voice Trade Log</h1>
            <p className="text-[12px] lg:text-[13px] text-muted-foreground mb-6 lg:mb-8">Describe your trade and AI will parse it</p>

            {error && <div className="bg-loss/8 border border-loss/15 text-loss text-[13px] p-3 rounded-md mb-5" data-testid="voice-error">{error}</div>}

            {step === 'record' && (
                <div className="premium-card p-6 lg:p-10 text-center">
                    <p className="text-[12px] lg:text-[13px] text-muted-foreground mb-6 lg:mb-8 max-w-md mx-auto">Press to record. Include symbol, direction, entry, exit, stop loss, reasoning, and emotions.</p>
                    <button onClick={recording ? stopRec : startRec}
                        className={`w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center mx-auto transition-all duration-200 ${recording ? 'bg-loss/15 border-2 border-loss/40 recording-pulse' : 'bg-primary/10 border-2 border-primary/30 hover:border-primary hover:bg-primary/15'}`}
                        data-testid="record-btn">
                        {recording ? <Square className="w-6 h-6 lg:w-7 lg:h-7 text-loss" /> : <Mic className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />}
                    </button>
                    <p className="text-[11px] text-muted-foreground mt-4">{recording ? 'Recording... Click to stop' : 'Click to start recording'}</p>
                    <div className="mt-8 lg:mt-10 premium-card p-4 text-left max-w-lg mx-auto">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-[0.18em] mb-2 font-semibold">Example</p>
                        <p className="text-[12px] text-foreground/60 italic leading-relaxed">"Long NQ at 18420, stop 18390, target 18470, risk 300 dollars, felt calm before entry but slightly revenge-driven after the last loss, entered on opening range breakout with strong volume, exited partial at 18455 and full at 18478."</p>
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="premium-card p-16 text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-foreground font-medium text-[15px]">Processing your trade...</p>
                    <p className="text-[13px] text-muted-foreground mt-2">Transcribing audio and extracting data</p>
                </div>
            )}

            {step === 'review' && parsedTrade && (
                <div className="space-y-4 animate-fade-up">
                    <div className="premium-card p-5">
                        <h3 className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2 font-semibold">Transcript</h3>
                        <p className="text-[13px] text-foreground/70 italic leading-relaxed" data-testid="transcript-text">"{transcript}"</p>
                    </div>

                    <div className="premium-card p-5">
                        <h3 className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-4 font-semibold">Parsed Trade</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {[['Symbol',parsedTrade.symbol],['Direction',parsedTrade.direction],['Market',parsedTrade.market_type],['Entry',parsedTrade.entry_price],['Exit',parsedTrade.exit_price],['Stop Loss',parsedTrade.stop_loss],['Size',parsedTrade.position_size],['Setup',parsedTrade.setup_type],['Status',parsedTrade.status]].map(([l,v])=>(
                                <div key={l}>
                                    <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{l}</p>
                                    <p className={`font-mono text-[14px] font-bold mt-1 ${l==='Direction'?(v==='long'?'text-profit':'text-loss'):'text-foreground'}`} data-testid={`parsed-${l.toLowerCase().replace(/\s/g,'-')}`}>{v||'—'}</p>
                                </div>
                            ))}
                        </div>
                        {(parsedTrade.emotions_before?.length>0||parsedTrade.emotions_during?.length>0||parsedTrade.emotions_after?.length>0)&&(
                            <div className="mt-4 pt-4 border-t border-border/50">
                                <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2 font-medium">Emotions</p>
                                <div className="flex flex-wrap gap-1.5">{[...(parsedTrade.emotions_before||[]),...(parsedTrade.emotions_during||[]),...(parsedTrade.emotions_after||[])].map((e,i)=><span key={i} className="chip chip-selected">{e}</span>)}</div>
                            </div>
                        )}
                        {parsedTrade.reasoning&&<div className="mt-4 pt-4 border-t border-border/50"><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1 font-medium">Reasoning</p><p className="text-[12px] text-foreground/70">{parsedTrade.reasoning}</p></div>}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={saveTrade} disabled={saving} className="flex-1 bg-primary text-primary-foreground font-semibold py-3 rounded-md hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-[14px]" data-testid="save-parsed-trade-btn"><Check className="w-4 h-4"/>{saving?'Saving...':'Save Trade'}</button>
                        <button onClick={()=>navigate('/new-trade')} className="px-5 py-3 bg-secondary border border-border text-foreground rounded-md hover:border-primary/30 transition-all flex items-center gap-2 text-[13px]" data-testid="edit-trade-btn"><Edit3 className="w-4 h-4"/>Edit</button>
                        <button onClick={reset} className="px-5 py-3 bg-secondary border border-border text-muted-foreground rounded-md hover:text-foreground transition-all flex items-center gap-2 text-[13px]" data-testid="retry-btn"><RotateCcw className="w-4 h-4"/>Retry</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceTrade;
