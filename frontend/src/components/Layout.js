import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PenLine, Mic, BookOpen, LineChart } from 'lucide-react';
import Sidebar from './Sidebar';

const bottomNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Home' },
    { path: '/new-trade', icon: PenLine, label: 'Trade' },
    { path: '/voice-trade', icon: Mic, label: 'Voice' },
    { path: '/journal', icon: BookOpen, label: 'Journal' },
    { path: '/insights', icon: LineChart, label: 'Insights' },
];

const Layout = ({ children }) => {
    const location = useLocation();

    return (
        <div className="flex min-h-screen bg-background" data-testid="app-layout">
            {/* Desktop sidebar — hidden on mobile */}
            <div className="hidden lg:block">
                <Sidebar />
            </div>

            {/* Main content */}
            <main className="flex-1 lg:ml-[232px] p-4 pb-24 lg:p-8 lg:pb-8 max-w-full lg:max-w-[calc(100vw-232px)]">
                <div className="max-w-[1280px] mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile bottom nav — hidden on desktop */}
            <nav className="fixed bottom-0 left-0 right-0 lg:hidden glass border-t border-border z-50" data-testid="bottom-nav">
                <div className="flex items-center justify-around h-14 px-1">
                    {bottomNavItems.map(({ path, icon: Icon, label }) => {
                        const active = location.pathname === path;
                        return (
                            <NavLink key={path} to={path}
                                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-md min-w-[52px] transition-colors ${
                                    active ? 'text-primary' : 'text-muted-foreground'
                                }`}
                                data-testid={`bnav-${label.toLowerCase()}`}>
                                <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
                                <span className="text-[9px] font-medium tracking-wide">{label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default Layout;
