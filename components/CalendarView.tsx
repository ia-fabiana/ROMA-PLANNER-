import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Download, 
  Printer, 
  Filter, 
  X, 
  CheckCircle2, 
  Trash2, 
  Edit, 
  FileText, 
  Image as ImageIcon, 
  MoreHorizontal,
  Layers,
  Video,
  Radio,
  Share2,
  CheckSquare,
  ChevronDown,
  FileSpreadsheet,
  Tag,
  Sparkles,
  Save
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { StrategyItem, CalendarContext, ApprovedContent, ContentType, PlannedContent } from '../types';

interface CalendarViewProps {
  data: StrategyItem[];
  selectedIds: string[];
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

const CONTENT_FORMATS = [
  { id: 'story_simple', label: 'Story (Único)', icon: <ImageIcon size={14}/> },
  { id: 'story_seq', label: 'Seq. Stories', icon: <Layers size={14}/> },
  { id: 'feed_static', label: 'Post (Imagem)', icon: <ImageIcon size={14}/> },
  { id: 'feed_carousel', label: 'Carrossel', icon: <GalleryIcon size={14}/> },
  { id: 'reels', label: 'Reels / Vídeo', icon: <Video size={14}/> },
  { id: 'live', label: 'Live', icon: <Radio size={14}/> },
];

function GalleryIcon({size}: {size:number}) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
    )
}

type ViewFilterType = 'ALL' | 'APPROVED' | 'DRAFT' | 'STORIES' | 'POST' | 'LIVE';

