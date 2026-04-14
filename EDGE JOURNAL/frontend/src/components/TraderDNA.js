import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

const TraderDNA = ({ scores, explanations, size = 300, showExplanations = false }) => {
    const s = scores || {};
    const data = [
        { attribute: 'Discipline', score: s.discipline || 0 },
        { attribute: 'Patience', score: s.patience || 0 },
        { attribute: 'Execution', score: s.execution || 0 },
        { attribute: 'Emot. Ctrl', score: s.emotional_control || 0 },
        { attribute: 'Risk Mgmt', score: s.risk_management || 0 },
        { attribute: 'Focus', score: s.focus_consistency || 0 },
    ];

    const vals = Object.values(s);
    const avgScore = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;

    const scoreColor = (v) => v >= 70 ? 'text-profit' : v >= 40 ? 'text-amber-400' : 'text-loss';
    const scoreBg = (v) => v >= 70 ? 'bg-profit/8' : v >= 40 ? 'bg-amber-400/8' : 'bg-loss/8';

    return (
        <div data-testid="trader-dna-hexagon" className="animate-fade-up">
            <div className="relative">
                <ResponsiveContainer width="100%" height={size}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                        <PolarGrid stroke="hsl(240, 6%, 14%)" strokeWidth={0.5} />
                        <PolarAngleAxis
                            dataKey="attribute"
                            tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 11, fontFamily: '"IBM Plex Sans", sans-serif', fontWeight: 500 }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <defs>
                            <linearGradient id="dnaGradientEdge" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#4EC2E1" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#9F70E1" stopOpacity={0.08} />
                            </linearGradient>
                            <linearGradient id="dnaStrokeEdge" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#4EC2E1" />
                                <stop offset="100%" stopColor="#9F70E1" />
                            </linearGradient>
                        </defs>
                        <Radar
                            name="DNA" dataKey="score"
                            stroke="url(#dnaStrokeEdge)" fill="url(#dnaGradientEdge)"
                            strokeWidth={2}
                            dot={{ r: 3.5, fill: '#818CF8', stroke: '#09090B', strokeWidth: 2 }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <span className="font-mono text-[32px] font-bold text-foreground leading-none" data-testid="dna-avg-score">{avgScore}</span>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-[0.25em] mt-1.5 font-medium">DNA Score</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                    ['discipline', 'Discipline'], ['patience', 'Patience'], ['execution', 'Execution'],
                    ['emotional_control', 'Emot. Ctrl'], ['risk_management', 'Risk Mgmt'], ['focus_consistency', 'Focus'],
                ].map(([key, label]) => (
                    <div key={key} className={`text-center py-2 px-1 rounded-md ${scoreBg(s[key] || 0)}`}>
                        <p className={`font-mono text-[15px] font-bold ${scoreColor(s[key] || 0)}`}>{s[key] || 0}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-[0.15em] mt-0.5 font-medium">{label}</p>
                    </div>
                ))}
            </div>

            {showExplanations && explanations && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-2.5">
                    {[
                        ['discipline', 'Discipline'], ['patience', 'Patience'], ['execution', 'Execution'],
                        ['emotional_control', 'Emotional Control'], ['risk_management', 'Risk Management'], ['focus_consistency', 'Focus & Consistency'],
                    ].map(([key, label]) => (
                        explanations[key] ? (
                            <div key={key} className="flex items-start gap-2.5" data-testid={`dna-explanation-${key}`}>
                                <span className={`font-mono text-xs font-bold w-7 text-right flex-shrink-0 mt-0.5 ${scoreColor(s[key] || 0)}`}>{s[key] || 0}</span>
                                <p className="text-[12px] leading-relaxed text-muted-foreground">
                                    <span className="text-foreground/80 font-medium">{label}:</span> {explanations[key]}
                                </p>
                            </div>
                        ) : null
                    ))}
                </div>
            )}
        </div>
    );
};

export default TraderDNA;
