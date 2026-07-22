import { useRef, forwardRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Printer, Download } from 'lucide-react'

// ── ELD Grid Constants ──────────────────────────────────────────────────────
const GRID_WIDTH = 860
const GRID_HEIGHT = 160
const ROW_H = 36
const LABEL_W = 120
const TIMELINE_H = 28
const CHART_W = GRID_WIDTH - LABEL_W
const CHART_H = ROW_H * 4
const TOTAL_H = TIMELINE_H + CHART_H + 20  // 20 for summary row

const STATUSES = ['off_duty', 'sleeper_berth', 'driving', 'on_duty']
const STATUS_LABELS = {
  off_duty: 'Off Duty',
  sleeper_berth: 'Sleeper\nBerth',
  driving: 'Driving',
  on_duty: 'On Duty\n(Not Drv)',
}
const STATUS_COLORS = {
  off_duty: { fill: 'rgba(148,163,184,0.15)', stroke: '#94a3b8', line: '#94a3b8' },
  sleeper_berth: { fill: 'rgba(167,139,250,0.2)', stroke: '#a78bfa', line: '#a78bfa' },
  driving: { fill: 'rgba(91,125,248,0.25)', stroke: '#5b7df8', line: '#5b7df8' },
  on_duty: { fill: 'rgba(245,158,11,0.2)', stroke: '#f59e0b', line: '#f59e0b' },
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function minutesToX(minutes) {
  return LABEL_W + (minutes / (24 * 60)) * CHART_W
}

function statusToY(status) {
  const idx = STATUSES.indexOf(status)
  return TIMELINE_H + idx * ROW_H
}

function format12Hour(timeStr) {
  if (!timeStr) return ''
  let [hStr, mStr] = timeStr.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr || '00'
  if (h === 24) return `12:${m} AM`
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

function ELDGridSVG({ dayLog, printMode = false }) {
  const { day, date_label, segments = [], total_driving_hours, total_on_duty_hours } = dayLog
  const bg = printMode ? '#fff' : '#0f172a'
  const gridColor = printMode ? '#ccc' : 'rgba(255,255,255,0.08)'
  const textColor = printMode ? '#1e293b' : '#94a3b8'
  const labelColor = printMode ? '#0f172a' : '#e2e8f0'

  // Build stair-step polyline points strictly forward (no backward line bleed)
  const points = []
  if (segments.length > 0) {
    let lastX = null

    segments.forEach((seg, idx) => {
      const startMin = timeToMinutes(seg.start)
      const endMin = timeToMinutes(seg.end)
      let x1 = minutesToX(startMin)
      let x2 = minutesToX(endMin)
      const y = statusToY(seg.status) + ROW_H / 2

      if (lastX !== null && x1 < lastX) {
        x1 = lastX
      }
      if (x2 < x1) x2 = x1

      if (idx === 0) {
        points.push({ x: x1, y })
      } else {
        // Vertical connector at exact transition point
        points.push({ x: lastX, y })
      }
      points.push({ x: x2, y })
      lastX = x2
    })
  }

  const polylineStr = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${GRID_WIDTH} ${TOTAL_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className="eld-grid-svg w-full"
      style={{ fontFamily: 'Inter, JetBrains Mono, monospace', background: bg }}
    >
      {/* Background */}
      <rect x="0" y="0" width={GRID_WIDTH} height={TOTAL_H} fill={bg} />

      {/* ── Row backgrounds ── */}
      {STATUSES.map((status, i) => (
        <rect
          key={status}
          x={LABEL_W}
          y={TIMELINE_H + i * ROW_H}
          width={CHART_W}
          height={ROW_H}
          fill={printMode ? (i % 2 === 0 ? '#fafafa' : '#f5f5f5') : (i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent')}
        />
      ))}

      {/* ── Vertical hour gridlines ── */}
      {Array.from({ length: 25 }).map((_, h) => {
        const x = LABEL_W + (h / 24) * CHART_W
        const isMajor = h % 6 === 0
        return (
          <line
            key={h}
            x1={x} y1={TIMELINE_H}
            x2={x} y2={TIMELINE_H + CHART_H}
            stroke={gridColor}
            strokeWidth={isMajor ? 1.5 : 0.5}
            strokeDasharray={isMajor ? 'none' : '2,3'}
          />
        )
      })}

      {/* ── Hour labels ── */}
      {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map((h) => {
        const x = LABEL_W + (h / 24) * CHART_W
        const label = h === 0 ? 'M' : h === 12 ? 'N' : h === 24 ? 'M' : h < 12 ? `${h}` : `${h - 12}`
        return (
          <text key={h} x={x} y={TIMELINE_H - 8} textAnchor="middle" fontSize="9" fill={textColor} fontWeight="500">
            {label}
          </text>
        )
      })}

      {/* AM/PM labels */}
      <text x={LABEL_W + CHART_W * 0.25} y={TIMELINE_H - 18} textAnchor="middle" fontSize="8" fill={textColor}>AM</text>
      <text x={LABEL_W + CHART_W * 0.75} y={TIMELINE_H - 18} textAnchor="middle" fontSize="8" fill={textColor}>PM</text>

      {/* ── Row labels ── */}
      {STATUSES.map((status, i) => {
        const y = TIMELINE_H + i * ROW_H
        const lines = STATUS_LABELS[status].split('\n')
        return (
          <g key={status}>
            <rect x="0" y={y} width={LABEL_W} height={ROW_H}
              fill={printMode ? '#f8f8f8' : 'rgba(15,23,42,0.8)'}
              stroke={gridColor} strokeWidth="0.5"
            />
            {lines.map((line, li) => (
              <text
                key={li}
                x={LABEL_W - 8}
                y={y + ROW_H / 2 + (li - (lines.length - 1) / 2) * 11}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="10"
                fill={labelColor}
                fontWeight="500"
              >
                {line}
              </text>
            ))}
            {/* Horizontal row border */}
            <line x1="0" y1={y} x2={GRID_WIDTH} y2={y} stroke={gridColor} strokeWidth="0.5" />
          </g>
        )
      })}

      {/* ── Segment fills ── */}
      {segments.map((seg, i) => {
        const x1 = minutesToX(timeToMinutes(seg.start))
        const x2 = minutesToX(timeToMinutes(seg.end))
        const y = statusToY(seg.status)
        const w = Math.max(x2 - x1, 1)
        const colors = STATUS_COLORS[seg.status] || STATUS_COLORS.off_duty
        return (
          <rect
            key={i}
            x={x1} y={y}
            width={w} height={ROW_H}
            fill={colors.fill}
          />
        )
      })}

      {/* ── Stair-step polyline ── */}
      {polylineStr && (
        <polyline
          points={polylineStr}
          fill="none"
          stroke="#5b7df8"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* ── Segment Number Badges on Graph (1-to-1 matching with cards) ── */}
      {segments.map((seg, i) => {
        const x1 = minutesToX(timeToMinutes(seg.start))
        const x2 = minutesToX(timeToMinutes(seg.end))
        const cx = Math.max(x1 + 8, Math.min(x2 - 8, (x1 + x2) / 2))
        const y = statusToY(seg.status) + ROW_H / 2
        const colors = STATUS_COLORS[seg.status] || STATUS_COLORS.off_duty

        return (
          <g key={i}>
            <circle cx={cx} cy={y} r="7" fill={colors.stroke} stroke={bg} strokeWidth="1.5" />
            <text
              x={cx}
              y={y + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="8"
              fill="#ffffff"
              fontWeight="800"
            >
              {i + 1}
            </text>
          </g>
        )
      })}

      {/* ── Bottom border ── */}
      <line x1="0" y1={TIMELINE_H + CHART_H} x2={GRID_WIDTH} y2={TIMELINE_H + CHART_H}
        stroke={gridColor} strokeWidth="1" />

      {/* ── Summary row ── */}
      <text x={LABEL_W + 8} y={TIMELINE_H + CHART_H + 14}
        fontSize="9" fill={textColor} fontWeight="500">
        Total Driving: {total_driving_hours}h  |  Total On Duty: {total_on_duty_hours}h
      </text>
      <text x={GRID_WIDTH - 8} y={TIMELINE_H + CHART_H + 14}
        textAnchor="end" fontSize="9" fill={textColor} fontWeight="500">
        {date_label}
      </text>
    </svg>
  )
}

// ── Printable wrapper ──────────────────────────────────────────────────────
const PrintWrapper = forwardRef(function PrintWrapper({ logs }, ref) {
  return (
    <div ref={ref} className="p-6 space-y-6" style={{ background: '#fff' }}>
      <div className="text-center mb-4">
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>ELD Driver's Daily Log</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>Generated by ELD Trip Planner — HOS Compliant</p>
      </div>
      {logs.map((log) => (
        <div key={log.day} className="print-section mb-6">
          <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
            Day {log.day} Log Sheet
          </p>
          <ELDGridSVG dayLog={log} printMode={true} />
          <div style={{ marginTop: 8, fontSize: 10, color: '#334155', display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
            {log.segments.map((s, i) => (
              <span key={i} style={{ fontWeight: 500 }}>
                <strong style={{ color: '#0f172a' }}>[{i + 1}]</strong> {format12Hour(s.start)} – {format12Hour(s.end)} ({s.duration_hours}h): {s.label || s.status.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})

// ── Main export ────────────────────────────────────────────────────────────
export default function DailyLogSheet({ dayLog, logs, showActions = true }) {
  const printRef = useRef(null)

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'ELD-Daily-Log',
  })

  const handleExportPDF = async () => {
    const el = printRef.current
    if (!el) return
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fff', useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
    pdf.save('ELD-Log-Sheet.pdf')
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Action buttons */}
      {showActions && logs && (
        <div className="flex items-center justify-between">
          <h3 className="section-title">ELD Log Sheets</h3>
          <div className="flex gap-2 no-print">
            <button onClick={handlePrint} className="btn-ghost" id="print-logs-btn">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button onClick={handleExportPDF} className="btn-ghost" id="export-pdf-btn">
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      )}

      {/* Hidden printable version (all logs) */}
      {logs && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <PrintWrapper ref={printRef} logs={logs} />
        </div>
      )}

      {/* On-screen grid for this day */}
      <div className="glass-card overflow-hidden p-4">
        <ELDGridSVG dayLog={dayLog} printMode={false} />

        {/* Structured Duty Status Timeline Cards */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <span>📋</span> Duty Status Breakdown & Time Log
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {dayLog.segments.map((seg, i) => {
              const colors = STATUS_COLORS[seg.status] || STATUS_COLORS.off_duty
              const start12 = format12Hour(seg.start)
              const end12 = format12Hour(seg.end)
              const statusText = STATUS_LABELS[seg.status]?.replace('\n', ' ') || seg.status
              const activityLabel = seg.label || statusText

              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150"
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${colors.stroke}33`,
                  }}
                >
                  {/* Segment number badge matching graph */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0"
                    style={{ background: colors.stroke }}
                  >
                    {i + 1}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-white truncate">{activityLabel}</span>
                      <span className="text-[11px] font-semibold text-primary-400 font-mono flex-shrink-0">
                        {seg.duration_hours}h
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">
                        {start12} – {end12}
                      </span>
                      <span className={`badge-${seg.status} text-[10px] px-1.5 py-0.2`}>
                        {statusText}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
