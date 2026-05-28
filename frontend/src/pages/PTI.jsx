import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPtiToday, getPtiHistory, validatePti, getDrivers, nudgePti, getTrucks } from '../api'
import { useState } from 'react'
import Ticker from '../components/Ticker'

const PHOTO_LABELS = ['FRONT', 'REAR', 'L-SIDE', 'R-SIDE', 'TIRE FL', 'TIRE FR', 'TIRE RL', 'TIRE RR']

// 09:00 CT (CDT = UTC-5) → 14:00 UTC
function isLate(submittedAt) {
  if (!submittedAt) return false
  const h = parseInt(submittedAt.slice(11, 13))
  const m = parseInt(submittedAt.slice(14, 16))
  return h > 14 || (h === 14 && m > 0)
}

export default function PTI() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [rosterFilter, setRosterFilter] = useState('all')

  const { data: today = [] } = useQuery({ queryKey: ['ptiToday'], queryFn: getPtiToday })
  const { data: history = [] } = useQuery({ queryKey: ['ptiHistory'], queryFn: () => getPtiHistory(7) })
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: getDrivers })
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks })

  const validateMut = useMutation({
    mutationFn: ({ id, is_valid }) => validatePti(id, is_valid),
    onSuccess: () => qc.invalidateQueries(['ptiHistory'])
  })

  const nudgeMut = useMutation({ mutationFn: nudgePti })

  const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]))
  const truckInfoMap = Object.fromEntries(trucks.map(t => [t.id, t]))

  const ptiDone = today.filter(p => p.submitted).length
  const ptiLate = today.filter(p => p.submitted && isLate(p.submitted_at)).length
  const ptiMiss = today.length - ptiDone

  const selectedRecord = history.find(r => r.id === selected)
  const mediaPaths = selectedRecord?.media_paths ? JSON.parse(selectedRecord.media_paths) : []
  const photoCount = mediaPaths.filter(p => /\.(jpg|jpeg|png)$/i.test(p.split('/').pop())).length
  const videoCount = mediaPaths.filter(p => /\.(mp4|mov)$/i.test(p.split('/').pop())).length

  const firstMissing = today.find(p => !p.submitted)

  // For each today entry, find matching history record (today's date)
  const todayStr = new Date().toISOString().slice(0, 10)
  function getTodayRecord(driverId) {
    return history.find(h => h.driver_id === driverId && h.date === todayStr)
  }

  function getPhotoCount(driverId) {
    const rec = getTodayRecord(driverId)
    if (!rec?.media_paths) return 0
    try { return JSON.parse(rec.media_paths).length } catch { return 0 }
  }

  const filteredToday = today.filter(p => {
    if (rosterFilter === 'ok') return p.submitted && !isLate(p.submitted_at)
    if (rosterFilter === 'late') return p.submitted && isLate(p.submitted_at)
    if (rosterFilter === 'miss') return !p.submitted
    return true
  })

  const tickerItems = [
    { t: 'PTI', body: 'WINDOW · 06:00 → 09:00 CT · DAILY', tone: 'amber' },
    { t: 'TODAY', body: `${ptiDone} OK · ${ptiLate > 0 ? ptiLate + ' LATE · ' : ''}${ptiMiss} MISS · ${today.length} TOTAL`, tone: ptiMiss > 0 ? 'amber' : '' },
    { t: 'POLICY', body: 'MIN 4 PHOTOS · FSMA 49 CFR §392.7' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)' }}>
      <Ticker items={tickerItems} />

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: '#000000ee', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, cursor: 'zoom-out' }}>
          <img src={lightbox} alt="PTI" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
      )}

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr) 280px', minHeight: 0, overflow: 'hidden' }}>

        {/* LEFT — Roster */}
        <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· ROSTER · {today.length} DRIVERS</span>
            <span className="ph-r">{new Date().toISOString().slice(0,10).replace(/-/g,'.')}</span>
          </div>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              ['all',  `ALL · ${today.length}`],
              ['ok',   `OK · ${ptiDone - ptiLate}`],
              ['late', `LATE · ${ptiLate}`],
              ['miss', `MISS · ${ptiMiss}`],
            ].map(([val, label]) => (
              <span key={val} onClick={() => setRosterFilter(val)}
                className={`tag ${rosterFilter === val ? (val === 'miss' ? 'red' : val === 'late' ? 'amber' : val === 'ok' ? 'green' : 'amber') : ''}`}
                style={{ cursor: 'pointer' }}>{label}</span>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredToday.map(p => {
              const driver = drivers.find(d => d.name === p.driver_name)
              const rec = getTodayRecord(driver?.id || p.driver_id)
              const isSelected = rec && selected === rec.id
              const late = p.submitted && isLate(p.submitted_at)
              const dotColor = !p.submitted ? 'var(--red)' : late ? 'var(--amber)' : 'var(--green)'
              const statusTag = !p.submitted
                ? <span className="tag red">MISS</span>
                : late
                  ? <span className="tag amber">LATE</span>
                  : <span className="tag green">OK</span>
              const photoCnt = getPhotoCount(driver?.id || p.driver_id)
              const drvId = driver?.id || p.driver_id

              return (
                <div key={p.driver_id} onClick={() => rec && setSelected(rec.id)} style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--line)',
                  background: isSelected ? 'var(--panel-2)' : 'transparent',
                  borderLeft: isSelected ? '2px solid var(--amber)' : '2px solid transparent',
                  display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 10, alignItems: 'center',
                  cursor: rec ? 'pointer' : 'default',
                }}>
                  <span className="dot" style={{ background: dotColor }} />
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ color: isSelected ? 'var(--amber)' : 'var(--ink)', fontSize: 12 }}>{p.driver_name}</span>
                      <span className="t-tiny t-mute">DRV·{String(drvId).padStart(3,'0')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                      <span className="t-tiny t-dim">{p.truck || '—'}</span>
                      {p.submitted && <><span className="t-tiny t-mute">·</span><span className="t-tiny t-dim">{p.submitted_at?.slice(11,16)}</span></>}
                      {p.submitted && photoCnt > 0 && <><span className="t-tiny t-mute">·</span><span className="t-tiny t-dim">{photoCnt} PHOTO</span></>}
                    </div>
                  </div>
                  {statusTag}
                </div>
              )
            })}
            {today.length === 0 && <div style={{ padding: 16, color: 'var(--ink-mute)', fontSize: 11 }}>NO DRIVERS REGISTERED</div>}
          </div>
        </div>

        {/* CENTER — PTI Report */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', overflow: 'hidden' }}>
          {selectedRecord ? (
            <>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>PTI REPORT · #{String(selectedRecord.id).padStart(6,'0')}</div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                      <span className="t-display" style={{ fontSize: 22, color: 'var(--ink)' }}>
                        {driverMap[selectedRecord.driver_id]?.name?.toUpperCase() || `DRIVER #${selectedRecord.driver_id}`}
                      </span>
                      {(() => {
                        const drv = driverMap[selectedRecord.driver_id]
                        const truck = drv?.truck_id ? truckInfoMap[drv.truck_id] : null
                        return truck ? (
                          <span className="t-display" style={{ fontSize: 15, color: 'var(--amber)' }}>
                            {truck.unit_number} · {truck.plate}
                          </span>
                        ) : null
                      })()}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                      <span className="t-tiny t-up t-dim">SUB · {selectedRecord.submitted_at?.slice(11,19)}</span>
                      <span className="t-tiny t-up t-dim">DATE · {selectedRecord.date}</span>
                      <span className="t-tiny t-up t-dim">{mediaPaths.length} MEDIA · {videoCount} VIDEO · {photoCount} PHOTO</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn primary" onClick={() => validateMut.mutate({ id: selectedRecord.id, is_valid: true })}>✓ APPROVE</button>
                    <button className="btn" onClick={() => validateMut.mutate({ id: selectedRecord.id, is_valid: false })}>✕ REJECT</button>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
                {/* Inspection media */}
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 12 }}>· INSPECTION MEDIA</div>
                {mediaPaths.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {mediaPaths.map((path, i) => {
                      const filename = path.split('\\').pop().split('/').pop()
                      const url = `/api/media/pti/${filename}`
                      const isImg = /\.(jpg|jpeg|png)$/i.test(filename)
                      const label = PHOTO_LABELS[i] || `EXTRA-${i + 1}`
                      return isImg ? (
                        <div key={i} onClick={() => setLightbox(url)} style={{ aspectRatio: '4/3', position: 'relative', cursor: 'zoom-in' }}>
                          <img src={url} alt={filename} style={{ width: '100%', height: '100%', objectFit: 'cover', border: '1px solid var(--line)' }} />
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: '#000000aa', padding: '3px 6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 9, color: 'var(--amber)', letterSpacing: '0.16em' }}>{String(i+1).padStart(2,'0')}</span>
                            <span style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.12em' }}>{label}</span>
                          </div>
                        </div>
                      ) : (
                        <div key={i} className="photo-slot" style={{ aspectRatio: '4/3' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'var(--amber)', marginBottom: 4 }}>{label}</div>
                            <div>VIDEO</div>
                            <div className="t-tiny t-mute" style={{ marginTop: 4 }}>{filename.slice(-12)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {PHOTO_LABELS.map((label, i) => (
                      <div key={i} className="photo-slot" style={{ aspectRatio: '4/3' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--amber)', marginBottom: 4, letterSpacing: '0.12em' }}>{label}</div>
                          <div style={{ fontSize: 9, color: 'var(--ink-mute)' }}>NO MEDIA</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Driver note */}
                {selectedRecord.notes && (
                  <div style={{ marginTop: 20 }}>
                    <div className="t-tiny t-up t-mute" style={{ marginBottom: 8 }}>· DRIVER NOTE</div>
                    <div style={{ padding: '10px 14px', border: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 11, color: 'var(--ink-dim)', fontFamily: 'var(--mono)', lineHeight: 1.6 }}>
                      "{selectedRecord.notes}"
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <span className="t-tiny t-up t-mute">· SELECT A DRIVER FROM ROSTER TO VIEW PTI REPORT</span>
            </div>
          )}
        </div>

        {/* RIGHT — History + nudge */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· PTI HISTORY · 7D</span>
            <span className="ph-r">{history.length} RECORDS</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {history.map(r => {
              const dname = driverMap[r.driver_id]?.name || `Driver #${r.driver_id}`
              const late = isLate(r.submitted_at)
              return (
                <div key={r.id} onClick={() => setSelected(r.id)} style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--line)',
                  borderLeft: selected === r.id ? '2px solid var(--amber)' : '2px solid transparent',
                  background: selected === r.id ? 'var(--panel-2)' : 'transparent',
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: selected === r.id ? 'var(--amber)' : 'var(--ink)', fontSize: 12 }}>{dname}</span>
                    <span className={`tag ${!r.is_valid ? 'red' : late ? 'amber' : 'green'}`}>
                      {!r.is_valid ? 'FLAGGED' : late ? 'LATE' : 'OK'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <span className="t-tiny t-mute">{r.date}</span>
                    <span className="t-tiny t-dim">{r.submitted_at?.slice(11,16)}</span>
                    {r.media_paths && (() => {
                      try { return <span className="t-tiny t-mute">{JSON.parse(r.media_paths).length} FILES</span> } catch { return null }
                    })()}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--line)', padding: '12px 16px', background: 'var(--bg-elev)', flexShrink: 0 }}>
            <div className="t-tiny t-up t-mute" style={{ marginBottom: 8 }}>NUDGE OUTSTANDING</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn primary"
                style={{ flex: 1 }}
                disabled={nudgeMut.isPending || !firstMissing}
                onClick={() => nudgeMut.mutate()}>
                {nudgeMut.isPending
                  ? '▸ SENDING...'
                  : firstMissing
                    ? `▸ NUDGE ${firstMissing.driver_name.split(' ')[0].toUpperCase()}`
                    : '✓ ALL SUBMITTED'}
              </button>
              <button className="btn" style={{ flex: 1 }}>BROADCAST</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
