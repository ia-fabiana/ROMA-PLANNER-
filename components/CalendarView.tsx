
import React, { useState, useMemo, useEffect } from 'react';
import { Video, Image, Trophy, Target, Sparkles, X, CheckCircle2, ChevronLeft, ChevronRight as ChevronRightIcon, Maximize2, Tag, Search, Copy, Save, Edit, FileText, PieChart, BarChart2, AlertCircle, BookOpen, Star, Trash2, Calendar as CalendarIcon, Filter, Download, Printer, ChevronDown, List, CheckSquare, PencilLine, FileSpreadsheet, Grid } from 'lucide-react';
import { StrategyItem, CalendarContext, ApprovedContent, ContentType, PlannedContent } from '../types';
import ReactMarkdown from 'react-markdown';

interface CalendarViewProps {
  data: StrategyItem[];
  selectedIds: string[]; // Received from App
  onGenerate: (context: CalendarContext) => void;
  onSavePlan: (plan: PlannedContent) => void;
  onDeletePlan: (id: string) => void;
  onDeleteApproved: (id: string) => void;
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

const CalendarView: React.FC<CalendarViewProps> = ({ data, selectedIds, onGenerate, onSavePlan, onDeletePlan, onDeleteApproved, approvedItems, plannedItems }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeSchedule, setActiveSchedule] = useState<'WEEKLY' | 'WARMUP' | 'LAUNCH'>('WEEKLY');
  
  // Modals
  const [selectedCell, setSelectedCell] = useState<{date: string, dayInfo: any, type: ContentType} | null>(null);
  const [viewingItem, setViewingItem] = useState<ApprovedContent | null>(null); // Read Mode
  const [showDashboard, setShowDashboard] = useState(false); // Reports
  const [dashboardTab, setDashboardTab] = useState<'STATS' | 'LIST'>('STATS'); // Report Tabs
  
  // Editing Mode State
  const [isEditingApproved, setIsEditingApproved] = useState(false);
  const [editedContentText, setEditedContentText] = useState('');

  // Modal State
  const [customAdjustment, setCustomAdjustment] = useState(''); // Just for AI Prompt
  const [manualPlanText, setManualPlanText] = useState(''); // User's manual draft
  const [activeTab, setActiveTab] = useState<'SELECTED' | 'ALL'>('SELECTED');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [modalSelectedIngredients, setModalSelectedIngredients] = useState<string[]>([]);

  // Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  
  const handlePrintCalendar = () => {
     window.print();
  };
  
