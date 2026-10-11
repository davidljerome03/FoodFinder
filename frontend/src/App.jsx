import { useCallback, useEffect, useState, Component } from 'react'
import { useLobbySocket } from './useLobbySocket'
import { Check, Copy, CheckCircle2, MapPin, Clock, Navigation, RotateCcw, Plus, AlertCircle, ShieldAlert, Trophy, Sliders, ChevronDown, ChevronUp, Scale, Calculator } from 'lucide-react'

const SESSION_KEY = 'food-finder-lobby-member'
const prices = ['$', '$$', '$$$', '$$$$']
const defaultCuisines = ['Mexican', 'Italian', 'Sushi', 'Burgers', 'Thai', 'Pizza', 'Seafood', 'Anything']
const defaultAllergies = ['Gluten / Celiac', 'Dairy / Lactose', 'Peanuts / Nuts', 'Shellfish', 'Seafood', 'Vegetarian', 'Vegan']
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
  'fast food': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000',
  thai: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&q=80&w=1000',
  vietnamese: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&q=80&w=1000',
  asian: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&q=80&w=1000',
  chinese: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&q=80&w=1000',
  seafood: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=1000',
  fish: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=1000',
  steak: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1000',
  steakhouse: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1000',
  bbq: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&q=80&w=1000',
  barbecue: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&q=80&w=1000',
  ramen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=1000',
  mediterranean: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1000',
  greek: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1000',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1000',
  dessert: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=1000',
  'ice cream': 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&q=80&w=1000',
  cafe: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1000',
  coffee: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=1000',
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
          <div className="text-xs sm:text-sm font-bold text-navy-900 break-words">
            {message}
          </div>
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

