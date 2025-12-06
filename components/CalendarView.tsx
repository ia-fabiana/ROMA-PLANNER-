
import React, { useState, useMemo, useEffect } from 'react';
import { Video, Image, Trophy, Target, Sparkles, X, CheckCircle2, ChevronLeft, ChevronRight as ChevronRightIcon, Maximize2, Tag, Search, Copy, Save, Edit, FileText, PieChart, BarChart2, AlertCircle, BookOpen, Star, Trash2 } from 'lucide-react';
import { StrategyItem, CalendarContext, ApprovedContent, ContentType, PlannedContent } from '../types';
import ReactMarkdown from 'react-markdown';

interface CalendarViewProps {
  data: StrategyItem[];
  selectedIds: string[]; // Received from App
  onGenerate: (context: CalendarContext) => void;
  onSavePlan: (plan: PlannedContent) => void;
  onDeletePlan: (id: string) => void;
  approvedItems: Record<string, ApprovedContent>;
  plannedItems: Record<string, PlannedContent>;
}

const WEEKLY_SCHEDULE = [
  { day: 'Segunda', focus: 'ATRAÇÃO (DESEJOS)', stories: 'Caixinha de pergunta - Chamada para seguir.', post: 'Post com motivação, frase simples (Conexão).', live: 'Bruno entrevista Fabi' },
  { day: 'Terça', focus: 'ENGAJAMENTO (DORES)', stories: 'Vídeo aprofundado (técnica) - CTA LISTA.', post: 'Carrossel com conteúdo que resolve dor específica.', live: null },
  { day: 'Quarta', focus: 'ATRAÇÃO (DIVULGAÇÃO)', stories: 'Caixinha de pergunta - Chamada para seguir.', post: 'Post anunciando Live (Antecipação).', live: 'Faça arte comigo' },
  { day: 'Quinta', focus: 'ENGAJAMENTO (TECNICA)', stories: 'Vídeo aprofundado (Seeding) - CTA LISTA.', post: 'Carrossel com conteúdo que resolve dor.', live: null },
  { day: 'Sexta', focus: 'ATRAÇÃO', stories: 'Caixinha de pergunta - Chamada para seguir.', post: 'Meme/Aúdio em alta (Viral).', live: null },
  { day: 'Sábado', focus: 'ENGAJAMENTO', stories: 'Vídeo aprofundado - CTA LISTA.', post: 'Livros (Indicação/Estudo).', live: null },
  { day: 'Domingo', focus: 'MEME / LIFESTYLE', stories: 'INTERAÇÃO / MEME', post: 'FOTOS LIFESTYLE (Conexão).', live: null }
];

const WARMUP_SCHEDULE = [
  { day: 'Segunda', focus: 'TSUNAMI (OPORTUNIDADE)', stories: 'Revelando a nova oportunidade (Tsunami).', post: 'Carrossel: "O mercado mudou".', live: 'Live 01: O Tsunami da IA' },
  { day: 'Terça', focus: 'CONSCIÊNCIA DA DOR', stories: 'Enquete sobre dores atuais.', post: 'Reels: Erros comuns.', live: null },
  { day: 'Quarta', focus: 'CONSCIÊNCIA DO PRODUTO', stories: 'Bastidores da Solução.', post: 'Foto/Vídeo resultado (Prova).', live: 'Live 02: Aprofundando ("Ensina sem Ensinar")' },
  { day: 'Quinta', focus: 'QUEBRA DE CRENÇA', stories: 'Caixinha: "Por que não começou?".', post: 'Mito vs. Verdade.', live: null },
  { day: 'Sexta', focus: 'ANTECIPAÇÃO', stories: 'Contagem regressiva.', post: 'O que você vai perder.', live: 'Live 03: Tira-Dúvidas' },
  { day: 'Sábado', focus: 'CONEXÃO / HISTÓRIA', stories: 'Minha história.', post: 'Foto pessoal inspiradora.', live: null },
  { day: 'Domingo', focus: 'ULTIMATO', stories: 'Última chamada.', post: 'Banner oficial.', live: null }
];

