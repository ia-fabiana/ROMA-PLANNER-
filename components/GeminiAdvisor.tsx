
import React, { useState, useEffect } from 'react';
import { StrategyItem, ContentType, CalendarContext, ApprovedContent } from '../types';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, Copy, RefreshCw, X, CheckCircle2, Image as ImageIcon, Video, Wand2, Edit2, Download, 
  FileText, Shirt, Check, User, Settings2, Clapperboard, MonitorPlay, AlertCircle, Key, Play, Eye
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
    const patterns = [
        new RegExp(`(?:Story|Stories|Cena|Slide|Quadrinho|Passo|Item|Slide|Vídeo|Reels)\\s*0?${index}\\s*[:.-]?\\s*([^]*?)(?=(?:Story|Stories|Cena|Slide|Quadrinho|Passo|Item|Slide|Vídeo|Reels)\\s*0?${index+1}|$)`, 'i'),
        new RegExp(`^\\s*${index}\\.\\s*([^]*?)(?=\\n\\s*${index+1}\\.|$)`, 'm'),
        new RegExp(`VISUAL(?: PARA VEO)?[:.-]?\\s*([^]*?)(?=(?:TEXTO|BALÃO|FALA|PENSAMENTO|$)?)`, 'i')
    ];
    for (const regex of patterns) {
        const match = fullText.match(regex);
        if (match && match[1]) {
            let clean = match[1].trim();
            clean = clean.replace(/^\(Visual:.*?\)/i, '').trim();
            return clean.substring(0, 800);
        }
    }
    const paragraphs = fullText.split(/\n\n+/).filter(p => p.trim().length > 10);
    if (paragraphs[index-1]) return paragraphs[index-1].substring(0, 800);
    return fullText.substring(0, 800);
}

