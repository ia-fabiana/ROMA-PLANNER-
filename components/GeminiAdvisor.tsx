
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StrategyItem, ContentType, HistoryItem, CalendarContext, ApprovedContent } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Copy, RefreshCw, MessageSquare, Bot, AlertTriangle, Tag, X, Video, History, Trash2, Calendar, ArrowLeft, CheckCircle2, Image as ImageIcon, Download, Volume2, StopCircle, Upload, ThumbsUp, Eye, EyeOff, Smartphone, Square, RectangleVertical, Hash, Clapperboard, Type as TypeIcon, Layers, ChevronDown, ChevronUp, Wand2, Edit, Grid, RefreshCcw } from 'lucide-react';

interface GeminiAdvisorProps {
  data: StrategyItem[];
  selectedIds: string[]; // Format: "rowId-field"
  calendarContext: CalendarContext | null;
  onClearContext: () => void;
  onApprove: (item: ApprovedContent) => void;
}

interface KitSection {
  title: string;
  content: string;
  visualCues: string[];
}

// Helper to define the schema structure manually since strictly typed Schema is verbose
const KIT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    script: { 
      type: Type.OBJECT, 
      properties: { 
        title: {type: Type.STRING}, 
        content: {type: Type.STRING}, 
        visualCues: {
          type: Type.ARRAY, 
          items: {type: Type.STRING},
          description: "List of detailed visual descriptions, one for each scene of the script."
        } 
      } 
    },
    stories: { 
      type: Type.OBJECT, 
      properties: { 
        title: {type: Type.STRING}, 
        content: {type: Type.STRING}, 
        visualCues: {
          type: Type.ARRAY, 
          items: {type: Type.STRING},
          description: "List of detailed visual descriptions, one for each story frame (sequence)."
        } 
      } 
    },
    feed: { 
      type: Type.OBJECT, 
      properties: { 
        title: {type: Type.STRING}, 
        content: {type: Type.STRING}, 
        visualCues: {
          type: Type.ARRAY, 
          items: {type: Type.STRING},
          description: "List containing 1 visual description for the post image."
        } 
      } 
    },
    caption: { 
      type: Type.OBJECT, 
      properties: { 
        title: {type: Type.STRING}, 
        content: {type: Type.STRING},
        // Caption usually doesn't have its own image separate from Feed, but we keep schema clean
      } 
    },
    carousel: { 
      type: Type.OBJECT, 
      properties: { 
        title: {type: Type.STRING}, 
        content: {type: Type.STRING}, 
        visualCues: {
          type: Type.ARRAY, 
          items: {type: Type.STRING},
          description: "List of detailed visual descriptions, one for each slide of the carousel."
        } 
      } 
    },
  },
  required: ["script", "stories", "feed", "caption", "carousel"]
};

