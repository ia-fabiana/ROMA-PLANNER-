import React, { useState, useEffect, useRef } from 'react';
import { AppMode, CalendarContext, ApprovedContent, ContentType } from './types';
import { STRATEGY_DATA } from './constants';
import OrganizationView from './components/OrganizationView';
import GeminiAdvisor from './components/GeminiAdvisor';
import CalendarView from './components/CalendarView';
import { LayoutDashboard, Bot, Layers, CalendarDays } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.ORGANIZATION);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [calendarContext, setCalendarContext] = useState<CalendarContext | null>(null);
  
  // Ref for scrolling to advisor
  const advisorRef = useRef<HTMLDivElement>(null);

  // Store approved content keyed by "date-type"
  const [approvedContent, setApprovedContent] = useState<Record<string, ApprovedContent>>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('roma_approved_content');
        return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('roma_approved_content', JSON.stringify(approvedContent));
  }, [approvedContent]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  const handleGenerateFromCalendar = (context: CalendarContext) => {
    setCalendarContext(context);
    // We stay in Calendar mode, but scroll to the advisor
    setTimeout(() => {
      advisorRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleApproveContent = (item: ApprovedContent) => {
    setApprovedContent(prev => ({
        ...prev,
        [item.id]: item
    }));
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.ORGANIZATION:
        return (
          <OrganizationView 
            data={STRATEGY_DATA} 
            selectedIds={selectedIds} 
            onToggleSelection={toggleSelection} 
          />
        );
      case AppMode.AI_INSIGHTS:
        return (
          <GeminiAdvisor 
            data={STRATEGY_DATA} 
            selectedIds={selectedIds}
            calendarContext={calendarContext}
            onClearContext={() => setCalendarContext(null)}
            onApprove={handleApproveContent}
          />
        );
      case AppMode.CALENDAR:
        return (
          <div className="space-y-12">
            <CalendarView 
              data={STRATEGY_DATA}
              selectedIds={selectedIds}
              onGenerate={handleGenerateFromCalendar}
              approvedItems={approvedContent}
            />
            
            <div ref={advisorRef} className="border-t border-slate-200 pt-8">
               <GeminiAdvisor 
                data={STRATEGY_DATA} 
                selectedIds={selectedIds}
                calendarContext={calendarContext}
                onClearContext={() => setCalendarContext(null)}
                onApprove={handleApproveContent}
              />
            </div>
          </div>
        );
      default:
        return (
          <OrganizationView 
            data={STRATEGY_DATA} 
            selectedIds={selectedIds} 
            onToggleSelection={toggleSelection} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Roma Planner</h1>
                <p className="text-xs text-slate-500 font-medium">Estratégia & Atração de Clientes</p>
              </div>
            </div>
            
            <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
              <button
                onClick={() => setMode(AppMode.ORGANIZATION)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  mode === AppMode.ORGANIZATION 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Organizar
                {selectedIds.length > 0 && (
                  <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                    {selectedIds.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setMode(AppMode.CALENDAR)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  mode === AppMode.CALENDAR 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                Calendário & IA
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Roma Strategy Organizer. Powered by Gemini API.
        </div>
      </footer>
    </div>
  );
}