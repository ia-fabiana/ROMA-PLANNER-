
import React, { useState, useEffect, useRef } from 'react';
import { StrategyItem, ContentType, HistoryItem, CalendarContext, ApprovedContent } from '../types';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Copy, RefreshCw, X, Calendar, CheckCircle2, Image as ImageIcon, Video, Mic, ExternalLink, Wand2, Grid, Clapperboard, MonitorPlay, Layers, Edit2, Download, ChevronRight, Camera, Upload, Trash2, Info, Save, Terminal, FileText } from 'lucide-react';

interface GeminiAdvisorProps {
  data: StrategyItem[];
  selectedIds: string[]; // Format: "rowId-field"
  calendarContext: CalendarContext | null;
  onClearContext: () => void;
  onApprove: (item: ApprovedContent) => void;
}

// Helper to identify section types based on headers
type SectionType = 'VIDEO' | 'STORIES' | 'FEED' | 'CAROUSEL' | 'AVATAR' | 'AUDIO' | 'IMAGE_PROMPT' | 'PROMPT' | 'OTHER';

interface ParsedSection {
    id: string;
    type: SectionType;
    title: string;
    content: string;
}

// Helper for handling Base64 Mime types safely
const parseBase64 = (dataUrl: string) => {
    if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.length < 100) return null; // Increased min length check
    
    try {
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const data = matches[2];
            // Validate mimeType specifically for Gemini Vision
            const validMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
            if (data.length > 0 && validMimes.includes(mimeType)) {
                return { mimeType, data };
            }
        }
    } catch (e) {
        console.error("Base64 Parse Error", e);
    }
    return null;
}

// NEW: Helper to extract specific content for a story step
const extractStoryContent = (fullText: string, index: number): string => {
    // Regex matches "Story 1:", "1.", "Cena 1" followed by text until the next number or end
    const patterns = [
        new RegExp(`(?:Story|Stories|Cena|Slide|Quadrinho)\\s*0?${index}\\s*[:.-]([^]*?)(?=(?:Story|Stories|Cena|Slide|Quadrinho)\\s*0?${index+1}|$)`, 'i'),
        new RegExp(`^\\s*${index}\\.\\s*([^]*?)(?=\\n\\s*${index+1}\\.|$)`, 'm')
    ];
    
    for (const regex of patterns) {
        const match = fullText.match(regex);
        if (match && match[1]) {
            let clean = match[1].trim();
            // Remove common visual cues from text if they are explicitly labeled, to avoid clutter
            clean = clean.replace(/^\(Visual:.*?\)/i, '').trim();
            return clean;
        }
    }
    
    // Fallback: If structure is lost, try to grab paragraph by index
    const paragraphs = fullText.split(/\n\n+/).filter(p => p.trim().length > 10);
    if (paragraphs[index-1]) return paragraphs[index-1];
    
    return fullText.substring(0, 150); // Ultimate fallback
}

