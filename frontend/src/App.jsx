import { useCallback, useEffect, useState } from 'react'
import { useLobbySocket } from './useLobbySocket'
import './App.css'

const SESSION_KEY = 'food-finder-lobby-member'
const prices = ['$', '$$', '$$$', '$$$$']
const cuisines = ['American', 'Asian', 'BBQ', 'Breakfast', 'Burgers', 'Chinese', 'Indian', 'Italian', 'Japanese', 'Mediterranean', 'Mexican', 'Pizza', 'Seafood', 'Thai', 'Vegan']
const defaultLocation = { lat: 28.5383, lng: -81.3792 }

function loadSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } catch { return null } }

function ChoiceList({ label, choices, selected, onChange }) {
  return <fieldset className="choice-list"><legend>{label}</legend><div className="chips">{choices.map((choice) => <label className="chip" key={choice}><input type="checkbox" checked={selected.includes(choice)} onChange={() => onChange(selected.includes(choice) ? selected.filter((item) => item !== choice) : [...selected, choice])} /><span>{choice}</span></label>)}</div></fieldset>
}

function EntryScreen({ onJoin }) {
  const [mode, setMode] = useState('create'); const [name, setName] = useState(''); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [location, setLocation] = useState(defaultLocation)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    const endpoint = mode === 'create' ? '/api/lobbies' : `/api/lobbies/${encodeURIComponent(code.trim().toUpperCase())}/join`
    const body = mode === 'create' ? { name, group_location: location } : { name }
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) {
        const detail = typeof data.detail === 'string' ? data.detail : data.detail?.message
        throw new Error(detail || 'Could not join this lobby.')
      }
      onJoin({ lobbyCode: data.lobby_code, memberId: data.member_id, memberToken: data.member_token, name: name.trim() })
    } catch (requestError) { setError(requestError.message) } finally { setBusy(false) }
  }
  return <main className="entry-page"><section className="hero-card"><p className="eyebrow">Group dinner, decided together</p><h1>Food Finder</h1><p>Pick your cravings, vote live, and stop debating dinner.</p><div className="tabs"><button type="button" className={mode === 'create' ? 'selected' : ''} onClick={() => setMode('create')}>Create a lobby</button><button type="button" className={mode === 'join' ? 'selected' : ''} onClick={() => setMode('join')}>Join a lobby</button></div><form onSubmit={submit}><label>Your display name<input required maxLength="30" value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex" /></label>{mode === 'join' ? <label>Lobby code<input required maxLength="6" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="AB12CD" /></label> : <div className="location-fields"><span>Group location <small>Orlando is prefilled for the sample restaurants.</small></span><label>Latitude<input type="number" step="any" value={location.lat} onChange={(event) => setLocation({ ...location, lat: Number(event.target.value) })} /></label><label>Longitude<input type="number" step="any" value={location.lng} onChange={(event) => setLocation({ ...location, lng: Number(event.target.value) })} /></label></div>}{error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Working…' : mode === 'create' ? 'Create lobby' : 'Join lobby'}</button></form></section></main>
}