const GeminiAdvisor: React.FC<GeminiAdvisorProps> = ({ 
  calendarContext, 
  onClearContext, 
  onApprove 
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

# 🎥 1. ROTEIRO DE VÍDEO (REELS COM AVATAR FABIANA)
- Forneça um roteiro completo mas também uma descrição visual detalhada para o Estúdio Veo:
  * VISUAL PARA VEO: [Descrição detalhada da cena de abertura/principal para animação fotorrealista com Fabiana]
# 📱 2. SEQUÊNCIA DE STORIES (5 SLIDES)
# 📝 3. LEGENDA PARA FEED (COM CTA E IDENTIFICAÇÃO)
# 🎠 4. FEED CARROSSEL (ESTILO HQ - HISTÓRIA EM QUADRINHOS)
- Para cada um dos 5 slides, forneça:
  * VISUAL: [Descrição da cena fotorrealista com Fabiana]
  * TEXTO NO SLIDE: [Texto principal escrito no slide]
  * BALÃO DE FALA/PENSAMENTO: [O que a Fabiana está falando ou pensando - estilo HQ]
# 🎬 5. SEQUÊNCIA DE VÍDEO VEO (DESCREVA 5 CENAS CURTAS PARA O VEO 3, FORMATO 9:16. MANTENHA A CONTINUIDADE DA HISTÓRIA)
# 🖼️ 6. PROMPT PARA IMAGEM (CAPA)
# 🎭 7. MEME ESTRATÉGICO

CONTEXTO:
- Foco: ${calendarContext.focus}
- Ingredientes: ${ingredientsText}
`;
      setPrompt(basePrompt);
    }
  }, [calendarContext]);

  const parseSections = (text: string): ParsedSection[] => {
      if (!text) return [];
      const rawSections = text.split(/(?=\n# .)/);
      return rawSections.map((sectionRaw, index) => {
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
          return { id: `sec_${index}`, type, title: titleLine.replace(/^#+ /, ''), content, index: index + 1 };
      }).filter(s => s.content.length > 0 || s.title.length > 0);
  };

  const ensureApiKey = async () => {
    // @ts-ignore
    if (!(await window.aistudio.hasSelectedApiKey())) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }
  };

  const handleGenerateMain = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResponse('');
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const result: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      const resultText = result.text;
      if (resultText) {
          setResponse(resultText);
          const sections = parseSections(resultText);
          const newAdjusted: Record<string, string> = {};
          sections.forEach((sec, sIdx) => {
              const count = (sec.type === 'CAROUSEL' || sec.type === 'STORIES' || sec.type === 'VIDEO_SEQUENCE') ? 5 : 1;
              for(let i=1; i<=count; i++) {
                newAdjusted[`${sec.type}_${sIdx}_${i}`] = extractStoryContent(sec.content, i);
              }
              if (sec.type === 'VIDEO_REELS') {
                  newAdjusted[`${sec.type}_${sIdx}_1`] = extractStoryContent(sec.content, 1);
              }
          });
          setAdjustedPrompts(prev => ({ ...prev, ...newAdjusted }));
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVeoVideo = async (slotKey: string, context: string, imageBase64: string) => {
      await ensureApiKey();
      setIsGeneratingVid(prev => ({ ...prev, [slotKey]: true }));
      setVideoStatus(prev => ({ ...prev, [slotKey]: 'Animando imagem...' }));
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
          const scenePrompt = `FOTORREALISTA, 8K. Fabiana (@ia.fabiana). Movimento fluido e natural baseado na cena: ${adjustedPrompts[slotKey] || context}. FORMATO 9:16.`;

          const imgParsed = parseBase64(imageBase64);
          if (!imgParsed) throw new Error("Imagem de referência inválida.");

          let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: scenePrompt,
            image: {
                imageBytes: imgParsed.data,
                mimeType: imgParsed.mimeType
            },
            config: {
              numberOfVideos: 1,
              resolution: '720p',
              aspectRatio: '9:16'
            }
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
            const videoBlob = await videoResp.blob();
            const videoUrl = URL.createObjectURL(videoBlob);
            setGeneratedVideos(prev => ({ ...prev, [slotKey]: videoUrl }));
          }
      } catch (e: any) {
          console.error(e);
          setError("Erro no Veo: " + e.message);
      } finally {
          setIsGeneratingVid(prev => ({ ...prev, [slotKey]: false }));
      }
  };

  const handleGenerateSlotImage = async (slotKey: string, context: string, ratioClass: string) => {
      setIsGeneratingImg(prev => ({ ...prev, [slotKey]: true }));
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
          let formatPrompt = ratioClass.includes('9/16') ? "FORMATO: Vertical (9:16)." : "FORMATO: Feed (4:5).";
          const finalContext = adjustedPrompts[slotKey] || context;
          const instructions = `FOTORREALISTA. Fabiana (@ia.fabiana) vestindo o look da referência. CENA: ${finalContext}. AMBIENTE: Salão de beleza moderno. ${formatPrompt}`;
          
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
          if (result.candidates?.[0]?.content?.parts) {
              for (const part of (result.candidates[0].content.parts as any[])) {
                  if (part.inlineData) setGeneratedImages(prev => ({ ...prev, [slotKey]: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }));
              }
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
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm no-print flex flex-col h-full">
          <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
              <div className="flex space-x-1">
                <button onClick={() => setEditingSlot(isEditing ? null : slotKey)} className={`p-1.5 rounded-md ${isEditing ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}><Edit2 size={12}/></button>
                <button onClick={() => handleGenerateSlotImage(slotKey, context, 'aspect-[9/16]')} className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" title="Gera imagem de referência"><ImageIcon size={12}/></button>
                
                {imageUrl && (
                    <a href={imageUrl} download={`roma_ref_${slotKey}.png`} className="p-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200" title="Download Imagem Ref">
                        <ImageIcon size={12}/>
                    </a>
                )}

                {videoUrl && (
                    <a href={videoUrl} download={`roma_veo_${slotKey}.mp4`} className="p-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200" title="Download Vídeo Veo">
                        <Video size={12}/>
                    </a>
                )}

                {imageUrl && !videoUrl && (
                    <button onClick={() => handleGenerateVeoVideo(slotKey, context, imageUrl)} className="p-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 animate-pulse" title="Transformar em Vídeo Veo">
                        <MonitorPlay size={12}/></button>
                )}
              </div>
          </div>
          {isEditing && (
              <textarea 
                value={currentPrompt}
                onChange={(e) => setAdjustedPrompts(prev => ({ ...prev, [slotKey]: e.target.value }))}
                className="w-full h-20 p-2 text-[10px] border border-amber-200 rounded bg-amber-50 mb-2 font-mono text-black font-bold"
              />
          )}
          <div className="w-full aspect-[9/16] bg-slate-900 rounded-lg overflow-hidden relative flex items-center justify-center border border-slate-800">
              {isGeneratingI && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 text-center">
                      <RefreshCw className="animate-spin text-white mb-2" size={24} />
                      <span className="text-[8px] font-bold text-white uppercase">Criando Referência...</span>
                  </div>
              )}
              {isGeneratingV && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-4 text-center">
                      <Clapperboard className="animate-pulse text-purple-400 mb-3" size={32} />
                      <span className="text-[9px] font-bold text-white uppercase tracking-widest">{videoStatus[slotKey]}</span>
                  </div>
              )}
              
              {videoUrl ? (
                  <video src={videoUrl} controls className="w-full h-full object-cover" loop autoPlay muted />
              ) : imageUrl ? (
                  <div className="relative w-full h-full">
                    <img src={imageUrl} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute bottom-0 inset-x-0 p-3 bg-black/60 backdrop-blur-sm">
                        <p className="text-[10px] text-white font-bold leading-tight uppercase tracking-tighter">Imagem Pronta ✓</p>
                        <button onClick={() => handleGenerateVeoVideo(slotKey, context, imageUrl)} className="mt-1.5 w-full py-2 bg-purple-600 text-white text-[10px] font-black rounded uppercase flex items-center justify-center">
                            <Play size={10} className="mr-1" /> Animando com Veo 3
                        </button>
                    </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-center opacity-40 text-white text-center px-4">
                      <Wand2 size={32} className="mb-2" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">1. Gerar Imagem</span>
                      <span className="text-[8px] mt-1 text-slate-400 leading-tight">Gere a base visual para animar</span>
                  </div>
              )}
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
              <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
              <div className="flex space-x-1">
                <button onClick={() => setEditingSlot(isEditing ? null : slotKey)} className={`p-1.5 rounded-md ${isEditing ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}><Edit2 size={12}/></button>
                <button onClick={() => handleGenerateSlotImage(slotKey, context, ratioClass)} className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"><Wand2 size={12}/></button>
                {imageUrl && (
                    <a href={imageUrl} download={`${slotKey}.png`} className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200" title="Download Imagem">
                        <Download size={12}/>
                    </a>
                )}
              </div>
          </div>
          {isEditing && (
              <textarea 
                value={currentPrompt}
                onChange={(e) => setAdjustedPrompts(prev => ({ ...prev, [slotKey]: e.target.value }))}
                className="w-full h-20 p-2 text-[10px] border border-amber-200 rounded bg-amber-50 mb-2 font-mono text-black font-bold"
              />
          )}
          <div className={`w-full ${ratioClass} bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200`}>
              {isGenerating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                      <RefreshCw className="animate-spin text-indigo-600 mb-2" size={24} />
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">Processando...</span>
                  </div>
              ) : null}
              {imageUrl ? (
                  <img src={imageUrl} className="w-full h-full object-cover animate-fade-in" />
              ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 opacity-50">
                      <ImageIcon size={32} />
                      <span className="text-[9px] font-bold mt-2 uppercase tracking-tighter">Imagen-4 Vision</span>
                  </div>
              )}
          </div>
      </div>
    );
  };

  return (
    <div className="bg-white/90 rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col min-h-[800px] backdrop-blur-sm">
      <div className="bg-slate-50/50 p-6 border-b border-slate-200 print:hidden backdrop-blur-md">
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
                    <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-widest">ESTRATÉGIA ATIVA</span>
                    <div className="text-xs font-bold uppercase text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg flex items-center">
                        <CheckCircle2 size={14} className="mr-2" /> {activeFocus || 'Estratégia Roma'}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-50 p-3 border border-indigo-100 rounded-xl shadow-inner relative overflow-hidden group">
                        <label className="text-[9px] font-bold text-indigo-600 block mb-2 uppercase flex items-center"><User size={12} className="mr-1" /> Avatar Face</label>
                        <div className="relative h-16 w-full rounded-lg border-2 border-white bg-white flex items-center justify-center overflow-hidden">
                            {avatarReference ? <img src={avatarReference} className="h-full w-full object-cover" /> : <Key className="text-indigo-200" size={20} />}
                            <input type="file" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setAvatarReference(reader.result as string); reader.readAsDataURL(file); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    </div>
                    <div className="bg-purple-50 p-3 border border-purple-100 rounded-xl shadow-inner relative overflow-hidden group">
                        <label className="text-[9px] font-bold text-purple-600 block mb-2 uppercase flex items-center"><Shirt size={12} className="mr-1" /> Look Roupa</label>
                        <div className="relative h-16 w-full rounded-lg border-2 border-white bg-white flex items-center justify-center overflow-hidden">
                            {clothingReference ? <img src={clothingReference} className="h-full w-full object-cover" /> : <ImageIcon className="text-purple-200" size={20} />}
                            <input type="file" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setClothingReference(reader.result as string); reader.readAsDataURL(file); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    </div>
                </div>
                <p className="text-[8px] text-slate-400 text-center italic text-black font-bold">Avatar = Rosto | Look = Estilo da Roupa</p>
            </div>
            
            <div className="md:col-span-8 flex flex-col">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refinar Prompt Estratégico</span>
                </div>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full h-40 p-4 border border-slate-200 rounded-2xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed bg-white shadow-inner text-black font-bold" />
                <button onClick={handleGenerateMain} disabled={isLoading} className="w-full py-4 mt-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white font-black rounded-2xl shadow-lg flex items-center justify-center hover:shadow-indigo-500/40 transform active:scale-[0.98] transition-all tracking-widest uppercase text-sm">
                    {isLoading ? <RefreshCw className="animate-spin mr-3" size={20}/> : <Sparkles className="mr-3" size={20}/>} 
                    {isLoading ? 'ESTRUTURANDO KIT...' : 'GERAR KIT COMPLETO + ESTÚDIO VEO'}
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto bg-slate-50/10">
          {response && parseSections(response).map((section, idx) => (
              <div key={idx} className="relative mb-24 animate-fade-in-up">
                  <div className="absolute -top-10 left-0 right-0 flex items-center justify-center opacity-40 select-none">
                      <div className="h-px bg-slate-300 flex-1"></div>
                      <div className="mx-6 text-[80px] font-black text-slate-200 leading-none">0{section.index}</div>
                      <div className="h-px bg-slate-300 flex-1"></div>
                  </div>

                  <div className="relative bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mr-5 shadow-lg shadow-indigo-600/20">
                                {section.index}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{section.title}</h3>
                                <div className="flex items-center mt-1">
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded mr-2">{section.type}</span>
                                    {(section.type === 'VIDEO_SEQUENCE' || section.type === 'VIDEO_REELS') && <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded flex items-center"><Play size={10} className="mr-1"/> VEO 3 Studio</span>}
                                    {section.type === 'CAROUSEL' && <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded flex items-center"><ImageIcon size={10} className="mr-1"/> Estilo HQ</span>}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(section.content); setCopiedSectionId(section.id); setTimeout(() => setCopiedSectionId(null), 2000); }} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all no-print ${copiedSectionId === section.id ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white'}`}>
                            {copiedSectionId === section.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="prose prose-slate prose-sm max-w-none lg:col-span-12 bg-slate-50/50 p-8 rounded-2xl border border-slate-100 shadow-inner text-black font-bold">
                            <ReactMarkdown>{section.content}</ReactMarkdown>
                        </div>

                        {['CAROUSEL', 'STORIES', 'VIDEO_REELS', 'IMAGE_PROMPT', 'VIDEO_SEQUENCE', 'MEME'].includes(section.type) && (
                            <div className="lg:col-span-12 mt-4">
                                <div className="flex items-center space-x-3 mb-6 no-print">
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                    <div className="flex items-center space-x-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-slate-400">
                                        <Settings2 size={16} className="text-amber-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {(section.type === 'VIDEO_SEQUENCE' || section.type === 'VIDEO_REELS') ? 'Workflow Veo 3: Imagem > Vídeo' : section.type === 'CAROUSEL' ? 'HQ Carousel Vision' : 'Imagen-4 Vision Studio'}
                                        </span>
                                    </div>
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                                    {section.type === 'VIDEO_SEQUENCE' ? (
                                        [1,2,3,4,5].map(i => (
                                            <VideoSlot key={i} slotKey={`VEO_${idx}_${i}`} label={`Cena 0${i}`} context={extractStoryContent(section.content, i)} />
                                        ))
                                    ) : section.type === 'VIDEO_REELS' ? (
                                        <div className="col-span-2 sm:col-span-3 md:col-span-2 mx-auto w-full">
                                            <VideoSlot slotKey={`${section.type}_${idx}_1`} label="Destaque Reels" context={extractStoryContent(section.content, 1)} />
                                        </div>
                                    ) : section.type === 'IMAGE_PROMPT' ? (
                                        <ImageSlot slotKey={`${section.type}_idx_1`} label="Destaque" ratioClass="aspect-[9/16]" context={section.content.substring(0, 800)} />
                                    ) : (
                                        [1,2,3,4,5].map(i => (
                                            <ImageSlot key={i} slotKey={`${section.type}_${idx}_${i}`} label={`Slide 0${i}`} ratioClass={section.type === 'CAROUSEL' ? 'aspect-[4/5]' : 'aspect-[9/16]'} context={extractStoryContent(section.content, i)} />
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                  </div>
              </div>
          ))}

          {response && (
              <div className="sticky bottom-6 p-2 bg-white/60 backdrop-blur-md rounded-3xl border border-white/30 shadow-2xl flex flex-col sm:flex-row justify-center gap-4 z-20 max-w-2xl mx-auto no-print">
                  <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-800 hover:bg-black text-white font-black rounded-2xl shadow-xl flex items-center justify-center space-x-3 uppercase text-xs tracking-widest">
                    <FileText size={20} /> <span>Download PDF</span>
                  </button>
                  <button onClick={() => onApprove({ id: targetDate + targetType, date: targetDate, type: targetType, text: response, strategy: activeFocus, timestamp: Date.now() })} className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl shadow-xl flex items-center justify-center space-x-3 uppercase text-xs tracking-widest">
                    <CheckCircle2 size={20} /> <span>Aprovar Estratégia</span>
                  </button>
              </div>
          )}
      </div>
    </div>
  );
};

export default GeminiAdvisor;