const GeminiAdvisor: React.FC<GeminiAdvisorProps> = ({ 
  data, 
  selectedIds, 
  calendarContext, 
  onClearContext, 
  onApprove 
}) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genType, setGenType] = useState<'TEXT' | 'IMAGE'>('TEXT');

  // --- TARGET DATE & TYPE SELECTION (FIX FOR SAVING BUG) ---
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [targetType, setTargetType] = useState<ContentType>('feed');

  // --- NEW STATE FOR INTERLEAVED IMAGES ---
  // Key format: "sectionIndex_slotIndex"
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [isGeneratingImg, setIsGeneratingImg] = useState<Record<string, boolean>>({});
  const [adjustedPrompts, setAdjustedPrompts] = useState<Record<string, string>>({});
  const [referenceImages, setReferenceImages] = useState<Record<string, string>>({}); // Local per-slot refs
  const [globalReferenceImage, setGlobalReferenceImage] = useState<string | null>(null); // Global ref
  const [editingSlot, setEditingSlot] = useState<string | null>(null); // Which slot is open for adjustment

  // Sync state with incoming calendar context
  useEffect(() => {
    if (calendarContext) {
      // 1. Set Target Metadata
      setTargetDate(calendarContext.date);
      setTargetType(calendarContext.contentType);

      // 2. Build Prompt
      const ingredientsText = calendarContext.strategy;
      const formatsText = calendarContext.selectedFormats && calendarContext.selectedFormats.length > 0 
          ? calendarContext.selectedFormats.join(', ') 
          : 'Nenhum formato específico selecionado (Gere Kit Padrão)';
      
      let basePrompt = `Atue como um ROTEIRISTA SÊNIOR e DIRETOR DE ARTE especialista em Marketing para Estética (Método Roma).
IDIOMA OBRIGATÓRIO: PORTUGUÊS DO BRASIL (PT-BR).

PERSONA DA EXPERT (QUEM FALA):
- Nome: Fabiana (@ia.fabiana).
- Perfil: Especialista em IA para profissionais da beleza.
- Tom de voz: Didático, inovador, acolhedor e direto.
- FORMATO DE VÍDEO: O conteúdo será gravado utilizando um AVATAR DIGITAL (HeyGen) da Fabiana.

CONTEXTO DO CLIENTE (ALUNO/SEGMENTO):
- Foco: ${calendarContext.focus}
- Ingredientes Estratégicos: ${ingredientsText}
- FORMATOS DESEJADOS: ${formatsText}
${calendarContext.manualContent ? `- RASCUNHO/IDEIA INICIAL: "${calendarContext.manualContent}"` : ''}
${calendarContext.adjustments ? `- Instruções Extras: ${calendarContext.adjustments}` : ''}

IMPORTANTE: Crie um KIT VISUAL seguindo ESTRITAMENTE a estrutura abaixo.

# 🎥 1. ROTEIRO DE VÍDEO (REELS COM AVATAR FABIANA @ia.fabiana)
Crie um roteiro vertical 9:16 otimizado para o HeyGen.
Siga rigorosamente os 8 PASSOS DO SCRIPT DE ALTA CONVERSÃO:
1. HEADLINE (P.E.C)
2. ROMA (Promessa)
3. CTA (Seguir @ia.fabiana)
4. JEITO ERRADO (O erro comum)
5. CONSEQUÊNCIA (O problema gerado)
6. JEITO CERTO (A Solução/Técnica correta)
7. BENEFÍCIO (O ganho imediato)
8. CTA (Salvar)

ESTRUTURA DA TABELA DE ROTEIRO:
| Passo | Visual / Cena (Instrução HeyGen) | Fala da Fabiana (Script) |
|---|---|---|
| 1. HEADLINE | Avatar Fabiana (Close-up) com expressão de alerta | "..." |
| ... | ... | ... |

*DICA VISUAL:* Alterne entre "Avatar Fabiana Falando" e "B-Roll/Demonstração Visual" (imagens ilustrativas cobrindo a tela enquanto ela narra) para tornar o vídeo dinâmico.

# 📱 2. SEQUÊNCIA DE STORIES (ESTILO HQ REALISTA / STORYBOOK)
Crie uma narrativa visual sequencial de 5 cenas estilo QUADRINHOS REALISTAS.
Mantenha a persona da Fabiana ensinando ou demonstrando algo.
Story 1: [Descrição Visual] | 🗣️ Fala: "..." | 💭 Pensamento: "..."
Story 2: [Descrição Visual] | 🗣️ Fala: "..." | 💭 Pensamento: "..."
... (até Story 5)

# 📝 3. LEGENDA PARA FEED (FOCADA NA SOLUÇÃO)
Escreva uma legenda completa e persuasiva.
ESTRUTURA OBRIGATÓRIA:
1. Headline (Gancho P.E.C).
2. O Problema (Jeito Errado): Descreva a dor do seguidor.
3. A Virada (Jeito Certo): Explique a técnica/solução que a Fabiana ensina.
4. CTA DE ALTO VALOR: Convide o seguidor a comentar uma palavra-chave para receber o "PROMPT DE OURO" (Seção 6 abaixo) no direct.
5. 15 Hashtags estratégicas.

# 🎠 4. ESTRUTURA DE CARROSSEL (EDUCAÇÃO)
5 Slides educativos ensinando o "Jeito Certo".
Slide 1: Capa (Headline P.E.C)
Slide 2: O Erro Comum
Slide 3: A Consequência
Slide 4: O Jeito Certo (A Técnica)
Slide 5: Resumo/CTA

# 🖼️ 5. PROMPT PARA IMAGEM (CAPA)
Descrição visual detalhada para capa do Reels ou Post, featuring uma estética tecnológica e clean (estilo IA).

# 🤖 6. PROMPT DE OURO (A FERRAMENTA DA SOLUÇÃO)
Crie um PROMPT DE COMANDO (Prompt de IA) pronto para ser copiado e colado.
OBJETIVO: Este é o "Jeito Certo" materializado. É o prompt que a Fabiana vai entregar para a aluna usar no ChatGPT/Gemini para resolver a dor abordada no tema.
ESTRUTURA DO PROMPT A SER GERADO:
"Aja como um especialista em [Area]. Meu objetivo é [Resultado]. Crie [Formato] seguindo [Critérios]. O contexto é..."
`;
      setPrompt(basePrompt);
      setGenType('TEXT');
    }
  }, [calendarContext]);

  // --- PARSING LOGIC ---
  const parseSections = (text: string): ParsedSection[] => {
      if (!text) return [];
      
      // Split by Headers starting with #
      const rawSections = text.split(/(?=\n# .)/);
      
      return rawSections.map((sectionRaw, index) => {
          const lines = sectionRaw.trim().split('\n');
          const titleLine = lines[0] || '';
          const content = lines.slice(1).join('\n').trim();
          
          let type: SectionType = 'OTHER';
          const t = titleLine.toUpperCase();
          
          if (t.includes('ROTEIRO DE VÍDEO') || t.includes('VIDEO')) type = 'VIDEO';
          else if (t.includes('SEQUÊNCIA DE STORIES') || t.includes('STORIES')) type = 'STORIES';
          else if (t.includes('LEGENDA') || t.includes('FEED')) type = 'FEED';
          else if (t.includes('CARROSSEL') || t.includes('CAROUSEL')) type = 'CAROUSEL';
          else if (t.includes('AVATAR')) type = 'AVATAR';
          else if (t.includes('NOTEBOOKLM')) type = 'AUDIO';
          else if (t.includes('PROMPT PARA IMAGEM')) type = 'IMAGE_PROMPT';
          else if (t.includes('PROMPT DE OURO') || t.includes('PROMPT DE COMANDO')) type = 'PROMPT';

          return {
              id: `sec_${index}`,
              type,
              title: titleLine.replace(/^#+ /, ''),
              content
          };
      }).filter(s => s.content.length > 0 || s.title.length > 0);
  };

  const handleGlobalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setGlobalReferenceImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGenerateMain = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setResponse('');
    setGeneratedImages({}); // Reset images on new text gen
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      if (genType === 'IMAGE') {
          // Manual Single Image Mode
          const parts: any[] = [{ text: prompt }];

          if (globalReferenceImage) {
              const parsed = parseBase64(globalReferenceImage);
              if (parsed) {
                parts.unshift({
                    inlineData: {
                        mimeType: parsed.mimeType,
                        data: parsed.data
                    }
                });
              }
          }

          const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts }
          });
          
          if (result.candidates?.[0]?.content?.parts) {
             for (const part of result.candidates[0].content.parts) {
                 if (part.inlineData) {
                     setGeneratedImages({ 'main_single': `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
                     setResponse('Imagem gerada abaixo.');
                 }
             }
          }
      } else {
          // Text Kit Mode
          const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.7, topK: 40, topP: 0.95 }
          });
          if (result.text) setResponse(result.text);
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao gerar. Verifique sua chave API.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- IMAGE SLOT GENERATION ---
  const handleGenerateSlotImage = async (slotKey: string, context: string, ratioClass: string) => {
      setIsGeneratingImg(prev => ({ ...prev, [slotKey]: true }));
      setEditingSlot(null);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          // Determine format details based on ratio
          const isStory = ratioClass.includes('9/16');
          const formatPrompt = isStory ? "FORMATO: Vertical (9:16) Storybook." : "FORMATO: Quadrado (1:1) Feed.";
          
          // Consistency instruction - Now emphasizes Realistic HQ Style
          const consistencyPrompt = isStory 
            ? "IMPORTANTE: MANTENHA A CONSISTÊNCIA VISUAL DOS PERSONAGENS (Mesmo rosto, roupas e iluminação da cena anterior). Crie uma narrativa visual contínua." 
            : "";

          // Use adjusted prompt if available, otherwise default context
          const specificPrompt = adjustedPrompts[slotKey] || `
            Gere uma IMAGEM FOTOGRÁFICA REALISTA (Estilo Editorial/Cinematográfico).
            ${formatPrompt}
            CENA PARA RETRATAR: ${context.substring(0, 500)}
            
            DIRETRIZES DE ESTILO:
            - Fotografia de alta resolução (8k), textura de pele natural.
            - Iluminação de estúdio suave e profissional.
            - NÃO inclua texto ou balões na imagem (isso será adicionado na edição).
            - Foco na expressão facial e linguagem corporal descrita.
            ${consistencyPrompt}
          `;

          const parts: any[] = [{ text: specificPrompt }];
          
          // Add reference image (Local takes priority over Global)
          const activeRef = referenceImages[slotKey] || globalReferenceImage;

          if (activeRef) {
              const parsed = parseBase64(activeRef);
              if (parsed) {
                  parts.unshift({
                      inlineData: {
                          mimeType: parsed.mimeType,
                          data: parsed.data
                      }
                  });
              }
          }

          const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
          });

          let imgUrl = null;
          if (result.candidates?.[0]?.content?.parts) {
              for (const part of result.candidates[0].content.parts) {
                  if (part.inlineData) {
                      imgUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                      break;
                  }
              }
          }

          if (imgUrl) {
              setGeneratedImages(prev => ({ ...prev, [slotKey]: imgUrl }));
          } else {
              alert("A IA não retornou uma imagem válida. Tente simplificar o prompt.");
          }

      } catch (e) {
          console.error(e);
          alert("Erro ao gerar imagem. Tente novamente.");
      } finally {
          setIsGeneratingImg(prev => ({ ...prev, [slotKey]: false }));
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slotKey: string) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setReferenceImages(prev => ({ ...prev, [slotKey]: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleApproveContent = () => {
      if (!response && Object.keys(generatedImages).length === 0) return;
      
      const dateKey = targetDate || new Date().toISOString().split('T')[0];
      const typeKey = targetType;
      const id = `${dateKey}-${typeKey}`;
      const allImages = Object.values(generatedImages) as string[];

      const item: ApprovedContent = {
          id: id,
          date: dateKey,
          type: typeKey,
          text: response,
          imageUrl: allImages[0], // First image as main thumbnail
          carouselImages: allImages, // All images stored here
          strategy: calendarContext?.focus || 'Conteúdo Gerado',
          timestamp: Date.now()
      };

      onApprove(item);
      onClearContext();
      setResponse('');
      setGeneratedImages({});
      setReferenceImages({});
      setPrompt('');
      alert("Conteúdo Aprovado! Verifique a data " + dateKey + " no calendário.");
  };

  // --- COMPONENT: IMAGE SLOT ---
  const ImageSlot: React.FC<{ slotKey: string, label: string, context: string, ratioClass: string }> = ({ slotKey, label, context, ratioClass }) => {
      const img = generatedImages[slotKey];
      const isBusy = isGeneratingImg[slotKey];
      const localRef = referenceImages[slotKey];
      const activeRef = localRef || globalReferenceImage;
      const isEditing = editingSlot === slotKey;
      const customPrompt = adjustedPrompts[slotKey];

      return (
          <div className="flex flex-col space-y-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              
              {/* Header: Label + Controls */}
              <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-1 rounded truncate max-w-[100px]" title={label}>{label}</span>
                    <button 
                        onClick={() => handleGenerateSlotImage(slotKey, context, ratioClass)}
                        disabled={isBusy}
                        className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md shadow-sm hover:shadow hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all"
                    >
                        {isBusy ? <RefreshCw size={12} className="animate-spin"/> : <Wand2 size={12} />}
                        <span>Gerar</span>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      {/* Upload Reference Button - MORE VISIBLE */}
                      <label className={`flex-1 flex items-center justify-center space-x-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-[10px] font-bold border ${activeRef ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`} title="Carregar uma foto para usar como referência visual">
                          <Camera size={12} />
                          <span>{localRef ? 'Ref. Local' : (globalReferenceImage ? 'Ref. Global' : '📸 Foto Ref')}</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, slotKey)} />
                      </label>

                      {/* Edit Prompt Button */}
                      <button 
                          onClick={() => setEditingSlot(isEditing ? null : slotKey)}
                          className={`flex-1 flex items-center justify-center space-x-1.5 px-2 py-1.5 rounded-md transition-colors text-[10px] font-bold border ${isEditing || customPrompt ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600'}`}
                      >
                          <Edit2 size={12} />
                          <span>{customPrompt ? 'Editado' : 'Ajustar'}</span>
                      </button>
                  </div>
              </div>

              {/* Prompt Editor Area */}
              {isEditing && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 animate-fade-in relative z-10">
                      <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] text-indigo-600 font-bold uppercase">Prompt da Imagem</p>
                          <button onClick={() => setEditingSlot(null)} className="text-slate-400 hover:text-slate-600"><X size={12}/></button>
                      </div>
                      <textarea 
                          className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900 bg-white"
                          rows={3}
                          value={adjustedPrompts[slotKey] !== undefined ? adjustedPrompts[slotKey] : context.substring(0, 300)}
                          onChange={(e) => setAdjustedPrompts(prev => ({ ...prev, [slotKey]: e.target.value }))}
                      />
                  </div>
              )}

              {/* Reference Image Preview */}
              {activeRef && (
                  <div className="flex items-center p-2 bg-blue-50 rounded-lg border border-blue-100 relative">
                      <div className="h-8 w-8 rounded overflow-hidden border border-blue-200 mr-2 flex-shrink-0">
                          <img src={activeRef} className="h-full w-full object-cover" alt="Ref" />
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-blue-700 truncate">
                              {localRef ? 'Ref Local' : 'Ref Global'}
                          </p>
                      </div>
                      {localRef && (
                          <button 
                            onClick={() => setReferenceImages(prev => { const n = {...prev}; delete n[slotKey]; return n; })} 
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={10}/>
                          </button>
                      )}
                  </div>
              )}

              {/* Main Image Display */}
              <div className={`w-full ${ratioClass} bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 relative group`}>
                  {img ? (
                      <>
                        <img src={img} className="w-full h-full object-cover" alt="Generated" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <a href={img} download={`roma-img-${slotKey}.png`} className="p-2 bg-white text-slate-800 rounded-full shadow-lg hover:scale-110 transition-transform" title="Baixar Imagem">
                                <Download size={16} />
                            </a>
                        </div>
                      </>
                  ) : (
                      <div className="text-center p-4 opacity-30 select-none">
                          <ImageIcon size={24} className="text-slate-400 mx-auto mb-1"/>
                          <p className="text-[10px] font-bold text-slate-400">Vazio</p>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col min-h-[800px]">
      
      {/* --- TOP: GENERATOR CONTROLS --- */}
      <div className="w-full bg-slate-50 border-b border-slate-200 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-indigo-700">
                <Sparkles className="animate-pulse" />
                <h2 className="font-bold text-lg">Roma AI Studio</h2>
            </div>
            {calendarContext && (
                <button onClick={onClearContext} className="text-slate-400 hover:text-slate-600 flex items-center bg-white border border-slate-200 px-3 py-1 rounded-lg text-sm transition-colors hover:bg-slate-50">
                    <X size={16} className="mr-1"/> Fechar
                </button>
            )}
        </div>

        {/* --- DESTINATION BAR (DATE & TYPE SELECTOR) --- */}
        <div className="mb-6 bg-white border border-indigo-100 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-4">
             <div className="flex items-center">
                <Calendar className="text-indigo-500 mr-2" size={18} />
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Data de Publicação</span>
                    <input 
                        type="date" 
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="font-bold text-slate-800 bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-indigo-500 text-sm"
                    />
                </div>
             </div>

             <div className="h-8 w-px bg-slate-100"></div>

             <div className="flex items-center">
                <Layers className="text-indigo-500 mr-2" size={18} />
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Destino / Formato</span>
                    <select 
                        value={targetType}
                        onChange={(e) => setTargetType(e.target.value as ContentType)}
                        className="font-bold text-slate-800 bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-indigo-500 text-sm uppercase"
                    >
                        <option value="stories">Stories</option>
                        <option value="post">Post / Feed</option>
                        <option value="feed">Feed (Genérico)</option>
                        <option value="live">Live</option>
                        <option value="carousel">Carrossel</option>
                        <option value="roteiro">Roteiro Vídeo</option>
                    </select>
                </div>
             </div>

             <div className="flex-1"></div>
             
             <div className="text-xs text-slate-500 italic bg-slate-50 px-2 py-1 rounded">
                 *Ao aprovar, o conteúdo irá para esta data no calendário.
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 flex flex-col space-y-4">
                <div className="bg-white p-1 rounded-lg border border-slate-200 flex shadow-sm">
                    <button onClick={() => setGenType('TEXT')} className={`flex-1 py-3 text-xs font-bold uppercase rounded-md flex items-center justify-center space-x-2 transition-all ${genType === 'TEXT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <Layers size={14}/> <span>Kit Completo</span>
                    </button>
                    <button onClick={() => setGenType('IMAGE')} className={`flex-1 py-3 text-xs font-bold uppercase rounded-md flex items-center justify-center space-x-2 transition-all ${genType === 'IMAGE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <ImageIcon size={14}/> <span>Imagem Única</span>
                    </button>
                </div>

                {/* KIT DEFINITION INFO BOX */}
                {genType === 'TEXT' && (
                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-[10px] text-indigo-800 animate-fade-in">
                        <p className="font-bold mb-1 flex items-center uppercase tracking-wide text-indigo-600"><Info size={10} className="mr-1"/> O Kit Completo gera:</p>
                        <ul className="grid grid-cols-2 gap-x-1 gap-y-1 pl-3 list-disc marker:text-indigo-400 leading-tight">
                            <li>Roteiro de Vídeo</li>
                            <li>Seq. Stories HQ</li>
                            <li>Legenda + Tags</li>
                            <li>Carrossel</li>
                            <li>Script Avatar</li>
                            <li>Prompt Solução 🎁</li>
                        </ul>
                    </div>
                )}

                {/* Global Reference Image Upload */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                         <span className="text-xs font-bold text-blue-800 uppercase flex items-center">
                            <Camera size={14} className="mr-1.5"/> Foto de Referência
                         </span>
                         {globalReferenceImage && (
                             <button onClick={() => setGlobalReferenceImage(null)} className="text-[10px] text-red-500 hover:text-red-700 font-bold bg-white px-2 py-0.5 rounded border border-red-100">
                                 Remover
                             </button>
                         )}
                    </div>
                    {globalReferenceImage ? (
                        <div className="h-24 w-full rounded-md overflow-hidden border border-blue-200 bg-white flex items-center justify-center relative group">
                            <img src={globalReferenceImage} className="w-full h-full object-cover" alt="Ref Global" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-blue-200 rounded-md bg-white hover:bg-blue-50/50 cursor-pointer transition-colors group">
                             <Upload size={20} className="text-blue-300 group-hover:text-blue-500 mb-1" />
                             <span className="text-[10px] font-bold text-blue-400 group-hover:text-blue-600 text-center px-2">
                                 Clique para carregar<br/>foto do Salão/Ref
                             </span>
                             <input type="file" className="hidden" accept="image/*" onChange={handleGlobalUpload} />
                        </label>
                    )}
                    <p className="text-[9px] text-blue-600/70 mt-1.5 leading-tight">
                       Esta imagem será usada como base para todas as gerações (Kit ou Imagem Única).
                    </p>
                </div>

                {calendarContext && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1 opacity-10"><Calendar size={64}/></div>
                        <p className="text-[10px] uppercase font-bold text-indigo-500 mb-1">Contexto Ativo</p>
                        <div className="mt-2 text-xs text-indigo-700 bg-white/50 p-1.5 rounded">
                           <span className="font-bold">Foco:</span> {calendarContext.focus}
                        </div>
                    </div>
                )}
                
                 <div className="grid grid-cols-2 gap-2">
                     <a href="https://notebooklm.google.com/" target="_blank" className="flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 transition-all text-xs font-bold text-slate-600"><Mic size={14} className="mr-1.5 text-blue-500"/> NotebookLM</a>
                     <a href="https://app.heygen.com/" target="_blank" className="flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 transition-all text-xs font-bold text-slate-600"><Video size={14} className="mr-1.5 text-purple-500"/> HeyGen Avatar</a>
                 </div>
            </div>

            <div className="lg:col-span-8 flex flex-col h-full">
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-full min-h-[140px] p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm bg-white shadow-sm font-mono text-slate-900"
                    placeholder={genType === 'TEXT' ? "Instruções para o Kit..." : "Descrição da Imagem..."}
                />
                <button
                    onClick={handleGenerateMain}
                    disabled={isLoading || !prompt.trim()}
                    className={`mt-4 w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center space-x-2 ${
                        isLoading ? 'bg-slate-400 cursor-wait' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-indigo-500/30'
                    }`}
                >
                    {isLoading ? <><RefreshCw className="animate-spin mr-2" /><span>Gerando...</span></> : <><Wand2 className="mr-2" /><span>{genType === 'TEXT' ? 'Gerar Kit Completo' : 'Gerar Imagem'}</span></>}
                </button>
            </div>
        </div>
      </div>

      {/* --- BOTTOM: EDITOR & INTERLEAVED VISUALS --- */}
      <div className="w-full bg-white p-8 flex-1 overflow-y-auto min-h-[500px] border-t border-slate-100">
         {!response && Object.keys(generatedImages).length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center opacity-40 mt-12">
                 <Wand2 size={48} className="text-slate-400 mb-4" />
                 <h3 className="text-xl font-bold text-slate-800">Seu espaço de criação</h3>
                 <p className="text-slate-500">Gere roteiros, legendas e imagens tudo em um só lugar.</p>
             </div>
         ) : (
             <div className="max-w-5xl mx-auto space-y-12 animate-fade-in-up">
                 
                 {/* SINGLE IMAGE MODE RESULT */}
                 {genType === 'IMAGE' && generatedImages['main_single'] && (
                     <div className="flex justify-center">
                         <img src={generatedImages['main_single']} className="rounded-lg shadow-lg max-h-96" alt="Resultado" />
                     </div>
                 )}

                 {/* TEXT KIT PARSED SECTIONS */}
                 {genType === 'TEXT' && parseSections(response).map((section, idx) => (
                     <div key={section.id} className="border-b border-slate-100 pb-12">
                         
                         {/* SPECIAL RENDER FOR THE GOLDEN PROMPT SECTION */}
                         {section.type === 'PROMPT' ? (
                            <div className="bg-slate-900 text-green-400 p-6 rounded-xl font-mono shadow-2xl border border-slate-700 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-20"><Terminal size={64}/></div>
                                <div className="flex items-center space-x-2 mb-4 border-b border-slate-700 pb-2">
                                    <Sparkles size={16} className="text-yellow-400 animate-pulse"/>
                                    <h3 className="text-lg font-bold text-white tracking-wider">PROMPT DE OURO (Solução Pronta)</h3>
                                </div>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {section.content}
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(section.content)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold flex items-center transition-colors"
                                    >
                                        <Copy size={14} className="mr-2"/> Copiar Comando
                                    </button>
                                </div>
                            </div>
                         ) : (
                             /* STANDARD TEXT CONTENT */
                             <div className="prose prose-indigo max-w-none text-slate-700">
                                 <ReactMarkdown components={{
                                     h1: ({node, ...props}) => <h2 className="text-xl font-bold text-indigo-700 flex items-center mt-0 mb-4 border-l-4 border-indigo-600 pl-3" {...props} />,
                                     table: ({node, ...props}) => <div className="overflow-x-auto border rounded-lg bg-slate-50 my-4 shadow-sm"><table className="w-full text-sm" {...props} /></div>,
                                     th: ({node, ...props}) => <th className="px-4 py-2 bg-slate-100 font-bold text-left text-slate-700" {...props} />,
                                     td: ({node, ...props}) => <td className="px-4 py-3 border-t border-slate-200" {...props} />,
                                     li: ({node, ...props}) => <li className="text-slate-900" {...props} />,
                                     p: ({node, ...props}) => <p className="text-slate-900" {...props} />,
                                 }}>
                                     {`# ${section.title}\n${section.content}`}
                                 </ReactMarkdown>
                             </div>
                         )}

                         {/* VISUAL GENERATOR BLOCK FOR THIS SECTION */}
                         {['VIDEO', 'STORIES', 'FEED', 'CAROUSEL', 'AVATAR', 'AUDIO'].includes(section.type) && (
                            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                                <div className="flex items-center space-x-2 mb-4 border-b border-slate-200 pb-3">
                                    <div className="p-1.5 bg-indigo-100 rounded text-indigo-600"><ImageIcon size={16}/></div>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Estúdio Visual: {section.title}</h3>
                                </div>
                                
                                {/* VIDEO THUMBNAIL (9:16) */}
                                {section.type === 'VIDEO' && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <ImageSlot 
                                            slotKey={`video_cover_${idx}`} 
                                            label="Capa do Vídeo (9:16)" 
                                            ratioClass="aspect-[9/16]" 
                                            context={`Capa impactante para Reels sobre beleza (Vertical 9:16): ${section.content.substring(0,150)}`}
                                        />
                                    </div>
                                )}

                                {/* STORIES SEQUENCE (5 SLOTS - 9:16) */}
                                {section.type === 'STORIES' && (
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {[1,2,3,4,5].map(i => (
                                            <ImageSlot 
                                                key={i}
                                                slotKey={`story_${idx}_${i}`} 
                                                label={`Story ${i}`} 
                                                ratioClass="aspect-[9/16]" 
                                                context={extractStoryContent(section.content, i)} 
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* FEED POST (1 SLOT - 1:1 or 4:5) */}
                                {section.type === 'FEED' && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <ImageSlot 
                                            slotKey={`feed_post_${idx}`} 
                                            label="Imagem Feed (1:1)" 
                                            ratioClass="aspect-square" 
                                            context={`Post Instagram profissional beleza (Quadrado): ${section.content.substring(0,150)}`}
                                        />
                                    </div>
                                )}

                                {/* CAROUSEL (5 SLOTS - 1:1) */}
                                {section.type === 'CAROUSEL' && (
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {[1,2,3,4,5].map(i => (
                                            <ImageSlot 
                                                key={i}
                                                slotKey={`carousel_${idx}_${i}`} 
                                                label={`Slide ${i}`} 
                                                ratioClass="aspect-square" 
                                                context={extractStoryContent(section.content, i)} // Reuse parser for carousel slides too
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* AVATAR (9:16) */}
                                {section.type === 'AVATAR' && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <ImageSlot 
                                            slotKey={`avatar_${idx}`} 
                                            label="Personagem Avatar" 
                                            ratioClass="aspect-[9/16]" 
                                            context={`Personagem profissional de beleza falando para câmera, estilo HeyGen, fundo estúdio moderno: ${section.content.substring(0,100)}`}
                                        />
                                    </div>
                                )}

                                {/* AUDIO / PODCAST COVER (1:1) */}
                                {section.type === 'AUDIO' && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <ImageSlot 
                                            slotKey={`audio_cover_${idx}`} 
                                            label="Capa Podcast" 
                                            ratioClass="aspect-square" 
                                            context={`Capa de podcast sobre estética e beleza, design minimalista e moderno: ${section.content.substring(0,100)}`}
                                        />
                                    </div>
                                )}
                            </div>
                         )}
                     </div>
                 ))}

                 <div className="flex justify-end pt-6 sticky bottom-0 bg-white/90 backdrop-blur p-4 border-t border-slate-100 shadow-lg">
                     <button 
                        onClick={handleApproveContent}
                        className="px-8 py-3 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg flex items-center transform hover:-translate-y-1 transition-all"
                     >
                         <CheckCircle2 className="mr-2" />
                         Aprovar Todo Conteúdo & Imagens
                     </button>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default GeminiAdvisor;
