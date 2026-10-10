import { useCallback, useEffect, useState } from 'react'
import { useLobbySocket } from './useLobbySocket'
import { Check, Copy, CheckCircle2, MapPin, Clock, Navigation, RotateCcw } from 'lucide-react'

const SESSION_KEY = 'food-finder-lobby-member'
const prices = ['$', '$$', '$$$', '$$$$']
const cuisines = ['Mexican', 'Italian', 'Sushi', 'Burgers', 'Thai', 'Anything']
const defaultLocation = { lat: 28.5383, lng: -81.3792 }

function loadSession() { 
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } 
  catch { return null } 
}

// -------------------------------------------------------------
// SCREEN 1: HOME / ENTRY SCREEN
// -------------------------------------------------------------
function EntryScreen({ onJoin }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [location, setLocation] = useState(defaultLocation)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        () => {}
      )
    }
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), group_location: location })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail?.message || data.detail || 'Could not create lobby.')
      onJoin({ lobbyCode: data.lobby_code, memberId: data.member_id, memberToken: data.member_token, name: name.trim() })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    if (!name.trim() || !code.trim()) return
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/lobbies/${encodeURIComponent(code.trim().toUpperCase())}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail?.message || data.detail || 'Could not join lobby.')
      onJoin({ lobbyCode: data.lobby_code, memberId: data.member_id, memberToken: data.member_token, name: name.trim() })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-navy-900 font-sans">
      <div className="w-full max-w-md bg-card rounded-2xl border-2 border-navy-900 p-8 space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center text-white font-bold">FF</div>
          </div>
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Food Finder</h1>
          <p className="text-sm font-mono text-black/60 uppercase tracking-wider">Group Dining Consensus</p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border-2 border-red-500 rounded-xl text-red-700 text-sm font-bold">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-navy-900 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-navy-900 bg-white focus:outline-none focus:border-orange-500 font-medium"
              placeholder="Enter your name"
            />
          </div>

          <div className="pt-2 space-y-4">
            <button
              onClick={handleCreate}
              disabled={!name.trim() || busy}
              className="w-full bg-orange-500 disabled:opacity-50 text-navy-900 border-2 border-navy-900 font-bold py-4 rounded-xl transition-colors shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              {busy ? 'Creating...' : 'Create Room'}
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t-2 border-navy-900/10"></div>
              <span className="flex-shrink-0 mx-4 text-navy-900/40 text-xs font-mono uppercase font-bold">Or</span>
              <div className="flex-grow border-t-2 border-navy-900/10"></div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl border-2 border-navy-900 bg-white focus:outline-none focus:border-green-400 uppercase text-center font-mono font-bold text-xl tracking-widest"
                placeholder="CODE"
              />
              <button
                onClick={handleJoin}
                disabled={!name.trim() || !code.trim() || busy}
                className="px-6 bg-green-400 disabled:opacity-50 text-navy-900 border-2 border-navy-900 font-bold rounded-xl transition-colors shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// SCREEN 2: LOBBY SCREEN (Preferences Phase)
