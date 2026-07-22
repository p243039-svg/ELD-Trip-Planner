import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Navigation, Package, Clock, Loader2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

function LocationInput({ id, label, icon: Icon, value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  const fetchSuggestions = useCallback(async (query) => {
    if (query.length < 3) { setSuggestions([]); return }
    setLoadingSuggestions(true)
    try {
      const params = new URLSearchParams({
        q: query, format: 'json', limit: '5', addressdetails: '1',
        'accept-language': 'en',
      })
      const res = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: { 'User-Agent': 'ELD-TripPlanner/1.0' }
      })
      const data = await res.json()
      setSuggestions(data.map(r => ({
        display: r.display_name,
        short: [r.address?.city || r.address?.town || r.address?.county, r.address?.state, r.address?.country].filter(Boolean).join(', ')
      })))
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
    } finally {
      setLoadingSuggestions(false)
    }
  }, [])

  const handleInput = (e) => {
    const val = e.target.value
    onChange(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(val), 400)
  }

  const selectSuggestion = (s) => {
    onChange(s.short || s.display)
    setSuggestions([])
    setShowSuggestions(false)
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (!inputRef.current?.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={inputRef} className="relative">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleInput}
          placeholder={placeholder}
          className="input-field pl-10 pr-10"
          autoComplete="off"
        />
        {loadingSuggestions && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-500/10 transition-colors duration-150"
              >
                <p className="text-slate-200 font-medium truncate">{s.short}</p>
                <p className="text-slate-500 text-xs truncate mt-0.5">{s.display}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: '',
  })

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))
  const setNumber = (e) => setForm((f) => ({ ...f, current_cycle_used: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.current_location || !form.pickup_location || !form.dropoff_location) {
      toast.error('Please fill in all location fields.')
      return
    }
    const cycle = parseFloat(form.current_cycle_used) || 0
    if (cycle < 0 || cycle > 70) {
      toast.error('Cycle hours used must be between 0 and 70.')
      return
    }
    onSubmit({ ...form, current_cycle_used: cycle })
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5 animate-slide-up">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #3b5bdb22, #5b7df822)', border: '1px solid rgba(91,125,248,0.3)' }}>
          <Navigation className="w-4 h-4 text-primary-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-base">Plan Your Trip</h2>
          <p className="text-slate-500 text-xs">Enter locations and current HOS cycle status</p>
        </div>
      </div>

      <div className="divider" />

      <LocationInput
        id="current-location"
        label="Current Location"
        icon={Navigation}
        value={form.current_location}
        onChange={set('current_location')}
        placeholder="e.g. Chicago, IL"
      />
      <LocationInput
        id="pickup-location"
        label="Pickup Location"
        icon={Package}
        value={form.pickup_location}
        onChange={set('pickup_location')}
        placeholder="e.g. Dallas, TX"
      />
      <LocationInput
        id="dropoff-location"
        label="Drop-off Location"
        icon={MapPin}
        value={form.dropoff_location}
        onChange={set('dropoff_location')}
        placeholder="e.g. Houston, TX"
      />

      <div>
        <label htmlFor="cycle-hours" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Current Cycle Hours Used (0–70)
        </label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="cycle-hours"
            type="number"
            min="0"
            max="70"
            step="0.5"
            value={form.current_cycle_used}
            onChange={setNumber}
            placeholder="e.g. 20"
            className="input-field pl-10"
          />
        </div>
        <p className="text-xs text-slate-600 mt-1">Hours used in your current 70-hr/8-day cycle</p>
      </div>

      <button
        id="plan-trip-btn"
        type="submit"
        disabled={loading}
        className="btn-primary w-full mt-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Planning route...</>
        ) : (
          <><Zap className="w-4 h-4" /> Generate HOS Plan</>
        )}
      </button>
    </form>
  )
}
