import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Check, Copy, CheckCircle2 } from 'lucide-react';

export default function Lobby() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentUserName = location.state?.displayName || 'Guest';
  
  const [selectedPrice, setSelectedPrice] = useState('$$');
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [isReady, setIsReady] = useState(false);
  
  // Dynamic players list initialized with current user
  const [players, setPlayers] = useState([
    { name: currentUserName, status: 'Choosing...', color: 'bg-orange-500', ready: false }
  ]);

  const toggleCuisine = (cuisine) => {
    if (selectedCuisines.includes(cuisine)) {
      setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
    } else {
      setSelectedCuisines([...selectedCuisines, cuisine]);
    }
  };

  const handleLockIn = () => {
    setIsReady(true);
    setPlayers(players.map(p => p.name === currentUserName ? { ...p, status: 'Ready to eat', ready: true } : p));
    // Simulate navigation when all ready
    setTimeout(() => {
      navigate(`/game/${roomCode}`);
    }, 1500);
  };

  const readyCount = players.filter(p => p.ready).length;
  const totalCount = players.length;
  const readyPercentage = totalCount === 0 ? 0 : (readyCount / totalCount) * 100;

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center text-white font-bold">FF</div>
          <div>
            <h1 className="text-xl font-bold leading-none">food finder</h1>
            <p className="text-[10px] font-mono tracking-widest uppercase text-navy-900/60 mt-1">Group Dining Consensus</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-4 py-1.5 bg-white">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-xs font-bold font-mono tracking-wider">LIVE / {totalCount.toString().padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-3 bg-navy-900 text-white px-6 py-2 rounded-xl">
            <span className="text-xs font-mono uppercase text-white/60">Room Code</span>
            <span className="text-xl font-bold text-green-400 tracking-widest">{roomCode}</span>
            <Copy size={16} className="text-white/60 cursor-pointer hover:text-white" />
          </div>
        </div>
      </header>

      <div className="flex gap-6 max-w-7xl mx-auto h-[calc(100vh-120px)]">
        {/* Main Content Area */}
        <div className="flex-1 border-2 border-navy-900 border-dashed rounded-3xl p-8 flex flex-col relative overflow-hidden bg-white/30">
          <div className="mb-8">
            <h2 className="text-xs font-mono font-bold tracking-widest text-navy-900/60 uppercase mb-2">Dinner Crew / {totalCount} Connected</h2>
            <h1 className="text-5xl font-bold mb-2 tracking-tight">Set the table.</h1>
            <p className="text-lg text-navy-900/60">A little mood-setting before the menu.</p>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 space-y-8 pb-32">
            {/* Players */}
            <div>
              <div className="flex justify-between text-xs font-mono font-bold tracking-widest uppercase mb-4 text-navy-900/60">
                <span>The Hungry Crew</span>
                <span>{readyCount} / {totalCount} Ready</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {players.map(player => (
                  <div key={player.name} className="bg-card border-2 border-navy-900 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full border-2 border-navy-900 flex items-center justify-center font-bold text-lg ${player.color} text-navy-900 uppercase`}>
                        {player.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-lg">{player.name}</div>
                        <div className="text-sm text-navy-900/60">{player.name === currentUserName && !isReady ? 'You - choosing' : player.status}</div>
                      </div>
                    </div>
                    {player.ready && <CheckCircle2 className="text-green-500" size={24} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className={isReady ? 'opacity-50 pointer-events-none' : ''}>
              <div className="flex justify-between text-xs font-mono font-bold tracking-widest uppercase mb-4 text-navy-900/60">
                <span>01 / Price Range</span>
                <span>{selectedPrice === '$' ? '< $15' : selectedPrice === '$$' ? '$15-30' : selectedPrice === '$$$' ? '$30-50' : '> $50'} / person</span>
              </div>
              <div className="flex border-2 border-navy-900 rounded-2xl overflow-hidden bg-card h-16">
                {['$', '$$', '$$$', '$$$$'].map((price) => (
                  <button
                    key={price}
                    onClick={() => setSelectedPrice(price)}
                    className={`flex-1 font-bold text-xl border-r-2 border-navy-900 last:border-r-0 transition-colors
                      ${selectedPrice === price ? 'bg-orange-500 text-navy-900' : 'hover:bg-navy-900/5'}
                    `}
                  >
                    {price}
                  </button>
                ))}
              </div>
            </div>

            {/* Cravings */}
            <div className={isReady ? 'opacity-50 pointer-events-none' : ''}>
              <div className="text-xs font-mono font-bold tracking-widest uppercase mb-4 text-navy-900/60">
                02 / What are you craving?
              </div>
              <div className="grid grid-cols-2 gap-4">
                {['Mexican', 'Italian', 'Sushi', 'Burgers', 'Thai', 'Anything'].map((cuisine) => {
                  const isSelected = selectedCuisines.includes(cuisine);
                  return (
                    <button
                      key={cuisine}
                      onClick={() => toggleCuisine(cuisine)}
                      className={`h-14 rounded-full border-2 border-navy-900 font-bold text-lg flex items-center justify-center gap-2 transition-colors
                        ${isSelected ? 'bg-green-400 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]' : 'bg-card hover:bg-white'}
                      `}
                    >
                      {isSelected ? <Check size={20} /> : <span className="text-navy-900/40 text-2xl leading-none">+</span>}
                      {cuisine}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Bottom Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-8 pt-12 bg-gradient-to-t from-[#F0ECE1] via-[#F0ECE1] to-transparent">
            <button 
              onClick={handleLockIn}
              disabled={isReady}
              className={`w-full border-2 border-navy-900 rounded-2xl h-20 flex items-center justify-between px-8 text-2xl font-bold transition-all
                ${isReady 
                  ? 'bg-green-400 opacity-80 cursor-default' 
                  : 'bg-orange-500 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'}
              `}
            >
              <span>{isReady ? 'Locked In' : 'Lock In'}</span>
              <Check size={32} />
            </button>
            <p className="text-center text-sm font-mono tracking-tight text-navy-900/60 mt-4">The round starts when everyone is ready.</p>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 flex flex-col gap-6">
          <div className="bg-navy-900 text-white rounded-3xl p-6 border-2 border-navy-900">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-white/60 mb-2">Room Code</div>
            <p className="mb-4">Share with the crew</p>
            <div className="flex items-center gap-4">
              <span className="text-5xl font-bold text-green-400 tracking-widest">{roomCode}</span>
              <Copy size={24} className="text-white/60 cursor-pointer hover:text-white" />
            </div>
          </div>

          <div className="bg-card border-2 border-navy-900 rounded-3xl p-6 flex-1">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-6">Ready Status</div>
            <div className="h-4 border-2 border-navy-900 rounded-full overflow-hidden bg-white mb-4">
              <div className={`h-full bg-green-400 border-r-2 border-navy-900 transition-all duration-500`} style={{ width: `${readyPercentage}%` }}></div>
            </div>
            <p className="text-sm">
              {readyCount === totalCount ? "Everyone is ready!" : `${readyCount} of ${totalCount} players are ready. ${isReady ? 'Waiting for others...' : 'You are still choosing.'}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