const LAUNCH_SCHEDULE = [
  { day: 'Segunda', focus: 'ABERTURA', stories: 'Atração - CTA para seguir.', post: 'Motivação + CTA EVENTO.', live: 'Live de Abertura' },
  { day: 'Terça', focus: 'QUEBRA DE OBJEÇÃO', stories: 'Vídeo quebra objeção.', post: 'Depoimento aluno + CTA.', live: 'Entrevista aluno' },
  { day: 'Quarta', focus: 'PROVA SOCIAL', stories: 'Depoimento aluno.', post: 'Conteúdo resolve dor + CTA.', live: 'Live Técnica (Demo)' },
  { day: 'Quinta', focus: 'QUEBRA DE OBJEÇÃO', stories: 'Vídeo quebra objeção.', post: 'Carrossel quebra objeção.', live: 'Entrevista aluno' },
  { day: 'Sexta', focus: 'PROVA SOCIAL', stories: 'Depoimento aluno.', post: 'Conteúdo resolve dor + CTA.', live: 'Live Encerramento' },
  { day: 'Sábado', focus: 'ATRAÇÃO', stories: 'Atração - CTA seguir.', post: 'Meme/áudio alta + CTA.', live: null },
  { day: 'Domingo', focus: 'VIRAL', stories: 'Meme/áudio alta.', post: 'Fotos Lifestyle.', live: null }
];

// --- KNOWLEDGE BASE: BOOK RECOMMENDATIONS ---
const BOOK_RECOMMENDATIONS = [
  { 
    title: "Dicas de Ouro com IA", 
    author: "Especialista em Prompts", 
    tag: "IA / Prompts",
    desc: "Um guia prático com prompts que resolvem problemas reais do dia a dia no salão."
  },
  { 
    title: "Inteligência Artificial para Negócios", 
    author: "Diversos Autores", 
    tag: "Inovação",
    desc: "Como a IA está transformando o mercado da beleza e atendimento."
  },
  { 
    title: "Marketing na Era Digital", 
    author: "Philip Kotler", 
    tag: "Marketing",
    desc: "Fundamentos essenciais para divulgar na era da tecnologia."
  },
  { 
    title: "O Jeito Disney de Encantar Clientes", 
    author: "Disney Institute", 
    tag: "Atendimento",
    desc: "Perfeito para falar sobre experiência do cliente e excelência."
  },
  { 
    title: "Gatilhos Mentais", 
    author: "Gustavo Ferreira", 
    tag: "Vendas",
    desc: "Ótimo para explicar como persuadir e vender mais."
  },
  { 
    title: "Comece pelo Porquê", 
    author: "Simon Sinek", 
    tag: "Propósito",
    desc: "Para posts sobre propósito de marca e inspiração."
  },
  { 
    title: "Mindset: A Nova Psicologia do Sucesso", 
    author: "Carol S. Dweck", 
    tag: "Mentalidade",
    desc: "Ideal para falar sobre crescimento e superação de desafios."
  },
  { 
    title: "Roube Como Um Artista", 
    author: "Austin Kleon", 
    tag: "Criatividade",
    desc: "Para falar sobre referências, criatividade e inovação."
  },
  { 
    title: "A Experiência Apple", 
    author: "Carmine Gallo", 
    tag: "Fidelização",
    desc: "Como criar fãs leais para o seu salão ou negócio."
  }
];

