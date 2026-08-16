import React, { useRef, useState } from 'react'
import { recognitionApi } from '../api'
import { fileToDataUrl, imageFileToCanvas } from '../webcam'

export default function UploadRecognition() {
  const fileRef = useRef(null)
  const canvasRef = useRef(null)
  const imgRef = useRef(null)

  const [src, setSrc] = useState('')
  const [imgEl, setImgEl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [logOnIdentify, setLogOnIdentify] = useState(true)

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setResults(null)
    setImgEl(null)
    try {
      const dataUrl = await fileToDataUrl(file)
      const canvas = await imageFileToCanvas(file, 1280)
      canvasRef.current = canvas
      setSrc(dataUrl)
      const img = new Image()
      await new Promise((res) => {
        img.onload = res
        img.src = dataUrl
      })
      imgRef.current = img
      setImgEl(img)
    } catch (e) {
      setError('Could not load image: ' + e.message)
    }
  }

  const drawResults = (faces) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    for (const f of faces || []) {
      const [x, y, fw, fh] = f.bbox
      const known = f.is_known
      ctx.strokeStyle = known ? '#2dd4a7' : '#ff5d73'
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, fw, fh)

      const label = known && f.matched_user ? `${f.matched_user.name} (${(f.similarity * 100).toFixed(0)}%)` : `Unknown (${(f.score * 100).toFixed(0)}%)`
      ctx.font = 'bold 16px Inter, sans-serif'
      const tw = ctx.measureText(label).width
      ctx.fillStyle = known ? 'rgba(45,212,167,0.92)' : 'rgba(255,93,115,0.92)'
      ctx.fillRect(x, y - 30, tw + 12, 28)
      ctx.fillStyle = '#0a0f1d'
      ctx.fillText(label, x + 6, y - 11)
    }
  }

  const identify = async () => {
    if (!canvasRef.current) return
    setBusy(true)
    setError('')
    try {
      const res = await recognitionApi.upload(canvasRef.current.toDataURL('image/jpeg', 0.85), {
        source: 'upload',
        log: logOnIdentify,
      })
      setResults(res)
      drawResults(res.faces)
    } catch (e) {
      setError(e.message || 'Recognition failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="grid two">
        <div>
          <div
            className="card"
            style={{
              borderStyle: 'dashed',
              textAlign: 'center',
              cursor: 'pointer',
              padding: 40,
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFile(e.dataTransfer.files[0])
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3c8" strokeWidth="1.5" style={{ margin: '0 auto 10px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>Drop an image here or click to browse</p>
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Supports JPG, PNG · faces detected automatically</p>
          </div>

          <div className="toolbar">
            <button className="btn" onClick={identify} disabled={!imgEl || busy}>
              {busy ? <span className="spinner" /> : 'Identify Faces'}
            </button>
            <label className="btn ghost" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={logOnIdentify} onChange={(e) => setLogOnIdentify(e.target.checked)} style={{ marginRight: 6 }} />
              Record results to log
            </label>
          </div>
          {error && <div className="alert error">{error}</div>}
          {results && (
            <div className="alert success">
              Detected {results.face_count} face{results.face_count === 1 ? '' : 's'} in the image.
            </div>
          )}
        </div>

        <div>
          <div className="camera-stage" style={{ background: 'var(--panel)' }}>
            {imgEl && <img ref={imgRef} src={src} alt="Uploaded" style={{ display: 'none' }} />}
            {src ? (
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: 'var(--radius)',
                }}
              />
            ) : (
              <div className="empty">No image selected</div>
            )}
          </div>

          {results && (
            <div className="card mt-2">
              <h3>Identification Results</h3>
              {results.faces.map((f, i) => {
                const u = f.matched_user
                return (
                  <div key={i} className="match-panel" style={{ marginTop: 0, marginBottom: 10 }}>
                    {u ? (
                      <img src={u.photo_url || `/api/users/${u.id}/photo`} alt={u.name} />
                    ) : (
                      <div className="ph">?</div>
                    )}
                    <div className="meta" style={{ flex: 1 }}>
                      <h3>{u ? u.name : 'Unknown Person'}</h3>
                      <p>
                        {u ? `${u.designation} · ${u.department}` : 'Not registered in the database'}
                      </p>
                      <div className="sim-bar" style={u ? {} : {}}>
                        <div style={{ width: `${Math.round((u ? f.similarity : f.score) * 100)}%`, background: u ? undefined : '#ff5d73' }} />
                      </div>
                      <p style={{ marginTop: 6, fontSize: 12 }}>
                        Confidence: <strong>{(u ? f.similarity : f.score).toFixed(3)}</strong> ·{' '}
                        <span className={u ? 'pill green' : 'pill red'}>{u ? 'Identified' : 'Unknown'}</span>
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
