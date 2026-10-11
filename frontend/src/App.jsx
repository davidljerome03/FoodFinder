import { useCallback, useEffect, useState, Component } from 'react'
import { useLobbySocket } from './useLobbySocket'
import {
  Check,
  Copy,
  CheckCircle2,
  MapPin,
  Clock,
  Navigation,
  RotateCcw,
  Plus,
  AlertCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Scale,
  Calculator,
  User,
  CornerDownLeft,
  UtensilsCrossed,
} from 'lucide-react'

const SESSION_KEY = 'food-finder-lobby-member'
const prices = ['$', '$$', '$$$', '$$$$']
const defaultCuisines = ['Mexican', 'Italian', 'Sushi', 'Burgers', 'Thai', 'Anything']
const defaultAllergies = ['Gluten / Celiac', 'Dairy / Lactose', 'Peanuts / Nuts', 'Shellfish', 'Vegetarian', 'Vegan']
const defaultLocation = { lat: 28.5383, lng: -81.3792 }
const fallbackImage = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1000'

const CUISINE_FALLBACK_IMAGES = {
  mexican: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=1000',
  tacos: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=1000',
  burrito: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=1000',
  italian: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=1000',
  pasta: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=1000',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1000',
  sushi: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1000',
  japanese: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1000',
  burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000',
  american: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000',
  'fast food': 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&q=80&w=1000',
  thai: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&q=80&w=1000',
  vietnamese: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&q=80&w=1000',
  asian: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&q=80&w=1000',
  chinese: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&q=80&w=1000',
  seafood: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=1000',
  steak: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1000',
  bbq: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&q=80&w=1000',
}

function getCuisineFallback(cuisines) {
  if (Array.isArray(cuisines)) {
    for (const c of cuisines) {
      const lower = String(c).toLowerCase().trim()
      for (const [key, url] of Object.entries(CUISINE_FALLBACK_IMAGES)) {
        if (lower.includes(key) || key.includes(lower)) return url
      }
    }
  }
  return fallbackImage
}

async function copyToClipboard(text) {
  if (!text) return false
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {}
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  } catch {
    return false
  }
}

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

