import React, { useState, useEffect } from 'react';
import { CLUB_TEAMS } from '@/types';
import { 
  Plus, 
  Trash2, 
  Play, 
  Filter, 
  Clock, 
  Video, 
  Check, 
  Sparkles,
  Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VideoAnalysis {
  id: string;
  titulo: string;
  url: string;
  categoria: 'Análisis Rival' | 'Errores Propios' | 'Jugadas Estrategia' | 'Entrenamiento';
  notas: string;
  fecha: string;
  timestamps: { time: string; note: string }[];
}

// Helper to extract YouTube video ID
const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function Videoteca() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [videos, setVideos] = useState<VideoAnalysis[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoAnalysis | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('Todos');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Video Form state
  const [formData, setFormData] = useState({
    titulo: '',
    url: '',
    categoria: 'Errores Propios' as VideoAnalysis['categoria'],
    notas: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  // Timestamp note input
  const [newTimestamp, setNewTimestamp] = useState({ time: '00:00', note: '' });

  // Load videos
  useEffect(() => {
    const key = `team_videos_${selectedTeam}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      setVideos(parsed);
      setActiveVideo(parsed.length > 0 ? parsed[0] : null);
    } else {
      // Default placeholder video
      const defaults: VideoAnalysis[] = [
        {
          id: 'v1',
          titulo: 'Análisis de Transición Defensiva - Último Partido',
          url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
          categoria: 'Errores Propios',
          notas: 'Análisis minucioso del comportamiento defensivo en la fase de repliegue tras pérdida de posesión.',
          fecha: new Date().toISOString().split('T')[0],
          timestamps: [
            { time: '01:24', note: 'Retraso del lateral en la basculación tras centro lateral.' },
            { time: '03:40', note: 'Recuperación de balón efectiva e inicio de contraataque rápido.' }
          ]
        }
      ];
      localStorage.setItem(key, JSON.stringify(defaults));
      setVideos(defaults);
      setActiveVideo(defaults[0]);
    }
  }, [selectedTeam]);

  const saveVideos = (updated: VideoAnalysis[]) => {
    setVideos(updated);
    localStorage.setItem(`team_videos_${selectedTeam}`, JSON.stringify(updated));
  };

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.url.trim()) {
      toast.error('Título y Enlace son obligatorios');
      return;
    }

    const newVideo: VideoAnalysis = {
      id: crypto.randomUUID(),
      titulo: formData.titulo,
      url: formData.url,
      categoria: formData.categoria,
      notas: formData.notas,
      fecha: formData.fecha,
      timestamps: []
    };

    const updated = [newVideo, ...videos];
    saveVideos(updated);
    setActiveVideo(newVideo);
    setShowAddForm(false);
    toast.success('Video guardado en la videoteca.');

    // Clear form
    setFormData({
      titulo: '',
      url: '',
      categoria: 'Errores Propios',
      notas: '',
      fecha: new Date().toISOString().split('T')[0]
    });
  };

  const handleDeleteVideo = (id: string, title: string) => {
    if (confirm(`¿Estás seguro de eliminar "${title}" de la videoteca?`)) {
      const updated = videos.filter(v => v.id !== id);
      saveVideos(updated);
      if (activeVideo?.id === id) {
        setActiveVideo(updated.length > 0 ? updated[0] : null);
      }
      toast.success('Video eliminado.');
    }
  };

  const handleAddTimestamp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVideo || !newTimestamp.note.trim()) return;

    const updatedTimestamps = [
      ...activeVideo.timestamps,
      { time: newTimestamp.time, note: newTimestamp.note.trim() }
    ].sort((a, b) => a.time.localeCompare(b.time)); // Sort by time string

    const updatedVideo = { ...activeVideo, timestamps: updatedTimestamps };
    setActiveVideo(updatedVideo);

    const updatedVideos = videos.map(v => v.id === activeVideo.id ? updatedVideo : v);
    saveVideos(updatedVideos);
    setNewTimestamp({ time: '00:00', note: '' });
    toast.success('Anotación temporal añadida.');
  };

  const filteredVideos = videos.filter(v => 
    activeCategoryFilter === 'Todos' || v.categoria === activeCategoryFilter
  );

  return (
    <div className="space-y-6">
      {/* Selector & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/60 border border-slate-900 p-4 rounded-2xl">
        <div className="w-full sm:w-auto flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Equipo Activo</label>
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-slate-950 text-white font-bold text-sm border border-slate-800 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            {CLUB_TEAMS.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full sm:w-auto text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Video</span>
        </Button>
      </div>

      {/* Add Video Form */}
      {showAddForm && (
        <form onSubmit={handleAddVideo} className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4 animate-in slide-in-from-top duration-200">
          <h4 className="text-sm font-extrabold uppercase text-white tracking-wide flex items-center gap-2 mb-4">
            <Video className="w-4 h-4 text-blue-500" />
            <span>Datos del video técnico</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-400">Título / Tema *</label>
              <input 
                type="text" 
                required
                value={formData.titulo}
                onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="Ej. Análisis de presión tras pérdida del rival..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Fecha de Análisis</label>
              <input 
                type="date" 
                required
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-400">Enlace del Video (Soporta YouTube / General) *</label>
              <input 
                type="url" 
                required
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="Ej. https://www.youtube.com/watch?v=..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Categoría Técnica</label>
              <select 
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value as any})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              >
                <option value="Errores Propios">Errores Propios</option>
                <option value="Análisis Rival">Análisis Rival</option>
                <option value="Jugadas Estrategia">Jugadas Estrategia</option>
                <option value="Entrenamiento">Entrenamiento</option>
              </select>
            </div>

            <div className="col-span-full">
              <label className="text-xs font-semibold text-slate-400">Notas / Introducción breve</label>
              <textarea 
                value={formData.notas}
                onChange={(e) => setFormData({...formData, notas: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 h-20"
                placeholder="Describe qué se debe observar primordialmente en este video..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAddForm(false)}
              className="text-xs border-slate-800 text-slate-300"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
            >
              Añadir Video
            </Button>
          </div>
        </form>
      )}

      {/* Main Grid: Feed & Player */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Videos Feed List */}
        <div className="lg:col-span-1 bg-slate-900/30 border border-slate-900 rounded-3xl p-4 flex flex-col gap-4">
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
            {['Todos', 'Errores Propios', 'Análisis Rival', 'Jugadas Estrategia'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`flex-1 text-[9px] font-black uppercase py-1.5 px-2 rounded-lg transition-all ${
                  activeCategoryFilter === cat 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                {cat.split(' ')[0]} {/* Shorten name for mobile */}
              </button>
            ))}
          </div>

          {/* Videos Feed */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredVideos.length > 0 ? (
              filteredVideos.map((vid) => {
                const isSelected = activeVideo?.id === vid.id;
                const ytId = getYoutubeId(vid.url);
                
                return (
                  <div 
                    key={vid.id}
                    onClick={() => setActiveVideo(vid)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3 relative group ${
                      isSelected 
                        ? 'bg-blue-600/10 border-blue-600' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    {/* Thumbnail placeholder */}
                    <div className="w-16 h-12 bg-slate-950 border border-slate-850 rounded-lg flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                      {ytId ? (
                        <img 
                          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Video className="w-4 h-4 text-slate-500" />
                      )}
                      <Play className="absolute w-4 h-4 text-white opacity-80" />
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <h6 className="font-bold text-white text-xs truncate uppercase leading-tight">{vid.titulo}</h6>
                        <span className="text-[9px] text-blue-400 font-extrabold uppercase mt-1 inline-block">{vid.categoria}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold mt-1.5">{vid.fecha}</span>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVideo(vid.id, vid.titulo);
                      }}
                      className="absolute right-3 bottom-3 text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center gap-1.5">
                <Video className="w-8 h-8 text-slate-700" />
                <h6 className="font-bold text-slate-400 text-xs uppercase">Videoteca vacía</h6>
                <p className="text-[9px] text-slate-650 max-w-xs">Introduce videos para comenzar tu pizarra de análisis técnico.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Video Player & Timestamps Notebook */}
        <div className="lg:col-span-2 bg-slate-900/30 border border-slate-900 rounded-3xl p-6 flex flex-col justify-between gap-6 min-h-[450px]">
          {activeVideo ? (
            <div className="space-y-6">
              
              {/* Responsive Video Container */}
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-900 relative">
                {getYoutubeId(activeVideo.url) ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${getYoutubeId(activeVideo.url)}`}
                    title={activeVideo.titulo}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
                    <Video className="w-12 h-12 text-blue-500 animate-pulse" />
                    <div>
                      <h6 className="font-bold text-white text-sm uppercase">Video Externo Registrado</h6>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">Este enlace no admite reproducción integrada. Puedes abrir el video en una nueva pestaña para su visualización.</p>
                    </div>
                    <Button
                      onClick={() => window.open(activeVideo.url, '_blank')}
                      className="bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase tracking-wider py-1.5 rounded-xl h-auto mt-2 cursor-pointer"
                    >
                      Abrir Video en Nueva Pestaña
                    </Button>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-white text-base uppercase tracking-tight leading-tight">{activeVideo.titulo}</h4>
                  <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-500/10 border border-blue-500/15 px-2.5 py-0.5 rounded-full">{activeVideo.categoria}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{activeVideo.notas || 'Sin descripción introducida.'}</p>
              </div>

              {/* Timestamps Section */}
              <div className="border-t border-slate-900 pt-5 space-y-4">
                <h5 className="font-bold text-xs text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-blue-500" />
                  <span>Anotaciones de Pizarra de Análisis</span>
                </h5>

                {/* List of annotations */}
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {activeVideo.timestamps.length > 0 ? (
                    activeVideo.timestamps.map((ts, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 flex items-start gap-3 transition-colors text-xs"
                      >
                        <span className="text-blue-400 font-extrabold flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/15 text-[10px]">
                          <Clock className="w-3 h-3" />
                          <span>{ts.time}</span>
                        </span>
                        <p className="text-slate-300 font-medium leading-normal">{ts.note}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-600 font-bold uppercase py-4">Sin anotaciones de análisis todavía en este video.</p>
                  )}
                </div>

                {/* Add new Timestamp form */}
                <form onSubmit={handleAddTimestamp} className="flex gap-2 items-end pt-2 border-t border-slate-900/40">
                  <div className="w-24 shrink-0">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Minuto (MM:SS)</label>
                    <input 
                      type="text"
                      required
                      placeholder="01:24"
                      value={newTimestamp.time}
                      onChange={(e) => setNewTimestamp({...newTimestamp, time: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-all font-bold text-center mt-1"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Observación Táctica</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ej. Cobertura tardía del central o fallo de marcaje..."
                      value={newTimestamp.note}
                      onChange={(e) => setNewTimestamp({...newTimestamp, note: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500 transition-all font-medium mt-1"
                    />
                  </div>

                  <Button type="submit" className="bg-blue-600 hover:bg-blue-500 font-bold text-xs uppercase rounded-xl py-2 h-auto">
                    Anotar
                  </Button>
                </form>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <Video className="w-12 h-12 text-slate-800" />
              <h5 className="font-bold text-white uppercase text-sm">Sin video seleccionado</h5>
              <p className="text-xs text-slate-500 max-w-xs">Selecciona un video de análisis técnico de la izquierda o añade uno nuevo.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