  // --- PDF PRINT FUNCTION ---
  const handlePrintPDF = (item: ApprovedContent) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          alert("Permita pop-ups para imprimir o PDF.");
          return;
      }
      
      const contentHtml = item.text
        .replace(/\n/g, '<br/>')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/## (.*?)\n/g, '<h2>$1</h2>')
        .replace(/### (.*?)\n/g, '<h3>$1</h3>');

      printWindow.document.write(`
        <html>
          <head>
            <title>Conteúdo - ${item.date}</title>
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
              h1 { color: #4338ca; border-bottom: 2px solid #e0e7ff; padding-bottom: 10px; }
              h2 { color: #1e293b; margin-top: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
              th { background-color: #f8fafc; font-weight: bold; }
              .meta { font-size: 0.8rem; color: #64748b; margin-bottom: 30px; }
              img { max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px; border: 1px solid #eee; }
              .gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>Planejamento de Conteúdo - Roma</h1>
            <div class="meta">
              <p><strong>Data:</strong> ${item.date} | <strong>Tipo:</strong> ${item.type.toUpperCase()}</p>
              <p><strong>Estratégia:</strong> ${item.strategy}</p>
            </div>
            ${item.imageUrl ? `<h3>Imagem Principal</h3><img src="${item.imageUrl}" alt="Imagem Gerada" /><br/>` : ''}
            
            ${item.carouselImages && item.carouselImages.length > 0 ? `
               <h3>Galeria Visual Criada</h3>
               <div class="gallery">
                  ${item.carouselImages.map((img, i) => `<div style="text-align:center;"><img src="${img}" /><p style="font-size:10px;">Item ${i+1}</p></div>`).join('')}
               </div>
            ` : ''}

            <br/>
            <div>${contentHtml}</div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
  };

  // --- EXCEL EXPORT FUNCTION ---
  const handleExportExcel = () => {
      // Combines approved and planned items for export
      const allItems = [
          ...Object.values(approvedItems).map(i => ({...i, status: 'Aprovado'})),
          ...Object.values(plannedItems).map(i => ({...i, status: 'Planejado', text: i.manualContent || '(Rascunho)'}))
      ];

      if (allItems.length === 0) {
          alert("Nenhum conteúdo para exportar.");
          return;
      }

      // CSV Header
      let csvContent = "\uFEFFData;Tipo;Status;Estratégia;Conteúdo\n";

      allItems.forEach(item => {
          const cleanText = (item.text || '').replace(/(\r\n|\n|\r|;)/gm, " "); // Remove breaks and semicolons
          const strategy = (item as any).strategy || (item as any).focus || '-';
          const type = item.type;
          const date = item.date;
          const status = (item as any).status;

          csvContent += `${date};${type};${status};${strategy};${cleanText}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `roma_planejamento_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Render Cell Content
  const renderCellContent = (dateKey: string, type: ContentType, label: string) => {
    const fullId = `${dateKey}-${type}`;
    const approvedItem = approvedItems[fullId];
    const plannedItem = plannedItems[fullId];

    if (approvedItem) {
      return (
        <div 
          onClick={(e) => { e.stopPropagation(); setViewingItem(approvedItem); }}
          className="mt-1 p-2 bg-green-50 border border-green-200 rounded-md cursor-pointer hover:bg-green-100 transition-colors group relative"
        >
          <div className="flex items-center justify-between mb-1">
             <span className="text-[10px] font-bold uppercase text-slate-900 flex items-center">
               <CheckCircle2 size={10} className="mr-1 text-green-600"/> {label}
             </span>
             {approvedItem.imageUrl && <Image size={10} className="text-green-600" />}
             {approvedItem.carouselImages && <Grid size={10} className="text-green-600 ml-1" />}
          </div>
          <p className="text-[10px] text-green-800 line-clamp-2 leading-tight">
             {approvedItem.text.substring(0, 60)}...
          </p>
        </div>
      );
    }
    
    if (plannedItem) {
        return (
            <div 
              onClick={(e) => { 
                  e.stopPropagation(); 
                  const dayInfo = getScheduleForDay(new Date(dateKey).getDay());
                  setSelectedCell({ date: dateKey, dayInfo, type }); 
              }}
              className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded-md cursor-pointer hover:bg-yellow-100 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                 <span className="text-[10px] font-bold uppercase text-slate-900 flex items-center">
                   <PencilLine size={10} className="mr-1 text-yellow-600"/> {label}
                 </span>
              </div>
              <p className="text-[10px] text-yellow-800 line-clamp-2 leading-tight italic">
                 {plannedItem.manualContent || "Rascunho salvo"}
              </p>
            </div>
        );
    }

    return (
      <div 
        onClick={(e) => {
            e.stopPropagation();
            const dayInfo = getScheduleForDay(new Date(dateKey).getDay());
            setSelectedCell({ date: dateKey, dayInfo, type });
        }}
        className="mt-1 py-2 px-2 rounded-md border border-dashed border-slate-300 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer flex items-center justify-center transition-all group"
      >
        <div className="flex items-center text-[10px] font-bold uppercase text-slate-900">
            <span className="group-hover:scale-110 transition-transform">+ {label}</span>
        </div>
      </div>
    );
  };

  const getScheduleForDay = (dayIndex: number) => {
    // 0 = Domingo, 1 = Segunda...
    // Array start at Monday (0 in array), so we adjust
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    
    let schedule = WEEKLY_SCHEDULE;
    if (activeSchedule === 'WARMUP') schedule = WARMUP_SCHEDULE;
    if (activeSchedule === 'LAUNCH') schedule = LAUNCH_SCHEDULE;
    
    return schedule[adjustedIndex];
  };

  // --- MAIN RENDER ---
  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Initialize Modal Data when opening
  useEffect(() => {
    if (selectedCell) {
        const fullId = `${selectedCell.date}-${selectedCell.type}`;
        const existingPlan = plannedItems[fullId];
        
        // Reset or Load
        setManualPlanText(existingPlan?.manualContent || '');
        setModalSelectedIngredients(existingPlan?.selectedIngredients || []);
        setCustomAdjustment(existingPlan?.adjustments || '');
        
        // Pre-select relevant ingredients if new
        if (!existingPlan && selectedIds.length > 0) {
            setModalSelectedIngredients(selectedIds);
        }
    }
  }, [selectedCell, plannedItems, selectedIds]);

  const handleSaveDraft = () => {
      if (!selectedCell) return;
      
      const fullId = `${selectedCell.date}-${selectedCell.type}`;
      const plan: PlannedContent = {
          id: fullId,
          date: selectedCell.date,
          type: selectedCell.type,
          focus: selectedCell.dayInfo.focus,
          selectedIngredients: modalSelectedIngredients,
          adjustments: customAdjustment,
          manualContent: manualPlanText
      };
      
      onSavePlan(plan);
      setSelectedCell(null); // Close modal
  };

  const handleSendToAI = () => {
      if (!selectedCell) return;
      
      // Save draft first
      handleSaveDraft();
      
      // Determine strategy text from ingredients
      const strategyText = modalSelectedIngredients.length > 0
        ? data.filter(d => modalSelectedIngredients.some(id => id.startsWith(d.id))).map(d => `${d.pain} -> ${d.desire}`).join('; ')
        : "Utilize o foco do dia.";

      // Send to AI
      onGenerate({
          date: selectedCell.date,
          dayOfWeek: selectedCell.dayInfo.day,
          contentType: selectedCell.type,
          focus: selectedCell.dayInfo.focus,
          strategy: strategyText,
          adjustments: customAdjustment,
          manualContent: manualPlanText // CRITICAL: Pass manual text
      });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
             <button onClick={handlePrevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"><ChevronLeft size={20}/></button>
             <span className="px-4 font-bold text-slate-800 min-w-[140px] text-center">{monthNameCapitalized}</span>
             <button onClick={handleNextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"><ChevronRightIcon size={20}/></button>
          </div>
          
          <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Modo:</span>
            <select 
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium outline-none"
              value={activeSchedule}
              onChange={(e) => setActiveSchedule(e.target.value as any)}
            >
              <option value="WEEKLY">Rotina Semanal (Padrão)</option>
              <option value="WARMUP">Aquecimento (Pré-Lançamento)</option>
              <option value="LAUNCH">Lançamento (Vendas)</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-2">
           <button 
             onClick={handleExportExcel}
             className="flex items-center px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-bold transition-colors border border-green-200"
             title="Baixar Backup em Excel"
           >
             <FileSpreadsheet size={16} className="mr-2" />
             Baixar Excel
           </button>
           <button 
             onClick={handlePrintCalendar}
             className="flex items-center px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors border border-slate-200"
           >
             <Printer size={16} className="mr-2" />
             Salvar PDF / Imprimir
           </button>
           <button 
             onClick={() => setShowDashboard(true)}
             className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-bold transition-colors border border-indigo-200"
           >
             <BarChart2 size={16} className="mr-2" />
             Relatórios
           </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, i) => (
            <div key={day} className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-slate-400 bg-slate-50/50' : 'text-slate-600'}`}>
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 auto-rows-fr">
          {/* Empty cells for previous month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[160px] bg-slate-50/30 border-b border-r border-slate-100"></div>
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateKey = currentDayDate.toISOString().split('T')[0];
            const dayOfWeek = currentDayDate.getDay();
            const dayInfo = getScheduleForDay(dayOfWeek);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <div 
                key={day} 
                className={`min-h-[180px] border-b border-r border-slate-100 p-2 relative hover:bg-slate-50 transition-colors flex flex-col group ${isWeekend ? 'bg-slate-50/30' : 'bg-white'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                    dateKey === new Date().toISOString().split('T')[0] 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-700'
                  }`}>
                    {day}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                     {dayInfo.focus.split(' ')[0]}
                  </span>
                </div>

                {/* Slots */}
                <div className="flex-1 flex flex-col space-y-1">
                    {/* STORIES SLOT */}
                    {dayInfo.stories && renderCellContent(dateKey, 'stories', 'Stories')}
                    
                    {/* POST SLOT */}
                    {dayInfo.post && renderCellContent(dateKey, 'post', 'Post')}
                    
                    {/* LIVE SLOT */}
                    {dayInfo.live && renderCellContent(dateKey, 'live', 'Live')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL: PLANEJAMENTO (WRITING & INGREDIENTS) --- */}
      {selectedCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center">
                   <CalendarIcon className="mr-2 text-indigo-600" size={20}/> 
                   Planejamento: {selectedCell.dayInfo.day} - {selectedCell.type === 'stories' ? 'Stories' : selectedCell.type === 'live' ? 'Live' : 'Post'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                   Foco do Dia: <span className="font-bold text-indigo-600">{selectedCell.dayInfo.focus}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedCell(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
                
                {/* 1. MANUAL WRITING AREA (PRIORITY) */}
                <div className="mb-8">
                    <label className="flex items-center text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                        <PencilLine size={16} className="mr-2 text-indigo-500"/>
                        Roteiro / Planejamento Manual
                    </label>
                    <textarea 
                        className="w-full h-40 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm bg-slate-50"
                        placeholder="Escreva aqui sua ideia, roteiro, tópicos ou lembretes para este conteúdo..."
                        value={manualPlanText}
                        onChange={(e) => setManualPlanText(e.target.value)}
                    ></textarea>
                    <p className="text-xs text-slate-400 mt-2 text-right">
                       Você pode apenas salvar este rascunho ou usá-lo como base para a IA.
                    </p>
                </div>

                {/* 2. INGREDIENTS SELECTION */}
                <div className="mb-6">
                     <div className="flex justify-between items-end mb-3">
                         <label className="flex items-center text-sm font-bold text-slate-700 uppercase tracking-wide">
                            <Target size={16} className="mr-2 text-indigo-500"/>
                            Enriquecer com Estratégia (Opcional)
                         </label>
                         <button 
                            onClick={() => setActiveTab(activeTab === 'ALL' ? 'SELECTED' : 'ALL')}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                         >
                            {activeTab === 'ALL' ? 'Ver Apenas Selecionados' : 'Ver Todas as Dores'}
                         </button>
                     </div>
                     
                     <div className="bg-white border border-slate-200 rounded-xl h-60 flex flex-col overflow-hidden">
                         <div className="p-3 border-b border-slate-100 bg-slate-50">
                             <div className="relative">
                                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                                 <input 
                                     type="text" 
                                     placeholder="Buscar dor, desejo ou objeção..." 
                                     className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                                     value={ingredientSearch}
                                     onChange={(e) => setIngredientSearch(e.target.value)}
                                 />
                             </div>
                         </div>
                         <div className="flex-1 overflow-y-auto p-2 space-y-1">
                             {data
                                .filter(d => activeTab === 'ALL' || selectedIds.some(sid => sid.startsWith(d.id)))
                                .filter(d => 
                                    !ingredientSearch || 
                                    d.pain.toLowerCase().includes(ingredientSearch.toLowerCase()) || 
                                    d.desire.toLowerCase().includes(ingredientSearch.toLowerCase())
                                )
                                .map(item => {
                                 const itemKey = `${item.id}-pain`; // Simple key for logic
                                 const isSelected = modalSelectedIngredients.includes(itemKey) || selectedIds.some(sid => sid.startsWith(item.id));
                                 
                                 return (
                                     <div 
                                        key={item.id} 
                                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start space-x-3 ${
                                            isSelected ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-100 hover:border-indigo-200'
                                        }`}
                                        onClick={() => {
                                            if(modalSelectedIngredients.includes(itemKey)) {
                                                setModalSelectedIngredients(prev => prev.filter(k => k !== itemKey));
                                            } else {
                                                setModalSelectedIngredients(prev => [...prev, itemKey]);
                                            }
                                        }}
                                     >
                                         <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                            {isSelected && <CheckCircle2 size={10} className="text-white"/>}
                                         </div>
                                         <div className="flex-1">
                                             <p className="font-bold text-slate-700 mb-0.5">{item.category}</p>
                                             <p className="text-slate-600">Dor: {item.pain}</p>
                                             <p className="text-slate-500 italic mt-1">Desejo: {item.desire}</p>
                                         </div>
                                     </div>
                                 );
                             })}
                             {data.length === 0 && <p className="p-4 text-center text-xs text-slate-400">Nenhum item encontrado.</p>}
                         </div>
                     </div>
                </div>

                {/* 3. EXTRA INSTRUCTIONS */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Instruções Extras para a IA</label>
                    <input 
                        type="text" 
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex: Use um tom de voz mais agressivo; Mencione a promoção X..."
                        value={customAdjustment}
                        onChange={(e) => setCustomAdjustment(e.target.value)}
                    />
                </div>

            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between">
                <button 
                    onClick={handleSaveDraft}
                    className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center shadow-sm"
                >
                    <Save size={18} className="mr-2" />
                    Salvar Rascunho
                </button>
                <button 
                    onClick={handleSendToAI}
                    className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-1 flex items-center"
                >
                    <Sparkles size={18} className="mr-2" />
                    Gerar com IA
                </button>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL: VISUALIZAÇÃO DE APROVADO (READING) --- */}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in">
             
             {/* Header */}
             <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-gradient-to-r from-green-50 to-white rounded-t-2xl">
                <div className="flex items-start space-x-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                        <CheckCircle2 size={32} />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-xl font-bold text-slate-800">Conteúdo Aprovado</h3>
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold uppercase">Pronto</span>
                        </div>
                        <p className="text-sm text-slate-500 flex items-center">
                            <CalendarIcon size={14} className="mr-1"/> {viewingItem.date} • {viewingItem.type.toUpperCase()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                     <button 
                        onClick={() => {
                            if (window.confirm("Tem certeza que deseja excluir este conteúdo aprovado permanentemente?")) {
                                onDeleteApproved(viewingItem.id);
                                setViewingItem(null);
                            }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg shadow-sm"
                        title="Excluir Conteúdo"
                     >
                         <Trash2 size={20} />
                     </button>
                    <button onClick={() => setIsEditingApproved(!isEditingApproved)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm" title="Editar Texto">
                        <Edit size={20} />
                    </button>
                    <button onClick={() => handlePrintPDF(viewingItem)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm" title="Imprimir PDF">
                        <Printer size={20} />
                    </button>
                    <button onClick={() => setViewingItem(null)} className="p-2 text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                 {/* Image Section */}
                 {(viewingItem.imageUrl || (viewingItem.carouselImages && viewingItem.carouselImages.length > 0)) && (
                     <div className="mb-8">
                         <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center">
                            <Image size={14} className="mr-1"/> Galeria Visual
                         </h4>
                         <div className="flex flex-wrap gap-4">
                             {/* Single Image */}
                             {viewingItem.imageUrl && (
                                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                    <p className="text-[10px] text-slate-400 mb-1 text-center font-bold">IMAGEM PRINCIPAL</p>
                                    <img src={viewingItem.imageUrl} alt="Generated Content" className="h-40 rounded-lg object-cover" />
                                </div>
                             )}
                             {/* Carousel Images */}
                             {viewingItem.carouselImages && viewingItem.carouselImages.map((img, idx) => (
                                 <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                     <p className="text-[10px] text-slate-400 mb-1 text-center font-bold">SLIDE {idx + 1}</p>
                                     <img src={img} alt={`Slide ${idx+1}`} className="h-40 rounded-lg object-cover" />
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}

                 {/* Text Section */}
                 <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                     {isEditingApproved ? (
                         <textarea 
                            className="w-full h-96 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            defaultValue={viewingItem.text}
                            onChange={(e) => setEditedContentText(e.target.value)}
                         />
                     ) : (
                         <div className="prose prose-sm max-w-none prose-indigo">
                            <ReactMarkdown components={{
                                h1: ({node, ...props}) => <h1 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-2 mt-6 mb-4" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-base font-bold text-slate-800 mt-4 mb-2" {...props} />,
                                table: ({node, ...props}) => <div className="overflow-x-auto my-4 border rounded-lg bg-slate-50"><table className="w-full text-sm text-left" {...props} /></div>,
                                th: ({node, ...props}) => <th className="px-4 py-2 bg-slate-100 font-bold text-slate-600 border-b" {...props} />,
                                td: ({node, ...props}) => <td className="px-4 py-2 border-b border-slate-100" {...props} />,
                            }}>
                                {viewingItem.text}
                            </ReactMarkdown>
                         </div>
                     )}
                 </div>
             </div>
             
             {isEditingApproved && (
                 <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                     <button 
                        onClick={() => {
                            // Update logic would go here (requires updating App state)
                            // For now simulate close
                            setIsEditingApproved(false);
                            alert("Edição salva localmente (funcionalidade completa requer atualização de estado).");
                        }}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                     >
                         Salvar Alterações
                     </button>
                 </div>
             )}

          </div>
        </div>
      )}

      {/* --- DASHBOARD (RELATÓRIOS) --- */}
      {showDashboard && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col animate-scale-in">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                          <BarChart2 className="mr-3 text-indigo-600"/> Dashboard de Conteúdo
                      </h2>
                      <button onClick={() => setShowDashboard(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24}/></button>
                  </div>
                  
                  <div className="flex border-b border-slate-100 px-6">
                      <button 
                        onClick={() => setDashboardTab('STATS')}
                        className={`py-4 mr-6 text-sm font-bold border-b-2 transition-colors ${dashboardTab === 'STATS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
                      >
                          Visão Geral
                      </button>
                      <button 
                        onClick={() => setDashboardTab('LIST')}
                        className={`py-4 mr-6 text-sm font-bold border-b-2 transition-colors ${dashboardTab === 'LIST' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
                      >
                          Lista de Conteúdos
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                      {dashboardTab === 'STATS' ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             {/* Cards */}
                             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                                 <p className="text-sm text-slate-500 uppercase font-bold mb-2">Total Aprovado</p>
                                 <p className="text-4xl font-bold text-indigo-600">{Object.keys(approvedItems).length}</p>
                             </div>
                             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                                 <p className="text-sm text-slate-500 uppercase font-bold mb-2">Em Planejamento</p>
                                 <p className="text-4xl font-bold text-yellow-600">{Object.keys(plannedItems).length}</p>
                             </div>
                             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                                 <p className="text-sm text-slate-500 uppercase font-bold mb-2">Posts vs Stories</p>
                                 <div className="flex items-center space-x-4">
                                     <div>
                                        <p className="text-2xl font-bold text-slate-800">{Object.values(approvedItems).filter(i => i.type === 'feed' || i.type === 'post').length}</p>
                                        <p className="text-xs text-slate-400">Posts</p>
                                     </div>
                                     <div className="h-8 w-px bg-slate-200"></div>
                                     <div>
                                        <p className="text-2xl font-bold text-slate-800">{Object.values(approvedItems).filter(i => i.type === 'stories').length}</p>
                                        <p className="text-xs text-slate-400">Stories</p>
                                     </div>
                                 </div>
                             </div>
                          </div>
                      ) : (
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                      <tr>
                                          <th className="px-6 py-4">Data</th>
                                          <th className="px-6 py-4">Tipo</th>
                                          <th className="px-6 py-4">Status</th>
                                          <th className="px-6 py-4">Estratégia</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {Object.values(approvedItems).map(item => (
                                          <tr key={item.id} className="hover:bg-slate-50">
                                              <td className="px-6 py-4 font-medium text-slate-700">{item.date}</td>
                                              <td className="px-6 py-4 uppercase text-xs">{item.type}</td>
                                              <td className="px-6 py-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Aprovado</span></td>
                                              <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{item.strategy}</td>
                                          </tr>
                                      ))}
                                      {Object.values(plannedItems).map(item => (
                                          <tr key={item.id} className="hover:bg-slate-50">
                                              <td className="px-6 py-4 font-medium text-slate-700">{item.date}</td>
                                              <td className="px-6 py-4 uppercase text-xs">{item.type}</td>
                                              <td className="px-6 py-4"><span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Rascunho</span></td>
                                              <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{item.focus}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default CalendarView;
