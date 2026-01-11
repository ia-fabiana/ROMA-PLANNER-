
import React, { useState, useEffect } from 'react';
import { StrategyItem, ContentType, CalendarContext, ApprovedContent } from '../types';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, Copy, RefreshCw, X, CheckCircle2, Image as ImageIcon, Video, Wand2, Edit2, Download, 
  FileText, Shirt, Check, User, Settings2, Clapperboard, MonitorPlay, AlertCircle, Key, Play, Eye,
  RotateCcw, MessageSquarePlus, Send, Save, Trash2, Layout
} from 'lucide-react';

interface GeminiAdvisorProps {
  data: StrategyItem[];
  selectedIds: string[];
  calendarContext: CalendarContext | null;
  onClearContext: () => void;
  onApprove: (item: ApprovedContent) => void;
}

type SectionType = 'VIDEO_REELS' | 'STORIES' | 'FEED' | 'CAROUSEL' | 'IMAGE_PROMPT' | 'PROMPT' | 'MEME' | 'VIDEO_SEQUENCE' | 'OTHER';

interface ParsedSection {
    id: string;
    type: SectionType;
    title: string;
    content: string;
    index: number;
}

const parseBase64 = (dataUrl: string) => {
    if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.length < 100) return null; 
    try {
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const data = matches[2];
            return { mimeType, data };
        }
    } catch (e) { console.error("Base64 Parse Error", e); }
    return null;
}

const extractStoryContent = (fullText: string, index: number): string => {
    // Tenta primeiro encontrar o bloco específico do slide/cena
    const blockRegex = new RegExp(`(?:Cena|Slide|Quadrinho|Passo|Item|Vídeo|Reels|Story|Stories|Meme)\\s*0?${index}\\s*[:.-]?\\s*([^]*?)(?=(?:Cena|Slide|Quadrinho|Passo|Item|Vídeo|Reels|Story|Stories|Meme)\\s*0?${index+1}|$)`, 'i');
    const blockMatch = fullText.match(blockRegex);
    
    if (blockMatch && blockMatch[1]) {
        const block = blockMatch[1].trim();
        // Dentro do bloco, busca especificamente pelo que vem após "VISUAL:"
        const visualMatch = block.match(/VISUAL(?: PARA VEO)?[:.-]?\s*([^]*?)(?=(?:TEXTO|BALÃO|FALA|PENSAMENTO|$)?)?/i);
        if (visualMatch && visualMatch[1]) {
            return visualMatch[1].trim();
        }
        // Se não achar "VISUAL:", pega a primeira linha ou o bloco limpo
        return block.split('\n')[0].replace(/^\(Visual:.*?\)/i, '').trim().substring(0, 800);
    }

    // Fallbacks antigos caso o regex de bloco falhe
    const paragraphs = fullText.split(/\n\n+/).filter(p => p.trim().length > 10);
    if (paragraphs[index-1]) return paragraphs[index-1].substring(0, 800);
    return "";
}

