import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (!displayName) return;
    // In real app: call API to generate room code
    const mockRoomCode = 'TACO';
    navigate(`/lobby/${mockRoomCode}`, { state: { displayName } });
  };

  const handleJoinRoom = () => {
    if (!displayName || !joinCode) return;
    navigate(`/lobby/${joinCode.toUpperCase()}`, { state: { displayName } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-card rounded-2xl border-2 border-navy-900 p-8 space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/favicon.svg"
              alt="Food Finder Logo"
              className="w-12 h-12 rounded-xl object-contain shadow-[2px_2px_0px_0px_rgba(255,90,54,1)]"
            />
          </div>
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Food Finder</h1>
          <p className="text-sm font-mono text-black/60 uppercase tracking-wider">Group Dining Consensus</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-navy-900 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-navy-900 bg-white focus:outline-none focus:border-orange-500 font-medium"
              placeholder="e.g. Alex"
            />
          </div>

          <div className="pt-2 space-y-4">
            <button
              onClick={handleCreateRoom}
              disabled={!displayName}
              className="w-full bg-orange-500 disabled:opacity-50 text-navy-900 border-2 border-navy-900 font-bold py-4 rounded-xl transition-colors shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              Create Room
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t-2 border-navy-900/10"></div>
              <span className="flex-shrink-0 mx-4 text-navy-900/40 text-xs font-mono uppercase font-bold">Or</span>
              <div className="flex-grow border-t-2 border-navy-900/10"></div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                maxLength={4}
                className="w-full px-4 py-3 rounded-xl border-2 border-navy-900 bg-white focus:outline-none focus:border-green-400 uppercase text-center font-mono font-bold text-xl tracking-widest"
                placeholder="CODE"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!displayName || joinCode.length !== 4}
                className="px-6 bg-green-400 disabled:opacity-50 text-navy-900 border-2 border-navy-900 font-bold rounded-xl transition-colors shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
