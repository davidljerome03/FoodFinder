import { useCallback, useEffect, useState } from 'react'
import { useLobbySocket } from './useLobbySocket'
import { Check, Copy, CheckCircle2, MapPin, Clock, Navigation, RotateCcw, Plus, X } from 'lucide-react'

const SESSION_KEY = 'food-finder-lobby-member'
const prices = ['$', '$$', '$$$', '$$$$']
const defaultCuisines = ['Mexican', 'Italian', 'Sushi', 'Burgers', 'Thai', 'Pizza', 'Seafood', 'Anything']
const defaultLocation = { lat: 28.5383, lng: -81.3792 }
const fallbackImage = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1000'

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

function getDirectionsUrl(restaurant) {
  if (!restaurant) return 'https://www.google.com/maps'
  if (restaurant.coordinates?.lat && restaurant.coordinates?.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${restaurant.coordinates.lat},${restaurant.coordinates.lng}`
  }
  if (restaurant.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name || 'restaurants')}`
}

// -------------------------------------------------------------
// SCREEN 1: HOME / ENTRY SCREEN (Mobile-First)
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
            lng: position.coords.longitude,
          })
        },
        () => {}
      )
    }
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), group_location: location }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail?.message || data.detail || 'Could not create lobby.')
      onJoin({
        lobbyCode: data.lobby_code,
        memberId: data.member_id,
        memberToken: data.member_token,
        name: name.trim(),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    if (!name.trim() || !code.trim()) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/lobbies/${encodeURIComponent(code.trim().toUpperCase())}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail?.message || data.detail || 'Could not join lobby.')
      onJoin({
        lobbyCode: data.lobby_code,
        memberId: data.member_id,
        memberToken: data.member_token,
        name: name.trim(),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-background text-navy-900 font-sans">
      <div className="w-full max-w-md bg-card rounded-2xl border-2 border-navy-900 p-6 sm:p-8 space-y-6 sm:space-y-8 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-navy-900 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[2px_2px_0px_0px_rgba(255,90,54,1)]">
              FF
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-1">Food Finder</h1>
          <p className="text-xs font-mono text-navy-900/60 uppercase tracking-widest">Group Dining Consensus</p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border-2 border-red-500 rounded-xl text-red-700 text-sm font-bold">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-navy-900 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-navy-900 bg-white focus:outline-none focus:border-orange-500 font-medium text-lg"
              placeholder="e.g. Alex"
              maxLength={30}
            />
          </div>

          <div className="pt-2 space-y-4">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim() || busy}
              className="w-full bg-orange-500 disabled:opacity-50 text-navy-900 border-2 border-navy-900 font-bold py-3.5 sm:py-4 rounded-xl transition-transform shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none text-lg"
            >
              {busy ? 'Creating Room...' : 'Create New Room'}
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t-2 border-navy-900/10"></div>
              <span className="flex-shrink-0 mx-4 text-navy-900/40 text-xs font-mono uppercase font-bold">Or Join Room</span>
              <div className="flex-grow border-t-2 border-navy-900/10"></div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full px-3 py-3 rounded-xl border-2 border-navy-900 bg-white focus:outline-none focus:border-green-400 uppercase text-center font-mono font-bold text-xl tracking-widest"
                placeholder="CODE"
              />
              <button
                type="button"
                onClick={handleJoin}
                disabled={!name.trim() || !code.trim() || busy}
                className="px-5 sm:px-6 bg-green-400 disabled:opacity-50 text-navy-900 border-2 border-navy-900 font-bold rounded-xl transition-transform shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none text-lg"
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
// SCREEN 2: LOBBY SCREEN (Preferences Phase - Mobile First)
// -------------------------------------------------------------
function PreferencesScreen({ lobby, session, connection, send, onLeave }) {
  const [selectedPrice, setSelectedPrice] = useState('$$')
  const [selectedCuisines, setSelectedCuisines] = useState([])
  const [customInput, setCustomInput] = useState('')
  const [availableCuisines, setAvailableCuisines] = useState(defaultCuisines)

  const me = lobby?.members?.find((m) => m.id === session.memberId)
  const isHost = lobby?.host_id === session.memberId
  const canAct = connection === 'connected'

  // Input Handling & Deselection with normalization
  const toggleCuisine = (cuisine) => {
    const raw = cuisine.trim()
    const norm = raw.toLowerCase()

    if (norm === 'anything') {
      // Toggle wildcard state: if active, deselect; otherwise, select ONLY Anything
      if (selectedCuisines.some((c) => c.toLowerCase() === 'anything')) {
        setSelectedCuisines([])
      } else {
        setSelectedCuisines(['Anything'])
      }
      return
    }

    // Selecting a specific cuisine removes the 'Anything' wildcard
    const withoutAnything = selectedCuisines.filter((c) => c.toLowerCase() !== 'anything')
    const exists = withoutAnything.some((c) => c.toLowerCase() === norm)

    if (exists) {
      // Successfully deselects the cuisine
      setSelectedCuisines(withoutAnything.filter((c) => c.toLowerCase() !== norm))
    } else {
      setSelectedCuisines([...withoutAnything, raw])
    }
  }

  // Custom text input for cuisines that normalizes input
  const handleAddCustomCuisine = (e) => {
    e?.preventDefault?.()
    const trimmed = customInput.trim()
    if (!trimmed) return

    // Normalize: capitalize each word for display
    const normalizedDisplay = trimmed
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    const normLower = normalizedDisplay.toLowerCase()

    // Add to available list if not present
    if (!availableCuisines.some((c) => c.toLowerCase() === normLower)) {
      setAvailableCuisines([normalizedDisplay, ...availableCuisines])
    }

    // Automatically select it (clearing Anything wildcard)
    const withoutAnything = selectedCuisines.filter((c) => c.toLowerCase() !== 'anything')
    if (!withoutAnything.some((c) => c.toLowerCase() === normLower)) {
      setSelectedCuisines([...withoutAnything, normalizedDisplay])
    }
    setCustomInput('')
  }

  const handleLockIn = () => {
    send('submit_preferences', {
      desired_cuisines: selectedCuisines,
      vetoed_cuisines: [],
      max_price: selectedPrice,
    })
  }

  const submittedCount = lobby.members.filter((m) => m.has_submitted).length
  const totalCount = lobby.members.length
  const readyPercentage = totalCount === 0 ? 0 : (submittedCount / totalCount) * 100

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-4 sm:p-6 pb-24">
      {/* Mobile-Responsive Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center text-white font-bold">FF</div>
            <div>
              <h1 className="text-xl font-bold leading-none">food finder</h1>
              <p className="text-[10px] font-mono tracking-widest uppercase text-navy-900/60 mt-1">Group Consensus</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLeave}
            className="sm:hidden text-xs font-mono uppercase text-navy-900/60 border border-navy-900/20 px-3 py-1.5 rounded-lg"
          >
            Leave
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-3 py-1 bg-white">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-xs font-bold font-mono tracking-wider">
              {submittedCount}/{totalCount} READY
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 bg-navy-900 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl">
            <span className="text-[11px] font-mono uppercase text-white/60 hidden sm:inline">Room</span>
            <span className="text-lg sm:text-xl font-bold text-green-400 tracking-widest font-mono">{lobby.lobby_code}</span>
            <Copy
              size={16}
              className="text-white/60 cursor-pointer hover:text-white"
              onClick={() => navigator.clipboard.writeText(lobby.lobby_code)}
            />
          </div>

          <button
            type="button"
            onClick={onLeave}
            className="hidden sm:inline-block text-xs font-mono uppercase text-navy-900/60 hover:text-navy-900 border border-navy-900/20 px-3 py-1.5 rounded-lg"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main Container - Stacks Vertically on Mobile */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
        <div className="flex-1 border-2 border-navy-900 rounded-3xl p-5 sm:p-8 flex flex-col relative bg-card shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
          <div className="mb-6">
            <div className="text-xs font-mono font-bold tracking-widest text-navy-900/60 uppercase mb-1">
              Step 1 of 2
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Set your mood.</h1>
            <p className="text-sm sm:text-base text-navy-900/70 mt-1">
              Choose your budget and cravings before the group votes.
            </p>
          </div>

          <div className="space-y-6">
            {/* The Hungry Crew */}
            <div>
              <div className="flex justify-between text-xs font-mono font-bold tracking-widest uppercase mb-3 text-navy-900/60">
                <span>The Crew ({totalCount})</span>
                <span>{submittedCount} Ready</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {lobby.members.map((member) => (
                  <div key={member.id} className="bg-white border-2 border-navy-900 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full border-2 border-navy-900 flex items-center justify-center font-bold text-sm bg-orange-500 text-navy-900 uppercase">
                        {member.name[0]}
                      </div>
                      <div className="font-bold text-sm">
                        {member.name} {member.id === session.memberId && '(You)'}
                      </div>
                    </div>
                    {member.has_submitted ? (
                      <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                    ) : (
                      <span className="text-xs font-mono text-navy-900/40">Thinking...</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Price Selection */}
            <div className={me?.has_submitted ? 'opacity-50 pointer-events-none' : ''}>
              <div className="flex justify-between text-xs font-mono font-bold tracking-widest uppercase mb-2 text-navy-900/60">
                <span>Budget</span>
                <span>{selectedPrice === '$' ? '< $15' : selectedPrice === '$$' ? '$15-30' : selectedPrice === '$$$' ? '$30-50' : '> $50'}</span>
              </div>
              <div className="flex border-2 border-navy-900 rounded-xl overflow-hidden bg-white h-12 sm:h-14">
                {prices.map((price) => (
                  <button
                    type="button"
                    key={price}
                    onClick={() => setSelectedPrice(price)}
                    className={`flex-1 font-bold text-lg sm:text-xl border-r-2 border-navy-900 last:border-r-0 transition-colors
                      ${selectedPrice === price ? 'bg-orange-500 text-navy-900' : 'hover:bg-navy-900/5'}
                    `}
                  >
                    {price}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuisines Grid */}
            <div className={me?.has_submitted ? 'opacity-50 pointer-events-none' : ''}>
              <div className="flex justify-between items-center text-xs font-mono font-bold tracking-widest uppercase mb-2 text-navy-900/60">
                <span>Cravings</span>
                <span>{selectedCuisines.length} Selected</span>
              </div>

              {/* Custom Cuisine Input */}
              <form onSubmit={handleAddCustomCuisine} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Add custom craving (e.g. Ramen, Halal)"
                  className="flex-1 px-3 py-2 text-sm rounded-xl border-2 border-navy-900 bg-white focus:outline-none focus:border-orange-500 font-medium"
                  maxLength={30}
                />
                <button
                  type="submit"
                  disabled={!customInput.trim()}
                  className="px-4 py-2 bg-orange-500 disabled:opacity-40 text-navy-900 font-bold text-xs uppercase font-mono border-2 border-navy-900 rounded-xl flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]"
                >
                  <Plus size={16} /> Add
                </button>
              </form>

              {/* Cuisine Selection Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {availableCuisines.map((cuisine) => {
                  const isWildcard = cuisine.toLowerCase() === 'anything'
                  const isSelected = selectedCuisines.some((c) => c.toLowerCase() === cuisine.toLowerCase())

                  return (
                    <button
                      type="button"
                      key={cuisine}
                      onClick={(e) => {
                        e.preventDefault()
                        toggleCuisine(cuisine)
                      }}
                      className={`h-12 sm:h-13 rounded-xl border-2 border-navy-900 font-bold text-sm sm:text-base flex items-center justify-center gap-2 px-3 transition-all
                        ${isSelected
                          ? isWildcard
                            ? 'bg-green-400 text-navy-900 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] font-extrabold'
                            : 'bg-green-400 text-navy-900 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]'
                          : isWildcard
                            ? 'bg-white border-dashed text-orange-600 hover:bg-orange-50'
                            : 'bg-white hover:bg-orange-50/50'
                        }
                      `}
                    >
                      {isSelected ? <Check size={18} className="shrink-0" /> : <span className="text-navy-900/40 text-lg leading-none">+</span>}
                      <span className="truncate">{cuisine}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8 pt-4 border-t-2 border-navy-900/10">
            {isHost && submittedCount === totalCount ? (
              <button
                type="button"
                onClick={() => send('start_voting')}
                disabled={!canAct}
                className="w-full bg-green-400 border-2 border-navy-900 rounded-xl py-4 flex items-center justify-center gap-3 text-xl font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-transform"
              >
                <span>Everyone Ready! Start Voting</span>
                <Check size={24} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLockIn}
                disabled={!canAct || me?.has_submitted}
                className={`w-full border-2 border-navy-900 rounded-xl py-4 flex items-center justify-center gap-3 text-xl font-bold transition-transform
                  ${me?.has_submitted
                    ? 'bg-green-400/80 text-navy-900 cursor-default'
                    : 'bg-orange-500 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px]'
                  }
                `}
              >
                <span>{me?.has_submitted ? 'Locked In! Waiting for crew...' : 'Lock In Choices'}</span>
                <Check size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Info Card */}
        <div className="w-full lg:w-80 flex flex-col gap-4 sm:gap-6">
          <div className="bg-navy-900 text-white rounded-2xl p-5 border-2 border-navy-900 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-white/60 mb-1">Invite Friends</div>
            <p className="text-xs text-white/80 mb-3">Share this code with your dining crew:</p>
            <div className="flex items-center justify-between bg-white/10 px-4 py-3 rounded-xl">
              <span className="text-3xl font-bold text-green-400 tracking-widest font-mono">{lobby.lobby_code}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(lobby.lobby_code)}
                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <Copy size={20} className="text-white" />
              </button>
            </div>
          </div>

          <div className="bg-card border-2 border-navy-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-3">Group Progress</div>
            <div className="h-4 border-2 border-navy-900 rounded-full overflow-hidden bg-white mb-3">
              <div
                className="h-full bg-green-400 border-r-2 border-navy-900 transition-all duration-500"
                style={{ width: `${readyPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs font-mono font-bold text-navy-900/80">
              {submittedCount === totalCount ? 'All players locked in!' : `${submittedCount} of ${totalCount} players ready.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// SCREEN 3: GAME / VOTING SCREEN (Mobile-First + Images & Address)
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
    <div className="min-h-screen bg-background text-navy-900 font-sans p-4 sm:p-6 pb-20">
      <header className="flex justify-between items-center mb-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center text-white font-bold">FF</div>
          <div>
            <h1 className="text-xl font-bold leading-none">food finder</h1>
            <p className="text-[10px] font-mono tracking-widest uppercase text-navy-900/60 mt-1">Voting Live</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-3 py-1 bg-white">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-xs font-bold font-mono tracking-wider uppercase">Vote Now</span>
          </div>
          {isHost && (
            <button
              type="button"
              onClick={() => send('finish_voting')}
              className="text-xs font-mono uppercase bg-navy-900 text-white px-3 py-1.5 rounded-lg border-2 border-navy-900"
            >
              Finish Early
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto text-center mb-6 sm:mb-8">
        <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-1">
          Final Round
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-2">Cast your vote.</h1>
        <p className="text-sm sm:text-lg text-navy-900/80">
          Tap the restaurant you want to eat at the most.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {candidates.map((restaurant) => {
          const isVoted = votedId === restaurant.id
          const imageSrc = restaurant.image_url || restaurant.image || fallbackImage

          return (
            <button
              type="button"
              key={restaurant.id}
              onClick={() => handleVote(restaurant.id)}
              disabled={!canAct || votedId !== null}
              className={`text-left flex flex-col bg-card border-2 rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300
                ${isVoted
                  ? 'border-orange-500 shadow-[6px_6px_0px_0px_rgba(255,90,54,1)] translate-x-[-2px] translate-y-[-2px]'
                  : votedId !== null
                    ? 'border-navy-900 opacity-50 grayscale'
                    : 'border-navy-900 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px]'
                }
              `}
            >
              {/* Restaurant Image Rendering */}
              <div className="h-48 sm:h-56 w-full bg-gray-200 relative overflow-hidden">
                <img
                  src={imageSrc}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute top-3 right-3 bg-card border-2 border-navy-900 px-3 py-1 rounded-full font-bold text-xs shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
                  {restaurant.price || '$$'}
                </div>

                {isVoted && (
                  <div className="absolute inset-0 bg-orange-500/30 flex items-center justify-center backdrop-blur-xs">
                    <div className="bg-orange-500 text-navy-900 font-extrabold px-6 py-2.5 rounded-full border-2 border-navy-900 text-lg shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] rotate-[-6deg]">
                      Your Pick!
                    </div>
                  </div>
                )}
              </div>

              {/* Restaurant Details with Address */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-1 leading-tight">{restaurant.name}</h2>
                  <p className="text-xs sm:text-sm font-bold text-orange-600 mb-2">
                    {restaurant.cuisines?.join(' • ')}
                  </p>
                </div>

                {/* Human-Readable Address */}
                {restaurant.address && (
                  <div className="flex items-start gap-1.5 text-xs text-navy-900/70 font-medium pt-2 border-t border-navy-900/10">
                    <MapPin size={14} className="shrink-0 mt-0.5 text-orange-500" />
                    <span className="line-clamp-2">{restaurant.address}</span>
                  </div>
                )}

                {/* Algorithm Score & Weights */}
                {restaurant._debug_stats && (
                  <div className="mt-2.5 text-[11px] font-mono font-bold bg-navy-900/5 px-2.5 py-1.5 rounded-lg text-navy-900/80 flex items-center justify-between border border-navy-900/10">
                    <span className="text-orange-600">Score: {restaurant._debug_stats.final_score}</span>
                    <span>+{restaurant._debug_stats.match_score} match / -{restaurant._debug_stats.distance_penalty} dist</span>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// SCREEN 4: WINNER / RESULTS SCREEN (Action Links & Play Again)
// -------------------------------------------------------------
function ResultsScreen({ lobby, session, onLeave, send }) {
  const winner = lobby?.winner
  const totalCount = lobby?.members?.length || 0
  const winnerImage = winner?.image_url || winner?.image || fallbackImage
  const directionsUrl = getDirectionsUrl(winner)

  const handlePlayAgain = () => {
    // Emits WebSocket event to clear backend lobby data and start a new round
    if (send) {
      send('play_again', {})
    } else {
      onLeave()
    }
  }

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-4 sm:p-6 pb-20">
      <header className="flex justify-between items-center mb-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center text-white font-bold">FF</div>
          <div>
            <h1 className="text-xl font-bold leading-none">food finder</h1>
            <p className="text-[10px] font-mono tracking-widest uppercase text-navy-900/60 mt-1">Consensus Reached</p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-3 py-1 bg-white">
          <span className="text-xs font-bold font-mono tracking-wider uppercase">Room {lobby.lobby_code}</span>
        </div>
      </header>

      {/* Main Container - Stacks on Mobile */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
        <div className="flex-1 space-y-5">
          <div className="bg-green-400 border-2 border-navy-900 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-xs font-mono font-bold tracking-widest uppercase mb-2">
              <span className="text-orange-500">★</span> ROOM {lobby.lobby_code} WINNER <span className="text-orange-500">★</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-2 tracking-tight">Dinner, decided.</h1>
            <p className="text-sm sm:text-base font-bold text-navy-900/80">
              The group has spoken! Here is your winning restaurant:
            </p>
          </div>

          {/* Winner Card with Live Image & Address */}
          <div className="bg-card border-2 border-navy-900 rounded-3xl overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="relative h-60 sm:h-80 bg-gray-200">
              <img
                src={winnerImage}
                alt={winner?.name || 'Winner'}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-orange-500 text-navy-900 font-bold text-xs font-mono px-3 py-1.5 rounded-full border-2 border-navy-900 flex items-center gap-1.5 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
                <span className="w-2 h-2 rounded-full bg-navy-900"></span>
                Top Pick
              </div>
            </div>

            <div className="p-5 sm:p-8 flex justify-between items-start gap-4">
              <div>
                <h2 className="text-2xl sm:text-4xl font-bold mb-1">{winner?.name || 'Selected Restaurant'}</h2>
                <p className="text-sm sm:text-lg font-bold text-orange-600 mb-2">{winner?.cuisines?.join(' • ')}</p>
                {winner?.address && (
                  <p className="text-xs sm:text-sm text-navy-900/70 font-medium flex items-center gap-1.5">
                    <MapPin size={16} className="text-orange-500 shrink-0" />
                    <span>{winner.address}</span>
                  </p>
                )}
                {winner?._debug_stats && (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-mono font-bold bg-navy-900/5 px-2.5 py-1.5 rounded-lg border border-navy-900/10 text-navy-900/80">
                    <span className="text-orange-600">Score: {winner._debug_stats.final_score}</span>
                    <span>(+{winner._debug_stats.match_score} match / -{winner._debug_stats.distance_penalty} dist)</span>
                  </div>
                )}
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-widest bg-white border-2 border-navy-900 px-3 py-1 rounded-xl">
                {winner?.price || '$$'}
              </div>
            </div>
          </div>

          {/* Action Buttons with Google Maps Deep Link */}
          <div className="space-y-3">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-orange-500 border-2 border-navy-900 rounded-2xl h-16 sm:h-18 flex items-center justify-between px-6 sm:px-8 text-xl sm:text-2xl font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-transform text-navy-900"
            >
              <span>Let's Eat (Get Directions)</span>
              <Navigation size={28} />
            </a>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2 text-xs font-mono font-bold tracking-widest uppercase text-navy-900/70">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-navy-900 flex items-center gap-1.5 underline underline-offset-4"
              >
                Open in Google Maps ↗
              </a>
              <span className="hidden sm:inline text-navy-900/30">•</span>
              <button
                type="button"
                onClick={handlePlayAgain}
                className="hover:text-navy-900 flex items-center gap-1.5 px-4 py-2 bg-green-400 border-2 border-navy-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[2px] active:translate-y-[2px]"
              >
                <RotateCcw size={14} /> Play Again (New Round)
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="w-full lg:w-80 flex flex-col gap-4 sm:gap-6">
          <div className="bg-white border-2 border-navy-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-3">The Crew</div>
            <div className="flex flex-wrap gap-3 items-center">
              {lobby?.members?.map((player) => (
                <div key={player.id} className="flex items-center gap-2 bg-card border border-navy-900 px-3 py-1.5 rounded-full">
                  <div className="w-6 h-6 rounded-full border border-navy-900 flex items-center justify-center font-bold text-xs bg-orange-500 text-navy-900 uppercase">
                    {player.name[0]}
                  </div>
                  <span className="text-xs font-bold">{player.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border-2 border-navy-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-3">Round Summary</div>
            <div className="space-y-2 font-mono text-xs font-bold">
              <div className="flex justify-between py-1 border-b border-navy-900/10">
                <span>Total Voters</span>
                <span>{totalCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-900/10">
                <span>Votes Cast</span>
                <span>{lobby?.votes_submitted} / {lobby?.votes_expected}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Consensus Status</span>
                <span className="text-orange-500">COMPLETE</span>
              </div>
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
  const lobbyExpired = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    onLeave()
  }, [onLeave])

  const { lobby, connection, error, clearError, send } = useLobbySocket({
    ...session,
    onLobbyExpired: lobbyExpired,
  })

  if (!lobby) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-navy-900 font-sans">
        <h1 className="text-3xl font-bold mb-2">Joining room...</h1>
        <p className="text-navy-900/60">
          {connection === 'reconnecting' ? 'Reconnecting to your group...' : 'Connecting to server...'}
        </p>
        {error && <p className="text-red-500 mt-4 font-bold">{error}</p>}
      </div>
    )
  }

  if (lobby.phase === 'voting') {
    return <VotingScreen lobby={lobby} session={session} connection={connection} send={send} />
  }

  if (lobby.phase === 'results') {
    return <ResultsScreen lobby={lobby} session={session} onLeave={onLeave} send={send} />
  }

  return (
    <PreferencesScreen
      lobby={lobby}
      session={session}
      connection={connection}
      send={send}
      onLeave={onLeave}
    />
  )
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