// -------------------------------------------------------------
function PreferencesScreen({ lobby, session, connection, send, onLeave }) {
  const [selectedPrice, setSelectedPrice] = useState('$$')
  const [selectedCuisines, setSelectedCuisines] = useState([])
  
  const me = lobby?.members?.find((m) => m.id === session.memberId)
  const isHost = lobby?.host_id === session.memberId
  const canAct = connection === 'connected'

  const toggleCuisine = (cuisine) => {
    if (selectedCuisines.includes(cuisine)) {
      setSelectedCuisines(selectedCuisines.filter((c) => c !== cuisine))
    } else {
      setSelectedCuisines([...selectedCuisines, cuisine])
    }
  }

  const handleLockIn = () => {
    send('submit_preferences', {
      desired_cuisines: selectedCuisines,
      vetoed_cuisines: [],
      max_price: selectedPrice
    })
  }

  const submittedCount = lobby.members.filter((m) => m.has_submitted).length
  const totalCount = lobby.members.length
  const readyPercentage = totalCount === 0 ? 0 : (submittedCount / totalCount) * 100

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-6">
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
            <span className="text-xl font-bold text-green-400 tracking-widest">{lobby.lobby_code}</span>
            <Copy size={16} className="text-white/60 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(lobby.lobby_code)} />
          </div>
          <button onClick={onLeave} className="text-xs font-mono uppercase text-navy-900/60 hover:text-navy-900 border border-navy-900/20 px-3 py-1 rounded-lg">
            Leave
          </button>
        </div>
      </header>

      <div className="flex gap-6 max-w-7xl mx-auto h-[calc(100vh-120px)]">
        <div className="flex-1 border-2 border-navy-900 border-dashed rounded-3xl p-8 flex flex-col relative overflow-hidden bg-white/30">
          <div className="mb-8">
            <h2 className="text-xs font-mono font-bold tracking-widest text-navy-900/60 uppercase mb-2">Dinner Crew / {totalCount} Connected</h2>
            <h1 className="text-5xl font-bold mb-2 tracking-tight">Set the table.</h1>
            <p className="text-lg text-navy-900/60">A little mood-setting before the menu.</p>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 space-y-8 pb-32">
            <div>
              <div className="flex justify-between text-xs font-mono font-bold tracking-widest uppercase mb-4 text-navy-900/60">
                <span>The Hungry Crew</span>
                <span>{submittedCount} / {totalCount} Ready</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {lobby.members.map((member) => (
                  <div key={member.id} className="bg-card border-2 border-navy-900 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full border-2 border-navy-900 flex items-center justify-center font-bold text-lg bg-orange-500 text-navy-900 uppercase">
                        {member.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-lg">{member.name} {member.id === session.memberId && '(You)'}</div>
                        <div className="text-sm text-navy-900/60">
                          {member.has_submitted ? 'Ready to eat' : 'Choosing...'}
                        </div>
                      </div>
                    </div>
                    {member.has_submitted && <CheckCircle2 className="text-green-500" size={24} />}
                  </div>
                ))}
              </div>
            </div>

            <div className={me?.has_submitted ? 'opacity-50 pointer-events-none' : ''}>
              <div className="flex justify-between text-xs font-mono font-bold tracking-widest uppercase mb-4 text-navy-900/60">
                <span>01 / Price Range</span>
                <span>{selectedPrice === '$' ? '< $15' : selectedPrice === '$$' ? '$15-30' : selectedPrice === '$$$' ? '$30-50' : '> $50'} / person</span>
              </div>
              <div className="flex border-2 border-navy-900 rounded-2xl overflow-hidden bg-card h-16">
                {prices.map((price) => (
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

            <div className={me?.has_submitted ? 'opacity-50 pointer-events-none' : ''}>
              <div className="text-xs font-mono font-bold tracking-widest uppercase mb-4 text-navy-900/60">
                02 / What are you craving?
              </div>
              <div className="grid grid-cols-2 gap-4">
                {cuisines.map((cuisine) => {
                  const isSelected = selectedCuisines.includes(cuisine)
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
                  )
                })}
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 pt-12 bg-gradient-to-t from-[#F0ECE1] via-[#F0ECE1] to-transparent">
            {isHost && submittedCount === totalCount ? (
              <button 
                onClick={() => send('start_voting')}
                disabled={!canAct}
                className="w-full bg-green-400 border-2 border-navy-900 rounded-2xl h-20 flex items-center justify-between px-8 text-2xl font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <span>Everyone is ready! Start Voting</span>
                <Check size={32} />
              </button>
            ) : (
              <button 
                onClick={handleLockIn}
                disabled={!canAct || me?.has_submitted}
                className={`w-full border-2 border-navy-900 rounded-2xl h-20 flex items-center justify-between px-8 text-2xl font-bold transition-all
                  ${me?.has_submitted 
                    ? 'bg-green-400 opacity-80 cursor-default' 
                    : 'bg-orange-500 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px]'}
                `}
              >
                <span>{me?.has_submitted ? 'Locked In (Waiting for others)' : 'Lock In'}</span>
                <Check size={32} />
              </button>
            )}
            <p className="text-center text-sm font-mono tracking-tight text-navy-900/60 mt-4">The round starts when everyone is ready.</p>
          </div>
        </div>

        <div className="w-80 flex flex-col gap-6">
          <div className="bg-navy-900 text-white rounded-3xl p-6 border-2 border-navy-900">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-white/60 mb-2">Room Code</div>
            <p className="mb-4">Share with the crew</p>
            <div className="flex items-center gap-4">
              <span className="text-5xl font-bold text-green-400 tracking-widest">{lobby.lobby_code}</span>
              <Copy size={24} className="text-white/60 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(lobby.lobby_code)} />
            </div>
          </div>

          <div className="bg-card border-2 border-navy-900 rounded-3xl p-6 flex-1">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-6">Ready Status</div>
            <div className="h-4 border-2 border-navy-900 rounded-full overflow-hidden bg-white mb-4">
              <div className="h-full bg-green-400 border-r-2 border-navy-900 transition-all duration-500" style={{ width: `${readyPercentage}%` }}></div>
            </div>
            <p className="text-sm">
              {submittedCount === totalCount ? "Everyone is ready!" : `${submittedCount} of ${totalCount} players are ready.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// SCREEN 3: GAME / VOTING SCREEN
// -------------------------------------------------------------
function VotingScreen({ lobby, session, connection, send }) {
  const [votedId, setVotedId] = useState(null)
  const canAct = connection === 'connected'
  const isHost = lobby?.host_id === session.memberId
  const candidates = lobby?.candidates || []

  const handleVote = (id) => {
    setVotedId(id)
    send('cast_vote', { restaurant_id: id })
  }

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-6">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center text-white font-bold">FF</div>
          <div>
            <h1 className="text-xl font-bold leading-none">food finder</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-4 py-1.5 bg-white">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-xs font-bold font-mono tracking-wider uppercase">Voting Live</span>
          </div>
          {isHost && (
            <button 
              onClick={() => send('finish_voting')}
              className="text-xs font-mono uppercase bg-navy-900 text-white px-4 py-2 rounded-xl"
            >
              Finish Early
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto text-center mb-12">
        <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-4">
          Round 1 / 1
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">Cast your vote.</h1>
        <p className="text-xl text-navy-900/80">Tap the restaurant you want to eat at the most.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {candidates.map((restaurant) => (
          <button
            key={restaurant.id}
            onClick={() => handleVote(restaurant.id)}
            disabled={!canAct || votedId !== null}
            className={`text-left flex flex-col bg-card border-2 rounded-3xl overflow-hidden transition-all duration-300
              ${votedId === restaurant.id 
                ? 'border-orange-500 shadow-[8px_8px_0px_0px_rgba(255,90,54,1)] translate-x-[-4px] translate-y-[-4px]' 
                : votedId !== null 
                  ? 'border-navy-900 opacity-50 grayscale'
                  : 'border-navy-900 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]'
              }
            `}
          >
            <div className="h-64 w-full bg-gray-200 relative">
              <img 
                src="https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&q=80&w=1000" 
                alt={restaurant.name} 
                className="w-full h-full object-cover"
              />
              {votedId === restaurant.id && (
                <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-orange-500 text-navy-900 font-bold px-6 py-3 rounded-full border-2 border-navy-900 text-xl shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] rotate-[-10deg]">
                    Voted!
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-bold">{restaurant.name}</h2>
                  <span className="text-xl font-bold tracking-widest">{restaurant.price}</span>
                </div>
                <p className="text-sm font-bold text-navy-900/60 mb-4">
                  {restaurant.cuisines?.join(' • ')}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// SCREEN 4: WINNER / RESULTS SCREEN
// -------------------------------------------------------------
function ResultsScreen({ lobby, session, onLeave }) {
  const winner = lobby?.winner
  const totalCount = lobby?.members?.length || 0

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-6 pb-20">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center text-white font-bold">FF</div>
          <div>
            <h1 className="text-xl font-bold leading-none">food finder</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-4 py-1.5 bg-white">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-xs font-bold font-mono tracking-wider">LIVE / {totalCount.toString().padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-4 py-1.5 bg-white">
            <span className="text-xs font-bold font-mono tracking-wider uppercase">Room {lobby.lobby_code} {totalCount} Players</span>
          </div>
        </div>
      </header>

      <div className="flex gap-6 max-w-7xl mx-auto">
        <div className="flex-1 space-y-6">
          <div className="bg-green-400 border-2 border-navy-900 rounded-3xl p-10 text-center relative overflow-hidden">
            <div className="text-xs font-mono font-bold tracking-widest uppercase mb-4">
              <span className="text-orange-500">✿</span> ROOM {lobby.lobby_code} / PERFECT MATCH <span className="text-orange-500">✿</span>
            </div>
            <h1 className="text-6xl font-bold mb-4 tracking-tight">Dinner, decided.</h1>
            <p className="text-xl font-bold">{totalCount} friends. {totalCount} votes. One very good choice.</p>
          </div>

          <div className="bg-card border-2 border-navy-900 rounded-3xl overflow-hidden flex flex-col">
            <div className="relative h-80 bg-gray-200">
              <img 
                src="https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&q=80&w=1000" 
                alt="Winning food" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 left-6 bg-orange-500 text-navy-900 font-bold text-xs font-mono px-4 py-2 rounded-full border-2 border-navy-900 flex items-center gap-2 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
                <span className="w-2 h-2 rounded-full bg-navy-900"></span>
                The Crew's Choice
              </div>
            </div>
            <div className="p-8 flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-bold mb-2">{winner?.name || 'Selected Restaurant'}</h2>
                <p className="text-lg font-bold text-navy-900/80">{winner?.cuisines?.join(' • ')}</p>
              </div>
              <div className="text-2xl font-bold tracking-widest">{winner?.price || '$$'}</div>
            </div>
          </div>

          <div className="bg-[#EAE6D6] border-2 border-navy-900 rounded-3xl p-8 space-y-6">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60">Your Dinner Plan</div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 font-bold">
                <MapPin size={24} />
                <span>
                  {winner?.coordinates ? `${winner.coordinates.lat.toFixed(4)}, ${winner.coordinates.lng.toFixed(4)}` : 'Coordinates ready'}
                </span>
              </div>
              <div className="flex items-center gap-4 font-bold">
                <Clock size={24} />
                <span>Open for dinner • {winner?.price} tier</span>
              </div>
            </div>
          </div>

          <button className="w-full bg-orange-500 border-2 border-navy-900 rounded-2xl h-20 flex items-center justify-between px-8 text-2xl font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-all">
            <span>Let's Eat</span>
            <Navigation size={32} />
          </button>
          
          <div className="flex justify-center items-center gap-8 text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60">
            <button className="hover:text-navy-900 flex items-center gap-2">Open Directions ↗</button>
            <span className="text-navy-900/20">/</span>
            <button onClick={onLeave} className="hover:text-navy-900 flex items-center gap-2">Play Again ↻</button>
          </div>
        </div>

        <div className="w-96 flex flex-col gap-6">
          <div className="bg-white border-2 border-navy-900 rounded-3xl p-6">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-6">The Crew</div>
            <div className="flex flex-wrap gap-4 items-center">
              {lobby?.members?.map((player) => (
                <div key={player.id} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full border-2 border-navy-900 flex items-center justify-center font-bold text-lg bg-orange-500 text-navy-900 uppercase">
                    {player.name[0]}
                  </div>
                  <span className="text-xs font-bold">{player.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#EAE6D6] border-2 border-navy-900 rounded-3xl p-6">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-6">Room Stats</div>
            <div className="space-y-4 font-mono text-sm font-bold">
              <div className="flex justify-between">
                <span>Players</span>
                <span>{totalCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Votes</span>
                <span>{lobby?.votes_submitted} / {lobby?.votes_expected}</span>
              </div>
              <div className="flex justify-between">
                <span>Consensus</span>
                <span className="text-orange-500">REACHED</span>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-navy-900 rounded-3xl p-6">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-6">Quick Actions</div>
            <div className="space-y-4">
              <button className="w-full bg-green-400 border-2 border-navy-900 rounded-xl py-4 px-6 font-bold flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                <Navigation size={20} />
                Open directions
              </button>
              <button onClick={onLeave} className="w-full bg-orange-500 border-2 border-navy-900 rounded-xl py-4 px-6 font-bold flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                <RotateCcw size={20} />
                Play again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// MAIN CONTAINER
// -------------------------------------------------------------
function LobbyScreen({ session, onLeave }) {
  const lobbyExpired = useCallback(() => { sessionStorage.removeItem(SESSION_KEY); onLeave() }, [onLeave])
  const { lobby, connection, error, clearError, send } = useLobbySocket({ ...session, onLobbyExpired: lobbyExpired })

  if (!lobby) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-navy-900 font-sans">
        <h1 className="text-3xl font-bold mb-2">Joining room...</h1>
        <p className="text-navy-900/60">{connection === 'reconnecting' ? 'Reconnecting to your group...' : 'Connecting to server...'}</p>
        {error && <p className="text-red-500 mt-4 font-bold">{error}</p>}
      </div>
    )
  }

  if (lobby.phase === 'voting') {
    return <VotingScreen lobby={lobby} session={session} connection={connection} send={send} />
  }

  if (lobby.phase === 'results') {
    return <ResultsScreen lobby={lobby} session={session} onLeave={onLeave} />
  }

  return <PreferencesScreen lobby={lobby} session={session} connection={connection} send={send} onLeave={onLeave} />
}

export default function App() {
  const [session, setSession] = useState(loadSession)

  const joinLobby = useCallback((membership) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(membership))
    setSession(membership)
  }, [])

  const leaveLobby = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
  }, [])

  return session ? <LobbyScreen session={session} onLeave={leaveLobby} /> : <EntryScreen onJoin={joinLobby} />
}