function handleOpenDirections(restaurant) {
  if (!restaurant) return
  let query = ''
  if (restaurant.coordinates?.lat && restaurant.coordinates?.lng) {
    query = `${restaurant.coordinates.lat},${restaurant.coordinates.lng}`
  } else if (restaurant.name) {
    query = encodeURIComponent(`${restaurant.name} ${restaurant.address || ''}`.trim())
  } else {
    query = encodeURIComponent(restaurant.address || 'restaurants')
  }
  const url = `https://www.google.com/maps/search/?api=1&query=${query}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function ErrorToast({ message, onClose }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => {
      onClose?.()
    }, 8000)
    return () => clearTimeout(timer)
  }, [message, onClose])

  if (!message) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg transition-all animate-bounce-in">
      <div className="bg-red-50 border-2 border-red-600 text-navy-900 rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-xs uppercase font-mono tracking-wider text-red-600 mb-0.5">
            Notice / Error
          </div>
          <div className="text-xs sm:text-sm font-bold text-navy-900 break-words">{message}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-red-600 hover:text-navy-900 hover:bg-red-100 rounded-lg p-1 text-sm font-bold shrink-0 transition-colors"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function AppFooter() {
  return (
    <footer className="w-full max-w-7xl mx-auto flex items-center justify-between py-8 px-4 text-xs font-mono font-bold text-navy-900/40 uppercase tracking-widest select-none mt-12 border-t border-navy-900/10">
      <div className="w-4 h-4 rounded-full border border-navy-900/40 flex items-center justify-center text-[10px]">○</div>
      <div className="tracking-widest opacity-60">|||||||</div>
      <div className="text-[11px] tracking-wider text-navy-900/60">GOOD FOOD. TOGETHER.</div>
    </footer>
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('Food Finder UI Error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-navy-900 font-sans">
          <div className="bg-card border-2 border-navy-900 p-6 sm:p-8 rounded-3xl shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] max-w-md w-full text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-red-600">Something went wrong</h1>
            <p className="text-xs font-mono text-navy-900/80 mb-6 break-words bg-red-50 p-3 rounded-xl border border-red-200">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => {
                sessionStorage.clear()
                window.location.reload()
              }}
              className="w-full bg-orange-500 text-navy-900 font-bold py-3.5 rounded-xl border-2 border-navy-900 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] hover:bg-orange-400"
            >
              Reset Session & Return to Home
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// -------------------------------------------------------------
// WEIGHTS & ALGORITHM INSPECTOR COMPONENT (Collapsible QA Tool)
// -------------------------------------------------------------
function WeightsInspector({ consensusData, members }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!consensusData && (!members || members.length === 0)) return null

  const rawPositive = consensusData?.positive_weights || {}
  const positiveList = Array.isArray(rawPositive)
    ? rawPositive.map((item) => ({
        trait: typeof item === 'object' ? item.trait || item.name || 'Trait' : String(item),
        weight: typeof item === 'object' ? Number(item.weight ?? 1) : 1,
      }))
    : Object.entries(rawPositive).map(([key, val]) => ({
        trait: key,
        weight: typeof val === 'object' ? Number(val.weight ?? 1) : Number(val ?? 1),
      }))
  positiveList.sort((a, b) => b.weight - a.weight)
  const maxPositiveWeight = Math.max(...positiveList.map((p) => p.weight), 1)

  const rawVetoes = consensusData?.vetoes_and_allergies || []
  const vetoList = Array.isArray(rawVetoes)
    ? rawVetoes.map((item) => ({
        trait: typeof item === 'object' ? item.trait || item.name || 'Restricted' : String(item),
        weight: typeof item === 'object' ? Number(item.weight ?? -100) : -100,
        isAllergy: typeof item === 'object' ? Boolean(item.is_allergy) : false,
      }))
    : Object.entries(rawVetoes).map(([key, val]) => ({
        trait: key,
        weight: typeof val === 'object' ? Number(val.weight ?? -100) : Number(val ?? -100),
        isAllergy: false,
      }))

  return (
    <div className="w-full max-w-7xl mx-auto mb-6 bg-card border-2 border-navy-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] overflow-hidden transition-all text-navy-900">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer bg-amber-100 hover:bg-amber-200 p-4 flex items-center justify-between border-b-2 border-navy-900 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-navy-900 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
            <Calculator size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-navy-900 leading-tight">Consensus & Weights Inspector</h3>
            <p className="text-[11px] text-navy-900/60 font-mono">Real-time vector math and trait score calculations</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className="flex items-center gap-1 bg-white border border-navy-900 px-2.5 py-1 rounded-lg font-mono text-xs font-bold"
        >
          {isOpen ? <><ChevronUp size={14} /> Hide</> : <><ChevronDown size={14} /> Inspect</>}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-navy-900 p-3">
              <div className="font-bold uppercase tracking-wider text-green-700 flex items-center gap-1 mb-2">
                <Scale size={14} /> Positive Trait Weights
              </div>
              {positiveList.length === 0 ? (
                <p className="text-navy-900/60 italic">Equal weighting across cuisines</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {positiveList.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="capitalize font-bold">{item.trait}</span>
                      <span className="text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded">+{Number(item.weight).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-navy-900 p-3">
              <div className="font-bold uppercase tracking-wider text-red-600 flex items-center gap-1 mb-2">
                <ShieldAlert size={14} /> Vetoes & Allergies
              </div>
              {vetoList.length === 0 ? (
                <p className="text-green-700 font-bold">No active dietary restrictions</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {vetoList.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-red-50 p-1 rounded">
                      <span className="capitalize font-bold text-red-900">{item.trait}</span>
                      <span className="text-red-700 font-bold">{item.isAllergy ? 'Allergy Penalty' : 'Vetoed'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// SCREEN 1: ENTRY · JOIN ROOM (Matching Top-Left Mockup)
// -------------------------------------------------------------
function EntryScreen({ onJoin }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [isJoinOpen, setIsJoinOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [location, setLocation] = useState(defaultLocation)

  const cleanCode = (val) => String(val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room') || params.get('code')
    if (roomParam) {
      const clean = cleanCode(roomParam)
      if (clean) {
        setCode(clean)
        setIsJoinOpen(true)
      }
    }
  }, [])

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
    if (!name.trim()) {
      setError('Please enter your display name.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), group_location: location }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.detail?.message || data?.detail || 'Could not create lobby.')
      }
      onJoin({
        lobbyCode: data.lobby_code,
        memberId: data.member_id,
        memberToken: data.member_token,
        name: name.trim(),
        location,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    const sanitizedCode = cleanCode(code)
    if (!name.trim()) {
      setError('Please enter your display name.')
      return
    }
    if (!sanitizedCode || sanitizedCode.length < 4) {
      setError('Please enter a valid 4-character room code.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/lobbies/${encodeURIComponent(sanitizedCode)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), location }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          data?.detail?.message ||
          (response.status === 404 ? 'Room not found. Check the 4-letter code and try again.' : 'Could not join room.')
        )
      }
      onJoin({
        lobbyCode: data.lobby_code,
        memberId: data.member_id,
        memberToken: data.member_token,
        name: name.trim(),
        location,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const codeChars = [code[0] || '', code[1] || '', code[2] || '', code[3] || '']

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-4 sm:p-8 flex flex-col justify-between">
      {/* Top Header */}
      <header className="flex justify-between items-center max-w-7xl w-full mx-auto mb-6 sm:mb-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-navy-900 text-white flex items-center justify-center">
            <UtensilsCrossed size={18} />
          </div>
          <span className="font-bold text-xl tracking-tight leading-none">food finder</span>
        </div>
        <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-3 py-1 bg-white">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
          <span className="text-xs font-bold font-mono tracking-wider uppercase">LIVE / 01</span>
        </div>
      </header>

      {/* Main Two-Column Card Layout */}
      <main className="max-w-5xl w-full mx-auto bg-card rounded-3xl border-2 border-navy-900 shadow-[6px_6px_0px_0px_rgba(28,46,53,1)] overflow-hidden flex flex-col md:flex-row my-auto">
        {/* Left Dark Column */}
        <section className="bg-navy-900 text-white p-8 sm:p-12 md:w-5/12 flex flex-col justify-between relative overflow-hidden border-b-2 md:border-b-0 md:border-r-2 border-navy-900">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#FF7A59] uppercase font-bold mb-4">
              THE GROUP DINNER DECISION DEVICE
            </div>
            <h1 className="text-5xl sm:text-6xl font-black text-[#FF6B4A] tracking-tighter leading-[0.92] mb-8 uppercase font-sans">
              FOOD<br />FINDER.
            </h1>
            <p className="text-sm sm:text-base text-white/80 font-medium leading-relaxed">
              Less &ldquo;where should we eat?&rdquo;<br />
              More &ldquo;see you there.&rdquo;
            </p>
          </div>

          <div className="mt-12">
            <div className="w-12 h-12 rounded-full bg-green-400 border-2 border-navy-900 flex items-center justify-center text-navy-900 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]">
              <UtensilsCrossed size={22} />
            </div>
          </div>
        </section>

        {/* Right Form Column */}
        <section className="p-8 sm:p-12 md:w-7/12 flex flex-col justify-between bg-card">
          <div className="space-y-6">
            {error && (
              <div className="p-3.5 bg-red-100 border-2 border-red-500 rounded-xl text-red-700 text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Display Name */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-navy-900/60 mb-2">
                01 / DISPLAY NAME
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={30}
                  className="w-full px-4 py-3.5 pr-10 rounded-2xl border-2 border-navy-900 bg-white font-bold text-lg focus:outline-none focus:border-orange-500"
                />
                <User size={20} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-900/40 pointer-events-none" />
              </div>
            </div>

            {/* Create Room Button */}
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim() || busy}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-navy-900 border-2 border-navy-900 rounded-2xl py-4 px-6 flex items-center justify-between text-lg font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
            >
              <span>{busy ? 'Creating Room...' : 'Create Room'}</span>
              <Plus size={22} />
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t-2 border-navy-900/10"></div>
              <span className="flex-shrink-0 mx-4 text-navy-900/40 text-[10px] font-mono uppercase font-bold tracking-widest">
                OR JOIN THE CREW
              </span>
              <div className="flex-grow border-t-2 border-navy-900/10"></div>
            </div>

            {/* Join Room Accordion Trigger */}
            <button
              type="button"
              onClick={() => {
                if (code.length === 4) {
                  handleJoin()
                } else {
                  setIsJoinOpen(!isJoinOpen)
                }
              }}
              disabled={busy}
              className="w-full bg-green-400 hover:bg-green-300 disabled:opacity-50 text-navy-900 border-2 border-navy-900 rounded-2xl py-4 px-6 flex items-center justify-between text-lg font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
            >
              <span>{code.length === 4 && name.trim() ? 'Join Room Now' : 'Join Room'}</span>
              <ChevronDown size={22} className={isJoinOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {/* 4-Character Room Code Box Input */}
            {isJoinOpen && (
              <div className="space-y-2 pt-2 animate-fadeIn">
                <div className="flex justify-between items-center text-xs font-mono font-bold uppercase tracking-wider text-navy-900/60">
                  <span>02 / 4-CHARACTER ROOM CODE</span>
                  <CornerDownLeft size={16} />
                </div>

                {/* 4 Boxes with hidden overlay input */}
                <div className="relative">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(cleanCode(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleJoin()
                    }}
                    maxLength={4}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck="false"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 font-mono"
                    autoFocus
                  />
                  <div className="grid grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`h-16 sm:h-18 rounded-2xl border-2 border-navy-900 bg-white flex items-center justify-center font-mono font-black text-2xl sm:text-3xl uppercase transition-colors
                          ${codeChars[idx] ? 'text-navy-900 bg-white' : 'text-navy-900/20 bg-background/50'}
                          ${code.length === idx ? 'ring-2 ring-orange-500' : ''}
                        `}
                      >
                        {codeChars[idx] || '·'}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs font-mono text-navy-900/60 pt-1">
                  {code.length === 4
                    ? 'Code entered. Hit Join Room to pull up a chair.'
                    : 'Enter the 4-letter room code shared by your host.'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-navy-900/10 text-center">
            <span className="text-[10px] font-mono font-bold tracking-widest text-navy-900/40 uppercase">
              NO TIER-LISTS. NO GROUP-CHAT DEBATES.
            </span>
          </div>
        </section>
      </main>

      {/* Shared Footer */}
      <AppFooter />
    </div>
  )
}

// -------------------------------------------------------------
// SCREEN 2: LOBBY · MOOD SETTER (Matching Top-Right Mockup)
// -------------------------------------------------------------
function PreferencesScreen({ lobby, session, connection, send, onLeave, error, clearError }) {
  const [selectedPrices, setSelectedPrices] = useState(['$$'])
  const [hasCustomizedPrice, setHasCustomizedPrice] = useState(false)
  const [selectedCuisines, setSelectedCuisines] = useState([])
  const [selectedAllergies, setSelectedAllergies] = useState([])
  const [customCuisineInput, setCustomCuisineInput] = useState('')
  const [customAllergyInput, setCustomAllergyInput] = useState('')
  const [availableCuisines, setAvailableCuisines] = useState(defaultCuisines)
  const [availableAllergies, setAvailableAllergies] = useState(defaultAllergies)
  const [userLocation, setUserLocation] = useState(session?.location || defaultLocation)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {}
      )
    }
  }, [])

  const me = lobby?.members?.find((m) => m.id === session.memberId)
  const isHost = lobby?.host_id === session.memberId
  const canAct = connection === 'connected'

  const handlePriceClick = (price) => {
    if (!hasCustomizedPrice) {
      setHasCustomizedPrice(true)
      setSelectedPrices([price])
      return
    }
    if (selectedPrices.includes(price)) {
      if (selectedPrices.length > 1) {
        setSelectedPrices(selectedPrices.filter((p) => p !== price))
      }
    } else {
      setSelectedPrices([...selectedPrices, price])
    }
  }

  const toggleCuisine = (cuisine) => {
    const raw = cuisine.trim()
    const norm = raw.toLowerCase()

    if (norm === 'anything') {
      if (selectedCuisines.some((c) => c.toLowerCase() === 'anything')) {
        setSelectedCuisines([])
      } else {
        setSelectedCuisines(['Anything'])
      }
      return
    }

    const withoutAnything = selectedCuisines.filter((c) => c.toLowerCase() !== 'anything')
    const exists = withoutAnything.some((c) => c.toLowerCase() === norm)

    if (exists) {
      setSelectedCuisines(withoutAnything.filter((c) => c.toLowerCase() !== norm))
    } else {
      setSelectedCuisines([...withoutAnything, raw])
    }
  }

  const toggleAllergy = (allergy) => {
    const raw = allergy.trim()
    const norm = raw.toLowerCase()
    if (selectedAllergies.some((a) => a.toLowerCase() === norm)) {
      setSelectedAllergies(selectedAllergies.filter((a) => a.toLowerCase() !== norm))
    } else {
      setSelectedAllergies([...selectedAllergies, raw])
    }
  }

  const handleAddCustomCuisine = (e) => {
    e?.preventDefault?.()
    const trimmed = customCuisineInput.trim()
    if (!trimmed) return
    const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    if (!availableCuisines.some((c) => c.toLowerCase() === normalized.toLowerCase())) {
      setAvailableCuisines([normalized, ...availableCuisines])
    }
    if (!selectedCuisines.some((c) => c.toLowerCase() === normalized.toLowerCase())) {
      setSelectedCuisines([...selectedCuisines.filter((c) => c.toLowerCase() !== 'anything'), normalized])
    }
    setCustomCuisineInput('')
  }

  const handleAddCustomAllergy = (e) => {
    e?.preventDefault?.()
    const trimmed = customAllergyInput.trim()
    if (!trimmed) return
    const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    if (!availableAllergies.some((a) => a.toLowerCase() === normalized.toLowerCase())) {
      setAvailableAllergies([normalized, ...availableAllergies])
    }
    if (!selectedAllergies.some((a) => a.toLowerCase() === normalized.toLowerCase())) {
      setSelectedAllergies([...selectedAllergies, normalized])
    }
    setCustomAllergyInput('')
  }

  const handleCopyCode = async () => {
    if (!lobby?.lobby_code) return
    const success = await copyToClipboard(lobby.lobby_code)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLockIn = () => {
    send('submit_preferences', {
      desired_cuisines: selectedCuisines,
      vetoed_cuisines: [],
      allergies: selectedAllergies,
      max_price: selectedPrices[selectedPrices.length - 1] || '$$',
      prices: selectedPrices,
      location: userLocation,
    })
  }

  const handleUnlock = () => {
    send('unlock_preferences', {})
  }

  const submittedCount = lobby.members.filter((m) => m.has_submitted).length
  const totalCount = lobby.members.length
  const readyPercentage = totalCount === 0 ? 0 : (submittedCount / totalCount) * 100

  // Colors for member avatars
  const avatarColors = ['bg-orange-500', 'bg-purple-300', 'bg-green-400', 'bg-red-300', 'bg-blue-300', 'bg-amber-300']

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-4 sm:p-8 flex flex-col justify-between">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-9 h-9 rounded-xl bg-navy-900 text-white flex items-center justify-center">
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none">food finder</h1>
            <p className="text-[10px] font-mono tracking-widest uppercase text-navy-900/60 mt-0.5">GROUP DINING CONSENSUS</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-3.5 py-1.5 bg-white">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-xs font-bold font-mono tracking-wider">LIVE / {String(totalCount).padStart(2, '0')}</span>
          </div>

          <div
            onClick={handleCopyCode}
            className="flex items-center gap-2.5 bg-navy-900 text-white px-5 py-2 rounded-2xl cursor-pointer hover:bg-navy-800 transition-colors select-none shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]"
            title="Click to copy room code"
          >
            <span className="text-xs font-mono uppercase text-white/60">ROOM CODE</span>
            <span className="text-xl font-bold text-green-400 tracking-widest font-mono">{lobby.lobby_code}</span>
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-white/60" />}
          </div>

          <button
            type="button"
            onClick={onLeave}
            className="text-xs font-mono uppercase text-navy-900/60 hover:text-navy-900 border-2 border-navy-900 px-3 py-1.5 rounded-xl bg-white"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main Content + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl w-full mx-auto flex-1">
        {/* Left Container */}
        <div className="flex-1 border-2 border-navy-900 border-dashed rounded-3xl p-6 sm:p-10 flex flex-col justify-between bg-card relative shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
          <div className="space-y-8 pb-32">
            <div>
              <div className="text-xs font-mono font-bold tracking-widest text-navy-900/60 uppercase mb-2">
                DINNER CREW / {totalCount} CONNECTED
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Set the table.</h1>
              <p className="text-base sm:text-lg text-navy-900/60 mt-1">A little mood-setting before the menu.</p>
            </div>

            {/* The Hungry Crew */}
            <div>
              <div className="flex justify-between text-xs font-mono font-bold tracking-widest uppercase mb-3 text-navy-900/60">
                <span>THE HUNGRY CREW</span>
                <span>{submittedCount} / {totalCount} READY</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lobby.members.map((member, idx) => (
                  <div key={member.id} className="bg-white border-2 border-navy-900 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-full border-2 border-navy-900 flex items-center justify-center font-bold text-base text-navy-900 uppercase ${avatarColors[idx % avatarColors.length]}`}>
                        {member.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-base leading-tight">
                          {member.name} {member.id === session.memberId && '(You)'}
                        </div>
                        <div className="text-xs text-navy-900/60 mt-0.5">
                          {member.has_submitted ? 'Ready to eat' : (member.id === session.memberId ? 'You - choosing' : 'Choosing...')}
                        </div>
                      </div>
                    </div>
                    {member.has_submitted ? (
                      <CheckCircle2 className="text-green-500 shrink-0" size={24} />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-navy-900/20"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className={me?.has_submitted ? 'opacity-60 pointer-events-none' : ''}>
              <div className="flex justify-between text-xs font-mono font-bold tracking-widest uppercase mb-3 text-navy-900/60">
                <span>01 / PRICE RANGE</span>
                <span>
                  {selectedPrices.length === 1
                    ? (selectedPrices[0] === '$' ? '< $15' : selectedPrices[0] === '$$' ? '$15-30' : selectedPrices[0] === '$$$' ? '$30-50' : '> $50')
                    : selectedPrices.join(', ')} / person
                </span>
              </div>
              <div className="flex border-2 border-navy-900 rounded-2xl overflow-hidden bg-white h-16 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
                {prices.map((price) => {
                  const isSelected = selectedPrices.includes(price)
                  return (
                    <button
                      type="button"
                      key={price}
                      onClick={() => handlePriceClick(price)}
                      className={`flex-1 font-bold text-xl border-r-2 border-navy-900 last:border-r-0 transition-colors
                        ${isSelected ? 'bg-orange-500 text-navy-900' : 'hover:bg-navy-900/5'}
                      `}
                    >
                      {price}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cravings Toggles */}
            <div className={me?.has_submitted ? 'opacity-60 pointer-events-none' : ''}>
              <div className="flex justify-between items-center text-xs font-mono font-bold tracking-widest uppercase mb-3 text-navy-900/60">
                <span>02 / WHAT ARE YOU CRAVING?</span>
                <span>{selectedCuisines.length} Selected</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {availableCuisines.map((cuisine) => {
                  const isSelected = selectedCuisines.some((c) => c.toLowerCase() === cuisine.toLowerCase())
                  return (
                    <button
                      type="button"
                      key={cuisine}
                      onClick={() => toggleCuisine(cuisine)}
                      className={`h-14 rounded-full border-2 border-navy-900 font-bold text-base flex items-center justify-center gap-2 px-4 transition-all
                        ${isSelected
                          ? 'bg-green-400 text-navy-900 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]'
                          : 'bg-card hover:bg-white text-navy-900'
                        }
                      `}
                    >
                      {isSelected ? <Check size={20} /> : <span className="text-navy-900/40 text-2xl leading-none">+</span>}
                      <span className="truncate">{cuisine}</span>
                    </button>
                  )
                })}
              </div>

              {/* Add Custom Craving Input */}
              <form onSubmit={handleAddCustomCuisine} className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={customCuisineInput}
                  onChange={(e) => setCustomCuisineInput(e.target.value)}
                  placeholder="+ Add another craving (e.g. Ramen, Halal, BBQ)"
                  className="flex-1 px-4 py-2.5 rounded-full border-2 border-navy-900 bg-white font-medium text-sm focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  disabled={!customCuisineInput.trim()}
                  className="px-5 py-2.5 bg-orange-500 disabled:opacity-40 text-navy-900 font-bold text-xs uppercase font-mono border-2 border-navy-900 rounded-full shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Dietary Restrictions & Allergies Section */}
            <div className={me?.has_submitted ? 'opacity-60 pointer-events-none' : ''}>
              <div className="flex justify-between items-center text-xs font-mono font-bold tracking-widest uppercase mb-3 text-red-600">
                <span className="flex items-center gap-1.5"><ShieldAlert size={14} /> 03 / DIETARY RESTRICTIONS & ALLERGIES</span>
                <span>{selectedAllergies.length} Restricted</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {availableAllergies.map((allergy) => {
                  const isSelected = selectedAllergies.some((a) => a.toLowerCase() === allergy.toLowerCase())
                  return (
                    <button
                      type="button"
                      key={allergy}
                      onClick={() => toggleAllergy(allergy)}
                      className={`h-11 rounded-full border-2 border-navy-900 font-bold text-xs flex items-center justify-center gap-1.5 px-3 transition-all
                        ${isSelected
                          ? 'bg-red-400 text-navy-900 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]'
                          : 'bg-white hover:bg-red-50 text-navy-900'
                        }
                      `}
                    >
                      {isSelected ? <Check size={16} /> : <span className="text-red-500 text-sm leading-none">✕</span>}
                      <span className="truncate">{allergy}</span>
                    </button>
                  )
                })}
              </div>
              <form onSubmit={handleAddCustomAllergy} className="flex gap-2 mt-2.5">
                <input
                  type="text"
                  value={customAllergyInput}
                  onChange={(e) => setCustomAllergyInput(e.target.value)}
                  placeholder="+ Add dietary restriction (e.g. Pork, Shellfish, Soy)"
                  className="flex-1 px-4 py-2 rounded-full border-2 border-navy-900 bg-white font-medium text-xs focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={!customAllergyInput.trim()}
                  className="px-4 py-2 bg-red-400 disabled:opacity-40 text-navy-900 font-bold text-xs uppercase font-mono border-2 border-navy-900 rounded-full shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]"
                >
                  Add
                </button>
              </form>
            </div>
          </div>

          {/* Sticky Bottom Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 pt-12 bg-gradient-to-t from-[#FAF8F0] via-[#FAF8F0] to-transparent rounded-b-3xl">
            {isHost && submittedCount === totalCount ? (
              <button
                type="button"
                onClick={() => send('start_voting')}
                disabled={!canAct}
                className="w-full bg-green-400 border-2 border-navy-900 rounded-2xl h-20 flex items-center justify-between px-8 text-2xl font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-all"
              >
                <span>Everyone is ready! Start Voting</span>
                <Check size={32} />
              </button>
            ) : me?.has_submitted ? (
              <div className="space-y-3">
                <div className="w-full bg-green-400 border-2 border-navy-900 rounded-2xl h-20 flex items-center justify-between px-8 text-2xl font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
                  <span>Locked In</span>
                  <Check size={32} />
                </div>
                <button
                  type="button"
                  onClick={handleUnlock}
                  disabled={!canAct}
                  className="w-full bg-white border-2 border-navy-900 rounded-xl py-2.5 font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-orange-50 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]"
                >
                  <RotateCcw size={14} /> Unlock / Edit Choices
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLockIn}
                disabled={!canAct}
                className="w-full bg-orange-500 border-2 border-navy-900 rounded-2xl h-20 flex items-center justify-between px-8 text-2xl font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-all"
              >
                <span>Lock In</span>
                <Check size={32} />
              </button>
            )}
            <p className="text-center text-xs font-mono tracking-tight text-navy-900/60 mt-3">
              The round starts when everyone is ready.
            </p>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          {/* Room Code Card */}
          <div className="bg-navy-900 text-white rounded-3xl p-6 sm:p-8 border-2 border-navy-900 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-white/60 mb-2">ROOM CODE</div>
            <p className="text-sm text-white/80 mb-4">Share with the crew</p>
            <div
              onClick={handleCopyCode}
              className="flex items-center justify-between cursor-pointer group"
            >
              <span className="text-5xl font-black text-green-400 tracking-widest font-mono">{lobby.lobby_code}</span>
              <Copy size={24} className="text-white/60 group-hover:text-white transition-colors" />
            </div>
          </div>

          {/* Ready Status Card */}
          <div className="bg-card border-2 border-navy-900 rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-6">READY STATUS</div>
            <div className="h-4 border-2 border-navy-900 rounded-full overflow-hidden bg-white mb-4">
              <div
                className="h-full bg-green-400 border-r-2 border-navy-900 transition-all duration-500"
                style={{ width: `${readyPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-navy-900/80 font-medium">
              {submittedCount === totalCount
                ? 'All players are ready!'
                : `${submittedCount} of ${totalCount} players are ready. ${me?.has_submitted ? 'Waiting for the rest of the crew.' : 'You are still choosing.'}`}
            </p>
          </div>

          {/* Consensus Math Inspector */}
          <WeightsInspector consensusData={lobby?.consensus_data} members={lobby?.members} />
        </div>
      </div>

      <AppFooter />
    </div>
  )
}

// -------------------------------------------------------------
// SCREEN 3: GAME / VOTING SCREEN (Matching Bottom-Left Mockup)
// -------------------------------------------------------------
function VotingScreen({ lobby, session, connection, send, error, clearError }) {
  const [votedId, setVotedId] = useState(null)
  const canAct = connection === 'connected'
  const isHost = lobby?.host_id === session.memberId
  const candidates = lobby?.candidates || []
  const totalCount = lobby?.members?.length || 0
  const votesSubmitted = lobby?.votes_submitted || 0
  const waitingCount = Math.max(0, totalCount - votesSubmitted)
  const votePercentage = totalCount === 0 ? 0 : (votesSubmitted / totalCount) * 100

  const handleVote = (id) => {
    setVotedId(id)
    send('cast_vote', { restaurant_id: id })
  }

  const handleChangeVote = () => {
    setVotedId(null)
  }

  const avatarColors = ['bg-orange-500', 'bg-purple-300', 'bg-green-400', 'bg-red-300', 'bg-blue-300', 'bg-amber-300']

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-4 sm:p-8 flex flex-col justify-between">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 max-w-7xl w-full mx-auto">
        <div>
          <div className="text-[10px] font-mono tracking-widest uppercase text-navy-900/60 font-bold mb-1">
            ROOM {lobby.lobby_code} / ROUND 01
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-navy-900 text-white flex items-center justify-center">
              <UtensilsCrossed size={18} />
            </div>
            <h1 className="text-xl font-bold leading-none">food finder</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-3.5 py-1.5 bg-white">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-xs font-bold font-mono tracking-wider uppercase">LIVE / 03</span>
          </div>

          <button
            type="button"
            onClick={handleChangeVote}
            className="flex items-center gap-1.5 border-2 border-navy-900 rounded-xl px-4 py-1.5 bg-white font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] hover:bg-orange-50"
          >
            <RotateCcw size={14} />
            <span>Change vote</span>
          </button>

          {isHost && (
            <button
              type="button"
              onClick={() => send('finish_voting')}
              className="text-xs font-mono uppercase bg-navy-900 text-white px-3.5 py-2 rounded-xl border-2 border-navy-900"
            >
              Finish Early
            </button>
          )}
        </div>
      </header>

      {/* Main Content + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl w-full mx-auto flex-1">
        {/* Left Voting Section */}
        <div className="flex-1 space-y-6">
          <div>
            <div className="text-xs font-mono font-bold tracking-widest text-navy-900/60 uppercase mb-2">
              ACTIVE VOTING
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Pick your plate.</h1>
            <p className="text-base sm:text-lg text-navy-900/60 mt-1">
              One pick per player. Change your vote until everyone&apos;s in.
            </p>
          </div>

          {/* Progress Card */}
          <div className="bg-card border-2 border-navy-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="flex justify-between items-center text-xs font-mono font-bold tracking-widest uppercase mb-3">
              <span>{waitingCount === 0 ? 'All players voted!' : `Waiting on ${waitingCount} player${waitingCount > 1 ? 's' : ''}...`}</span>
              <span className="text-navy-900/60">{votesSubmitted} / {totalCount} VOTED</span>
            </div>
            <div className="h-3.5 border-2 border-navy-900 rounded-full overflow-hidden bg-white mb-3">
              <div
                className="h-full bg-orange-500 border-r-2 border-navy-900 transition-all duration-500"
                style={{ width: `${votePercentage}%` }}
              ></div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-navy-900/70">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>
                {votesSubmitted} vote{votesSubmitted !== 1 ? 's are' : ' is'} in. {waitingCount === 1 ? 'The next player locks the round.' : 'Waiting for remaining votes.'}
              </span>
            </div>
          </div>

          {/* 3 Restaurant Cards Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {candidates.map((restaurant, idx) => {
              const isVoted = votedId === restaurant.id
              const imageSrc = restaurant.image_url || restaurant.image || fallbackImage
              const matchScore = restaurant._debug_stats?.final_score || (3.0 - idx * 0.5)
              const percentage = Math.min(99, Math.max(70, Math.round(80 + matchScore * 5)))

              return (
                <div
                  key={restaurant.id}
                  className={`bg-card border-2 rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-200
                    ${isVoted
                      ? 'border-orange-500 shadow-[6px_6px_0px_0px_rgba(255,90,54,1)] ring-2 ring-orange-500'
                      : 'border-navy-900 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]'
                    }
                  `}
                >
                  <div>
                    {/* Top Image with Badge and Button */}
                    <div className="relative h-48 sm:h-52 bg-gray-200">
                      <img
                        src={imageSrc}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = getCuisineFallback(restaurant.cuisines)
                        }}
                      />
                      <div className="absolute top-3 left-3 bg-orange-500 text-navy-900 font-bold text-[10px] font-mono px-3 py-1 rounded-full border-2 border-navy-900 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
                        {idx === 0 ? 'CREW PICK' : `★ ${percentage}% MATCH`}
                      </div>

                      {/* Vote Action on Image */}
                      <div className="absolute bottom-3 right-3">
                        <button
                          type="button"
                          onClick={() => handleVote(restaurant.id)}
                          disabled={!canAct}
                          className={`px-3.5 py-1.5 rounded-xl border-2 border-navy-900 font-bold text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] transition-transform hover:scale-105
                            ${isVoted ? 'bg-orange-500 text-navy-900' : 'bg-green-400 text-navy-900'}
                          `}
                        >
                          <UtensilsCrossed size={14} />
                          <span>{isVoted ? 'Your Pick!' : 'Tap to Vote'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h2 className="text-xl font-bold leading-tight">{restaurant.name}</h2>
                        <span className="text-base font-bold font-mono">{restaurant.price || '$$'}</span>
                      </div>
                      <p className="text-xs font-bold text-navy-900/60 mb-3">
                        {restaurant.cuisines?.join(' · ')} / {restaurant.rating || 4.8} ★
                        {restaurant._debug_stats?.distance_miles != null && ` · ${Math.round(restaurant._debug_stats.distance_miles * 20)} min walk`}
                      </p>

                      {/* Matched Trait Badges */}
                      {restaurant._debug_stats?.matched_traits && restaurant._debug_stats.matched_traits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {restaurant._debug_stats.matched_traits.slice(0, 2).map((t, tIdx) => {
                            const traitName = typeof t === 'object' ? t.trait || t.name : String(t)
                            return (
                              <span
                                key={tIdx}
                                className="bg-green-100 text-green-900 border border-green-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                              >
                                ✓ {traitName}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <WeightsInspector consensusData={lobby?.consensus_data || candidates[0]?._consensus_data} members={lobby?.members} />
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          {/* Room Summary Card */}
          <div className="bg-card border-2 border-navy-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-2">
              ROOM SUMMARY
            </div>
            <h3 className="text-2xl font-bold mb-4">Room {lobby.lobby_code}</h3>
            <div className="space-y-3 font-mono text-xs font-bold">
              <div className="flex justify-between py-1.5 border-b border-navy-900/10">
                <span className="text-navy-900/60">Players</span>
                <span>{totalCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-navy-900/10">
                <span className="text-navy-900/60">Voted</span>
                <span>{votesSubmitted} / {totalCount}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-navy-900/60">Round</span>
                <span>01</span>
              </div>
            </div>
          </div>

          {/* Players Card */}
          <div className="bg-card border-2 border-navy-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-4">
              PLAYERS
            </div>
            <div className="space-y-3">
              {lobby.members.map((member, idx) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full border border-navy-900 flex items-center justify-center font-bold text-xs uppercase ${avatarColors[idx % avatarColors.length]}`}>
                      {member.name[0]}
                    </div>
                    <span className="font-bold text-sm">{member.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-navy-900 uppercase
                      ${member.has_voted ? 'bg-green-400 text-navy-900' : 'bg-background text-navy-900/60'}
                    `}
                  >
                    {member.has_voted ? 'VOTED' : 'WAITING'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works Card */}
          <div className="bg-card border-2 border-navy-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-2">
              HOW IT WORKS
            </div>
            <p className="text-xs font-bold text-navy-900 leading-relaxed mb-3">
              One pick per player. Change your vote until everyone&apos;s in.
            </p>
            <div className="flex items-start gap-2 text-[11px] text-navy-900/70 font-mono">
              <RotateCcw size={14} className="shrink-0 mt-0.5" />
              <span>Use the Change vote button to swap before the round locks.</span>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  )
}

// -------------------------------------------------------------
// SCREEN 4: WINNER · DINNER DECIDED (Matching Bottom-Right Mockup)
// -------------------------------------------------------------
function ResultsScreen({ lobby, session, onLeave, onPlayAgain }) {
  const winner = lobby?.winner
  const candidates = lobby?.candidates || []
  const totalCount = lobby?.members?.length || 0
  const winnerImage = winner?.image_url || winner?.image || fallbackImage
  const [playAgainLoading, setPlayAgainLoading] = useState(false)
  const [playAgainError, setPlayAgainError] = useState('')

  const handlePlayAgain = async () => {
    if (playAgainLoading) return
    setPlayAgainLoading(true)
    setPlayAgainError('')
    try {
      const response = await fetch(`/api/lobbies/${encodeURIComponent(lobby.lobby_code)}/play-again`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_token: session.memberToken,
          name: session.name,
          location: session.location || lobby.group_location,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.detail?.message || 'Could not start new round.')
      }
      onPlayAgain?.({
        lobbyCode: data.lobby_code,
        memberId: data.member_id,
        memberToken: data.member_token,
        name: session.name,
        location: session.location || lobby.group_location,
      })
    } catch (err) {
      setPlayAgainError(err.message || 'Failed to start new round')
    } finally {
      setPlayAgainLoading(false)
    }
  }

  const avatarColors = ['bg-orange-500', 'bg-purple-300', 'bg-green-400', 'bg-red-300', 'bg-blue-300', 'bg-amber-300']
  const walkMinutes = winner?._debug_stats?.distance_miles != null ? Math.round(winner._debug_stats.distance_miles * 20) : 8

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-4 sm:p-8 flex flex-col justify-between">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-navy-900 text-white flex items-center justify-center">
            <UtensilsCrossed size={18} />
          </div>
          <h1 className="text-xl font-bold leading-none">food finder</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-3.5 py-1.5 bg-white">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-xs font-bold font-mono tracking-wider uppercase">LIVE / 04</span>
          </div>
          <div className="flex items-center gap-2 border-2 border-navy-900 rounded-full px-3.5 py-1.5 bg-white">
            <span className="text-xs font-bold font-mono tracking-wider uppercase">
              ROOM {lobby.lobby_code} {totalCount} PLAYERS
            </span>
          </div>
        </div>
      </header>

      {/* Main Content + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl w-full mx-auto flex-1">
        {/* Left Winning Section */}
        <div className="flex-1 space-y-6">
          {/* Lime Green Banner */}
          <div className="bg-green-400 border-2 border-navy-900 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-xs font-mono font-bold tracking-widest uppercase mb-3 text-navy-900/80">
              <span className="text-orange-500">✿</span> ROOM {lobby.lobby_code} / PERFECT MATCH <span className="text-orange-500">✿</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold mb-3 tracking-tight">Dinner, decided.</h1>
            <p className="text-lg sm:text-xl font-bold text-navy-900">
              {totalCount} friends. {totalCount} votes. One very good choice.
            </p>
          </div>

          {/* Winning Restaurant Card */}
          <div className="bg-card border-2 border-navy-900 rounded-3xl overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="relative h-64 sm:h-80 bg-gray-200">
              <img
                src={winnerImage}
                alt={winner?.name || 'Winner'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = getCuisineFallback(winner?.cuisines)
                }}
              />
              <div className="absolute top-6 left-6 bg-orange-500 text-navy-900 font-bold text-xs font-mono px-4 py-2 rounded-full border-2 border-navy-900 flex items-center gap-2 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
                <span className="w-2 h-2 rounded-full bg-navy-900"></span>
                THE CREW&apos;S CHOICE
              </div>
            </div>

            <div className="p-6 sm:p-8 flex justify-between items-end">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-1">{winner?.name || 'Selected Restaurant'}</h2>
                <p className="text-base sm:text-lg font-bold text-navy-900/80">
                  {winner?.cuisines?.join(' · ')} / {winner?.rating || 4.8} ★ ({winner?.reviews_count || 286} reviews)
                </p>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-widest font-mono">{winner?.price || '$$'}</div>
            </div>
          </div>

          {/* Dinner Plan Info Box */}
          <div className="bg-[#EAE6D6] border-2 border-navy-900 rounded-3xl p-6 sm:p-8 space-y-5 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60">
              YOUR DINNER PLAN
            </div>
            <div className="space-y-3 font-bold text-base">
              <div className="flex items-center gap-3">
                <MapPin size={22} className="shrink-0 text-navy-900" />
                <span>{winner?.address || '124 Valencia St'} • {walkMinutes} min walk</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={22} className="shrink-0 text-navy-900" />
                <span>Open until 10 pm • {winner?.price || '$$'} tier</span>
              </div>
            </div>
          </div>

          {/* Big Orange Action Button */}
          <button
            type="button"
            onClick={() => handleOpenDirections(winner)}
            className="w-full bg-orange-500 border-2 border-navy-900 rounded-2xl h-20 flex items-center justify-between px-8 text-2xl font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-all"
          >
            <span>Let&apos;s Eat</span>
            <Navigation size={30} />
          </button>

          {/* Secondary Text Links */}
          <div className="flex justify-center items-center gap-6 text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 pt-2">
            <button
              type="button"
              onClick={() => handleOpenDirections(winner)}
              className="hover:text-navy-900 flex items-center gap-1.5"
            >
              OPEN DIRECTIONS ↗
            </button>
            <span className="text-navy-900/20">/</span>
            <button
              type="button"
              onClick={handlePlayAgain}
              className="hover:text-navy-900 flex items-center gap-1.5"
            >
              PLAY AGAIN ↻
            </button>
          </div>

          {playAgainError && (
            <div className="text-center text-xs text-red-600 font-bold font-mono">
              {playAgainError}
            </div>
          )}

          {/* Full Voting Podium */}
          {candidates.length > 1 && (
            <div className="pt-4">
              <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-3">
                Voting Podium (Runner-Ups)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {candidates.filter((c) => c.id !== winner?.id).map((c, idx) => (
                  <div key={c.id} className="bg-white border-2 border-navy-900 rounded-2xl p-3 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-navy-900 shrink-0 bg-gray-200">
                        <img
                          src={c.image_url || c.image || fallbackImage}
                          alt={c.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = getCuisineFallback(c.cuisines)
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold bg-navy-900 text-white px-1.5 py-0.5 rounded">
                            #{idx + 2}
                          </span>
                          <span className="font-bold text-sm">{c.name}</span>
                        </div>
                        <div className="text-xs text-navy-900/60">{c.cuisines?.join(' · ')}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenDirections(c)}
                      className="text-xs font-mono font-bold text-orange-600 hover:underline p-1"
                    >
                      Map ↗
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <WeightsInspector consensusData={lobby?.consensus_data || candidates[0]?._consensus_data} members={lobby?.members} />
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          {/* Unanimous Crew Card */}
          <div className="bg-white border-2 border-navy-900 rounded-3xl p-6 sm:p-7 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-5">
              UNANIMOUS CREW
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                {lobby.members.map((member, idx) => (
                  <div key={member.id} className="flex flex-col items-center gap-1.5">
                    <div className={`w-11 h-11 rounded-full border-2 border-navy-900 flex items-center justify-center font-bold text-base text-navy-900 uppercase ${avatarColors[idx % avatarColors.length]}`}>
                      {member.name[0]}
                    </div>
                    <span className="text-xs font-bold">{member.name}</span>
                  </div>
                ))}
              </div>
              <div className="bg-navy-900 text-green-400 rounded-2xl px-4 py-2.5 font-mono font-bold text-lg border-2 border-navy-900 shrink-0">
                {totalCount}/{totalCount} ✓
              </div>
            </div>
          </div>

          {/* Room Stats Card */}
          <div className="bg-[#EAE6D6] border-2 border-navy-900 rounded-3xl p-6 sm:p-7 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-5">
              ROOM STATS
            </div>
            <div className="space-y-4 font-mono text-sm font-bold">
              <div className="flex justify-between py-1 border-b border-navy-900/10">
                <span className="text-navy-900/70">Players</span>
                <span>{totalCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-900/10">
                <span className="text-navy-900/70">Votes</span>
                <span>{totalCount}/{totalCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-900/10">
                <span className="text-navy-900/70">Consensus</span>
                <span className="text-orange-500 uppercase">UNANIMOUS</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-navy-900/70">Walk time</span>
                <span>{walkMinutes} min</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white border-2 border-navy-900 rounded-3xl p-6 sm:p-7 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-5">
              QUICK ACTIONS
            </div>
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleOpenDirections(winner)}
                className="w-full bg-green-400 border-2 border-navy-900 rounded-2xl py-4 px-6 font-bold flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-transform"
              >
                <Navigation size={20} />
                <span>Open directions</span>
              </button>

              <button
                type="button"
                onClick={handlePlayAgain}
                disabled={playAgainLoading}
                className="w-full bg-orange-500 border-2 border-navy-900 rounded-2xl py-4 px-6 font-bold flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-transform disabled:opacity-50"
              >
                <RotateCcw size={20} className={playAgainLoading ? 'animate-spin' : ''} />
                <span>{playAgainLoading ? 'Entering New Room...' : 'Play again'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  )
}

// -------------------------------------------------------------
// MAIN CONTAINER
// -------------------------------------------------------------
function LobbyScreen({ session, onLeave, onPlayAgain }) {
  const [persistedResults, setPersistedResults] = useState(null)

  const lobbyExpired = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    onLeave()
  }, [onLeave])

  const { lobby, connection, error, clearError, send } = useLobbySocket({
    ...session,
    onLobbyExpired: lobbyExpired,
  })

  useEffect(() => {
    if (lobby?.phase === 'results' && lobby?.winner) {
      setPersistedResults(lobby)
    } else if (lobby?.phase === 'preferences') {
      setPersistedResults(null)
    }
  }, [lobby])

  const activeResults =
    lobby?.phase === 'results' && lobby?.winner && lobby?.lobby_code === session.lobbyCode
      ? lobby
      : persistedResults?.lobby_code === session.lobbyCode
      ? persistedResults
      : null

  const handlePlayAgainTransition = useCallback(
    (newMembership) => {
      setPersistedResults(null)
      onPlayAgain?.(newMembership)
    },
    [onPlayAgain]
  )

  return (
    <>
      <ErrorToast message={error} onClose={clearError} />
      {activeResults ? (
        <ResultsScreen
          lobby={activeResults}
          session={session}
          onLeave={onLeave}
          onPlayAgain={handlePlayAgainTransition}
          send={send}
          error={error}
          clearError={clearError}
        />
      ) : !lobby ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-navy-900 font-sans">
          <div className="bg-card border-2 border-navy-900 p-8 rounded-3xl shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-white flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_rgba(255,90,54,1)]">
              <UtensilsCrossed size={24} />
            </div>
            <h1 className="text-3xl font-bold">Joining room...</h1>
            <p className="text-navy-900/60 text-sm font-mono">
              {connection === 'reconnecting' ? 'Reconnecting to your group...' : 'Connecting to server...'}
            </p>
            {error && (
              <div className="p-3 bg-red-100 border-2 border-red-500 rounded-xl text-red-700 text-xs font-bold break-words">
                {error}
              </div>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={onLeave}
                className="w-full bg-white hover:bg-orange-50 border-2 border-navy-900 py-3 rounded-xl text-sm font-bold font-mono text-navy-900 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[2px] active:translate-y-[2px]"
              >
                Back to Home / Leave
              </button>
            </div>
          </div>
        </div>
      ) : lobby.phase === 'voting' ? (
        <VotingScreen
          lobby={lobby}
          session={session}
          connection={connection}
          send={send}
          error={error}
          clearError={clearError}
        />
      ) : (
        <PreferencesScreen
          lobby={lobby}
          session={session}
          connection={connection}
          send={send}
          onLeave={onLeave}
          error={error}
          clearError={clearError}
        />
      )}
    </>
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

  return (
    <ErrorBoundary>
      {session ? <LobbyScreen session={session} onLeave={leaveLobby} onPlayAgain={joinLobby} /> : <EntryScreen onJoin={joinLobby} />}
    </ErrorBoundary>
  )
}
