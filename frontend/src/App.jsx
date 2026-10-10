import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState('Checking backend status...')

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/'
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        setStatus(data.message || 'Connected to Backend')
      })
      .catch(err => {
        setStatus('Backend not reachable: ' + err.message)
      })
  }, [])

  return (
    <div className="App">
      <h1>Food Finder Skeleton Active</h1>
      <p>Backend status: {status}</p>
    </div>
  )
}

export default App