const GeminiAdvisor: React.FC<GeminiAdvisorProps> = ({ 
  calendarContext, 
  onClearContext, 
  onApprove 
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [sections, setSections] = useState<ParsedSection[]>([]);
  const [sectionTexts, setSectionTexts] = useState<Record<string, string>>({});
  const [refinementPrompts, setRefinementPrompts] = useState<Record<string, string>>({});
  const [isRefining, setIsRefining] = useState<Record<string, boolean>>({});
  const [manualEditId, setManualEditId] = useState<string | null>(null);
  const [reelsTab, setReelsTab] = useState<'trad' | 'heygen'>('trad');

  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [targetType, setTargetType] = useState<ContentType>('feed');
  const [activeFocus, setActiveFocus] = useState<string>('');

  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [generatedVideos, setGeneratedVideos] = useState<Record<string, string>>({});
  const [isGeneratingImg, setIsGeneratingImg] = useState<Record<string, boolean>>({});
  const [isGeneratingVid, setIsGeneratingVid] = useState<Record<string, boolean>>({});
  const [videoStatus, setVideoStatus] = useState<Record<string, string>>({});
  const [adjustedPrompts, setAdjustedPrompts] = useState<Record<string, string>>({});
  
  const [avatarReference, setAvatarReference] = useState<string | null>(null); 
  const [clothingReference, setClothingReference] = useState<string | null>(null); 
  const [editingSlot, setEditingSlot] = useState<string | null>(null); 
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (calendarContext) {
      setTargetDate(calendarContext.date);
      setTargetType(calendarContext.contentType);
      setActiveFocus(calendarContext.focus);
      const ingredientsText = calendarContext.strategy;
      
      let basePrompt = `Atue como um ROTEIRISTA SÊNIOR e DIRETOR DE ARTE especialista em Marketing para PROFISSIONAIS DA BELEZA.
IDIOMA OBRIGATÓRIO: PORTUGUÊS DO BRASIL (PT-BR).
COR DO TEXTO NOS ROTEIROS: SEMPRE PRETO (BLACK).

PERSONA DA EXPERT (QUEM FALA):
- Nome: Fabiana (@ia.fabiana).
- Aparência: Mulher moderna, tech beauty, fotorrealista.

# 🎥 1. ROTEIRO DE VÍDEO (REELS - ESTRUTURA ROMA 8 PASSOS)
Gere duas versões separadas por "--- HEYGEN STUDIO ---":

[VERSÃO TRADICIONAL]
Siga RIGOROSAMENTE esta estrutura estratégica:
1. HEADLINE (Gancho de impacto imediato)
2. ROMA (A promessa principal)
3. CTA 1 - SEGUIR
4. JEITO ERRADO
5. CONSEQUÊNCIA
6. JEITO CERTO
7. BENEFÍCIO
8. CTA 2 - SEGUIR

--- HEYGEN STUDIO ---
[VERSÃO HEYGEN]
Para cada um dos 8 passos da estrutura Roma (Headline, Roma, CTA1, Jeito Errado, Consequência, Jeito Certo, Benefício, CTA2), descreva o roteiro técnico para o HeyGen da seguinte forma:

- TEXTO DA FALA: [O roteiro EXATO do que a Fabiana vai falar nesta cena].
- CENÁRIO: Detalhe o ambiente fotorrealista (ex: Escritório futurista, estúdio clean, clínica de estética moderna).
- ZOOM: Indique o movimento (ex: Close-up no rosto, plano médio, zoom lento in/out).
- ELEMENTOS VISUAIS: Descreva objetos dinâmicos. Ex: "Aparece um gráfico 3D flutuando", "Partículas de luz azul", "Uma maçã vermelha brilhante surge girando ao lado da expert".

# 📱 2. SEQUÊNCIA DE STORIES (5 SLIDES)
- Crie uma sequência de 5 slides com narrativa estratégica.
- REGRAS VISUAIS CRÍTICAS: Fabiana deve estar com a EXATA MESMA ROUPA e aparência da referência em todos os 5 slides para manter continuidade visual.
- Para cada slide, forneça:
  * VISUAL: [Descrição detalhada da cena mantendo a MESMA ROUPA]
  * TEXTO NO SLIDE: [Texto principal curto]

# 📝 3. LEGENDA PARA FEED (COM CTA E IDENTIFICAÇÃO)

# 🎠 4. FEED CARROSSEL (ESTILO HQ - HISTÓRIA EM QUADRINHOS)
- Para cada um dos 5 slides, forneça:
  * VISUAL: [Cena fotorrealista com Fabiana]
  * TEXTO NO SLIDE: [Texto principal]
  * BALÃO DE FALA/PENSAMENTO: [Falas estilo HQ]

# 🎬 5. SEQUÊNCIA DE VÍDEO VEO (DESCREVA 5 CENAS CURTAS PARA O VEO 3, FORMATO 9:16)
- Descreva 5 cenas para uma narrativa contínua.
- REGRAS VISUAIS CRÍTICAS: Mesma roupa e aparência em todas as cenas.

# 🖼️ 6. PROMPT PARA IMAGEM (CAPA)

# 🎭 7. MEME ESTRATÉGICO (2 OPÇÕES)
- Forneça 2 opções de memes fotorrealistas e engraçados com Fabiana.
- REGRAS VISUAIS: Mantenha a MESMA ROUPA e aparência da referência nos 2 memes.

CONTEXTO:
- Foco: ${calendarContext.focus}
- Ingredientes: ${ingredientsText}
`;
      setPrompt(basePrompt);
    }
  }, [calendarContext]);

  const parseSectionsToState = (text: string) => {
      if (!text) return;
      const rawSections = text.split(/(?=\n# .)/);
      const parsed = rawSections.map((sectionRaw, index) => {
          const lines = sectionRaw.trim().split('\n');
          const titleLine = lines[0] || '';
          const content = lines.slice(1).join('\n').trim();
          let type: SectionType = 'OTHER';
          const t = titleLine.toUpperCase();
          if (t.includes('ROTEIRO')) type = 'VIDEO_REELS';
          else if (t.includes('STORIES')) type = 'STORIES';
          else if (t.includes('CARROSSEL')) type = 'CAROUSEL';
          else if (t.includes('LEGENDA')) type = 'FEED';
          else if (t.includes('IMAGEM')) type = 'IMAGE_PROMPT';
          else if (t.includes('VÍDEO VEO')) type = 'VIDEO_SEQUENCE';
          else if (t.includes('MEME')) type = 'MEME';
          return { id: `sec_${index}_${Date.now()}`, type, title: titleLine.replace(/^#+ /, ''), content, index: index + 1 };
      }).filter(s => s.content.length > 0 || s.title.length > 0);
      
      setSections(parsed);
      const texts: Record<string, string> = {};
      parsed.forEach((sec) => { texts[sec.id] = sec.content; });
      setSectionTexts(texts);
  };

  const handleGenerateMain = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const result: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      if (result.text) parseSectionsToState(result.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefineSection = async (sectionId: string, specificFeedback?: string) => {
      const feedback = specificFeedback || refinementPrompts[sectionId];
      const currentText = sectionTexts[sectionId];
      if (!feedback || !currentText) return;

      setIsRefining(prev => ({ ...prev, [sectionId]: true }));
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
          const sec = sections.find(s => s.id === sectionId);
          
          const refinePrompt = `
            Sou Fabiana (@ia.fabiana). Ajuste este conteúdo para "${sec?.title}".
            CONTEÚDO ATUAL:
            ${currentText}
            FEEDBACK:
            ${feedback}
            REGRAS: Texto PRETO e em negrito na edição, Mesma roupa nas sequências, Detalhes HeyGen ricos (incluindo Script da Fala).
          `;

          const result: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: refinePrompt });
          if (result.text) {
              setSectionTexts(prev => ({ ...prev, [sectionId]: result.text!.trim() }));
              setRefinementPrompts(prev => ({ ...prev, [sectionId]: '' }));
          }
      } catch (e) {
          setError("Erro no ajuste: " + (e as any).message);
      } finally {
          setIsRefining(prev => ({ ...prev, [sectionId]: false }));
      }
  };

  const handleRegenerateSection = async (sectionId: string) => {
      setIsRefining(prev => ({ ...prev, [sectionId]: true }));
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
          const sec = sections.find(s => s.id === sectionId);
          const regenPrompt = `Sou Fabiana (@ia.fabiana). Gere NOVAMENTE o conteúdo para a seção "${sec?.title}". Contexto: ${activeFocus}. REGRAS: Mesma roupa, Texto PRETO, HeyGen Studio com Script da Fala e visual detalhado.`;
          const result: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: regenPrompt });
          if (result.text) {
              setSectionTexts(prev => ({ ...prev, [sectionId]: result.text!.trim() }));
          }
      } catch (e) {
          setError("Erro ao regenerar: " + (e as any).message);
      } finally {
          setIsRefining(prev => ({ ...prev, [sectionId]: false }));
      }
  };

  const handleGenerateVeoVideo = async (slotKey: string, context: string, imageBase64: string) => {
      // @ts-ignore
      if (!(await window.aistudio.hasSelectedApiKey())) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
      }
      setIsGeneratingVid(prev => ({ ...prev, [slotKey]: true }));
      setVideoStatus(prev => ({ ...prev, [slotKey]: 'Animando com Veo 3...' }));
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
          const finalPrompt = adjustedPrompts[slotKey] || context;
          const scenePrompt = `FOTORREALISTA, 8K. Fabiana (@ia.fabiana). CENA: ${finalPrompt}. FORMATO 9:16. MANTENHA A MESMA ROUPA DA IMAGEM.`;
          const imgParsed = parseBase64(imageBase64);
          if (!imgParsed) throw new Error("Imagem base necessária.");

          let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: scenePrompt,
            image: { imageBytes: imgParsed.data, mimeType: imgParsed.mimeType },
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
          });

          while (!operation.done) {
            setVideoStatus(prev => ({ ...prev, [slotKey]: 'Gerando vídeo (Pode levar 1-2 min)...' }));
            await new Promise(resolve => setTimeout(resolve, 10000));
            // @ts-ignore
            operation = await ai.operations.getVideosOperation({ operation: operation });
          }

          const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
          if (downloadLink) {
            const videoResp = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const videoUrl = URL.createObjectURL(await videoResp.blob());
            setGeneratedVideos(prev => ({ ...prev, [slotKey]: videoUrl }));
          }
      } catch (e: any) {
          setError("Veo Error: " + e.message);
      } finally {
          setIsGeneratingVid(prev => ({ ...prev, [slotKey]: false }));
      }
  };

  const handleGenerateSlotImage = async (slotKey: string, context: string, ratioClass: string) => {
      setIsGeneratingImg(prev => ({ ...prev, [slotKey]: true }));
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
          let formatPrompt = ratioClass.includes('9/16') ? "FORMATO: 9:16." : "FORMATO: 4:5.";
          const finalContext = (adjustedPrompts[slotKey] || context).trim();
          
          // Prompt super explícito para evitar cópia direta da referência
          const instructions = `
            GERE UMA NOVA IMAGEM COMPLETA. 
            NÃO COPIE OU APENAS REPITA AS IMAGENS DE REFERÊNCIA. 
            As imagens de referência servem APENAS para manter a APARÊNCIA DA FABIANA (@ia.fabiana) e a sua ROUPA.
            
            CENA A SER GERADA: ${finalContext}. 
            
            ESTILO: Fotorrealista, 8K, cinematic lighting.
            ${formatPrompt}
            
            IMPORTANTE: Foque nos detalhes do ambiente descritos na CENA (ex: fogo, portal, neon, clientes, escritório). A Fabiana deve estar inserida NESTE NOVO CONTEXTO.
          `;
          
          const parts: any[] = [{ text: instructions }];
          if (avatarReference) {
              const parsed = parseBase64(avatarReference);
              if (parsed) parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
          }
          if (clothingReference) {
              const parsed = parseBase64(clothingReference);
              if (parsed) parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
          }
          const result: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts } });
          const imagePart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
          if (imagePart?.inlineData) {
              setGeneratedImages(prev => ({ ...prev, [slotKey]: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` }));
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsGeneratingImg(prev => ({ ...prev, [slotKey]: false }));
      }
  };

  const VideoSlot = ({ slotKey, label, context }: any) => {
    const isEditing = editingSlot === slotKey;
    const currentPrompt = adjustedPrompts[slotKey] || context || "";
    const videoUrl = generatedVideos[slotKey];
    const imageUrl = generatedImages[slotKey];
    const isGeneratingV = isGeneratingVid[slotKey];
    const isGeneratingI = isGeneratingImg[slotKey];

    return (
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm no-print flex flex-col h-full group/slot">
          <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{label}</span>
              <div className="flex space-x-1">
                <button onClick={() => setEditingSlot(isEditing ? null : slotKey)} className={`p-1.5 rounded-md ${isEditing ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}><Edit2 size={12}/></button>
                <button onClick={() => handleGenerateSlotImage(slotKey, context, 'aspect-[9/16]')} className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"><Wand2 size={12}/></button>
                {imageUrl && <button onClick={() => handleGenerateVeoVideo(slotKey, context, imageUrl)} className="p-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 animate-pulse"><MonitorPlay size={12}/></button>}
              </div>
          </div>
          {isEditing && (
              <textarea 
                value={currentPrompt}
                onChange={(e) => setAdjustedPrompts(prev => ({ ...prev, [slotKey]: e.target.value }))}
                className="w-full h-20 p-2 text-[10px] border border-amber-200 rounded bg-amber-50 mb-2 font-mono text-black font-bold resize-none"
              />
          )}
          <div className="w-full aspect-[9/16] bg-slate-900 rounded-lg overflow-hidden relative flex items-center justify-center border border-slate-800">
              {isGeneratingI && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 text-center p-2"><RefreshCw className="animate-spin text-white mb-2" size={24} /><span className="text-[8px] font-bold text-white uppercase tracking-widest">Renderizando...</span></div>}
              {isGeneratingV && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-4 text-center"><Clapperboard className="animate-pulse text-purple-400 mb-3" size={32} /><span className="text-[9px] font-bold text-white uppercase tracking-widest leading-tight">{videoStatus[slotKey]}</span></div>}
              {videoUrl ? <video src={videoUrl} controls className="w-full h-full object-cover" loop autoPlay muted /> : imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <div className="text-white opacity-20"><ImageIcon size={32} /></div>}
          </div>
      </div>
    );
  };

  const ImageSlot = ({ slotKey, label, context, ratioClass }: any) => {
    const isEditing = editingSlot === slotKey;
    const currentPrompt = adjustedPrompts[slotKey] || context || "";
    const isGenerating = isGeneratingImg[slotKey];
    const imageUrl = generatedImages[slotKey];

    return (
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm no-print">
          <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{label}</span>
              <div className="flex space-x-1">
                <button onClick={() => setEditingSlot(isEditing ? null : slotKey)} className={`p-1.5 rounded-md ${isEditing ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}><Edit2 size={12}/></button>
                <button onClick={() => handleGenerateSlotImage(slotKey, context, ratioClass)} className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"><Wand2 size={12}/></button>
              </div>
          </div>
          {isEditing && (
              <textarea 
                value={currentPrompt}
                onChange={(e) => setAdjustedPrompts(prev => ({ ...prev, [slotKey]: e.target.value }))}
                className="w-full h-20 p-2 text-[10px] border border-amber-200 rounded bg-amber-50 mb-2 font-mono text-black font-bold resize-none"
              />
          )}
          <div className={`w-full ${ratioClass} bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200 flex items-center justify-center`}>
              {isGenerating ? <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10"><RefreshCw className="animate-spin text-indigo-600" size={24} /></div> : null}
              {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <div className="text-slate-200"><ImageIcon size={32} /></div>}
          </div>
      </div>
    );
  };

  return (
    <div className="bg-white/95 rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col min-h-[800px] backdrop-blur-md">
      <div className="bg-slate-50/50 p-6 border-b border-slate-200 print:hidden">
        <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-lg text-indigo-700 flex items-center"><Sparkles className="mr-2 text-indigo-500 animate-pulse"/> Roma AI Studio</h2>
            <button onClick={onClearContext} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-all"><X size={20}/></button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center animate-shake">
            <AlertCircle size={18} className="mr-3" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 space-y-4">
                <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-widest">ESTRATÉGIA ATIVA (ROMA)</span>
                    <div className="text-xs font-bold uppercase text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg flex items-center">
                        <CheckCircle2 size={14} className="mr-2" /> {activeFocus || 'Estratégia Roma'}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-50 p-3 border border-indigo-100 rounded-xl shadow-inner">
                        <label className="text-[9px] font-bold text-indigo-600 block mb-2 uppercase flex items-center"><User size={12} className="mr-1" /> Avatar Face</label>
                        <div className="relative h-16 w-full rounded-lg bg-white flex items-center justify-center overflow-hidden border border-indigo-100">
                            {avatarReference ? <img src={avatarReference} className="h-full w-full object-cover" /> : <Key className="text-indigo-200" size={20} />}
                            <input type="file" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setAvatarReference(reader.result as string); reader.readAsDataURL(file); } }} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload Face" />
                        </div>
                    </div>
                    <div className="bg-purple-50 p-3 border border-purple-100 rounded-xl shadow-inner">
                        <label className="text-[9px] font-bold text-purple-600 block mb-2 uppercase flex items-center"><Shirt size={12} className="mr-1" /> Look Roupa</label>
                        <div className="relative h-16 w-full rounded-lg bg-white flex items-center justify-center overflow-hidden border border-purple-100">
                            {clothingReference ? <img src={clothingReference} className="h-full w-full object-cover" /> : <ImageIcon className="text-purple-200" size={20} />}
                            <input type="file" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setClothingReference(reader.result as string); reader.readAsDataURL(file); } }} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload Style" />
                        </div>
                    </div>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-[9px] font-bold text-amber-700 uppercase flex items-center space-x-1">
                    <AlertCircle size={10} /> <span>Continuidade Visual Consistente Ativada</span>
                </div>
            </div>
            
            <div className="md:col-span-8 flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Configuração do Prompt do Kit</span>
                <textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    className="w-full h-40 p-4 border border-slate-200 rounded-2xl font-mono text-xs text-black font-bold focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed bg-white shadow-inner" 
                />
                <button onClick={handleGenerateMain} disabled={isLoading} className="w-full py-4 mt-3 bg-gradient-to-r from-indigo-600 to-purple-800 text-white font-black rounded-2xl shadow-lg flex items-center justify-center hover:shadow-indigo-500/40 transform active:scale-[0.98] transition-all tracking-widest uppercase text-sm">
                    {isLoading ? <RefreshCw className="animate-spin mr-3" size={20}/> : <Sparkles className="mr-3" size={20}/>} 
                    {isLoading ? 'GERANDO KIT ESTRATÉGICO...' : 'MONTAR KIT COMPLETO + VEO STUDIO'}
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto bg-slate-50/10">
          {sections.map((section) => {
              const currentText = sectionTexts[section.id] || section.content;
              const isEditingText = manualEditId === section.id;
              const feedback = refinementPrompts[section.id] || '';
              const refining = isRefining[section.id];

              // Split content for Reels if HeyGen marker is present
              let mainDisplayContent = currentText;
              if (section.type === 'VIDEO_REELS' && !isEditingText) {
                  const parts = currentText.split(/--- HEYGEN STUDIO ---/i);
                  mainDisplayContent = (reelsTab === 'trad' ? (parts[0] || currentText) : (parts[1] || 'Script HeyGen não disponível. Clique em Regenerar.')).trim();
              }

              return (
                  <div key={section.id} className="relative mb-24 animate-fade-in-up">
                      <div className="absolute -top-10 left-0 right-0 flex items-center justify-center opacity-40 select-none no-print">
                          <div className="h-px bg-slate-300 flex-1"></div>
                          <div className="mx-6 text-[80px] font-black text-slate-200 leading-none">0{section.index}</div>
                          <div className="h-px bg-slate-300 flex-1"></div>
                      </div>

                      <div className="relative bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
                        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg mr-4 shadow-lg shadow-indigo-600/20">
                                    {section.index}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{section.title}</h3>
                                    <div className="flex items-center mt-1">
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded mr-2">{section.type}</span>
                                        {(section.type === 'VIDEO_REELS') && <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded flex items-center"><Play size={10} className="mr-1"/> HeyGen Studio Ativo</span>}
                                        {(section.type === 'STORIES' || section.type === 'MEME') && <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded flex items-center"><Shirt size={10} className="mr-1"/> Look Consistente</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 no-print">
                                <button onClick={() => handleRegenerateSection(section.id)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all border border-slate-200" title="Regenerar"><RotateCcw size={18} className={refining ? 'animate-spin' : ''}/></button>
                                <button onClick={() => setManualEditId(isEditingText ? null : section.id)} className={`p-2 rounded-xl border transition-all ${isEditingText ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>{isEditingText ? <Save size={18} /> : <Edit2 size={18} />}</button>
                                <button onClick={() => { navigator.clipboard.writeText(currentText); setCopiedSectionId(section.id); setTimeout(() => setCopiedSectionId(null), 2000); }} className={`p-2 rounded-xl border transition-all ${copiedSectionId === section.id ? 'bg-green-600 text-white border-green-700' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>{copiedSectionId === section.id ? <Check size={18} /> : <Copy size={18} />}</button>
                            </div>
                        </div>

                        {section.type === 'VIDEO_REELS' && !isEditingText && (
                            <div className="flex space-x-1 mb-6 p-1 bg-slate-100 rounded-xl w-fit no-print">
                                <button onClick={() => setReelsTab('trad')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${reelsTab === 'trad' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Tradicional</button>
                                <button onClick={() => setReelsTab('heygen')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${reelsTab === 'heygen' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Sparkles size={14}/> <span>HeyGen Studio</span></button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            <div className="lg:col-span-12">
                                <div className={`relative p-8 rounded-2xl border ${isEditingText ? 'border-amber-400 bg-amber-50 shadow-inner' : 'border-slate-100 bg-slate-50/50'} transition-all`}>
                                    {isEditingText ? (
                                        <textarea 
                                            value={currentText}
                                            onChange={(e) => setSectionTexts(prev => ({ ...prev, [section.id]: e.target.value }))}
                                            className="w-full h-80 bg-transparent focus:outline-none font-mono text-sm leading-relaxed text-black font-bold resize-none"
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="prose prose-slate prose-sm max-w-none text-black font-bold">
                                            <ReactMarkdown>{mainDisplayContent}</ReactMarkdown>
                                        </div>
                                    )}
                                    
                                    <div className="mt-8 pt-6 border-t border-slate-200/60 no-print">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Refinar Conteúdo</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="text"
                                                    value={feedback}
                                                    onChange={(e) => setRefinementPrompts(prev => ({ ...prev, [section.id]: e.target.value }))}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleRefineSection(section.id)}
                                                    placeholder="Ex: No HeyGen Studio, altere o script da fala do Jeito Errado..."
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-black font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                                />
                                                {refining && <div className="absolute right-3 top-1/2 -translate-y-1/2"><RotateCcw size={16} className="animate-spin text-indigo-600" /></div>}
                                            </div>
                                            <button 
                                                onClick={() => handleRefineSection(section.id)}
                                                disabled={refining || !feedback.trim()}
                                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl shadow-lg transition-all flex items-center space-x-2"
                                            >
                                                <Send size={16} />
                                                <span className="text-xs font-black uppercase">Refinar</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {['CAROUSEL', 'STORIES', 'VIDEO_REELS', 'IMAGE_PROMPT', 'VIDEO_SEQUENCE', 'MEME'].includes(section.type) && (
                                <div className="lg:col-span-12 mt-4">
                                    <div className="flex items-center space-x-3 mb-6 no-print">
                                        <div className="h-px bg-slate-200 flex-1"></div>
                                        <div className="flex items-center space-x-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-slate-400">
                                            <Settings2 size={16} className="text-amber-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {section.type === 'STORIES' ? 'Sequência de Stories' : section.type === 'MEME' ? 'Opções de Meme' : 'Gerador Visual'}
                                            </span>
                                        </div>
                                        <div className="h-px bg-slate-200 flex-1"></div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                                        {section.type === 'VIDEO_SEQUENCE' ? (
                                            [1,2,3,4,5].map(i => (
                                                <VideoSlot key={i} slotKey={`${section.id}_${i}`} label={`Cena 0${i}`} context={extractStoryContent(currentText, i)} />
                                            ))
                                        ) : section.type === 'VIDEO_REELS' ? (
                                            <div className="col-span-2 sm:col-span-3 md:col-span-2 mx-auto w-full">
                                                <VideoSlot slotKey={`${section.id}_1`} label="Abertura Reels" context={extractStoryContent(currentText, 1)} />
                                            </div>
                                        ) : section.type === 'IMAGE_PROMPT' ? (
                                            <ImageSlot slotKey={`${section.id}_1`} label="Capa Principal" ratioClass="aspect-[9/16]" context={extractStoryContent(currentText, 1) || currentText.substring(0, 800)} />
                                        ) : section.type === 'MEME' ? (
                                            [1,2].map(i => (
                                                <ImageSlot key={i} slotKey={`${section.id}_${i}`} label={`Meme Opção ${i}`} ratioClass="aspect-[9/16]" context={extractStoryContent(currentText, i)} />
                                            ))
                                        ) : (
                                            [1,2,3,4,5].map(i => (
                                                <ImageSlot key={i} slotKey={`${section.id}_${i}`} label={`Slide 0${i}`} ratioClass={section.type === 'CAROUSEL' ? 'aspect-[4/5]' : 'aspect-[9/16]'} context={extractStoryContent(currentText, i)} />
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                      </div>
                  </div>
              );
          })}

          {sections.length > 0 && (
              <div className="sticky bottom-6 p-2 bg-white/60 backdrop-blur-md rounded-3xl border border-white/30 shadow-2xl flex flex-col sm:flex-row justify-center gap-4 z-20 max-w-2xl mx-auto no-print">
                  <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-800 hover:bg-black text-white font-black rounded-2xl shadow-xl flex items-center justify-center space-x-3 uppercase text-xs tracking-widest">
                    <FileText size={20} /> <span>Exportar PDF</span>
                  </button>
                  <button onClick={() => {
                      const fullText = sections.map(sec => `# ${sec.title}\n${sectionTexts[sec.id]}`).join('\n\n');
                      onApprove({ id: targetDate + targetType, date: targetDate, type: targetType, text: fullText, strategy: activeFocus, timestamp: Date.now() });
                  }} className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl shadow-xl flex items-center justify-center space-x-3 uppercase text-xs tracking-widest">
                    <CheckCircle2 size={20} /> <span>Aprovar Estratégia</span>
                  </button>
              </div>
          )}
      </div>
    </div>
  );
};

export default GeminiAdvisor;
