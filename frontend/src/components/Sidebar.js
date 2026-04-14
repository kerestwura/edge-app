import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, PenLine, Mic, BookOpen, LineChart, LogOut, User } from 'lucide-react';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/new-trade', icon: PenLine, label: 'New Trade' },
    { path: '/voice-trade', icon: Mic, label: 'Voice Log' },
    { path: '/journal', icon: BookOpen, label: 'Journal' },
    { path: '/insights', icon: LineChart, label: 'Insights' },
    { path: '/profile', icon: User, label: 'Profile' },
];

const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    return (
        <aside className="fixed left-0 top-0 h-full w-[232px] glass border-r border-border flex flex-col z-50" data-testid="sidebar">
            <div className="px-5 py-4 border-b border-border/50">
                <img src="/edge-logo.jpg" alt="EDGE" className="h-[38px] w-auto object-contain" draggable={false} data-testid="sidebar-logo" />
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5" data-testid="sidebar-nav">
                {navItems.map(({ path, icon: Icon, label }) => {
                    const active = location.pathname === path;
                    return (
                        <NavLink key={path} to={path}
                            className={`flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${
                                active ? 'nav-active bg-primary/8 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                            }`}
                            data-testid={`nav-${label.toLowerCase().replace(/\s/g, '-')}`}>
                            <Icon className={`w-[18px] h-[18px] ${active ? 'text-primary' : ''}`} strokeWidth={active ? 2 : 1.5} />
                            {label}
                        </NavLink>
                    );
                })}
            </nav>
            <div className="px-3 py-3 border-t border-border/50">
                <div className="flex items-center gap-2.5 px-3 py-2">
                    {user?.picture ? (
                        <img src={user.picture} alt="" className="w-7 h-7 rounded-full ring-1 ring-border" />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary text-[11px] font-bold">
                            {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{user?.name || 'Trader'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                    </div>
                </div>
                <button onClick={logout}
                    className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-150"
                    data-testid="logout-btn">
                    <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} /> Sign out
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