function LobbyScreen({ session, onLeave }) {
  const lobbyExpired = useCallback(() => { sessionStorage.removeItem(SESSION_KEY); onLeave() }, [onLeave])
  const { lobby, connection, error, clearError, send } = useLobbySocket({ ...session, onLobbyExpired: lobbyExpired })
  const [desired, setDesired] = useState([]); const [vetoed, setVetoed] = useState([]); const [maxPrice, setMaxPrice] = useState('$$')
  const me = lobby?.members?.find((member) => member.id === session.memberId); const isHost = lobby?.host_id === session.memberId; const canAct = connection === 'connected'; const activeCandidates = lobby?.candidates || []
  const submitted = (event) => { event.preventDefault(); send('submit_preferences', { desired_cuisines: desired, vetoed_cuisines: vetoed, max_price: maxPrice }) }
  useEffect(() => { if (lobby?.phase === 'preferences' && me?.has_submitted) clearError() }, [clearError, lobby?.phase, me?.has_submitted])
  if (!lobby) return <main className="loading"><h1>Joining lobby…</h1><p>{connection === 'reconnecting' ? 'Reconnecting to your group.' : 'Connecting to Food Finder.'}</p>{error && <p className="error">{error}</p>}</main>
  const submittedCount = lobby.members.filter((member) => member.has_submitted).length
  return <main className="lobby-page"><header className="lobby-header"><div><p className="eyebrow">Lobby code</p><h1>{lobby.lobby_code}</h1><p className={`connection ${connection}`}>{connection === 'connected' ? 'Live' : connection}</p></div><button className="quiet" onClick={onLeave}>Leave lobby</button></header>{error && <p className="error notice" role="alert">{error}<button onClick={clearError}>×</button></p>}<section className="members card"><h2>Your group <span>{lobby.members.length}/12</span></h2>{lobby.members.map((member) => <div className="member" key={member.id}><span className={`presence ${member.connected ? 'online' : ''}`} /><strong>{member.name}{member.id === session.memberId ? ' (you)' : ''}</strong>{member.id === lobby.host_id && <small>Host</small>}<em>{member.has_voted ? 'Voted' : member.has_submitted ? 'Ready' : 'Choosing'}</em>{isHost && lobby.phase === 'preferences' && member.id !== session.memberId && <button disabled={!canAct} className="remove" onClick={() => send('remove_member', { member_id: member.id })}>Remove</button>}</div>)}</section>{lobby.phase === 'preferences' && <section className="card preferences"><div><p className="eyebrow">Step 1 of 2</p><h2>What sounds good?</h2><p>{submittedCount} of {lobby.members.length} people are ready.</p></div><form onSubmit={submitted}><ChoiceList label="Craving" choices={cuisines} selected={desired} onChange={setDesired} /><ChoiceList label="Skip tonight" choices={cuisines} selected={vetoed} onChange={setVetoed} /><label>Highest price point<select value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}>{prices.map((price) => <option key={price}>{price}</option>)}</select></label><button disabled={!canAct} className="primary">{me?.has_submitted ? 'Update preferences' : 'Save preferences'}</button></form>{isHost && <button disabled={!canAct || submittedCount !== lobby.members.length} className="start" onClick={() => send('start_voting')}>Find our options</button>}</section>}{lobby.phase === 'voting' && <section className="card vote"><p className="eyebrow">Step 2 of 2</p><h2>Cast your vote</h2><p>{lobby.votes_submitted} of {lobby.votes_expected} votes submitted.</p><div className="candidate-grid">{activeCandidates.map((restaurant) => <button className="candidate" disabled={!canAct} key={restaurant.id} onClick={() => send('cast_vote', { restaurant_id: restaurant.id })}><h3>{restaurant.name}</h3><p>{restaurant.cuisines.join(' · ')}</p><span>{restaurant.price}</span></button>)}</div>{isHost && <button className="quiet" disabled={!canAct || lobby.votes_submitted < 1} onClick={() => send('finish_voting')}>Finish voting early</button>}</section>}{lobby.phase === 'results' && <section className="card results"><p className="eyebrow">The group picked</p><h2>{lobby.winner?.name || 'No winner'}</h2>{lobby.winner && <><p>{lobby.winner.cuisines.join(' · ')} · {lobby.winner.price}</p><p className="winner-address">{lobby.winner.coordinates.lat.toFixed(4)}, {lobby.winner.coordinates.lng.toFixed(4)}</p></>}<h3>Final votes</h3>{activeCandidates.map((restaurant) => <div className="total" key={restaurant.id}><span>{restaurant.name}</span><strong>{lobby.vote_totals?.[restaurant.id] || 0}</strong></div>)}</section>}</main>
}

function App() {
  const [session, setSession] = useState(loadSession)
  const joinLobby = useCallback((membership) => { sessionStorage.setItem(SESSION_KEY, JSON.stringify(membership)); setSession(membership) }, [])
  const leaveLobby = useCallback(() => { sessionStorage.removeItem(SESSION_KEY); setSession(null) }, [])
  return session ? <LobbyScreen session={session} onLeave={leaveLobby} /> : <EntryScreen onJoin={joinLobby} />
}

export default App
