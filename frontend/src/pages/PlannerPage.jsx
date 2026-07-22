import { useState } from 'react'
import { tripsApi } from '../api/tripApi'
import TripForm from '../components/TripForm'
import RouteMap from '../components/RouteMap'
import LogSheetList from '../components/LogSheetList'
import toast from 'react-hot-toast'
import { MapPin, Clock, Ruler, Calendar, ChevronRight } from 'lucide-react'

function StatBar({ route, logs }) {
  const totalDays = logs?.length || 0
  const totalDriving = logs?.reduce((s, d) => s + d.total_driving_hours, 0).toFixed(1)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
      <div className="stat-card">
        <span className="stat-label">Distance</span>
        <span className="stat-value">{route.distance_miles?.toFixed(0)}</span>
        <span className="text-xs text-slate-500">miles</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Drive Time</span>
        <span className="stat-value">{route.duration_hours?.toFixed(1)}</span>
        <span className="text-xs text-slate-500">hours total</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Days Needed</span>
        <span className="stat-value">{totalDays}</span>
        <span className="text-xs text-slate-500">HOS days</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Driving Hrs</span>
        <span className="stat-value">{totalDriving}</span>
        <span className="text-xs text-slate-500">total</span>
      </div>
    </div>
  )
}

export default function PlannerPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handlePlan = async (formData) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await tripsApi.planTrip(formData)
      setResult(res.data)
      toast.success(`Route planned! ${res.data.daily_logs.length} day(s) scheduled ✅`)
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to plan trip. Check your locations and try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Trip Planner
        </h1>
        <p className="text-slate-400 mt-1">
          Enter your route details to generate an HOS-compliant schedule with ELD log sheets.
        </p>
      </div>

      {/* Form + Map layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="lg:col-span-2">
          <TripForm onSubmit={handlePlan} loading={loading} />
        </div>
        <div className="lg:col-span-3" style={{ minHeight: 420 }}>
          {result?.route?.geometry ? (
            <div className="animate-fade-in h-full">
              <RouteMap route={result.route} />
            </div>
          ) : (
            <div className="glass-card h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(91,125,248,0.08)', border: '1px solid rgba(91,125,248,0.15)' }}>
                <MapPin className="w-10 h-10 text-primary-500 opacity-60" />
              </div>
              <div>
                <p className="text-slate-300 font-semibold">Route map appears here</p>
                <p className="text-slate-600 text-sm mt-1">Fill in the trip form and click Generate</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-3 h-3 rounded-full" style={{ background: '#3b5bdb' }} />Current
                <div className="w-3 h-3 rounded-full" style={{ background: '#059669' }} />Pickup
                <div className="w-3 h-3 rounded-full" style={{ background: '#dc2626' }} />Drop-off
                <div className="w-3 h-3 rounded-full" style={{ background: '#d97706' }} />Fuel
                <div className="w-3 h-3 rounded-full" style={{ background: '#7c3aed' }} />Rest
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div id="results-section" className="space-y-6 animate-slide-up">
          <StatBar route={result.route} logs={result.daily_logs} />

          {/* Stops summary */}
          {result.route.stops?.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="section-title mb-4">Planned Stops</h3>
              <div className="flex flex-wrap gap-2">
                {result.route.stops.map((stop, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span>{stop.type === 'fuel' ? '⛽' : stop.type === 'rest' ? '🛌' : '🔄'}</span>
                    <span className="text-slate-300">{stop.label}</span>
                    <span className="text-slate-600">@ mi {stop.mile_marker}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ELD Log Sheets */}
          <div className="glass-card p-5">
            <LogSheetList logs={result.daily_logs} />
          </div>
        </div>
      )}
    </div>
  )
}