// Helper to format date consistently as YYYY-MM-DD in local time
const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CalendarView: React.FC<CalendarViewProps> = ({ data, selectedIds, onGenerate, onSavePlan, onDeletePlan, approvedItems, plannedItems }) => {
  const [viewMode, setViewMode] = useState<'standard' | 'warmup' | 'launch'>('standard');
  const [activeCell, setActiveCell] = useState<{dayIdx: number, type: 'stories' | 'post' | 'live', focus: string, date: string} | null>(null);
  const [viewingItem, setViewingItem] = useState<ApprovedContent | null>(null);
  const [showStats, setShowStats] = useState(false);
  
  // Selection Logic within Modal
  const [modalSelectedIngredients, setModalSelectedIngredients] = useState<string[]>([]);
  const [adjustmentText, setAdjustmentText] = useState('');
  
  // New: Idea Bank State
  const [bankTab, setBankTab] = useState<'selected' | 'all'>('all');
  const [bankSearch, setBankSearch] = useState('');
  const [bankCategoryFilter, setBankCategoryFilter] = useState<'all' | 'Atração de Clientes' | 'Melhorar Divulgação'>('all');

  // Extract globally selected items
  const globalSelectedItems = useMemo(() => {
    return selectedIds.map(idStr => {
      const [rowId, field] = idStr.split('-');
      const item = data.find(d => d.id === rowId);
      // @ts-ignore
      const val = item ? item[field] : '';
      return { id: idStr, text: val, field, type: 'global' };
    }).filter(i => i.text);
  }, [selectedIds, data]);

  // Filter full data for "Banco Completo"
  const filteredBankData = useMemo(() => {
    return data.filter(item => {
        const matchesCategory = bankCategoryFilter === 'all' || item.category === bankCategoryFilter;
        const matchesSearch = bankSearch === '' || 
            item.pain.toLowerCase().includes(bankSearch.toLowerCase()) || 
            item.desire.toLowerCase().includes(bankSearch.toLowerCase()) ||
            item.objection.toLowerCase().includes(bankSearch.toLowerCase());
        return matchesCategory && matchesSearch;
    });
  }, [data, bankCategoryFilter, bankSearch]);

  // Stats / Dashboard Data
  const statsData = useMemo(() => {
    const focusCounts: Record<string, number> = {};
    const strategyCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    Object.values(approvedItems).forEach((item: ApprovedContent) => {
        // Count Focus
        const focus = item.strategy ? item.strategy.split('.')[0] : 'Geral'; // Approximate focus from strategy string or context
        
        // Let's count types
        const typeKey = item.id.includes('live') ? 'Live' : item.id.includes('stories') ? 'Stories' : 'Post/Kit';
        typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;

        // Try to parse ingredients from strategy text for repetition check
        if (item.strategy && item.strategy.includes('Usar estes ingredientes específicos:')) {
            const ings = item.strategy.split('Usar estes ingredientes específicos:')[1].trim().replace(/\.$/, '').split(', ');
            ings.forEach(ing => {
                strategyCounts[ing] = (strategyCounts[ing] || 0) + 1;
            });
        }
    });

    return { focusCounts, strategyCounts, typeCounts };
  }, [approvedItems]);


  // Date State - Default to today
  const [selectedDate, setSelectedDate] = useState<string>(formatDateLocal(new Date()));

  // Handle Year Change specifically
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = e.target.value;
    if (newYear.length === 4) {
      const [_, month, day] = selectedDate.split('-');
      setSelectedDate(`${newYear}-${month}-${day}`);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const current = new Date(y, m - 1, d);
    
    // Add or subtract 7 days
    const daysToAdd = direction === 'next' ? 7 : -7;
    current.setDate(current.getDate() + daysToAdd);
    
    setSelectedDate(formatDateLocal(current));
  };

  // Calculate Dates for the Week
  const weekDates = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const current = new Date(y, m - 1, d);
    
    // Adjust to Monday (1)
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(current.setDate(diff));

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [selectedDate]);

  const currentSchedule = viewMode === 'warmup' ? WARMUP_SCHEDULE 
    : viewMode === 'launch' ? LAUNCH_SCHEDULE 
    : WEEKLY_SCHEDULE;

  // Initialize modal data when activeCell changes
  useEffect(() => {
    if (activeCell) {
        // Construct the ID to check for existing plans
        const kitId = `${activeCell.date}-kit`;
        const specificId = `${activeCell.date}-${activeCell.type === 'stories' ? 'stories' : (activeCell.type === 'live' ? 'live' : 'social')}`;
        
        // Check if there is a saved plan for this slot
        const plan = plannedItems[kitId] || plannedItems[specificId];
        
        if (plan) {
            setModalSelectedIngredients(plan.selectedIngredients || []);
            setAdjustmentText(plan.adjustments || '');
            if (plan.selectedIngredients && plan.selectedIngredients.length > 0) {
                 setBankTab('all');
            }
        } else {
            setModalSelectedIngredients([]);
            setAdjustmentText('');
            setBankTab('all');
        }
    }
  }, [activeCell, plannedItems]);

  const handleCellClick = (dayIdx: number, type: 'stories' | 'post' | 'live', focus: string, dateStr: string) => {
    // Check approval
    const kitId = `${dateStr}-kit`;
    // Map 'post' to 'social' for legacy/compatibility if needed, but 'live' needs its own
    const typeSuffix = type === 'stories' ? 'stories' : (type === 'live' ? 'live' : 'social');
    const specificId = `${dateStr}-${typeSuffix}`;
    
    const approved = approvedItems[kitId] || approvedItems[specificId];

    if (approved) {
      setViewingItem(approved);
    } else {
      setActiveCell({ dayIdx, type, focus, date: dateStr });
    }
  };

  const toggleModalIngredient = (text: string) => {
    setModalSelectedIngredients(prev => 
      prev.includes(text) ? prev.filter(t => t !== text) : [...prev, text]
    );
  };

  // 1. SAVE PLAN (NO GENERATION)
  const handleSavePlanClick = (shouldClose: boolean = true) => {
    if (!activeCell) return;
    
    const id = `${activeCell.date}-kit`; // Unified ID for planning
    
    const newPlan: PlannedContent = {
        id,
        date: activeCell.date,
        type: activeCell.type,
        focus: activeCell.focus,
        selectedIngredients: modalSelectedIngredients,
        adjustments: adjustmentText
    };

    onSavePlan(newPlan);
    if (shouldClose) setActiveCell(null);
  };
  
  // 1.5 DELETE PLAN
  const handleRemovePlan = () => {
      if (!activeCell) return;
      const kitId = `${activeCell.date}-kit`;
      const typeSuffix = activeCell.type === 'stories' ? 'stories' : (activeCell.type === 'live' ? 'live' : 'social');
      const specificId = `${activeCell.date}-${typeSuffix}`;
      
      onDeletePlan(kitId);
      onDeletePlan(specificId); // Delete both to be safe
      
      setActiveCell(null);
  };

  // 2. GENERATE (SAVES PLAN + TRIGGERS AI)
  const handleConfirmGeneration = () => {
    if (!activeCell) return;
    
    // First, save the plan
    handleSavePlanClick(false); 

    // Build strategy string
    let strategyText = "Estratégia Geral do Dia";
    if (modalSelectedIngredients.length > 0) {
        strategyText = `Usar estes ingredientes específicos: ${modalSelectedIngredients.join(', ')}.`;
    }

    // Include Live specific context if needed
    if (activeCell.type === 'live') {
        strategyText += " TIPO DE CONTEÚDO: Roteiro e Divulgação para LIVE.";
    }

    // Trigger Generation (this updates App state which triggers GeminiAdvisor)
    onGenerate({
        date: activeCell.date,
        dayOfWeek: currentSchedule[activeCell.dayIdx].day,
        contentType: 'kit', // Force Kit for everything (including lives)
        focus: activeCell.focus,
        strategy: strategyText,
        adjustments: adjustmentText
    });
    
    setActiveCell(null);
  };

  // Determine if the current active slot is for Books
  const isBookSlot = activeCell && activeCell.type === 'post' && 
                     (currentSchedule[activeCell.dayIdx].post || '').includes('Livros');

  // Helper to render cell content
  const renderCellContent = (dayIdx: number, type: 'stories' | 'post' | 'live', label: string | null, dateStr: string) => {
    
    const typeSuffix = type === 'stories' ? 'stories' : (type === 'live' ? 'live' : 'social');
    const kitId = `${dateStr}-kit`;
    const specificId = `${dateStr}-${typeSuffix}`;
    
    // 1. Check Approved
    const approved = approvedItems[kitId] || approvedItems[specificId];

    if (approved) {
        return (
            <div className="h-full w-full bg-green-50 border border-green-200 rounded-lg p-2 relative group hover:shadow-md transition-all cursor-pointer overflow-hidden">
                <div className="absolute top-1 right-1">
                    <CheckCircle2 className="text-green-600 h-4 w-4" />
                </div>
                <p className="text-[10px] font-bold text-green-800 uppercase mb-1">Aprovado</p>
                <p className="text-xs text-green-700 line-clamp-3 text-left">
                  {approved.text.replace(/#/g, '').substring(0, 50)}...
                </p>
                <div className="absolute inset-0 bg-green-100/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg backdrop-blur-[1px]">
                   <span className="text-xs font-bold text-green-800 flex items-center bg-white px-2 py-1 rounded shadow-sm">
                      <Maximize2 size={12} className="mr-1"/> Ver
                   </span>
                </div>
            </div>
        );
    }

    // 2. Check Planned (Briefing)
    const plan = plannedItems[kitId] || plannedItems[specificId];
    
    // Filter: Only show if relevant to this slot (or if it's a kit/global)
    const isRelevant = plan && (plan.type === type || plan.type === 'kit' || (type === 'post' && (plan.type as any) === 'social'));
    const relevantPlan = isRelevant ? plan : null;

    if (relevantPlan) {
         return (
            <div className="h-full w-full bg-blue-50 border border-blue-200 rounded-lg p-2 relative group hover:shadow-md transition-all cursor-pointer overflow-hidden">
                <div className="absolute top-1 right-1">
                    <FileText className="text-blue-500 h-4 w-4" />
                </div>
                <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Planejado</p>
                <div className="text-xs text-blue-600 text-left space-y-1">
                   {relevantPlan.selectedIngredients && relevantPlan.selectedIngredients.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                         {relevantPlan.selectedIngredients.slice(0, 2).map((ing, i) => (
                            <span key={i} className="bg-white px-1 rounded border border-blue-100 text-[9px] truncate max-w-full block">
                               {ing.substring(0, 15)}...
                            </span>
                         ))}
                         {relevantPlan.selectedIngredients.length > 2 && <span className="text-[9px] opacity-70">+{relevantPlan.selectedIngredients.length - 2}</span>}
                      </div>
                   ) : (
                      <span className="italic opacity-70">Ingredientes manuais...</span>
                   )}
                   {relevantPlan.adjustments && (
                       <p className="text-[9px] opacity-80 truncate border-t border-blue-100 pt-1 mt-1">"{relevantPlan.adjustments}"</p>
                   )}
                </div>
                <div className="absolute inset-0 bg-blue-100/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg backdrop-blur-[1px] gap-2">
                   <span className="text-xs font-bold text-blue-800 flex items-center bg-white px-2 py-1 rounded shadow-sm">
                      <Edit size={12} className="mr-1"/> Editar
                   </span>
                </div>
            </div>
         );
    }

    // 3. Default Label
    return (
      <div className={`h-full flex flex-col justify-between text-slate-500 hover:text-slate-700 group cursor-pointer relative ${!label && type === 'live' ? 'opacity-50 hover:opacity-100' : ''}`}>
        <span className="text-xs leading-tight text-left block">{label || (type === 'live' ? 'Agendar Live' : '-')}</span>
        <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 right-0">
            <span className="bg-indigo-50 text-indigo-600 p-1 rounded hover:bg-indigo-100">
                <Tag size={14} />
            </span>
        </div>
      </div>
    );
  };

  // Determine if there is an EXISTING plan for the currently open modal
  const existingPlanInModal = activeCell ? (
      plannedItems[`${activeCell.date}-kit`] || 
      plannedItems[`${activeCell.date}-${activeCell.type === 'stories' ? 'stories' : (activeCell.type === 'live' ? 'live' : 'social')}`]
  ) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* View Selector & Date Nav */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
         
         {/* Date Navigation */}
         <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
            <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500">
               <ChevronLeft size={18} />
            </button>
            <div className="px-4 flex flex-col items-center">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Semana de</span>
               <div className="flex items-baseline space-x-1">
                 <span className="text-sm font-bold text-slate-800">
                    {weekDates[0].toLocaleDateString('pt-BR', {day: '2-digit', month: 'long'})}
                 </span>
                 <input 
                   type="number" 
                   value={selectedDate.split('-')[0]} 
                   onChange={handleYearChange}
                   className="w-12 bg-transparent text-xs text-slate-400 border-none focus:ring-0 p-0 text-right font-medium"
                 />
               </div>
            </div>
            <button onClick={() => navigateWeek('next')} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500">
               <ChevronRightIcon size={18} />
            </button>
         </div>

         {/* Mode Toggles */}
         <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('standard')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'standard' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Semanal
            </button>
            <button 
              onClick={() => setViewMode('warmup')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'warmup' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Aquecimento
            </button>
            <button 
              onClick={() => setViewMode('launch')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'launch' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Lançamento
            </button>
         </div>

         {/* Report Button */}
         <button 
            onClick={() => setShowStats(true)}
            className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-bold"
         >
            <BarChart2 size={16} className="mr-2" />
            Relatório de Tópicos
         </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {currentSchedule.map((day, idx) => {
             const currentDate = weekDates[idx];
             const dateStr = formatDateLocal(currentDate);
             const isToday = formatDateLocal(new Date()) === dateStr;

             return (
              <div key={day.day} className={`flex flex-col ${isToday ? 'bg-indigo-50/30' : ''}`}>
                
                {/* Header */}
                <div className={`p-3 border-b border-slate-100 ${isToday ? 'bg-indigo-100/50' : 'bg-slate-50'}`}>
                  <div className="flex justify-between items-center mb-1">
                     <span className={`text-xs font-bold uppercase ${isToday ? 'text-indigo-700' : 'text-slate-500'}`}>
                        {day.day}
                     </span>
                     {isToday && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
                  </div>
                  <div className="text-lg font-bold text-slate-800 leading-none mb-2">
                    {currentDate.getDate()}
                  </div>
                  <div className="min-h-[40px]">
                    <span className={`inline-block px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider leading-tight ${isToday ? 'bg-white text-indigo-800 shadow-sm' : 'bg-slate-200 text-slate-600'}`}>
                        {day.focus}
                    </span>
                  </div>
                </div>

                {/* Rows */}
                <div className="flex-1 flex flex-col divide-y divide-slate-100">
                   {/* Stories Row */}
                   <div 
                     onClick={() => handleCellClick(idx, 'stories', day.focus, dateStr)}
                     className="p-3 hover:bg-slate-50 transition-colors flex-1 min-h-[80px]"
                   >
                      <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase mb-1">
                         <Target size={10} className="mr-1" /> Stories
                      </div>
                      {renderCellContent(idx, 'stories', day.stories, dateStr)}
                   </div>
                   
                   {/* Post Row */}
                   <div 
                     onClick={() => handleCellClick(idx, 'post', day.focus, dateStr)}
                     className="p-3 hover:bg-slate-50 transition-colors flex-1 min-h-[80px]"
                   >
                      <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase mb-1">
                         <Image size={10} className="mr-1" /> Feed / Reels
                      </div>
                      {renderCellContent(idx, 'post', day.post, dateStr)}
                   </div>

                   {/* Live Row */}
                   <div 
                     onClick={() => handleCellClick(idx, 'live', day.focus, dateStr)}
                     className="p-3 hover:bg-slate-50 transition-colors flex-1 min-h-[80px]"
                   >
                      <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase mb-1">
                         <Video size={10} className="mr-1" /> Live
                      </div>
                      {renderCellContent(idx, 'live', day.live, dateStr)}
                   </div>
                </div>
              </div>
             );
          })}
        </div>
      </div>

      {/* Generation Modal */}
      {activeCell && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`p-6 text-white shrink-0 ${activeCell.type === 'live' ? 'bg-gradient-to-r from-red-600 to-pink-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
               <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-lg font-bold flex items-center">
                        {activeCell.type === 'live' && <Video className="mr-2" size={20}/>}
                        Planejar {activeCell.type === 'live' ? 'Live' : 'Conteúdo'}
                    </h3>
                    <p className="text-white/80 text-sm mt-1">
                       {currentSchedule[activeCell.dayIdx].day}, {new Date(activeCell.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                 </div>
                 <button onClick={() => setActiveCell(null)} className="text-white/70 hover:text-white">
                    <X size={20} />
                 </button>
               </div>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
               <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Sugestão do Cronograma</span>
                  <p className="font-semibold text-slate-900">{activeCell.focus}</p>
                  <p className="text-sm text-slate-700 mt-2 italic">
                     "{activeCell.type === 'stories' ? currentSchedule[activeCell.dayIdx].stories : (activeCell.type === 'live' ? (currentSchedule[activeCell.dayIdx].live || 'Tema Livre') : currentSchedule[activeCell.dayIdx].post)}"
                  </p>
               </div>
               
               {/* --- SPECIAL BOOK RECOMMENDATION SECTION --- */}
               {isBookSlot && (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                     <div className="flex items-center gap-2 mb-3 text-amber-800">
                        <BookOpen size={18} />
                        <h4 className="font-bold text-sm">Base de Conhecimento: Indicações de Leitura</h4>
                     </div>
                     <p className="text-xs text-amber-700 mb-3">
                        O cronograma sugere falar de um livro. Selecione uma das opções abaixo para a IA criar o conteúdo baseada nela:
                     </p>
                     <div className="grid grid-cols-2 gap-3">
                        {BOOK_RECOMMENDATIONS.map((book, idx) => {
                           const bookString = `Livro: ${book.title} (${book.author})`;
                           const isSelected = modalSelectedIngredients.includes(bookString);
                           return (
                              <button
                                 key={idx}
                                 onClick={() => toggleModalIngredient(bookString)}
                                 className={`p-3 rounded-lg border text-left transition-all ${
                                    isSelected 
                                       ? 'bg-amber-200 border-amber-400 shadow-sm' 
                                       : 'bg-white border-amber-100 hover:border-amber-300 hover:shadow-sm'
                                 }`}
                              >
                                 <div className="flex justify-between items-start">
                                    <h5 className="font-bold text-slate-800 text-xs line-clamp-1">{book.title}</h5>
                                    {isSelected && <CheckCircle2 size={12} className="text-amber-700 shrink-0"/>}
                                 </div>
                                 <p className="text-[10px] text-slate-500 mb-1">{book.author}</p>
                                 <div className="inline-block bg-amber-100/50 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-800 uppercase mb-1">
                                    {book.tag}
                                 </div>
                                 <p className="text-[10px] text-slate-600 italic line-clamp-2 leading-tight">
                                    "{book.desc}"
                                 </p>
                              </button>
                           );
                        })}
                     </div>
                  </div>
               )}

               {/* Ingredients Selection Section */}
               <div className="border-t border-slate-100 pt-4 flex flex-col h-[350px]">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-sm font-bold text-slate-700 flex items-center">
                        <Tag size={16} className="mr-1.5 text-indigo-500" />
                        O que abordar? (Ingredientes)
                     </span>
                     
                     <div className="flex bg-slate-100 rounded-lg p-0.5">
                        <button 
                           onClick={() => setBankTab('all')}
                           className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${bankTab === 'all' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
                        >
                           Banco Completo
                        </button>
                        <button 
                           onClick={() => setBankTab('selected')}
                           className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${bankTab === 'selected' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
                        >
                           Meus Selecionados ({globalSelectedItems.length})
                        </button>
                     </div>
                  </div>
                  
                  {/* Filters & Search for Bank */}
                  {bankTab === 'all' && (
                     <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                           <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400"/>
                           <input 
                              type="text" 
                              placeholder="Buscar dor, desejo, objeção..." 
                              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                              value={bankSearch}
                              onChange={(e) => setBankSearch(e.target.value)}
                           />
                        </div>
                        <select 
                           className="text-xs border border-slate-200 rounded-lg px-2 bg-white focus:outline-none"
                           value={bankCategoryFilter}
                           onChange={(e) => setBankCategoryFilter(e.target.value as any)}
                        >
                           <option value="all">Todas Categorias</option>
                           <option value="Atração de Clientes">Atração</option>
                           <option value="Melhorar Divulgação">Divulgação</option>
                        </select>
                     </div>
                  )}

                  {/* Scrollable List */}
                  <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50/50 space-y-2">
                      {bankTab === 'selected' ? (
                          globalSelectedItems.length > 0 ? (
                             globalSelectedItems.map((item) => (
                                <button
                                   key={item.id}
                                   onClick={() => toggleModalIngredient(item.text)}
                                   className={`w-full text-left p-2 rounded-md border text-xs transition-all ${
                                      modalSelectedIngredients.includes(item.text)
                                         ? 'bg-indigo-100 border-indigo-300 text-indigo-900 shadow-sm' 
                                         : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
                                   }`}
                                >
                                   <div className="flex justify-between items-start">
                                      <span>{item.text}</span>
                                      {modalSelectedIngredients.includes(item.text) && <CheckCircle2 size={12} className="text-indigo-600 shrink-0 ml-2 mt-0.5"/>}
                                   </div>
                                </button>
                             ))
                          ) : (
                             <div className="text-center p-8 text-slate-400 text-xs italic">
                                Nenhum item selecionado na aba Organizar.
                             </div>
                          )
                      ) : (
                         // FULL BANK LIST
                         filteredBankData.length > 0 ? (
                            filteredBankData.map((item) => (
                               <div key={item.id} className="bg-white p-2 rounded-lg border border-slate-200 text-xs">
                                  <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-50">
                                     <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${item.category.includes('Atração') ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                        {item.category.includes('Atração') ? 'Atração' : 'Divulgação'}
                                     </span>
                                  </div>
                                  
                                  {/* Sub-items to select */}
                                  <div className="space-y-1 mt-1">
                                     {item.pain && (
                                        <button 
                                          onClick={() => toggleModalIngredient(item.pain)}
                                          className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-slate-50 ${modalSelectedIngredients.includes(item.pain) ? 'text-indigo-700 bg-indigo-50 font-medium' : 'text-slate-600'}`}
                                        >
                                           <div className={`w-3 h-3 rounded border flex items-center justify-center ${modalSelectedIngredients.includes(item.pain) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                              {modalSelectedIngredients.includes(item.pain) && <CheckCircle2 size={8} className="text-white"/>}
                                           </div>
                                           <span className="truncate"><span className="text-red-400 font-bold mr-1">Dor:</span> {item.pain}</span>
                                        </button>
                                     )}
                                     {item.desire && (
                                        <button 
                                          onClick={() => toggleModalIngredient(item.desire)}
                                          className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-slate-50 ${modalSelectedIngredients.includes(item.desire) ? 'text-indigo-700 bg-indigo-50 font-medium' : 'text-slate-600'}`}
                                        >
                                           <div className={`w-3 h-3 rounded border flex items-center justify-center ${modalSelectedIngredients.includes(item.desire) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                              {modalSelectedIngredients.includes(item.desire) && <CheckCircle2 size={8} className="text-white"/>}
                                           </div>
                                           <span className="truncate"><span className="text-blue-400 font-bold mr-1">Desejo:</span> {item.desire}</span>
                                        </button>
                                     )}
                                  </div>
                               </div>
                            ))
                         ) : (
                            <div className="text-center p-8 text-slate-400 text-xs italic">
                               Nenhum item encontrado.
                            </div>
                         )
                      )}
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Instrução Adicional (Opcional)</label>
                  <textarea
                     className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                     rows={2}
                     placeholder="Ex: Fale de forma mais descontraída, cite o produto X..."
                     value={adjustmentText}
                     onChange={(e) => setAdjustmentText(e.target.value)}
                  ></textarea>
               </div>

               <div className="flex justify-end space-x-3 pt-2">
                  <button 
                    onClick={() => setActiveCell(null)}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                  >
                     Cancelar
                  </button>
                  {existingPlanInModal && (
                      <button
                        onClick={handleRemovePlan}
                        className="px-4 py-2 border border-red-200 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 flex items-center"
                        title="Excluir Planejamento"
                      >
                         <Trash2 size={16} />
                      </button>
                  )}
                  <button 
                    onClick={() => handleSavePlanClick(true)}
                    className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-100 flex items-center"
                  >
                     <Save size={16} className="mr-2" />
                     {existingPlanInModal ? 'Atualizar Planejamento' : 'Salvar Planejamento'}
                  </button>
                  <button 
                    onClick={handleConfirmGeneration}
                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md flex items-center"
                  >
                     <Sparkles size={16} className="mr-2" />
                     Gerar Conteúdo
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats/Dashboard Modal */}
      {showStats