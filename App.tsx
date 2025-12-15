
import React, { useState, useEffect, useRef } from 'react';
import { AppMode, CalendarContext, ApprovedContent, PlannedContent } from './types';
import { STRATEGY_DATA, STUDENT_DATABASE } from './constants';
import OrganizationView from './components/OrganizationView';
import ChoiceMode from './components/ChoiceMode';
import GeminiAdvisor from './components/GeminiAdvisor';
import CalendarView from './components/CalendarView';
import LoginScreen from './components/LoginScreen';
import { LayoutDashboard, Layers, CalendarDays, LogOut, User, Eye } from 'lucide-react';

export default function App() {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<string>('');

  // --- APP DATA STATE ---
  const [mode, setMode] = useState<AppMode>(AppMode.ORGANIZATION);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [calendarContext, setCalendarContext] = useState<CalendarContext | null>(null);
  
  // Ref for scrolling to advisor
  const advisorRef = useRef<HTMLDivElement>(null);

  // --- CHECK LOGIN ON MOUNT ---
  useEffect(() => {
    const savedAuth = localStorage.getItem('roma_is_authenticated');
    const savedUser = localStorage.getItem('roma_user_name');
    if (savedAuth === 'true') {
        setIsAuthenticated(true);
        if (savedUser) setCurrentUser(savedUser);
    }
    setIsAuthChecking(false);
  }, []);

  // --- DATA PERSISTENCE ---
  const [approvedContent, setApprovedContent] = useState<Record<string, ApprovedContent>>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('roma_approved_content');
        return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [plannedContent, setPlannedContent] = useState<Record<string, PlannedContent>>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('roma_planned_content');
        return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('roma_approved_content', JSON.stringify(approvedContent));
  }, [approvedContent]);

  useEffect(() => {
    localStorage.setItem('roma_planned_content', JSON.stringify(plannedContent));
  }, [plannedContent]);

  // --- AUTH HANDLERS ---
  const handleLogin = (email: string, password: string) => {
      // PROCURA O ALUNO NA LISTA (SIMULAÇÃO DE BANCO DE DADOS)
      const foundUser = STUDENT_DATABASE.find(user => 
        (user.email.toLowerCase() === email.toLowerCase() || user.email === 'admin') && 
        user.password === password
      );
      
      if (foundUser) {
          setIsAuthenticated(true);
          setCurrentUser(foundUser.name);
          localStorage.setItem('roma_is_authenticated', 'true');
          localStorage.setItem('roma_user_name', foundUser.name);
          return true;
      }
      return false;
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser('');
      localStorage.removeItem('roma_is_authenticated');
      localStorage.removeItem('roma_user_name');
  };

  // --- APP HANDLERS ---
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  const handleGenerateFromCalendar = (context: CalendarContext) => {
    setCalendarContext(context);
    setTimeout(() => {
      advisorRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleApproveContent = (item: ApprovedContent) => {
    setApprovedContent(prev => ({ ...prev, [item.id]: item }));
  };

  const handleDeleteApproved = (id: string) => {
    setApprovedContent(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
    });
  };

  const handleSavePlan = (item: PlannedContent) => {
    setPlannedContent(prev => ({ ...prev, [item.id]: item }));
  };

  const handleDeletePlan = (id: string) => {
    setPlannedContent(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
    });
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
      case AppMode.VISUALIZATION:
        return (
          <ChoiceMode data={STRATEGY_DATA} />
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
              onSavePlan={handleSavePlan}
              onDeletePlan={handleDeletePlan}
              onDeleteApproved={handleDeleteApproved}
              approvedItems={approvedContent}
              plannedItems={plannedContent}
            />
            
            <div ref={advisorRef} className="border-t border-slate-200 pt-8 print:hidden">
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

  // --- RENDER CONDITIONAL ---
  if (isAuthChecking) return null; // Or a loading spinner

  if (!isAuthenticated) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
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
            
            <div className="flex items-center space-x-4">
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
                    onClick={() => setMode(AppMode.VISUALIZATION)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    mode === AppMode.VISUALIZATION 
                        ? 'bg-white text-indigo-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar
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

                <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                <div className="flex items-center space-x-2">
                    {currentUser && (
                        <div className="hidden lg:flex items-center text-xs font-bold text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                            <User size={12} className="mr-1.5" />
                            Olá, {currentUser.split(' ')[0]}
                        </div>
                    )}
                    <button 
                        onClick={handleLogout}
                        className="flex items-center space-x-2 text-slate-400 hover:text-red-600 transition-colors text-sm font-medium px-2 py-2 rounded-md hover:bg-red-50"
                        title="Sair"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:w-full print:max-w-none">
        {renderContent()}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Roma Strategy Organizer. Powered by Gemini API.
        </div>
      </footer>
    </div>
  );
}
