import React, { useState, useMemo } from 'react';
import { StrategyItem } from '../types';
import { ArrowRight, CheckCircle2, AlertTriangle, Zap, Search, Users, Megaphone, Star } from 'lucide-react';

interface ChoiceModeProps {
  data: StrategyItem[];
}

const ChoiceMode: React.FC<ChoiceModeProps> = ({ data }) => {
  const [selectedItem, setSelectedItem] = useState<StrategyItem | null>(null);
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Atração de Clientes');

  // Extract unique categories
  const categories = useMemo(() => Array.from(new Set(data.map(d => d.category))), [data]);

  const filteredData = data.filter(item => 
    item.category === activeCategory &&
    (item.pain.toLowerCase().includes(filter.toLowerCase()) || 
     item.objection.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
      
      {/* Sidebar Selector */}
      <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        
        {/* Category Tabs */}
        <div className="flex border-b border-slate-100">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSelectedItem(null);
              }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-2 ${
                activeCategory === cat 
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' 
                  : 'bg-slate-50 text-slate-400 hover:text-slate-600'
              }`}
            >
              {cat === 'Atração de Clientes' ? <Users size={14} /> : <Megaphone size={14} />}
              <span>{cat === 'Atração de Clientes' ? 'Clientes' : 'Divulgação'}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-slate-100 bg-white">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Identifique o Problema
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Busque por dor ou objeção..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
          {filteredData.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`w-full text-left p-4 rounded-lg border transition-all duration-200 group relative overflow-hidden ${
                selectedItem?.id === item.id 
                  ? 'bg-white border-indigo-500 ring-1 ring-indigo-500 shadow-md' 
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${selectedItem?.id === item.id ? 'bg-indigo-500' : 'bg-transparent'}`}></div>
              <div className="flex items-start justify-between pl-2">
                <div>
                  <p className={`text-sm font-semibold ${selectedItem?.id === item.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {item.pain}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.objection}</p>
                </div>
                {selectedItem?.id === item.id && (
                  <ArrowRight className="h-4 w-4 text-indigo-600 mt-1" />
                )}
              </div>
            </button>
          ))}
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhuma dor encontrada nesta categoria.
            </div>
          )}
        </div>
      </div>

      {/* Main Detail View */}
      <div className="lg:col-span-8">
        {selectedItem ? (
          <div className="h-full flex flex-col space-y-6">
            
            {/* Header: The Problem */}
            <div className="bg-white p-8 rounded-xl shadow-sm border-l-4 border-red-500 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-full">
                    <AlertTriangle size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Cenário Atual (Problema)</h3>
                </div>
                <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500 font-medium">
                  {selectedItem.category}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs uppercase text-slate-400 font-bold mb-1">Dor Principal</p>
                  <p className="text-xl text-slate-900 font-medium leading-relaxed">"{selectedItem.pain}"</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400 font-bold mb-1">Objeção Identificada</p>
                  <p className="text-lg text-slate-700 italic">"{selectedItem.objection}"</p>
                </div>
                <div className="md:col-span-2 mt-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs uppercase text-slate-400 font-bold mb-1">Engajamento / Sintoma</p>
                  <p className="text-sm text-slate-600">{selectedItem.engagement}</p>
                </div>
              </div>
            </div>

            {/* Arrow Divider */}
            <div className="flex justify-center -my-3 z-10">
              <div className="bg-indigo-600 text-white rounded-full p-2 shadow-lg">
                <ArrowRight size={24} />
              </div>
            </div>

            {/* Solution: The Roma */}
            <div className={`flex-1 rounded-xl shadow-lg p-8 text-white relative overflow-hidden animate-fade-in-up transition-colors duration-500 ${
              selectedItem.category === 'Atração de Clientes' 
                ? 'bg-gradient-to-br from-indigo-600 to-blue-700' 
                : 'bg-gradient-to-br from-purple-600 to-pink-700'
            }`} style={{animationDelay: '100ms'}}>
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
              
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-start justify-between border-b border-white/20 pb-6 mb-6">
                  <div>
                     <div className="flex items-center space-x-2 text-yellow-300 mb-2">
                        <Star size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">Roma Principal</span>
                     </div>
                     <h3 className="text-xl md:text-2xl font-bold leading-tight text-white/95">
                       "Ajudo Profissionais da Beleza a melhorar a divulgação e atrair novas clientes utilizando IA."
                     </h3>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm hidden md:block">
                    <Zap size={24} className="text-yellow-300" />
                  </div>
                </div>

                <div className="space-y-8 flex-1 flex flex-col justify-center">
                  <div>
                    <p className="text-xs uppercase text-white/60 font-bold tracking-wider mb-2">Desejo a Despertar (Micro-Roma)</p>
                    <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                      {selectedItem.desire}
                    </h2>
                  </div>

                  <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm border border-white/10">
                    <p className="text-xs uppercase text-white/60 font-bold tracking-wider mb-2">A Grande Oportunidade</p>
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="text-green-400 mt-1 flex-shrink-0" />
                      <p className="text-xl font-medium">{selectedItem.opportunity}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
            <Zap size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Selecione uma Dor</p>
            <p className="text-sm">Escolha uma categoria acima e um item na lista.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChoiceMode;