import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const makeIcon = (color, emoji, size = 36) => {
  const html = `
    <div style="
      width: ${size}px; height: ${size}px;
      background: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      border: 2px solid rgba(255,255,255,0.3);
    ">
      <span style="transform: rotate(45deg); font-size: ${size * 0.45}px;">${emoji}</span>
    </div>`
  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

const ICONS = {
  current: makeIcon('#3b5bdb', '📍'),
  pickup:  makeIcon('#059669', '📦'),
  dropoff: makeIcon('#dc2626', '🏁'),
  fuel:    makeIcon('#d97706', '⛽', 30),
  rest:    makeIcon('#7c3aed', '🛌', 30),
  cycle_reset: makeIcon('#be185d', '🔄', 30),
}

function getBounds(geometry) {
  if (!geometry || geometry.length === 0) return null
  const lats = geometry.map(c => c[0])
  const lngs = geometry.map(c => c[1])
  return [
    [Math.min(...lats) - 0.5, Math.min(...lngs) - 0.5],
    [Math.max(...lats) + 0.5, Math.max(...lngs) + 0.5],
  ]
}

export default function RouteMap({ route }) {
  const mapRef = useRef(null)
  const { geometry, waypoints, stops = [], distance_miles, duration_hours } = route

  useEffect(() => {
    const bounds = getBounds(geometry)
    if (mapRef.current && bounds) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [geometry])

  const center = geometry[Math.floor(geometry.length / 2)] || [39.5, -98.35]
  const bounds = getBounds(geometry)

  return (
    <div className="w-full h-full min-h-[420px] rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <MapContainer
        center={center}
        zoom={5}
        bounds={bounds}
        boundsOptions={{ padding: [40, 40] }}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Route polyline */}
        <Polyline
          positions={geometry}
          pathOptions={{ color: '#5b7df8', weight: 4, opacity: 0.9, dashArray: undefined }}
        />

        {/* Current location marker */}
        {waypoints?.current && (
          <Marker position={waypoints.current.coords} icon={ICONS.current}>
            <Popup>
              <strong>📍 Current Location</strong><br />{waypoints.current.name}
            </Popup>
          </Marker>
        )}

        {/* Pickup marker */}
        {waypoints?.pickup && (
          <Marker position={waypoints.pickup.coords} icon={ICONS.pickup}>
            <Popup>
              <strong>📦 Pickup</strong><br />{waypoints.pickup.name}
            </Popup>
          </Marker>
        )}

        {/* Dropoff marker */}
        {waypoints?.dropoff && (
          <Marker position={waypoints.dropoff.coords} icon={ICONS.dropoff}>
            <Popup>
              <strong>🏁 Drop-off</strong><br />{waypoints.dropoff.name}
            </Popup>
          </Marker>
        )}

        {/* Stops (fuel, rest, cycle reset) */}
        {stops.map((stop, i) => (
          <Marker
            key={i}
            position={stop.location}
            icon={ICONS[stop.type] || ICONS.fuel}
          >
            <Popup>
              <strong>{stop.label}</strong><br />
              Mile marker: {stop.mile_marker}
              {stop.duration_hours && <><br />Duration: {stop.duration_hours} hrs</>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
