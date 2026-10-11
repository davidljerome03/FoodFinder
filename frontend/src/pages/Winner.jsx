import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Clock, Navigation, RotateCcw } from 'lucide-react';

export default function Winner() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const currentUserName = location.state?.displayName || 'Guest';

  // In a real app, this would be populated from WebSockets
  const players = [
    { name: currentUserName, color: 'bg-orange-500' }
  ];

  const totalCount = players.length;

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-6 pb-20">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <img
            src="/favicon.svg"
            alt="Food Finder Logo"
            className="w-10 h-10 rounded-xl object-contain shadow-[2px_2px_0px_0px_rgba(255,90,54,1)]"
          />
          <div>
            <h1 className="text-xl font-bold leading-none">Food Finder</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-4 py-1.5 bg-white">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-xs font-bold font-mono tracking-wider">LIVE / {totalCount.toString().padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-4 py-1.5 bg-white">
            <span className="text-xs font-bold font-mono tracking-wider uppercase">Room {roomCode} {totalCount} Players</span>
          </div>
        </div>
      </header>

      <div className="flex gap-6 max-w-7xl mx-auto">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Top Banner */}
          <div className="bg-green-400 border-2 border-navy-900 rounded-3xl p-10 text-center relative overflow-hidden">
            <div className="text-xs font-mono font-bold tracking-widest uppercase mb-4">
              <span className="text-orange-500">✿</span> ROOM {roomCode} / PERFECT MATCH <span className="text-orange-500">✿</span>
            </div>
            <h1 className="text-6xl font-bold mb-4 tracking-tight">Dinner, decided.</h1>
            <p className="text-xl font-bold">{totalCount} friends. {totalCount} votes. One very good choice.</p>
          </div>

          {/* Restaurant Card */}
          <div className="bg-card border-2 border-navy-900 rounded-3xl overflow-hidden flex flex-col">
            <div className="relative h-80 bg-gray-200">
              <img 
                src="https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&q=80&w=1000" 
                alt="Tacos" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 left-6 bg-orange-500 text-navy-900 font-bold text-xs font-mono px-4 py-2 rounded-full border-2 border-navy-900 flex items-center gap-2 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
                <span className="w-2 h-2 rounded-full bg-navy-900"></span>
                The Crew's Choice
              </div>
            </div>
            <div className="p-8 flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-bold mb-2">Taco Loco</h2>
                <p className="text-lg font-bold text-navy-900/80">Mexican • Tacos <span className="text-navy-900/40">/</span> 4.8 ★ (286 reviews)</p>
              </div>
              <div className="text-2xl font-bold tracking-widest">$$</div>
            </div>
          </div>

          {/* Dinner Plan Info */}
          <div className="bg-[#EAE6D6] border-2 border-navy-900 rounded-3xl p-8 space-y-6">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60">Your Dinner Plan</div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 font-bold">
                <MapPin size={24} />
                <span>124 Valencia St • 8 min walk</span>
              </div>
              <div className="flex items-center gap-4 font-bold">
                <Clock size={24} />
                <span>Open until 10 pm • $15-30 per person</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button className="w-full bg-orange-500 border-2 border-navy-900 rounded-2xl h-20 flex items-center justify-between px-8 text-2xl font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all">
            <span>Let's Eat</span>
            <Navigation size={32} />
          </button>
          
          <div className="flex justify-center items-center gap-8 text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60">
            <button className="hover:text-navy-900 flex items-center gap-2">Open Directions ↗</button>
            <span className="text-navy-900/20">/</span>
            <button onClick={() => navigate('/')} className="hover:text-navy-900 flex items-center gap-2">Play Again ↻</button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 flex flex-col gap-6">
          {/* Unanimous Crew */}
          <div className="bg-white border-2 border-navy-900 rounded-3xl p-6">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-6">Unanimous Crew</div>
            <div className="flex justify-between items-center">
              {players.map(player => (
                <div key={player.name} className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full border-2 border-navy-900 flex items-center justify-center font-bold text-lg ${player.color} text-navy-900 uppercase`}>
                    {player.name[0]}
                  </div>
                  <span className="text-xs font-bold">{player.name}</span>
                </div>
              ))}
              <div className="bg-navy-900 text-green-400 rounded-2xl px-4 py-3 font-mono font-bold text-lg flex items-center gap-2 border-2 border-navy-900 ml-2">
                {totalCount}/{totalCount} ✓
              </div>
            </div>
          </div>

          {/* Room Stats */}
          <div className="bg-[#EAE6D6] border-2 border-navy-900 rounded-3xl p-6">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-6">Room Stats</div>
            <div className="space-y-4 font-mono text-sm font-bold">
              <div className="flex justify-between">
                <span>Players</span>
                <span>{totalCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Votes</span>
                <span>{totalCount}/{totalCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Consensus</span>
                <span className="text-orange-500">UNANIMOUS</span>
              </div>
              <div className="flex justify-between">
                <span>Walk time</span>
                <span>8 min</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border-2 border-navy-900 rounded-3xl p-6">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-6">Quick Actions</div>
            <div className="space-y-4">
              <button className="w-full bg-green-400 border-2 border-navy-900 rounded-xl py-4 px-6 font-bold flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all">
                <Navigation size={20} />
                Open directions
              </button>
              <button onClick={() => navigate('/')} className="w-full bg-orange-500 border-2 border-navy-900 rounded-xl py-4 px-6 font-bold flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all">
                <RotateCcw size={20} />
                Play again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
