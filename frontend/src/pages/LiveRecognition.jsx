import React, { useEffect, useRef, useState } from 'react'
import { recognitionApi, settingsApi } from '../api'
import { startCamera, stopCamera, canvasToDataUrl, renderFrame } from '../webcam'

const POLL_MS = 350
const STABLE_FRAMES = 6

export default function LiveRecognition() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const runningRef = useRef(false)
  const busyRef = useRef(false)
  const stableRef = useRef({ key: null, count: 0 })
  const loggedRef = useRef({})
  const settingsRef = useRef({})

  const [running, setRunning] = useState(false)
  const [flip, setFlip] = useState(false)
  const [logEnabled, setLogEnabled] = useState(true)
  const [match, setMatch] = useState(null)
  const [unknowns, setUnknowns] = useState(0)
  const [recognitions, setRecognitions] = useState(0)
  const [fps, setFps] = useState(0)
  const [error, setError] = useState('')
  const [fpsCount, setFpsCount] = useState(0)

  useEffect(() => {
    settingsApi.get().then((s) => {
      settingsRef.current = s
      setFlip(s.camera_flip)
    }).catch(() => {})
    return () => {
      stopCamera(streamRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const logNow = async (image) => {
    if (!logEnabled) return
    try {
      await recognitionApi.frame(image, { source: 'webcam', log: true })
    } catch (e) {
      /* ignore */
    }
  }

  const processFrame = async () => {
    if (busyRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || video.videoWidth === 0) return
    busyRef.current = true
    const t0 = performance.now()
    try {
      renderFrame(video, canvas, [], flip)
      const dataUrl = canvasToDataUrl(canvas)
      const res = await recognitionApi.frame(dataUrl, { source: 'webcam', log: false })

      const faces = res.faces || []
      renderFrame(video, canvas, faces, flip)
      setFps(Math.round(1000 / (performance.now() - t0)))
      setRecognitions((n) => n + 1)

      const known = faces.find((f) => f.is_known)
      const any = faces.length > 0

      if (known && known.matched_user) {
        setMatch({ ...known.matched_user, similarity: known.similarity })
        stableRef.current = {
          key: `u${known.matched_user.id}`,
          count: stableRef.current.key === `u${known.matched_user.id}` ? stableRef.current.count + 1 : 1,
        }
      } else if (any) {
        setMatch(null)
        stableRef.current = {
          key: 'unknown',
          count: stableRef.current.key === 'unknown' ? stableRef.current.count + 1 : 1,
        }
      } else {
        setMatch(null)
        stableRef.current = { key: null, count: 0 }
      }

      // Auto-log when identity is stable for N consecutive frames
      if (logEnabled && stableRef.current.count >= STABLE_FRAMES && stableRef.current.key) {
        const now = Date.now()
        if (!loggedRef.current[stableRef.current.key] || now - loggedRef.current[stableRef.current.key] > 8000) {
          loggedRef.current[stableRef.current.key] = now
          await logNow(dataUrl)
          if (stableRef.current.key === 'unknown') setUnknowns((n) => n + 1)
        }
      }
    } catch (e) {
      /* transient errors ignored */
    } finally {
      busyRef.current = false
    }
  }

  const start = async () => {
    setError('')
    try {
      const stream = await startCamera(videoRef.current)
      streamRef.current = stream
      runningRef.current = true
      setRunning(true)
      intervalRef.current = setInterval(processFrame, POLL_MS)
    } catch (e) {
      setError(e.message || 'Camera could not be started')
    }
  }

  const stop = () => {
    runningRef.current = false
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    stopCamera(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const toggleFlip = () => {
    const next = !flip
    setFlip(next)
    settingsApi.update({ camera_flip: next }).catch(() => {})
  }

  return (
    <div>
      <div className="grid two">
        <div>
          <div className="camera-stage">
            <video ref={videoRef} playsInline muted style={{ transform: flip ? 'scaleX(-1)' : 'none' }} />
            <canvas ref={canvasRef} style={{ transform: flip ? 'scaleX(-1)' : 'none' }} />
          </div>

          <div className="toolbar">
            {!running ? (
              <button className="btn" onClick={start}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="4"/></svg>
                Start Camera
              </button>
            ) : (
              <button className="btn danger" onClick={stop}>Stop Camera</button>
            )}
            <button className="btn secondary" onClick={toggleFlip} disabled={!running}>
              {flip ? 'Unmirror View' : 'Mirror View'}
            </button>
            <label className="btn ghost" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={logEnabled}
                onChange={(e) => setLogEnabled(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Auto-log identifications
            </label>
          </div>

          {error && <div className="alert error">{error}</div>}
          {running && (
            <div className="alert info" style={{ fontSize: 13 }}>
              Real-time inference active · {fps} FPS · {recognitions} frames processed ·{' '}
              {unknowns} unknown logs recorded
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <h3>Latest Identification</h3>
            {match ? (
              <div className="match-panel" style={{ borderColor: 'rgba(45,212,167,0.5)' }}>
                <img src={match.photo_url || '/api/users/' + match.id + '/photo'} alt={match.name} onError={(e) => (e.currentTarget.style.display = 'none')} />
                <div className="meta" style={{ flex: 1 }}>
                  <h3>{match.name}</h3>
                  <p>{match.designation} · {match.department}</p>
                  <p>ID: {match.employee_id || '—'}</p>
                  <div className="sim-bar">
                    <div style={{ width: `${Math.round(match.similarity * 100)}%` }} />
                  </div>
                  <p style={{ marginTop: 6, fontSize: 12 }}>
                    Match confidence: <strong>{(match.similarity * 100).toFixed(1)}%</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="match-panel" style={{ borderColor: 'rgba(255,93,115,0.4)' }}>
                <div className="ph">?</div>
                <div className="meta">
                  <h3>No person identified</h3>
                  <p>Point the camera at a registered face, or an unknown face will be flagged.</p>
                </div>
              </div>
            )}
            <div className="empty" style={{ padding: '12px 0 4px' }}>
              Identity is logged automatically when stable for a few seconds.
            </div>
          </div>

          <div className="card mt-2">
            <h3>Recognition Pipeline</h3>
            <ol style={{ color: 'var(--text-dim)', margin: 0, paddingLeft: 20, lineHeight: 2 }}>
              <li>Webcam frame captured every {POLL_MS / 1000}s</li>
              <li>YuNet detects faces in the frame</li>
              <li>SFace extracts a 128-d facial embedding per face</li>
              <li>Cosine similarity vs registered database</li>
              <li>Match above threshold → identified, else Unknown</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