// -------------------------------------------------------------
// WEIGHTS & ALGORITHM INSPECTOR COMPONENT (Testing / QA Transparency)
// -------------------------------------------------------------
// -------------------------------------------------------------
// ERROR BOUNDARY (Guarantees app never hangs on a blank screen)
// -------------------------------------------------------------
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
// WEIGHTS & ALGORITHM INSPECTOR COMPONENT (Testing / QA Transparency)
// -------------------------------------------------------------
function WeightsInspector({ consensusData, members }) {
  const [isOpen, setIsOpen] = useState(true)

  if (!consensusData && (!members || members.length === 0)) return null

  // Normalize positive weights: handles array of objects, array of strings, or object map
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

  // Normalize vetoes & allergies: handles array of objects, array of strings, or object map
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

  const candidatesMath = Array.isArray(consensusData?.candidates_math) ? consensusData.candidates_math : []
  const midpoint = consensusData?.midpoint

  return (
    <div className="w-full max-w-7xl mx-auto mb-6 bg-amber-50/90 border-2 border-navy-900 rounded-2xl sm:rounded-3xl shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] overflow-hidden transition-all text-navy-900">
      {/* Header bar with toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer bg-amber-200/90 hover:bg-amber-300/80 p-4 sm:p-5 flex items-center justify-between border-b-2 border-navy-900 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy-900 text-amber-300 flex items-center justify-center font-bold text-sm shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] shrink-0">
            <Calculator size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg text-navy-900 leading-tight">
                Consensus Algorithm & Weights Inspector
              </h3>
              <span className="bg-orange-500 text-navy-900 text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full border border-navy-900">
                QA / Testing Mode
              </span>
            </div>
            <p className="text-xs text-navy-900/70 font-mono mt-0.5">
              Live breakdown of incoming member preferences, consensus vector weights, and candidate scoring math
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className="flex items-center gap-1.5 bg-white border-2 border-navy-900 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-navy-900 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] shrink-0 hover:bg-orange-50"
        >
          {isOpen ? (
            <>
              <span>Hide Details</span>
              <ChevronUp size={16} />
            </>
          ) : (
            <>
              <span>Inspect Weights</span>
              <ChevronDown size={16} />
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Section 1: Positive Weights & Vetoes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Positive Weights Card */}
            <div className="bg-white rounded-2xl border-2 border-navy-900 p-4 sm:p-5 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-navy-900/70 flex items-center gap-1.5">
                  <Scale size={14} className="text-green-600" />
                  Consensus Vector (Positive Weights)
                </div>
                <span className="text-[11px] font-mono text-navy-900/60 font-bold">
                  {positiveList.length} trait{positiveList.length !== 1 ? 's' : ''}
                </span>
              </div>
              {positiveList.length === 0 ? (
                <p className="text-xs text-navy-900/60 font-mono italic">
                  {consensusData?.is_wildcard ? 'Wildcard mode: Equal weighting across all cuisines' : 'No positive weights recorded.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {positiveList.map((item, idx) => {
                    const percent = Math.min(100, Math.round((item.weight / maxPositiveWeight) * 100))
                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="w-28 font-bold font-mono capitalize truncate">{item.trait}</span>
                        <div className="flex-1 bg-navy-900/10 h-3 rounded-full overflow-hidden border border-navy-900/20">
                          <div
                            className="bg-green-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-14 text-right font-mono font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-300">
                          +{Number(item.weight).toFixed(1)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Vetoes & Allergies Card */}
            <div className="bg-white rounded-2xl border-2 border-navy-900 p-4 sm:p-5 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-navy-900/70 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-red-600" />
                  Dietary Restrictions & Strict Vetoes
                </div>
                <span className="text-[11px] font-mono text-navy-900/60 font-bold">
                  {vetoList.length} active
                </span>
              </div>
              {vetoList.length === 0 ? (
                <div className="p-3 bg-green-50 rounded-xl border border-green-200 text-xs font-bold text-green-800 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span>No allergies or strict vetoes active for this round.</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {vetoList.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-red-50 border border-red-300 px-2.5 py-1.5 rounded-lg text-xs"
                    >
                      <span className="font-bold text-red-900 capitalize">{item.trait}</span>
                      <span className="font-mono font-bold text-[10px] text-red-700 bg-red-200 px-2 py-0.5 rounded uppercase">
                        {item.isAllergy
                          ? `Allergy Penalty (${Number(item.weight).toFixed(1)})`
                          : `Strict Veto (${Number(item.weight).toFixed(0)})`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {midpoint && typeof midpoint.lat === 'number' && typeof midpoint.lng === 'number' && (
                <div className="mt-3 pt-3 border-t border-navy-900/10 text-[11px] font-mono text-navy-900/70 flex items-center justify-between">
                  <span>Group Midpoint:</span>
                  <span className="font-bold text-navy-900">
                    {midpoint.lat.toFixed(4)}, {midpoint.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Incoming Member Submissions */}
          {members && members.length > 0 && (
            <div className="bg-white rounded-2xl border-2 border-navy-900 p-4 sm:p-5 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-navy-900/70 mb-3 flex items-center gap-1.5">
                <Sliders size={14} className="text-orange-600" />
                Incoming Member Submissions (Raw Inputs)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {members.map((member) => {
                  const prefs = member.preferences
                  const cravings = prefs?.desired_cuisines || prefs?.cuisines || []
                  const vetoed = prefs?.vetoed_cuisines || []
                  const allergies = prefs?.allergies || []
                  return (
                    <div
                      key={member.id}
                      className="border border-navy-900/20 bg-background rounded-xl p-3 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-navy-900 text-sm truncate">{member.name}</span>
                          <span className="text-[10px] font-mono font-bold bg-navy-900/10 px-1.5 py-0.5 rounded">
                            Budget: {prefs?.prices ? prefs.prices.join(', ') : (prefs?.max_price || '$$')}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px]">
                            <span className="font-mono text-navy-900/60 uppercase text-[10px]">Cravings: </span>
                            <span className="font-bold text-green-700">
                              {cravings.length > 0 ? cravings.join(', ') : 'None / Wildcard'}
                            </span>
                          </div>
                          {vetoed.length > 0 && (
                            <div className="text-[11px]">
                              <span className="font-mono text-navy-900/60 uppercase text-[10px]">Vetoed: </span>
                              <span className="font-bold text-red-600">{vetoed.join(', ')}</span>
                            </div>
                          )}
                          {allergies.length > 0 && (
                            <div className="text-[11px]">
                              <span className="font-mono text-navy-900/60 uppercase text-[10px]">Allergies: </span>
                              <span className="font-bold text-red-700">{allergies.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section 3: Candidate Scoring Formulas */}
          {candidatesMath.length > 0 && (
            <div className="bg-white rounded-2xl border-2 border-navy-900 p-4 sm:p-5 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-navy-900/70 mb-3 flex items-center gap-1.5">
                <Calculator size={14} className="text-orange-600" />
                Algorithm Score Calculations for Top Candidates
              </div>
              <div className="space-y-2.5">
                {candidatesMath.map((cand, idx) => (
                  <div
                    key={cand.id || idx}
                    className="border border-navy-900/20 bg-background rounded-xl p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full bg-navy-900 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-sm text-navy-900 truncate">{cand.name}</span>
                        <span className="text-xs font-bold text-orange-600">({cand.price || '$$'})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {Array.isArray(cand.matched_traits) && cand.matched_traits.map((item, tIdx) => {
                          const traitName = typeof item === 'object' ? item.trait || item.name : String(item)
                          const traitWeight = typeof item === 'object' && item.weight != null ? item.weight : null
                          return (
                            <span
                              key={tIdx}
                              className="bg-green-100 text-green-800 border border-green-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                            >
                              ✓ {traitName} {traitWeight != null ? `(+${Number(traitWeight).toFixed(1)})` : ''}
                            </span>
                          )
                        })}
                        {(!cand.matched_traits || cand.matched_traits.length === 0) && (
                          <span className="text-[10px] font-mono text-navy-900/50">Base distance match</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col md:items-end justify-center shrink-0">
                      <div className="font-mono font-bold text-xs bg-navy-900 text-white px-2 py-1 rounded-lg">
                        Final Score: {Number(cand.final_score || 0).toFixed(2)} pts
                      </div>
                      <div className="font-mono text-[10px] text-navy-900/70 mt-1 md:text-right">
                        {cand.distance_miles != null && (
                          <span className="mr-1.5 font-bold">📍 {cand.distance_miles} mi</span>
                        )}
                        {cand.formula || `+${cand.match_score} match - ${cand.distance_penalty} dist`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
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

  const cleanCode = (val) => String(val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room') || params.get('code')
    if (roomParam) {
      const clean = cleanCode(roomParam)
      if (clean) setCode(clean)
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
    if (!name.trim()) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), group_location: location }),
      })
      let data = null
      try {
        data = await response.json()
      } catch {
        data = null
      }
      if (!response.ok) {
        const errorMsg =
          data?.detail?.message ||
          (typeof data?.detail === 'string' ? data.detail : null) ||
          (Array.isArray(data?.detail) ? data.detail[0]?.msg : null) ||
          'Could not create lobby. Please try again.'
        throw new Error(errorMsg)
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
      setError('Please enter your name.')
      return
    }
    if (!sanitizedCode) {
      setError('Please enter a room code.')
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
      let data = null
      try {
        data = await response.json()
      } catch {
        data = null
      }
      if (!response.ok) {
        const errorMsg =
          data?.detail?.message ||
          (typeof data?.detail === 'string' ? data.detail : null) ||
          (Array.isArray(data?.detail) ? data.detail[0]?.msg : null) ||
          (response.status === 404
            ? 'Lobby not found. Please check the room code and try again.'
            : 'Could not join lobby. Please try again.')
        throw new Error(errorMsg)
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
                onChange={(e) => setCode(cleanCode(e.target.value))}
                onPaste={(e) => {
                  e.preventDefault()
                  const pasted = e.clipboardData.getData('text') || ''
                  setCode(cleanCode(pasted))
                }}
                maxLength={8}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck="false"
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
// SCREEN 2: LOBBY SCREEN (Preferences Phase - Allergies & Unlock)
// -------------------------------------------------------------
function PreferencesScreen({ lobby, session, connection, send, onLeave, error, clearError }) {
  const [selectedPrices, setSelectedPrices] = useState(['$$'])
  const [hasCustomizedPrice, setHasCustomizedPrice] = useState(false)

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
  const [selectedCuisines, setSelectedCuisines] = useState([])
  const [selectedAllergies, setSelectedAllergies] = useState([])
  const [customCuisineInput, setCustomCuisineInput] = useState('')
  const [customAllergyInput, setCustomAllergyInput] = useState('')
  const [availableCuisines, setAvailableCuisines] = useState(defaultCuisines)
  const [availableAllergies, setAvailableAllergies] = useState(defaultAllergies)
  const [userLocation, setUserLocation] = useState(session?.location || defaultLocation)

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
    const normalizedDisplay = trimmed
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    const normLower = normalizedDisplay.toLowerCase()

    if (!availableCuisines.some((c) => c.toLowerCase() === normLower)) {
      setAvailableCuisines([normalizedDisplay, ...availableCuisines])
    }

    const withoutAnything = selectedCuisines.filter((c) => c.toLowerCase() !== 'anything')
    if (!withoutAnything.some((c) => c.toLowerCase() === normLower)) {
      setSelectedCuisines([...withoutAnything, normalizedDisplay])
    }
    setCustomCuisineInput('')
  }

  const handleAddCustomAllergy = (e) => {
    e?.preventDefault?.()
    const trimmed = customAllergyInput.trim()
    if (!trimmed) return
    const normalizedDisplay = trimmed
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    const normLower = normalizedDisplay.toLowerCase()

    if (!availableAllergies.some((a) => a.toLowerCase() === normLower)) {
      setAvailableAllergies([normalizedDisplay, ...availableAllergies])
    }
    if (!selectedAllergies.some((a) => a.toLowerCase() === normLower)) {
      setSelectedAllergies([...selectedAllergies, normalizedDisplay])
    }
    setCustomAllergyInput('')
  }

  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    if (!lobby?.lobby_code) return
    const success = await copyToClipboard(lobby.lobby_code)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLeave = () => {
    send('leave_lobby', {})
    onLeave()
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

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-4 sm:p-6 pb-24">
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
            onClick={handleLeave}
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

          <div
            onClick={handleCopyCode}
            className="flex items-center gap-2 sm:gap-3 bg-navy-900 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl cursor-pointer hover:bg-navy-800 transition-colors select-none shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]"
            title="Click to copy room code"
          >
            <span className="text-[11px] font-mono uppercase text-white/60 hidden sm:inline">Room</span>
            <span className="text-lg sm:text-xl font-bold text-green-400 tracking-widest font-mono">
              {lobby.lobby_code}
            </span>
            {copied ? (
              <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-green-400 bg-green-950/80 px-2 py-0.5 rounded-md border border-green-500/30">
                <Check size={14} /> Copied!
              </span>
            ) : (
              <Copy size={16} className="text-white/60 hover:text-white" />
            )}
          </div>

          <button
            type="button"
            onClick={handleLeave}
            className="hidden sm:inline-block text-xs font-mono uppercase text-navy-900/60 hover:text-navy-900 border border-navy-900/20 px-3 py-1.5 rounded-lg"
          >
            Leave
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
        <div className="flex-1 border-2 border-navy-900 rounded-3xl p-5 sm:p-8 flex flex-col relative bg-card shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
          <div className="mb-6">
            <div className="text-xs font-mono font-bold tracking-widest text-navy-900/60 uppercase mb-1">
              Step 1 of 2
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Set your mood.</h1>
            <p className="text-sm sm:text-base text-navy-900/70 mt-1">
              Choose your budget, cravings, and any allergies.
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
            <div className={me?.has_submitted ? 'opacity-60 pointer-events-none' : ''}>
              <div className="flex justify-between text-xs font-mono font-bold tracking-widest uppercase mb-2 text-navy-900/60">
                <span>Budget</span>
                <span>
                  {selectedPrices.length === 1
                    ? (selectedPrices[0] === '$' ? '< $15' : selectedPrices[0] === '$$' ? '$15-30' : selectedPrices[0] === '$$$' ? '$30-50' : '> $50')
                    : selectedPrices.join(', ')}
                </span>
              </div>
              <div className="flex border-2 border-navy-900 rounded-xl overflow-hidden bg-white h-12 sm:h-14">
                {prices.map((price) => {
                  const isSelected = selectedPrices.includes(price)
                  return (
                    <button
                      type="button"
                      key={price}
                      onClick={() => handlePriceClick(price)}
                      className={`flex-1 font-bold text-lg sm:text-xl border-r-2 border-navy-900 last:border-r-0 transition-colors
                        ${isSelected ? 'bg-orange-500 text-navy-900' : 'hover:bg-navy-900/5'}
                      `}
                    >
                      {price}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cuisines Grid */}
            <div className={me?.has_submitted ? 'opacity-60 pointer-events-none' : ''}>
              <div className="flex justify-between items-center text-xs font-mono font-bold tracking-widest uppercase mb-2 text-navy-900/60">
                <span>Cravings</span>
                <span>{selectedCuisines.length} Selected</span>
              </div>

              <form onSubmit={handleAddCustomCuisine} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={customCuisineInput}
                  onChange={(e) => setCustomCuisineInput(e.target.value)}
                  placeholder="Add custom craving (e.g. Ramen, Halal)"
                  className="flex-1 px-3 py-2 text-sm rounded-xl border-2 border-navy-900 bg-white focus:outline-none focus:border-orange-500 font-medium"
                  maxLength={30}
                />
                <button
                  type="submit"
                  disabled={!customCuisineInput.trim()}
                  className="px-4 py-2 bg-orange-500 disabled:opacity-40 text-navy-900 font-bold text-xs uppercase font-mono border-2 border-navy-900 rounded-xl flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]"
                >
                  <Plus size={16} /> Add
                </button>
              </form>

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
                          ? 'bg-green-400 text-navy-900 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]'
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

            {/* Allergies & Dietary Restrictions */}
            <div className={me?.has_submitted ? 'opacity-60 pointer-events-none' : ''}>
              <div className="flex justify-between items-center text-xs font-mono font-bold tracking-widest uppercase mb-2 text-red-600">
                <span className="flex items-center gap-1"><ShieldAlert size={14} /> Allergies & Dietary Restrictions</span>
                <span>{selectedAllergies.length} Vetoed</span>
              </div>

              <form onSubmit={handleAddCustomAllergy} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={customAllergyInput}
                  onChange={(e) => setCustomAllergyInput(e.target.value)}
                  placeholder="Add custom restriction (e.g. Soy, Pork)"
                  className="flex-1 px-3 py-2 text-sm rounded-xl border-2 border-navy-900 bg-white focus:outline-none focus:border-red-500 font-medium"
                  maxLength={30}
                />
                <button
                  type="submit"
                  disabled={!customAllergyInput.trim()}
                  className="px-4 py-2 bg-red-400 disabled:opacity-40 text-navy-900 font-bold text-xs uppercase font-mono border-2 border-navy-900 rounded-xl flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]"
                >
                  <Plus size={16} /> Add
                </button>
              </form>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {availableAllergies.map((allergy) => {
                  const isSelected = selectedAllergies.some((a) => a.toLowerCase() === allergy.toLowerCase())
                  return (
                    <button
                      type="button"
                      key={allergy}
                      onClick={(e) => {
                        e.preventDefault()
                        toggleAllergy(allergy)
                      }}
                      className={`h-11 rounded-xl border-2 border-navy-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 px-2 transition-all
                        ${isSelected
                          ? 'bg-red-400 text-navy-900 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]'
                          : 'bg-white hover:bg-red-50'
                        }
                      `}
                    >
                      {isSelected ? <Check size={16} className="shrink-0" /> : <span className="text-red-500 text-sm leading-none">✕</span>}
                      <span className="truncate">{allergy}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons & Unlock Choices */}
          <div className="mt-8 pt-4 border-t-2 border-navy-900/10">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-500 rounded-xl flex items-start gap-3 text-red-900 shadow-[2px_2px_0px_0px_rgba(239,68,68,1)]">
                <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1 text-xs sm:text-sm font-bold">{error}</div>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-red-600 hover:text-navy-900 font-bold px-1.5 py-0.5 rounded text-sm"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}
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

            {/* Unlock Choices Button */}
            {me?.has_submitted && (
              <button
                type="button"
                onClick={handleUnlock}
                disabled={!canAct}
                className="w-full mt-3 bg-white border-2 border-navy-900 text-navy-900 rounded-xl py-3 flex items-center justify-center gap-2 font-bold text-sm uppercase font-mono shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] hover:bg-orange-50 transition-all"
              >
                <RotateCcw size={16} />
                <span>Unlock / Edit Choices</span>
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
// SCREEN 3: GAME / VOTING SCREEN (Change Votes & Weights Transparency)
// -------------------------------------------------------------
function VotingScreen({ lobby, session, connection, send, error, clearError }) {
  const [votedId, setVotedId] = useState(null)
  const canAct = connection === 'connected'
  const isHost = lobby?.host_id === session.memberId
  const candidates = lobby?.candidates || []
  const candidateOffset = lobby?.candidate_offset || 0
  const startRank = candidateOffset + 1
  const endRank = candidateOffset + candidates.length
  const roundNum = Math.floor(candidateOffset / 3) + 1

  const me = lobby?.members?.find((m) => m.id === session.memberId)
  const hasVotedReroll = me?.voted_reroll || votedId === 'REROLL'

  // Reset local vote selection when round/batch changes
  useEffect(() => {
    setVotedId(null)
  }, [candidateOffset])

  // Users can click different restaurants to change their vote dynamically before final result
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
          Round {roundNum} • Candidates #{startRank} – #{endRank}
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-2">Cast your vote.</h1>
        <p className="text-sm sm:text-lg text-navy-900/80">
          Tap an option to vote, or vote to reroll if these aren't popular with the crew!
        </p>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex items-start gap-3 text-red-900 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
          <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1 text-xs sm:text-sm font-bold">{error}</div>
          <button
            type="button"
            onClick={clearError}
            className="text-red-600 hover:text-navy-900 font-bold px-1.5 py-0.5 rounded text-sm"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Weights and Consensus Math Inspector */}
      <WeightsInspector
        consensusData={lobby?.consensus_data || candidates[0]?._consensus_data}
        members={lobby?.members}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {candidates.map((restaurant, idx) => {
          const isVoted = votedId === restaurant.id
          const imageSrc = restaurant.image_url || restaurant.image || fallbackImage
          const matchScore = restaurant._debug_stats?.final_score || (3.0 - idx * 0.5)
          const percentage = Math.min(99, Math.max(70, Math.round(80 + (matchScore * 5))))

          return (
            <button
              type="button"
              key={restaurant.id}
              onClick={() => handleVote(restaurant.id)}
              disabled={!canAct}
              className={`text-left flex flex-col bg-card border-2 rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 relative
                ${isVoted
                  ? 'border-orange-500 shadow-[6px_6px_0px_0px_rgba(255,90,54,1)] ring-4 ring-orange-400/40 translate-x-[-2px] translate-y-[-2px]'
                  : 'border-navy-900 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px]'
                }
              `}
            >
              <div className="h-48 sm:h-56 w-full bg-gray-200 relative overflow-hidden">
                <img
                  src={imageSrc}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = getCuisineFallback(restaurant.cuisines)
                  }}
                />
                
                {/* Consensus Match Score Badge */}
                <div className="absolute top-3 left-3 bg-green-400 text-navy-900 border-2 border-navy-900 px-3 py-1 rounded-full font-bold text-xs uppercase font-mono shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] flex items-center gap-1">
                  <span>★ {percentage}% Match</span>
                </div>

                <div className="absolute top-3 right-3 bg-card border-2 border-navy-900 px-3 py-1 rounded-full font-bold text-xs shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
                  {restaurant.price || '$$'}
                </div>

                {isVoted && (
                  <div className="absolute inset-0 bg-orange-500/25 flex items-center justify-center backdrop-blur-xs">
                    <div className="bg-orange-500 text-navy-900 font-extrabold px-6 py-2.5 rounded-full border-2 border-navy-900 text-lg shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] rotate-[-6deg]">
                      Your Pick!
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h2 className="text-xl sm:text-2xl font-bold leading-tight">{restaurant.name}</h2>
                    <span className="text-xs font-mono font-bold text-navy-900/60 uppercase">#{candidateOffset + idx + 1}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-orange-600 mb-2">
                    {restaurant.cuisines?.join(' • ')}
                  </p>
                </div>

                {/* Matched Traits Chips */}
                {restaurant._debug_stats?.matched_traits && restaurant._debug_stats.matched_traits.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {restaurant._debug_stats.matched_traits.map((t, tIdx) => {
                      const traitName = typeof t === 'object' ? t.trait || t.name : String(t)
                      const traitWeight = typeof t === 'object' && t.weight != null ? t.weight : null
                      return (
                        <span
                          key={tIdx}
                          className="bg-green-100 text-green-900 border border-green-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md"
                        >
                          ★ {traitName} {traitWeight != null ? `(+${Number(traitWeight).toFixed(1)})` : ''}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Allergy Conflict Badge */}
                {restaurant._debug_stats?.allergy_penalty > 0 && (
                  <div className="mb-2 bg-red-100 text-red-900 border border-red-300 text-[10px] font-mono font-bold px-2 py-1 rounded-lg flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-red-600 shrink-0" />
                    <span>
                      ⚠️ Allergy Penalty: -{restaurant._debug_stats.allergy_penalty} pts
                      {restaurant._debug_stats.conflicted_allergies?.length > 0 && ` (${restaurant._debug_stats.conflicted_allergies.join(', ')})`}
                    </span>
                  </div>
                )}

                {restaurant.address && (
                  <div className="flex items-start gap-1.5 text-xs text-navy-900/70 font-medium pt-2 border-t border-navy-900/10">
                    <MapPin size={14} className="shrink-0 mt-0.5 text-orange-500" />
                    <span className="line-clamp-2">{restaurant.address}</span>
                  </div>
                )}

                {/* Score and Distance Breakdown */}
                {restaurant._debug_stats && (
                  <div className="mt-2.5 text-[11px] font-mono font-bold bg-navy-900/5 px-2.5 py-1.5 rounded-lg text-navy-900/80 flex flex-col gap-1 border border-navy-900/10">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-orange-600 font-bold">Score: {restaurant._debug_stats.final_score} pts</span>
                      <span className="text-navy-900/80">
                        📍 {restaurant._debug_stats.distance_miles ?? '—'} mi (-{restaurant._debug_stats.distance_penalty} pts)
                      </span>
                    </div>
                    {restaurant._debug_stats.allergy_penalty > 0 && (
                      <div className="text-[10px] text-red-600 font-bold flex items-center justify-between">
                        <span>Allergy Conflict:</span>
                        <span>-{restaurant._debug_stats.allergy_penalty} pts</span>
                      </div>
                    )}
                    {restaurant._debug_stats.formula && (
                      <div className="text-[10px] text-navy-900/60 font-medium">
                        {restaurant._debug_stats.formula}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-2 text-center text-[11px] font-mono font-bold uppercase tracking-wider text-navy-900/50">
                  {isVoted ? 'Selected (Tap another to switch)' : 'Tap to select'}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Reroll Section */}
      <div className="max-w-7xl mx-auto mt-8 bg-white border-2 border-navy-900 rounded-3xl p-5 sm:p-6 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 text-left w-full md:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 border-2 border-navy-900 flex items-center justify-center text-2xl shrink-0 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
              🎲
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg sm:text-xl text-navy-900">None of these options popular?</h3>
                <span className="text-[11px] font-mono font-bold bg-orange-100 text-orange-900 border border-orange-300 px-2 py-0.5 rounded-full">
                  {lobby?.reroll_votes || 0} / {lobby?.reroll_majority_needed || 1} votes to reroll
                </span>
              </div>
              <p className="text-xs sm:text-sm text-navy-900/70 mt-1">
                {lobby?.has_more_options
                  ? `Vote to reroll for the next 3 best options (#${endRank + 1} – #${endRank + 3}). Triggers when the majority (${lobby?.reroll_majority_needed || 1} of ${lobby?.votes_expected || 1}) votes for it.`
                  : 'This is the final batch of candidates! Rerolling will end the session if no consensus is reached.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleVote('REROLL')}
              disabled={!canAct}
              className={`w-full md:w-auto px-6 py-3.5 rounded-2xl border-2 border-navy-900 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shrink-0
                ${hasVotedReroll
                  ? 'bg-orange-500 text-navy-900 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] ring-4 ring-orange-300/40'
                  : 'bg-yellow-300 hover:bg-yellow-400 text-navy-900 shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px]'
                }
              `}
            >
              <span>🎲 {hasVotedReroll ? 'Voted to Reroll (Tap to cancel)' : 'Vote to Reroll'}</span>
            </button>
            {isHost && (
              <button
                type="button"
                onClick={() => send('end_session')}
                disabled={!canAct}
                className="hidden sm:inline-flex text-xs font-mono uppercase bg-white hover:bg-red-50 text-red-700 px-3 py-3 rounded-2xl border-2 border-navy-900 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]"
                title="End the session if crew cannot decide"
              >
                End Session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// SCREEN 4: ENDED / NO CONSENSUS SCREEN
// -------------------------------------------------------------
function EndedScreen({ lobby, session, onLeave, send }) {
  const isHost = lobby?.host_id === session?.memberId

  return (
    <div className="min-h-screen bg-background text-navy-900 font-sans p-4 sm:p-6 pb-20 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-card border-2 border-navy-900 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-[6px_6px_0px_0px_rgba(28,46,53,1)]">
        <div className="w-16 h-16 bg-navy-900/10 border-2 border-navy-900 rounded-2xl flex items-center justify-center text-4xl mx-auto shadow-[3px_3px_0px_0px_rgba(28,46,53,1)]">
          🎲
        </div>

        <div>
          <div className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-1">
            Room {lobby?.lobby_code} • Session Ended
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">No consensus reached.</h1>
          <p className="text-sm sm:text-base text-navy-900/70 mt-2">
            The crew couldn't agree on a spot, and all candidate options for this search have been exhausted!
          </p>
        </div>

        <div className="bg-white border-2 border-navy-900 rounded-2xl p-4 text-left space-y-2 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
          <div className="text-xs font-mono font-bold uppercase text-navy-900/60">💡 Suggestions for next round</div>
          <ul className="text-xs text-navy-900/80 space-y-1 list-disc list-inside font-medium">
            <li>Select more budget tiers (e.g. $$ and $$$).</li>
            <li>Add more varied cravings or try the "Anything" wildcard.</li>
            <li>Reduce vetoes so more candidate restaurants qualify.</li>
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onLeave}
            className="w-full bg-orange-500 hover:bg-orange-600 text-navy-900 border-2 border-navy-900 rounded-xl py-3.5 font-bold text-base shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-transform"
          >
            Start New Session / Home
          </button>
          {isHost && (
            <button
              type="button"
              onClick={() => send('unlock_preferences')}
              className="w-full bg-white hover:bg-navy-900/5 text-navy-900 border-2 border-navy-900 rounded-xl py-3 font-bold text-sm font-mono uppercase shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]"
            >
              Adjust Preferences & Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// SCREEN 4: WINNER / RESULTS SCREEN (Podium + Google Maps Deep Link)
// -------------------------------------------------------------
function ResultsScreen({ lobby, session, onLeave, send }) {
  const winner = lobby?.winner
  const candidates = lobby?.candidates || []
  const totalCount = lobby?.members?.length || 0
  const winnerImage = winner?.image_url || winner?.image || fallbackImage

  // Isolate Play Again State:
  // Clicking Play Again safely resets ONLY the local client state and disconnects this user.
  // It does NOT emit a global room reset, allowing remaining users to continue viewing the winner.
  const handlePlayAgain = () => {
    onLeave()
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

      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
        <div className="flex-1 space-y-6">
          <div className="bg-green-400 border-2 border-navy-900 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="text-xs font-mono font-bold tracking-widest uppercase mb-2">
              <span className="text-orange-500">★</span> ROOM {lobby.lobby_code} WINNER <span className="text-orange-500">★</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-2 tracking-tight">Dinner, decided.</h1>
            <p className="text-sm sm:text-base font-bold text-navy-900/80">
              The group consensus has picked the winning spot!
            </p>
          </div>

          {/* Winner Card */}
          <div className="bg-card border-2 border-navy-900 rounded-3xl overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(28,46,53,1)]">
            <div className="relative h-60 sm:h-80 bg-gray-200">
              <img
                src={winnerImage}
                alt={winner?.name || 'Winner'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = getCuisineFallback(winner?.cuisines)
                }}
              />
              <div className="absolute top-4 left-4 bg-orange-500 text-navy-900 font-bold text-xs font-mono px-3.5 py-1.5 rounded-full border-2 border-navy-900 flex items-center gap-1.5 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
                <Trophy size={14} /> The Group Winner
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
                {/* Winner Matched Traits */}
                {winner?._debug_stats?.matched_traits && winner._debug_stats.matched_traits.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {winner._debug_stats.matched_traits.map((t, tIdx) => {
                      const traitName = typeof t === 'object' ? t.trait || t.name : String(t)
                      const traitWeight = typeof t === 'object' && t.weight != null ? t.weight : null
                      return (
                        <span
                          key={tIdx}
                          className="bg-green-100 text-green-900 border border-green-300 text-xs font-mono font-bold px-2 py-0.5 rounded-md"
                        >
                          ★ {traitName} {traitWeight != null ? `(+${Number(traitWeight).toFixed(1)})` : ''}
                        </span>
                      )
                    })}
                  </div>
                )}
                {winner?._debug_stats && (
                  <div className="mt-3 flex flex-col gap-1 text-xs font-mono font-bold bg-navy-900/5 px-3 py-2 rounded-xl border border-navy-900/10 text-navy-900/80">
                    <div className="flex items-center gap-2 flex-wrap justify-between">
                      <span className="text-orange-600">Final Score: {winner._debug_stats.final_score} pts</span>
                      <span className="text-navy-900/70">
                        📍 {winner._debug_stats.distance_miles ?? '—'} mi (-{winner._debug_stats.distance_penalty} pts)
                      </span>
                    </div>
                    {winner._debug_stats.allergy_penalty > 0 && (
                      <div className="text-red-700 text-[11px] flex items-center gap-1">
                        <ShieldAlert size={14} className="text-red-600 shrink-0" />
                        <span>⚠️ Allergy Penalty: -{winner._debug_stats.allergy_penalty} pts ({winner._debug_stats.conflicted_allergies?.join(', ')})</span>
                      </div>
                    )}
                    {winner._debug_stats.formula && (
                      <div className="text-[11px] text-navy-900/60 font-medium">
                        {winner._debug_stats.formula}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-widest bg-white border-2 border-navy-900 px-3 py-1 rounded-xl">
                {winner?.price || '$$'}
              </div>
            </div>
          </div>

          {/* Action Buttons: Let's Eat with Google Maps deep link */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOpenDirections(winner)}
              className="w-full bg-orange-500 border-2 border-navy-900 rounded-2xl h-16 sm:h-18 flex items-center justify-between px-6 sm:px-8 text-xl sm:text-2xl font-bold shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-transform text-navy-900"
            >
              <span>Let's Eat (Open Directions)</span>
              <Navigation size={28} />
            </button>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2 text-xs font-mono font-bold tracking-widest uppercase text-navy-900/70">
              <button
                type="button"
                onClick={() => handleOpenDirections(winner)}
                className="hover:text-navy-900 flex items-center gap-1.5 underline underline-offset-4"
              >
                Open in Google Maps ↗
              </button>
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

          {/* Persistent Top 3 Podium Display */}
          {candidates.length > 1 && (
            <div className="pt-4">
              <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-navy-900/60 mb-3">
                Full Voting Podium (Top 3)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {candidates.filter((c) => c.id !== winner?.id).map((c, idx) => (
                  <div key={c.id} className="bg-white border-2 border-navy-900 rounded-xl p-3 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(28,46,53,1)]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-navy-900 shrink-0 relative bg-gray-200">
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
                        <div className="text-xs text-navy-900/60">{c.cuisines?.join(' • ')}</div>
                        {c._debug_stats && (
                          <div className="text-[10px] font-mono font-bold flex items-center gap-2 flex-wrap">
                            <span className="text-orange-600">Score: {c._debug_stats.final_score}</span>
                            <span className="text-navy-900/60">📍 {c._debug_stats.distance_miles} mi</span>
                            {c._debug_stats.allergy_penalty > 0 && (
                              <span className="text-red-600">⚠️ -{c._debug_stats.allergy_penalty} pts</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenDirections(c)}
                      className="text-xs font-mono font-bold text-orange-600 hover:underline p-1 shrink-0"
                    >
                      Map ↗
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weights & Consensus Math Inspector in Results */}
          <WeightsInspector
            consensusData={lobby?.consensus_data || candidates[0]?._consensus_data}
            members={lobby?.members}
          />
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
// MAIN CONTAINER (Decoupled Post-Game Room Stability)
// -------------------------------------------------------------
function LobbyScreen({ session, onLeave }) {
  const [persistedResults, setPersistedResults] = useState(null)

  const lobbyExpired = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    onLeave()
  }, [onLeave])

  const { lobby, connection, error, clearError, send } = useLobbySocket({
    ...session,
    onLobbyExpired: lobbyExpired,
  })

  // Post-Game Room Stability: Cache results state so if players close tabs or disconnect early,
  // remaining users are never booted or reset!
  useEffect(() => {
    if (lobby?.phase === 'results' && lobby?.winner) {
      setPersistedResults(lobby)
    } else if (lobby?.phase === 'preferences') {
      // Clear cached results when starting a brand new round
      setPersistedResults(null)
    }
  }, [lobby])

  const activeResults = (lobby?.phase === 'results' && lobby?.winner) ? lobby : persistedResults

  return (
    <>
      <ErrorToast message={error} onClose={clearError} />
      {activeResults ? (
        <ResultsScreen lobby={activeResults} session={session} onLeave={onLeave} send={send} error={error} clearError={clearError} />
      ) : lobby?.phase === 'ended' ? (
        <EndedScreen lobby={lobby} session={session} onLeave={onLeave} send={send} />
      ) : !lobby ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-navy-900 font-sans">
          <div className="bg-card border-2 border-navy-900 p-6 sm:p-8 rounded-3xl shadow-[4px_4px_0px_0px_rgba(28,46,53,1)] max-w-md w-full text-center space-y-4">
            <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto shadow-[2px_2px_0px_0px_rgba(255,90,54,1)]">
              FF
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Joining room...</h1>
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
                className="w-full bg-white hover:bg-orange-50 border-2 border-navy-900 py-2.5 rounded-xl text-sm font-bold font-mono text-navy-900 shadow-[2px_2px_0px_0px_rgba(28,46,53,1)] active:translate-x-[2px] active:translate-y-[2px]"
              >
                Back to Home / Leave
              </button>
            </div>
          </div>
        </div>
      ) : lobby.phase === 'voting' ? (
        <VotingScreen lobby={lobby} session={session} connection={connection} send={send} error={error} clearError={clearError} />
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
      {session ? <LobbyScreen session={session} onLeave={leaveLobby} /> : <EntryScreen onJoin={joinLobby} />}
    </ErrorBoundary>
  )
}
