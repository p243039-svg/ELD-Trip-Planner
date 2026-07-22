import { useEffect, useState } from 'react'
import { tripsApi } from '../api/tripApi'
import { useNavigate } from 'react-router-dom'
import { History, MapPin, Clock, Trash2, ChevronDown, ChevronUp, Loader2, Package } from 'lucide-react'
import RouteMap from '../components/RouteMap'
import LogSheetList from '../components/LogSheetList'
import ConfirmModal from '../components/ConfirmModal'
import toast from 'react-hot-toast'

function StatBar({ route, logs }) {
  const totalDays = logs?.length || 0
  const totalDriving = logs?.reduce((s, d) => s + d.total_driving_hours, 0).toFixed(1)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

function TripCard({ trip, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [fullTripData, setFullTripData] = useState(trip)

  const route_data = fullTripData.route_data || {}
  const route = route_data.route || {}
  const logs = route_data.daily_logs || []

  const toggleExpand = async () => {
    if (!expanded && !fullTripData.route_data) {
      setLoadingDetail(true)
      try {
        const res = await tripsApi.getTrip(trip.id)
        setFullTripData(res.data)
      } catch {
        toast.error('Failed to load trip details')
      } finally {
        setLoadingDetail(false)
      }
    }
    setExpanded(p => !p)
  }

  const openDeleteModal = (e) => {
    e.stopPropagation()
    setShowConfirmModal(true)
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    try {
      await tripsApi.deleteTrip(trip.id)
      onDelete(trip.id)
      toast.success('Trip deleted successfully')
    } catch {
      toast.error('Failed to delete trip')
    } finally {
      setDeleting(false)
      setShowConfirmModal(false)
    }
  }

  const date = new Date(trip.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <>
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Planned Trip?"
        message={`Are you sure you want to delete the trip from "${trip.current_location}" to "${trip.dropoff_location}"? This action cannot be undone.`}
        confirmText="Delete Trip"
        loading={deleting}
      />

      <div className="glass-card overflow-hidden animate-fade-in">
        {/* Card header */}
        <button
          type="button"
          onClick={toggleExpand}
          className="w-full flex items-start gap-4 p-5 hover:bg-white/5 transition-colors duration-150 text-left"
          id={`trip-card-${trip.id}-btn`}
        >
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
            style={{ background: 'linear-gradient(135deg, rgba(59,91,219,0.2), rgba(91,125,248,0.2))', border: '1px solid rgba(91,125,248,0.3)' }}>
            <MapPin className="w-5 h-5 text-primary-400" />
          </div>

          {/* Route info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-white font-semibold text-sm truncate">{trip.current_location}</span>
              <span className="text-slate-600">→</span>
              <span className="text-slate-300 text-sm truncate">{trip.pickup_location}</span>
              <span className="text-slate-600">→</span>
              <span className="text-slate-300 text-sm truncate">{trip.dropoff_location}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              {trip.distance_miles ? <span>📏 {Number(trip.distance_miles).toFixed(0)} mi</span> : route.distance_miles && <span>📏 {route.distance_miles.toFixed(0)} mi</span>}
              {trip.duration_hours ? <span>⏱ {Number(trip.duration_hours).toFixed(1)} hrs</span> : route.duration_hours && <span>⏱ {route.duration_hours.toFixed(1)} hrs</span>}
              <span>📅 {trip.total_days || logs.length} day{(trip.total_days || logs.length) !== 1 ? 's' : ''}</span>
              <span>🔋 {trip.current_cycle_used}h cycle used</span>
              <span className="text-slate-600">• {date}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={openDeleteModal}
              disabled={deleting}
              className="btn-danger"
              id={`delete-trip-${trip.id}-btn`}
              title="Delete trip"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
            {loadingDetail ? <Loader2 className="w-4 h-4 animate-spin text-primary-400" /> : expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t p-5 space-y-6 animate-slide-up" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Stat bar */}
          <StatBar route={route} logs={logs} />

          {/* Map */}
          {route.geometry && route.geometry.length > 0 && (
            <div>
              <h3 className="section-title mb-3">Route Map</h3>
              <div style={{ height: 360 }}>
                <RouteMap route={route} />
              </div>
            </div>
          )}

          {/* Planned stops summary */}
          {route.stops?.length > 0 && (
            <div>
              <h3 className="section-title mb-3">Planned Stops</h3>
              <div className="flex flex-wrap gap-2">
                {route.stops.map((stop, i) => (
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

          {/* Daily Log Sheets */}
          {logs.length > 0 && (
            <div>
              <LogSheetList logs={logs} />
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}

export default function HistoryPage() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    tripsApi.listTrips()
      .then(res => setTrips(res.data))
      .catch(() => toast.error('Failed to load trip history'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = (id) => setTrips(prev => prev.filter(t => t.id !== id))

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <History className="w-7 h-7 text-primary-400" />
            Trip History
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {trips.length > 0 ? `${trips.length} trip${trips.length !== 1 ? 's' : ''} saved` : 'No trips yet'}
          </p>
        </div>
        <button onClick={() => navigate('/planner')} className="btn-primary" id="new-trip-btn">
          <Package className="w-4 h-4" />
          New Trip
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && trips.length === 0 && (
        <div className="glass-card p-16 text-center animate-slide-up">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(91,125,248,0.08)', border: '1px solid rgba(91,125,248,0.15)' }}>
            <History className="w-10 h-10 text-primary-500 opacity-50" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">No trips yet</h3>
          <p className="text-slate-500 text-sm mb-6">Plan your first trip and it'll appear here.</p>
          <button onClick={() => navigate('/planner')} className="btn-primary">
            Plan Your First Trip
          </button>
        </div>
      )}

      {/* Trip list */}
      {!loading && trips.length > 0 && (
        <div className="space-y-4">
          {trips.map(trip => (
            <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
