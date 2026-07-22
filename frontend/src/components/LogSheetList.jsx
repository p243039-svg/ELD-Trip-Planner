import { useState } from 'react'
import DailyLogSheet from './DailyLogSheet'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function LogSheetList({ logs }) {
  const [expanded, setExpanded] = useState(new Set([0])) // first day open by default

  const toggle = (idx) => setExpanded(prev => {
    const next = new Set(prev)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    return next
  })

  if (!logs || logs.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Show print/export buttons only once at the top */}
      <DailyLogSheet
        dayLog={logs[0]}
        logs={logs}
        showActions={true}
      />
      {/* Show remaining days without duplicate action buttons */}
      {logs.slice(1).map((log, idx) => {
        const i = idx + 1
        const isOpen = expanded.has(i)
        return (
          <div key={log.day} className="glass-card overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors duration-150"
              id={`toggle-day-${log.day}-btn`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(91,125,248,0.15)', color: '#5b7df8', border: '1px solid rgba(91,125,248,0.3)' }}>
                  {log.day}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{log.date_label}</p>
                  <p className="text-xs text-slate-500">
                    Driving: {log.total_driving_hours}h · On Duty: {log.total_on_duty_hours}h
                  </p>
                </div>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 animate-fade-in">
                <DailyLogSheet dayLog={log} showActions={false} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