const GeminiAdvisor: React.FC<GeminiAdvisorProps> = ({ data, selectedIds, calendarContext, onClearContext, onApprove }) => {
  const [generatedContent, setGeneratedContent] = useState<string>(''); // Legacy/Single string content
  const [kitResult, setKitResult] = useState<Record<string, KitSection> | null>(null); // New structured content
  
  const [storyImage, setStoryImage] = useState<string | null>(null); // Legacy single image
  const [sectionImages, setSectionImages] = useState<Record<string, string[]>>({}); // Images for kit sections (array of URLs)

  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null); // Holds key of section currently generating
  const [regeneratingIndex, setRegeneratingIndex] = useState<{key: string, index: number} | null>(null); // Track individual image regen
  const [promptType, setPromptType] = useState<ContentType>('kit'); // Default to Kit
  const [isApproved, setIsApproved] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '3:4' | '9:16'>('9:16');
  
  // Refinement State
  const [adjustmentText, setAdjustmentText] = useState('');
  
  // Section-specific Refinement State
  const [activeRefineSection, setActiveRefineSection] = useState<string | null>(null);
  const [sectionAdjustmentText, setSectionAdjustmentText] = useState('');
  
  // Audio / TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Image Reference State
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roma_history');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Handle incoming calendar context on mount/change
  useEffect(() => {
    if (calendarContext) {
      if (calendarContext.contentType === 'stories') {
        setPromptType('stories');
      } else if (calendarContext.contentType === 'roteiro') {
        setPromptType('roteiro');
      } else {
        setPromptType('kit'); 
      }
      setIsApproved(false);
      setAdjustmentText('');
      setKitResult(null);
      generateInsight(true); 
    }
  }, [calendarContext]);

  // Set default aspect ratio based on prompt type
  useEffect(() => {
    if (promptType === 'stories' || promptType === 'roteiro' || promptType === 'kit') {
        setImageAspectRatio('9:16');
    } else if (promptType === 'feed') {
        setImageAspectRatio('4:3'); 
    } else {
        setImageAspectRatio('1:1');
    }
  }, [promptType]);

  // Persist history
  useEffect(() => {
    localStorage.setItem('roma_history', JSON.stringify(history));
  }, [history]);

  // TTS Cleanup
  useEffect(() => {
    return () => {
        window.speechSynthesis.cancel();
    };
  }, []);

  const addToHistory = (content: string | object, type: ContentType, ingredients: any, imageUrl?: string) => {
    const summary: string[] = [];
    if (calendarContext) {
        summary.push(`Agenda: ${calendarContext.date}`);
        summary.push(`Foco: ${calendarContext.strategy.substring(0,20)}...`);
    } else {
        if (ingredients.pain.length) summary.push(`Dor: ${ingredients.pain[0].substring(0, 15)}...`);
        if (ingredients.desire.length) summary.push(`Desejo: ${ingredients.desire[0].substring(0, 15)}...`);
    }

    // Serialize object content for history
    const finalContent = typeof content === 'string' ? content : JSON.stringify(content);

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type,
      content: finalContent,
      ingredientsSummary: summary,
      imageUrl
    };

    setHistory(prev => [newItem, ...prev]);
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const restoreHistoryItem = (item: HistoryItem) => {
    try {
        // Try parsing as JSON first (for Kit items)
        const parsed = JSON.parse(item.content);
        if (typeof parsed === 'object' && parsed !== null && item.type === 'kit') {
            setKitResult(parsed);
            setGeneratedContent('');
        } else {
            setGeneratedContent(item.content);
            setKitResult(null);
        }
    } catch (e) {
        // Fallback for plain text
        setGeneratedContent(item.content);
        setKitResult(null);
    }

    setStoryImage(item.imageUrl || null);
    setSectionImages({}); // Clear section images on restore for now, as they aren't fully persisted in this simplified version
    setPromptType(item.type);
    setIsApproved(false);
    setShowHistory(false);
    setAdjustmentText('');
  };

  const handleSpeak = (textToRead: string) => {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
    }
    if (!textToRead) return;

    // Clean markdown
    const clean = textToRead.replace(/(\*\*|__|\*|_|`|#|~|\[.*?\])/g, '');
    
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'pt-BR';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleApprove = () => {
    if (calendarContext) {
        const typeKey = calendarContext.contentType === 'stories' ? 'stories' : 'social';
        const id = `${calendarContext.date}-${typeKey}`;
        
        let finalContent = generatedContent;
        // If kit, we flatten it for approval text, or just take the main parts
        if (kitResult) {
            finalContent = Object.values(kitResult).map((k: any) => `## ${k.title}\n\n${k.content}`).join('\n\n---\n\n');
        }

        const approvedItem: ApprovedContent = {
            id,
            date: calendarContext.date,
            type: calendarContext.contentType,
            text: finalContent,
            imageUrl: storyImage || undefined,
            strategy: calendarContext.strategy,
            timestamp: Date.now()
        };
        
        onApprove(approvedItem);
        setIsApproved(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setReferenceImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const clearReferenceImage = () => {
    setReferenceImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  // Ingredients logic
  const ingredients = useMemo(() => {
    const acc = {
      desire: [] as string[],
      opportunity: [] as string[],
      engagement: [] as string[],
      objection: [] as string[],
      pain: [] as string[]
    };

    selectedIds.forEach(idString => {
      const [rowId, field] = idString.split('-');
      const item = data.find(d => d.id === rowId);
      if (item && field && field in item) {
        // @ts-ignore
        const value = item[field];
        if (value && typeof value === 'string') {
          // @ts-ignore
          acc[field].push(value); 
        }
      }
    });

    return acc;
  }, [selectedIds, data]);

  const hasIngredients = selectedIds.length > 0;
  
  // --- CORE GENERATION LOGIC ---
  const generateInsight = async (isAutoRun = false, customInstruction: string = '') => {
    if (!process.env.API_KEY) return;
    if (!hasIngredients && !calendarContext && !customInstruction) return;

    setLoading(true);
    if (!customInstruction) {
        // Reset only if full regen
        setGeneratedContent('');
        setKitResult(null);
        setStoryImage(null);
        setSectionImages({});
        setIsApproved(false);
    }
    
    setShowHistory(false);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const baseContext = `
        Atue como um especialista em Marketing Digital para salões de beleza.
        ROMA: "Ajudo Profissionais da Beleza a melhorar a divulgação e atrair novas clientes utilizando IA."
        AVATAR: Iniciantes em tecnologia. Use linguagem simples (ELI5), acolhedora, sem termos infantis.
        Use AIDA.
      `;

      let promptData = '';
      if (calendarContext) {
        promptData = `CONTEXTO: Estratégia: ${calendarContext.strategy}. Foco: ${calendarContext.focus}. Nota: ${calendarContext.adjustments || 'Nenhuma'}`;
      } else {
        promptData = `INGREDIENTES: Dores: ${ingredients.pain.join(', ')}. Desejos: ${ingredients.desire.join(', ')}.`;
      }

      const isKit = promptType === 'kit';
      let fullPrompt = `${baseContext}\n${promptData}\n`;

      if (customInstruction) {
          fullPrompt += `\n🔴 REFAZER COM AJUSTE: "${customInstruction}".`;
      }

      // Prompt Configuration
      if (isKit) {
         fullPrompt += `
         Gere uma CAMPANHA COMPLETA.
         Retorne um JSON estrito.
         Estrutura:
         - script: Roteiro de REELS ENVOLVENTE (Título, Conteúdo Markdown com Gancho Viral (3s), Corpo com Retenção e CTA Forte, visualCues: string[] com descrição para CADA cena). O foco é vídeo dinâmico vertical.
         - stories: Sequência de 5 Stories (Título, Conteúdo Markdown, visualCues: string[] com descrição para CADA story)
         - feed: Post de Feed (Título, Conteúdo Markdown com Headline, visualCues: string[] com 1 descrição da imagem)
         - caption: Legenda AIDA + Hashtags (Título, Conteúdo Markdown)
         - carousel: Estrutura Carrossel 5-7 slides (Título, Conteúdo Markdown, visualCues: string[] com descrição para CADA slide)
         
         IMPORTANTE: 'visualCues' deve ser sempre um ARRAY de strings, mesmo se tiver apenas um item.
         `;
      } else {
         // Legacy text prompts
         if (promptType === 'roteiro') fullPrompt += "Escreva um Roteiro de REELS altamente engajador (30-60s). Use linguagem falada e dinâmica. Estruture com: Gancho Viral (0-3s), Desenvolvimento (Retenção) e CTA (Chamada para Ação) Claro. Inclua sugestões de texto na tela e cortes.";
         else if (promptType === 'stories') fullPrompt += "Crie uma sequência de 5 Stories (Interação > Conteúdo > Oferta).";
         else if (promptType === 'feed') fullPrompt += "Crie uma descrição visual para foto de Feed e a Headline (Texto na imagem).";
         else if (promptType === 'legenda') fullPrompt += "Crie uma Legenda AIDA para Instagram com Hashtags.";
         else if (promptType === 'hashtags') fullPrompt += "Liste 30 hashtags estratégicas divididas por grupos.";
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: isKit ? { 
            responseMimeType: 'application/json',
            responseSchema: KIT_SCHEMA
        } : undefined
      });

      if (isKit && response.text) {
          const parsed = JSON.parse(response.text);
          setKitResult(parsed);
          if (!customInstruction) addToHistory(parsed, 'kit', isAutoRun ? {pain:[]} : ingredients);
      } else {
          const text = response.text || 'Erro na geração.';
          setGeneratedContent(text);
          if (!customInstruction) addToHistory(text, promptType, isAutoRun ? {pain:[]} : ingredients);
      }

    } catch (error) {
      console.error(error);
      setGeneratedContent('Erro ao gerar estratégia. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to generate a single image blob/url from a cue
  const generateSingleImage = async (cue: string): Promise<string> => {
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
     
     let imagePrompt = `
       Crie uma imagem realista, profissional, estilo fotografia de alta qualidade para Instagram de salão de beleza.
       Cena: ${cue}
       Estilo: Iluminação suave, tons de dourado e branco, clean, estético.
       Texto OBRIGATÓRIO na imagem: @ia.fabiana
       Texto deve ser pequeno, discreto, no canto inferior direito, fonte sans-serif moderna, cor branca ou dourada.
     `;

     const contents: any[] = [{ text: imagePrompt }];

     // If there's a reference image, include it
     if (referenceImage) {
        const base64Data = referenceImage.split(',')[1];
        contents.unshift({
           inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg' 
           }
        });
        imagePrompt += " Baseie-se na composição e estilo da imagem de referência fornecida, mas adapte para a cena descrita.";
     }

     const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: contents },
        config: {
           imageConfig: {
              aspectRatio: imageAspectRatio,
              imageSize: "1K"
           }
        }
     });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
       if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
       }
    }
    throw new Error("No image generated");
  };

  const handleGenerateSectionImages = async (sectionKey: string, cues: string[]) => {
     if (!cues || cues.length === 0) return;
     setGeneratingImage(sectionKey);
     setRegeneratingIndex(null); // Clear specific regen state if running full batch

     try {
        const promises = cues.map(cue => generateSingleImage(cue));
        const results = await Promise.all(promises);
        
        setSectionImages(prev => ({
            ...prev,
            [sectionKey]: results
        }));
     } catch (e) {
        console.error("Batch image gen failed", e);
        // Fallback or error toast could go here
     } finally {
        setGeneratingImage(null);
     }
  };

  const handleRegenerateSingleImage = async (sectionKey: string, index: number, cue: string) => {
     setRegeneratingIndex({ key: sectionKey, index });
     try {
        const newUrl = await generateSingleImage(cue);
        setSectionImages(prev => {
           const currentImages = [...(prev[sectionKey] || [])];
           currentImages[index] = newUrl;
           return {
              ...prev,
              [sectionKey]: currentImages
           };
        });
     } catch (e) {
        console.error("Single image regen failed", e);
     } finally {
        setRegeneratingIndex(null);
     }
  };

  const handleRefineKitSection = async (sectionKey: string) => {
    if (!kitResult || !sectionAdjustmentText) return;
    
    setLoading(true);
    // Regenerate just this section (simulated by re-running prompt with focus, 
    // real implementation would be more complex partial update, here we just re-run full with instruction focused on that part
    // OR we can just use the text prompt to update that specific part. For simplicity, let's re-run full but ask to keep others same.
    // BETTER: Just run a text update on that specific content.
    
    // For this demo, let's just re-run the full kit generator with the instruction
    await generateInsight(false, `No item '${sectionKey}': ${sectionAdjustmentText}. Mantenha os outros itens iguais.`);
    setActiveRefineSection(null);
    setSectionAdjustmentText('');
  };

  const renderSectionImages = (sectionKey: string, cues: string[]) => {
     const images = sectionImages[sectionKey];
     const isGen = generatingImage === sectionKey;
     
     if (!images && !isGen) return null;

     return (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
           {cues.map((cue, idx) => {
              const url = images?.[idx];
              const isThisRegen = regeneratingIndex?.key === sectionKey && regeneratingIndex?.index === idx;

              return (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-[9/16]">
                   {url ? (
                      <>
                        <img src={url} alt={`Slide ${idx+1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                           <a href={url} download={`roma-${sectionKey}-${idx}.png`} className="p-2 bg-white rounded-full text-slate-800 hover:bg-slate-200 transition-colors" title="Baixar">
                              <Download size={16} />
                           </a>
                           <button 
                             onClick={() => handleRefineKitSection(sectionKey)} // This would trigger text refine, logic below is for image refine
                             className="hidden"
                           ></button>
                           <button
                             onClick={() => handleRegenerateSingleImage(sectionKey, idx, cue)}
                             disabled={!!regeneratingIndex}
                             className={`p-2 bg-white rounded-full text-slate-800 hover:bg-slate-200 transition-colors ${isThisRegen ? 'animate-spin' : ''}`}
                             title="Regerar Imagem"
                           >
                              <RefreshCw size={16} />
                           </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50 text-white text-[9px] truncate px-2">
                           {cue}
                        </div>
                      </>
                   ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-slate-400">
                         {isGen || isThisRegen ? <Sparkles className="animate-spin mb-2" size={20}/> : <ImageIcon className="mb-2" size={20}/>}
                         <span className="text-[10px] line-clamp-3">{cue}</span>
                      </div>
                   )}
                </div>
              );
           })}
        </div>
      );
  };

  // Render a specific card for a Kit Section
  const renderKitCard = (key: string, section: KitSection, icon: React.ReactNode, colorClass: string) => {
    const isVisual = section.visualCues && section.visualCues.length > 0;
    
    return (
      <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className={`px-4 py-3 border-b border-slate-100 flex justify-between items-center ${colorClass} bg-opacity-10`}>
           <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${colorClass} text-white`}>{icon}</div>
              <h3 className="font-bold text-slate-800">{section.title || key.toUpperCase()}</h3>
           </div>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                   navigator.clipboard.writeText(section.content);
                }}
                className="p-1.5 hover:bg-white rounded-md text-slate-500 transition-colors" title="Copiar Texto"
              >
                <Copy size={16} />
              </button>
           </div>
        </div>
        
        <div className="p-5">
           <div className="prose prose-sm max-w-none text-black prose-headings:text-black prose-p:text-black prose-li:text-black prose-strong:text-black">
              <ReactMarkdown>{section.content}</ReactMarkdown>
           </div>
           
           {/* Section Controls */}
           <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveRefineSection(activeRefineSection === key ? null : key)}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                 <Edit size={14} className="mr-1.5" />
                 Ajustar Texto
              </button>
              
              {isVisual && (
                 <button
                    onClick={() => handleGenerateSectionImages(key, section.visualCues)}
                    disabled={!!generatingImage}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                 >
                    {generatingImage === key ? <Sparkles size={14} className="mr-1.5 animate-spin"/> : <ImageIcon size={14} className="mr-1.5"/>}
                    {sectionImages[key] ? 'Regerar Imagens' : 'Gerar Imagens Sugeridas'}
                 </button>
              )}
           </div>

           {/* Refinement Input */}
           {activeRefineSection === key && (
              <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200 animate-fade-in">
                 <textarea
                    value={sectionAdjustmentText}
                    onChange={(e) => setSectionAdjustmentText(e.target.value)}
                    placeholder={`Como você quer melhorar este ${key}?`}
                    className="w-full text-sm p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
                    rows={2}
                 />
                 <div className="flex justify-end gap-2">
                    <button 
                       onClick={() => setActiveRefineSection(null)}
                       className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                    >Cancelar</button>
                    <button 
                       onClick={() => handleRefineKitSection(key)}
                       disabled={loading}
                       className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                       {loading ? 'Processando...' : 'Aplicar Ajuste'}
                    </button>
                 </div>
              </div>
           )}

           {/* Images Display */}
           {isVisual && renderSectionImages(key, section.visualCues)}
        </div>
      </div>
    );
  };

  // Helper for rendering format tabs
  const renderTab = (type: ContentType, label: string, icon: React.ReactNode) => {
    const isActive = promptType === type;
    return (
      <button
        onClick={() => setPromptType(type)}
        className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
           isActive 
             ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
             : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
        }`}
      >
        {icon}
        <span className="ml-2">{label}</span>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in flex flex-col relative h-[calc(100vh-120px)] min-h-[600px]">
      
      {/* 1. TOP TAB BAR */}
      <div className="flex items-center bg-white border-b border-slate-200 overflow-x-auto no-scrollbar">
        {renderTab('kit', 'Campanha (Kit)', <Layers size={18} />)}
        {renderTab('roteiro', 'Roteiro', <Clapperboard size={18} />)}
        {renderTab('stories', 'Story', <Smartphone size={18} />)}
        {renderTab('feed', 'Feed', <ImageIcon size={18} />)}
        {renderTab('legenda', 'Legenda', <TypeIcon size={18} />)}
        {renderTab('hashtags', 'Hashtags', <Hash size={18} />)}
        
        {/* Spacer */}
        <div className="flex-1"></div>

        {/* History Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-3 text-slate-400 hover:text-indigo-600 transition-colors border-l border-slate-100 ${showHistory ? 'bg-indigo-50 text-indigo-600' : ''}`}
          title="Histórico de Gerações"
        >
           <History size={18} />
        </button>
      </div>

      {/* 2. COMPACT TOOLBAR */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3 shadow-sm z-10">
        
        {/* Main Generate Button */}
        <button
            onClick={() => generateInsight()}
            disabled={loading || (!hasIngredients && !calendarContext && !adjustmentText)}
            className={`
                flex items-center px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all
                ${loading 
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-md hover:scale-[1.02]'
                }
            `}
        >
            {loading ? <RefreshCw className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? 'Criando...' : 'Gerar Conteúdo'}
        </button>

        {/* Visual Ref Upload */}
        <div className="relative group">
           <input
               type="file"
               ref={fileInputRef}
               onChange={handleFileSelect}
               className="hidden"
               accept="image/*"
           />
           <button
               onClick={() => fileInputRef.current?.click()}
               className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  referenceImage 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
               }`}
           >
               {referenceImage ? <CheckCircle2 size={14} className="mr-1.5"/> : <Upload size={14} className="mr-1.5"/>}
               {referenceImage ? 'Ref. Carregada' : 'Ref. Visual'}
           </button>
           {referenceImage && (
               <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded shadow-lg border border-slate-200 z-50 w-32 hidden group-hover:block">
                   <img src={referenceImage} alt="Ref" className="w-full h-20 object-cover rounded mb-2"/>
                   <button onClick={clearReferenceImage} className="w-full text-xs text-red-500 hover:bg-red-50 p-1 rounded">Remover</button>
               </div>
           )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-300 mx-1"></div>

        {/* Context Indicator */}
        <div className="flex-1 flex items-center justify-between overflow-hidden">
            <div className="flex items-center text-xs text-slate-500 truncate mr-2">
               {calendarContext ? (
                  <>
                     <span className="font-bold text-indigo-600 mr-2 bg-indigo-50 px-2 py-0.5 rounded">
                        {calendarContext.dayOfWeek}
                     </span>
                     <span className="truncate max-w-[200px]">{calendarContext.focus}</span>
                     <button onClick={onClearContext} className="ml-2 p-1 hover:bg-slate-200 rounded-full" title="Limpar Contexto">
                        <X size={12}/>
                     </button>
                  </>
               ) : hasIngredients ? (
                  <>
                     <span className="font-bold text-slate-700 mr-2 bg-white border px-2 py-0.5 rounded">
                        {ingredients.pain.length} Dores
                     </span>
                     <span className="truncate max-w-[200px]">Selecionadas</span>
                  </>
               ) : (
                  <span className="italic opacity-50">Selecione itens em "Organizar" ou use o Calendário</span>
               )}
            </div>
            
            {/* General Refine Input (Always visible but compact) */}
            <div className="flex items-center max-w-[300px] flex-1">
               <input 
                  type="text" 
                  value={adjustmentText}
                  onChange={(e) => setAdjustmentText(e.target.value)}
                  placeholder="Instrução extra (ex: 'Mais curto')"
                  className="w-full text-xs py-1.5 px-3 border border-slate-300 rounded-l-lg focus:outline-none focus:border-indigo-500"
               />
               <button className="bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg px-2 py-1.5 text-slate-500 hover:text-indigo-600">
                  <Wand2 size={14} />
               </button>
            </div>
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden bg-slate-50/30">
        
        {/* History Sidebar Overlay */}
        {showHistory && (
          <div className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 absolute inset-y-0 left-0 shadow-xl animate-slide-in-left">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 flex items-center text-sm">
                 <History size={16} className="mr-2"/> Histórico
              </h3>
              <button onClick={() => setShowHistory(false)}><X size={16} className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 && <div className="p-6 text-center text-xs text-slate-400">Nenhum histórico ainda.</div>}
              {history.map(item => (
                <div key={item.id} onClick={() => restoreHistoryItem(item)} className="p-3 border-b border-slate-100 hover:bg-indigo-50 cursor-pointer group">
                   <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                         {new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </span>
                      <button onClick={(e) => deleteHistoryItem(e, item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                         <Trash2 size={12}/>
                      </button>
                   </div>
                   <div className="text-xs font-semibold text-slate-700 mb-1 flex items-center capitalize">
                      {item.type === 'kit' ? <Layers size={12} className="mr-1 text-purple-500"/> : <MessageSquare size={12} className="mr-1 text-blue-500"/>}
                      {item.type}
                   </div>
                   <div className="text-[10px] text-slate-500 line-clamp-2">
                      {item.ingredientsSummary.join(' • ')}
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Result Display */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
               <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                  <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-indigo-500" size={24} />
               </div>
               <p className="animate-pulse font-medium">Analisando estratégia e criando conteúdo...</p>
            </div>
          ) : !generatedContent && !kitResult ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
               <Bot size={48} className="mb-4 text-slate-300"/>
               <p className="text-sm">Selecione os ingredientes e clique em Gerar.</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
              
              {/* KIT VIEW MODE */}
              {kitResult ? (
                  <div className="space-y-6 animate-fade-in-up">
                     {renderKitCard('roteiro', kitResult.script, <Clapperboard size={20}/>, 'bg-blue-500')}
                     {renderKitCard('story', kitResult.stories, <Smartphone size={20}/>, 'bg-pink-500')}
                     {renderKitCard('feed', kitResult.feed, <ImageIcon size={20}/>, 'bg-purple-500')}
                     {renderKitCard('carousel', kitResult.carousel, <Grid size={20}/>, 'bg-indigo-500')}
                     {renderKitCard('legenda', kitResult.caption, <TypeIcon size={20}/>, 'bg-slate-500')}
                     
                     {/* Kit Approval */}
                     <div className="flex justify-center mt-12 mb-8">
                        {isApproved ? (
                           <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-6 py-3 rounded-full border border-green-200">
                              <CheckCircle2 size={24} />
                              <span className="font-bold">Conteúdo Aprovado!</span>
                           </div>
                        ) : calendarContext && (
                           <button
                              onClick={handleApprove}
                              className="flex items-center px-8 py-4 bg-green-600 text-white rounded-full font-bold shadow-lg hover:bg-green-700 hover:scale-105 transition-all"
                           >
                              <ThumbsUp size={20} className="mr-2" />
                              Aprovar Campanha Completa
                           </button>
                        )}
                     </div>
                  </div>
              ) : (
                  // STANDARD VIEW MODE (Legacy single text)
                  <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-fade-in-up">
                      <div className="prose max-w-none mb-6 text-black prose-headings:text-black prose-p:text-black prose-li:text-black prose-strong:text-black">
                          <ReactMarkdown>{generatedContent}</ReactMarkdown>
                      </div>
                      
                      {/* Image Generator for Standard Mode */}
                      {(promptType === 'feed' || promptType === 'stories') && (
                          <div className="mt-8 pt-8 border-t border-slate-100">
                              <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-bold text-slate-700 flex items-center">
                                      <ImageIcon className="mr-2" size={18} /> 
                                      Sugestão Visual
                                  </h4>
                                  {!storyImage && (
                                      <button 
                                          onClick={() => generateSingleImage(generatedContent.slice(0, 300)).then(setStoryImage)} // Simple generation based on text
                                          className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium"
                                      >
                                          Gerar Imagem
                                      </button>
                                  )}
                              </div>
                              {storyImage && (
                                  <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-w-sm mx-auto shadow-lg">
                                      <img src={storyImage} alt="Generated" className="w-full h-auto" />
                                      <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <a href={storyImage} download="roma-content.png" className="p-2 bg-white/90 rounded-full shadow-sm hover:bg-white text-slate-700">
                                              <Download size={16} />
                                          </a>
                                          <button onClick={() => setStoryImage(null)} className="p-2 bg-white/90 rounded-full shadow-sm hover:bg-white text-red-500">
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}

                      {/* Approval Button Standard */}
                      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex space-x-2">
                             <button onClick={() => navigator.clipboard.writeText(generatedContent)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Copiar Texto">
                                <Copy size={20} />
                             </button>
                             <button onClick={() => handleSpeak(generatedContent)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title={isSpeaking ? "Parar" : "Ouvir"}>
                                {isSpeaking ? <StopCircle size={20} className="text-red-500 animate-pulse"/> : <Volume2 size={20} />}
                             </button>
                          </div>
                          
                          {calendarContext && (
                             isApproved ? (
                                <div className="text-green-600 font-bold flex items-center bg-green-50 px-4 py-2 rounded-lg">
                                   <CheckCircle2 size={18} className="mr-2"/> Aprovado
                                </div>
                             ) : (
                                <button
                                   onClick={handleApprove}
                                   className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center"
                                >
                                   <ThumbsUp size={18} className="mr-2" /> Aprovar
                                </button>
                             )
                          )}
                      </div>
                  </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeminiAdvisor;
