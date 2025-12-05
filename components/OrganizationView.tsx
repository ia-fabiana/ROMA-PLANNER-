
import React from 'react';
import { StrategyItem } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Database, TrendingUp, AlertCircle, Target, Tag, Sparkles, Star, Users, CheckSquare, MessageCircle, ShieldAlert } from 'lucide-react';

interface OrganizationViewProps {
  data: StrategyItem[];
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
}

const OrganizationView: React.FC<OrganizationViewProps> = ({ data, selectedIds, onToggleSelection }) => {
  
  // Aggregate data for charts
  const painCount = data.reduce((acc, item) => {
    const key = item.pain || 'Outros';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(painCount)
    .map(key => ({ name: key.substring(0, 15) + (key.length > 15 ? '...' : ''), full: key, count: painCount[key] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6); 

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
            Clique nos itens individuais da tabela abaixo para selecionar os "ingredientes" da sua estratégia.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total de Linhas</p>
            <p className="text-2xl font-bold text-slate-800">{data.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <CheckSquare size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Itens Selecionados</p>
            <p className="text-2xl font-bold text-slate-800">{selectedIds.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Dores Distintas</p>
            <p className="text-2xl font-bold text-slate-800">{Object.keys(painCount).length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Tag size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Categorias</p>
            <p className="text-2xl font-bold text-slate-800">{new Set(data.map(d => d.category)).size}</p>
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

        {/* Analytics View */}
        <div className="xl:col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky top-24 h-fit">
          <h3 className="text-sm font-semibold text-slate-500 uppercase mb-6">Top Dores Identificadas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '10px' }} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 bg-indigo-50 rounded-lg text-xs text-indigo-900 leading-relaxed border border-indigo-100">
            <div className="flex items-center mb-2 font-bold text-indigo-700">
               <Sparkles size={14} className="mr-1" /> Insight
            </div>
            Para cumprir sua Roma de <strong>"Atrair clientes utilizando IA"</strong>, observe que a maioria das dores está relacionada à falta de conhecimento técnico e estratégia.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationView;
