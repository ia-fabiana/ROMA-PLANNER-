
import React, { useMemo } from 'react';
import { StrategyItem } from '../types';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Database, TrendingUp, AlertCircle, Target, Tag, Sparkles, Star, Users, CheckSquare, MessageCircle, ShieldAlert, PieChart } from 'lucide-react';

interface OrganizationViewProps {
  data: StrategyItem[];
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
}

const OrganizationView: React.FC<OrganizationViewProps> = ({ data, selectedIds, onToggleSelection }) => {
  
  // Calcular métricas baseadas na SELEÇÃO REAL do usuário
  const stats = useMemo(() => {
    let counts = {
      pain: 0,
      objection: 0,
      desire: 0,
      opportunity: 0,
      engagement: 0
    };

    selectedIds.forEach(id => {
      if (id.endsWith('-pain')) counts.pain++;
      else if (id.endsWith('-objection')) counts.objection++;
      else if (id.endsWith('-desire')) counts.desire++;
      else if (id.endsWith('-opportunity')) counts.opportunity++;
      else if (id.endsWith('-engagement')) counts.engagement++;
    });

    return counts;
  }, [selectedIds]);

  // Dados para o Gráfico Radar
  const radarData = [
    { subject: 'Dores', A: stats.pain, fullMark: 10 },
    { subject: 'Objeções', A: stats.objection, fullMark: 10 },
    { subject: 'Engajamento', A: stats.engagement, fullMark: 10 },
    { subject: 'Oportunidades', A: stats.opportunity, fullMark: 10 },
    { subject: 'Desejos', A: stats.desire, fullMark: 10 },
  ];

  // Diagnóstico Inteligente
  const getDiagnosis = () => {
    const total = selectedIds.length;
    if (total === 0) return "Selecione itens na tabela para ver a análise.";
    
    const negativeBias = stats.pain + stats.objection;
    const positiveBias = stats.desire + stats.opportunity;

    if (negativeBias > positiveBias * 1.5) return "Sua estratégia está muito focada na DOR. Tente incluir mais Desejos e Oportunidades para inspirar, não apenas cutucar a ferida.";
    if (positiveBias > negativeBias * 1.5) return "Sua estratégia é muito OTIMISTA. Lembre-se de tocar nas Dores e Objeções para gerar conexão e urgência.";
    return "Excelente equilíbrio! Você está mesclando bem a atração (Desejos) com a conexão (Dores).";
  };

  // Helper to render a checkable cell
  const renderCheckableCell = (item: StrategyItem, field: keyof StrategyItem, icon?: React.ReactNode, bgColorClass: string = 'bg-white') => {
    const selectionId = `${item.id}-${field}`;
    const isSelected = selectedIds.includes(selectionId);
    const text = item[field] as string;

    if (!text) return <span className="text-slate-300">-</span>;

    return (
      <div 
        onClick={() => onToggleSelection(selectionId)}
        className={`flex items-start space-x-2 p-2 rounded-lg cursor-pointer transition-all border ${
          isSelected 
            ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
            : `border-transparent hover:border-slate-200 ${bgColorClass}`
        }`}
      >
        <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
          isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
        }`}>
          {isSelected && <CheckSquare size={10} className="text-white" />}
        </div>
        <div className={`text-sm ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-600'}`}>
          {text}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Stats & Roma Definition */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-2 text-indigo-200 uppercase text-xs font-bold tracking-widest">
            <Star size={14} />
            <span>Definição da Roma</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight max-w-4xl">
            "Ajudo Profissionais da Beleza a melhorar a divulgação e atrair novas clientes utilizando IA."
          </h1>
          <p className="mt-4 text-indigo-100 text-sm opacity-90 max-w-2xl">
            Clique nos itens individuais da tabela abaixo (Dores, Desejos...) para montar seu mix estratégico.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Base de Dados</p>
            <p className="text-2xl font-bold text-slate-800">{data.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <CheckSquare size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Ingredientes</p>
            <p className="text-2xl font-bold text-slate-800">{selectedIds.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Dores Ativas</p>
            <p className="text-2xl font-bold text-slate-800">{stats.pain}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Oportunidades</p>
            <p className="text-2xl font-bold text-slate-800">{stats.opportunity}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Table View */}
        <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center">
              <Database className="mr-2 h-5 w-5 text-indigo-500" />
              Matriz de Dados
            </h2>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
              Use o tick para selecionar itens individuais
            </span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-4 py-4 bg-blue-50/50 text-blue-800 border-l border-blue-100">
                    <div className="flex items-center"><Star size={14} className="mr-1"/> Atração: Desejo</div>
                  </th>
                  <th className="px-4 py-4 bg-green-50/50 text-green-800 border-l border-green-100">
                    <div className="flex items-center"><TrendingUp size={14} className="mr-1"/> Atração: Oportunidade</div>
                  </th>
                  <th className="px-4 py-4 bg-yellow-50/50 text-yellow-800 border-l border-yellow-100">
                    <div className="flex items-center"><Users size={14} className="mr-1"/> Engajamento</div>
                  </th>
                  <th className="px-4 py-4 border-l border-slate-200">
                    <div className="flex items-center"><ShieldAlert size={14} className="mr-1"/> Objeção</div>
                  </th>
                  <th className="px-4 py-4 border-l border-slate-200 text-red-600">
                     <div className="flex items-center"><AlertCircle size={14} className="mr-1"/> Dor</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 align-top">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.category === 'Atração de Clientes' 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'bg-purple-50 text-purple-700'
                      }`}>
                        {item.category === 'Atração de Clientes' ? 'Atração' : 'Divulgação'}
                      </span>
                    </td>
                    <td className="px-2 py-3 align-top border-l border-slate-50 bg-blue-50/5">
                      {renderCheckableCell(item, 'desire', null)}
                    </td>
                    <td className="px-2 py-3 align-top border-l border-slate-50 bg-green-50/5">
                      {renderCheckableCell(item, 'opportunity', null)}
                    </td>
                    <td className="px-2 py-3 align-top border-l border-slate-50 bg-yellow-50/5">
                      {renderCheckableCell(item, 'engagement', null)}
                    </td>
                    <td className="px-2 py-3 align-top border-l border-slate-50">
                      {renderCheckableCell(item, 'objection', null)}
                    </td>
                    <td className="px-2 py-3 align-top border-l border-slate-50">
                      {renderCheckableCell(item, 'pain', <AlertCircle size={14}/>, 'bg-red-50/50')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Strategic Balance Radar */}
        <div className="xl:col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky top-24 h-fit">
          <h3 className="text-sm font-semibold text-slate-800 uppercase mb-2 flex items-center">
            <PieChart size={16} className="mr-2 text-indigo-500"/>
            Equilíbrio Estratégico
          </h3>
          <p className="text-xs text-slate-400 mb-6">Analisa a distribuição dos itens selecionados.</p>
          
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                <Radar
                  name="Estratégia"
                  dataKey="A"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="#6366f1"
                  fillOpacity={0.3}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-white rounded-lg border border-indigo-100 shadow-sm">
            <div className="flex items-center mb-2 font-bold text-indigo-700 text-xs uppercase tracking-wider">
               <Sparkles size={12} className="mr-1.5" /> Diagnóstico da IA
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "{getDiagnosis()}"
            </p>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
             <span className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">
                Dores: {stats.pain}
             </span>
             <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                Desejos: {stats.desire}
             </span>
             <span className="text-[10px] px-2 py-1 bg-yellow-50 text-yellow-600 rounded-full border border-yellow-100">
                Objeções: {stats.objection}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationView;