const CalendarView: React.FC<CalendarViewProps> = ({ 
  data, 
  selectedIds, 
  onGenerate, 
  onSavePlan, 
  onDeletePlan,
  onDeleteApproved,
  approvedItems, 
  plannedItems 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [approvedModalOpen, setApprovedModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{date: string, type: ContentType} | null>(null);
  const [manualText, setManualText] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [viewFilter, setViewFilter] = useState<ViewFilterType>('ALL');

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sunday
  
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const year = currentDate.getFullYear();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // --- ACTIONS ---

  const handleSlotClick = (date: number, type: ContentType) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    const id = `${dateStr}-${type}`;

    if (approvedItems[id]) {
        setSelectedSlot({ date: dateStr, type });
        setApprovedModalOpen(true);
    } else {
        const existingPlan = plannedItems[id];
        setManualText(existingPlan?.manualContent || '');
        setSelectedFormats(existingPlan?.selectedFormats || []);
        setSelectedSlot({ date: dateStr, type });
        setModalOpen(true);
    }
  };

  const handleSaveDraft = () => {
      if (!selectedSlot) return;
      const id = `${selectedSlot.date}-${selectedSlot.type}`;
      
      // Look up schedule focus
      const dayOfWeek = new Date(selectedSlot.date).getDay(); // 0=Sun, 1=Mon...
      // Adjust because WEEKLY_SCHEDULE starts at Monday index 0, but Date.getDay() Sunday is 0.
      const scheduleIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const scheduleItem = WEEKLY_SCHEDULE[scheduleIndex];
      const focus = scheduleItem?.focus || 'Geral';

      // Gather ingredients
      const ingredients = data.filter(i => selectedIds.includes(i.id + '-pain') || selectedIds.includes(i.id + '-desire')).map(i => i.desire || i.pain);

      onSavePlan({
          id,
          date: selectedSlot.date,
          type: selectedSlot.type,
          focus,
          selectedIngredients: ingredients,
          adjustments: '',
          manualContent: manualText,
          selectedFormats
      });
      setModalOpen(false);
  };

  const handleSendToAI = () => {
      if (!selectedSlot) return;
      handleSaveDraft(); // Save first
      
      const dayOfWeekIdx = new Date(selectedSlot.date).getDay();
      const scheduleIdx = dayOfWeekIdx === 0 ? 6 : dayOfWeekIdx - 1;
      const schedule = WEEKLY_SCHEDULE[scheduleIdx];

      // Build context string from ingredients
      const ingredientsList = data
        .filter(d => selectedIds.some(id => id.startsWith(d.id)))
        .map(d => {
            const parts = [];
            if (selectedIds.includes(`${d.id}-pain`)) parts.push(`Dor: ${d.pain}`);
            if (selectedIds.includes(`${d.id}-desire`)) parts.push(`Desejo: ${d.desire}`);
            if (selectedIds.includes(`${d.id}-objection`)) parts.push(`Objeção: ${d.objection}`);
            return parts.join(' | ');
        })
        .join('\n');

      onGenerate({
          date: selectedSlot.date,
          dayOfWeek: schedule.day,
          contentType: selectedSlot.type,
          focus: schedule.focus,
          strategy: ingredientsList,
          manualContent: manualText,
          selectedFormats
      });
      setModalOpen(false);
  };

  const handleDeleteCurrentPlan = () => {
      if (selectedSlot) {
          onDeletePlan(`${selectedSlot.date}-${selectedSlot.type}`);
          setModalOpen(false);
      }
  };

  const handleDeleteCurrentApproved = () => {
      if (selectedSlot && confirm('Tem certeza que deseja excluir este conteúdo aprovado? Esta ação não pode ser desfeita.')) {
          onDeleteApproved(`${selectedSlot.date}-${selectedSlot.type}`);
          setApprovedModalOpen(false);
      }
  };

  const handleFormatToggle = (id: string) => {
      setSelectedFormats(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleExportExcel = () => {
      let csvContent = "\uFEFFData;Tipo;Status;Foco;Conteúdo\n"; // BOM for Excel
      
      const allDates = new Set([...Object.keys(approvedItems), ...Object.keys(plannedItems)]);
      
      allDates.forEach(key => {
          const approved = approvedItems[key];
          const planned = plannedItems[key];
          
          if (approved) {
              const cleanText = approved.text.replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, ",");
              csvContent += `${approved.date};${approved.type};APROVADO;${approved.strategy};"${cleanText.substring(0, 100)}..."\n`;
          } else if (planned) {
              csvContent += `${planned.date};${planned.type};PLANEJADO;${planned.focus};"${planned.manualContent || 'Rascunho'}"\n`;
          }
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `planejamento_roma_${monthName}_${year}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handlePrint = () => {
      window.print();
  };

  // --- RENDERING HELPERS ---

  const renderCellContent = (day: number, type: ContentType, label: string) => {
      // Filtering Logic
      if (viewFilter === 'STORIES' && type !== 'stories') return null;
      if (viewFilter === 'POST' && type !== 'post' && type !== 'feed') return null;
      if (viewFilter === 'LIVE' && type !== 'live') return null;

      const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const id = `${dateStr}-${type}`;
      
      const approved = approvedItems[id];
      const planned = plannedItems[id];

      if (viewFilter === 'APPROVED' && !approved) return null;
      if (viewFilter === 'DRAFT' && !planned) return null;

      if (approved) {
          return (
              <div onClick={(e) => { e.stopPropagation(); handleSlotClick(day, type); }} className="mb-1 p-1.5 bg-green-50 border border-green-200 rounded cursor-pointer hover:bg-green-100 transition-colors group">
                  <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-900 uppercase">{label}</span>
                      <CheckCircle2 size={12} className="text-green-600" />
                  </div>
                  <p className="text-[9px] text-green-800 line-clamp-2 mt-0.5 leading-tight">
                      {approved.strategy}
                  </p>
              </div>
          );
      }

      if (planned) {
          return (
              <div onClick={(e) => { e.stopPropagation(); handleSlotClick(day, type); }} className="mb-1 p-1.5 bg-yellow-50 border border-yellow-200 rounded cursor-pointer hover:bg-yellow-100 transition-colors group">
                  <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-900 uppercase">{label}</span>
                      <Edit size={12} className="text-yellow-600" />
                  </div>
                  <p className="text-[9px] text-yellow-800 line-clamp-2 mt-0.5 leading-tight">
                      {planned.manualContent ? `📝 ${planned.manualContent}` : planned.focus}
                  </p>
              </div>
          );
      }

      // Empty Slot
      // If we are filtering by Approved or Draft specifically, we hide empty slots to declutter
      if (viewFilter === 'APPROVED' || viewFilter === 'DRAFT') return null;

      return (
          <div onClick={(e) => { e.stopPropagation(); handleSlotClick(day, type); }} className="mb-1 p-1.5 border border-dashed border-slate-300 rounded hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer transition-colors group flex items-center justify-between opacity-60 hover:opacity-100">
              <span className="text-[10px] font-bold text-slate-900 uppercase">{label}</span>
              <span className="text-indigo-400 opacity-0 group-hover:opacity-100 text-[10px]">+</span>
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER CONTROLS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
                  <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronLeft size={18}/></button>
                  <span className="px-3 font-bold text-slate-700 capitalize min-w-[140px] text-center">{monthName} {year}</span>
                  <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronRight size={18}/></button>
              </div>
              <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500">
                  <div className="flex items-center"><div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>Aprovado</div>
                  <div className="flex items-center"><div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>Planejado</div>
              </div>
          </div>

          <div className="flex items-center gap-3">
              {/* FILTER DROPDOWN */}
              <div className="relative group">
                  <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 cursor-pointer hover:border-indigo-300">
                      <Filter size={16} />
                      <span>Visualizar: {viewFilter === 'ALL' ? 'Todos' : viewFilter}</span>
                      <ChevronDown size={14} />
                  </div>
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-lg z-20 hidden group-hover:block p-1">
                      <button onClick={() => setViewFilter('ALL')} className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-slate-50 ${viewFilter === 'ALL' ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>Todos</button>
                      <button onClick={() => setViewFilter('APPROVED')} className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-slate-50 ${viewFilter === 'APPROVED' ? 'font-bold text-green-600' : 'text-slate-600'}`}>Apenas Aprovados</button>
                      <button onClick={() => setViewFilter('DRAFT')} className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-slate-50 ${viewFilter === 'DRAFT' ? 'font-bold text-yellow-600' : 'text-slate-600'}`}>Apenas Rascunhos</button>
                      <div className="h-px bg-slate-100 my-1"></div>
                      <button onClick={() => setViewFilter('STORIES')} className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-slate-50 ${viewFilter === 'STORIES' ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>Apenas Stories</button>
                      <button onClick={() => setViewFilter('POST')} className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-slate-50 ${viewFilter === 'POST' ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>Apenas Posts</button>
                      <button onClick={() => setViewFilter('LIVE')} className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-slate-50 ${viewFilter === 'LIVE' ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>Apenas Lives</button>
                  </div>
              </div>

              <button onClick={handleExportExcel} className="flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-bold border border-green-200 transition-colors">
                  <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Baixar Excel</span>
              </button>
              <button onClick={handlePrint} className="flex items-center space-x-2 px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-bold border border-slate-200 transition-colors">
                  <Printer size={16} /> <span className="hidden sm:inline">Salvar PDF / Imprimir</span>
              </button>
          </div>
      </div>

      {/* CALENDAR GRID */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-indigo-50">
              {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((d) => (
                  <div key={d} className="py-3 text-center text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                      {d}
                  </div>
              ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px border-b border-slate-200">
              {/* Empty slots for previous month */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-white min-h-[140px] p-2 opacity-50"></div>
              ))}

              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dayOfWeek = date.getDay(); // 0 = Sun
                  // Map Sunday=0 to Index 6, Mon=1 to Index 0
                  const scheduleIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  const schedule = WEEKLY_SCHEDULE[scheduleIdx];

                  const focusColor = schedule.focus.includes('ATRAÇÃO') ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                     schedule.focus.includes('ENGAJAMENTO') ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                     'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                      <div key={day} className="bg-white min-h-[160px] p-2 hover:bg-slate-50 transition-colors flex flex-col group relative">
                          <div className="flex justify-between items-start mb-2">
                              <span className={`text-sm font-bold ${dayOfWeek === 0 || dayOfWeek === 6 ? 'text-red-500' : 'text-slate-700'}`}>{day}</span>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase truncate max-w-[80px] ${focusColor}`}>
                                  {schedule.focus.split(' ')[0]}
                              </span>
                          </div>
                          
                          <div className="flex-1 space-y-1">
                              {renderCellContent(day, 'stories', 'Stories')}
                              {renderCellContent(day, 'post', 'Post')}
                              {renderCellContent(day, 'live', 'Live')}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      {/* --- PLANNING MODAL --- */}
      {modalOpen && selectedSlot && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                      <div className="flex items-center space-x-2">
                         <CalendarIcon size={20} />
                         <h3 className="font-bold text-lg">Planejar Conteúdo</h3>
                      </div>
                      <button onClick={() => setModalOpen(false)} className="hover:bg-indigo-500 p-1 rounded transition-colors"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto">
                      <div className="flex items-center space-x-4 mb-6 text-sm">
                          <div className="bg-slate-100 px-3 py-1 rounded-full font-bold text-slate-600 flex items-center">
                              <CalendarIcon size={14} className="mr-2"/> {selectedSlot.date.split('-').reverse().join('/')}
                          </div>
                          <div className="bg-slate-100 px-3 py-1 rounded-full font-bold text-indigo-600 uppercase flex items-center">
                              <Tag size={14} className="mr-2"/> {selectedSlot.type}
                          </div>
                      </div>

                      {/* FORMAT SELECTOR */}
                      <div className="mb-6">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Formatos de Conteúdo (Multi-escolha)</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {CONTENT_FORMATS.map(fmt => {
                                  const isSelected = selectedFormats.includes(fmt.id);
                                  return (
                                      <button 
                                        key={fmt.id}
                                        onClick={() => handleFormatToggle(fmt.id)}
                                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                                            isSelected 
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                                        }`}
                                      >
                                          <div className={isSelected ? 'text-indigo-600' : 'text-slate-400'}>{fmt.icon}</div>
                                          <span>{fmt.label}</span>
                                          {isSelected && <CheckCircle2 size={12} className="ml-auto text-indigo-600"/>}
                                      </button>
                                  )
                              })}
                          </div>
                      </div>

                      <div className="mb-6">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Roteiro / Planejamento Manual</label>
                          <textarea 
                              className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 placeholder:text-slate-400"
                              placeholder="Escreva sua ideia, roteiro ou briefing aqui..."
                              value={manualText}
                              onChange={(e) => setManualText(e.target.value)}
                          />
                          <p className="text-xs text-slate-400 mt-1">Se preenchido, a IA usará este texto como base principal.</p>
                      </div>

                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-6">
                          <h4 className="text-sm font-bold text-yellow-800 mb-1 flex items-center"><Sparkles size={14} className="mr-1"/> Estratégia Ativa</h4>
                          <p className="text-xs text-yellow-700">
                             {selectedIds.length} ingredientes selecionados na aba Organizar serão incluídos no prompt para a IA.
                          </p>
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                      <button onClick={handleDeleteCurrentPlan} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center px-3 py-2">
                          <Trash2 size={16} className="mr-1"/> Excluir
                      </button>
                      <div className="flex space-x-3">
                          <button onClick={handleSaveDraft} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center">
                              <Save size={16} className="mr-2"/> Salvar Rascunho
                          </button>
                          <button onClick={handleSendToAI} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center">
                              <Sparkles size={16} className="mr-2"/> Gerar com IA
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- APPROVED CONTENT MODAL --- */}
      {approvedModalOpen && selectedSlot && approvedItems[`${selectedSlot.date}-${selectedSlot.type}`] && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-green-600 p-4 flex justify-between items-center text-white">
                      <div className="flex items-center space-x-2">
                         <CheckCircle2 size={20} />
                         <h3 className="font-bold text-lg">Conteúdo Aprovado</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                          <button onClick={handleDeleteCurrentApproved} className="p-1.5 bg-green-700 hover:bg-green-800 rounded text-white mr-2" title="Excluir Conteúdo">
                              <Trash2 size={18}/>
                          </button>
                          <button onClick={() => setApprovedModalOpen(false)} className="hover:bg-green-500 p-1 rounded transition-colors"><X size={20}/></button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8">
                        <div className="flex items-center space-x-4 mb-6 text-sm">
                          <div className="bg-slate-100 px-3 py-1 rounded-full font-bold text-slate-600 flex items-center">
                              <CalendarIcon size={14} className="mr-2"/> {selectedSlot.date.split('-').reverse().join('/')}
                          </div>
                          <div className="bg-slate-100 px-3 py-1 rounded-full font-bold text-green-600 uppercase flex items-center">
                              <Tag size={14} className="mr-2"/> {selectedSlot.type}
                          </div>
                      </div>

                      <div className="prose prose-sm max-w-none text-slate-800">
                          <ReactMarkdown>{approvedItems[`${selectedSlot.date}-${selectedSlot.type}`].text}</ReactMarkdown>
                      </div>

                      {/* CAROUSEL / IMAGE GALLERY */}
                      {approvedItems[`${selectedSlot.date}-${selectedSlot.type}`].carouselImages && approvedItems[`${selectedSlot.date}-${selectedSlot.type}`].carouselImages!.length > 0 && (
                          <div className="mt-8 border-t border-slate-200 pt-6">
                              <h4 className="text-sm font-bold text-slate-900 uppercase mb-4 flex items-center">
                                  <ImageIcon size={16} className="mr-2 text-indigo-600"/> Galeria Visual Criada
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                  {approvedItems[`${selectedSlot.date}-${selectedSlot.type}`].carouselImages!.map((img, idx) => (
                                      <div key={idx} className="relative group bg-slate-100 rounded-lg overflow-hidden border border-slate-200 aspect-square md:aspect-[9/16]">
                                          <img src={img} className="w-full h-full object-cover" alt={`Slide ${idx + 1}`} />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                              <a 
                                                href={img} 
                                                download={`roma-visual-${selectedSlot.date}-${idx+1}.png`}
                                                className="opacity-0 group-hover:opacity-100 p-2 bg-white rounded-full shadow-lg text-slate-800 hover:scale-110 transition-all"
                                              >
                                                  <Download size={16} />
                                              </a>
                                          </div>
                                          <span className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 rounded font-bold">
                                              {idx + 1}
                                          </span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <button onClick={() => setApprovedModalOpen(false)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors">
                          Fechar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CalendarView;