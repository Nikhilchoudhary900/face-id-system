import React, { useRef, useState } from 'react'
import { startCamera, stopCamera, canvasToDataUrl, fileToDataUrl, imageFileToCanvas } from '../webcam'

export default function FaceCapture({ samples, onChange, maxSamples = 6 }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [error, setError] = useState('')

  const toggleCamera = async () => {
    if (cameraOn) {
      stopCamera(streamRef.current)
      streamRef.current = null
      setCameraOn(false)
      if (videoRef.current) videoRef.current.srcObject = null
      return
    }
    setError('')
    try {
      const stream = await startCamera(videoRef.current)
      streamRef.current = stream
      setCameraOn(true)
    } catch (e) {
      setError(e.message || 'Camera unavailable')
    }
  }

  const capture = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvasToDataUrl(canvas)
    onChange([...samples, dataUrl].slice(0, maxSamples))
  }

  const addFile = async (file) => {
    if (!file) return
    try {
      const canvas = await imageFileToCanvas(file, 640)
      const dataUrl = canvasToDataUrl(canvas)
      onChange([...samples, dataUrl].slice(0, maxSamples))
    } catch (e) {
      setError('Could not read image')
    }
  }

  const remove = (i) => {
    const next = samples.filter((_, idx) => idx !== i)
    onChange(next)
  }

  return (
    <div>
      <div className="flex-between">
        <h3 style={{ fontSize: 15 }}>Facial Samples</h3>
        <button className="btn secondary sm" onClick={toggleCamera}>
          {cameraOn ? 'Close Camera' : 'Open Camera'}
        </button>
      </div>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
        Capture {samples.length < 3 ? 'at least 3' : 'more'} samples under different angles and lighting for better accuracy (recommended 3-5).
      </p>

      {error && <div className="alert error">{error}</div>}

      {cameraOn && (
        <div style={{ display: 'flex', gap: 12, margin: '10px 0', flexWrap: 'wrap' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: 240, borderRadius: 12, background: '#000', transform: 'scaleX(-1)' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            <button className="btn" onClick={capture} disabled={samples.length >= maxSamples}>
              Capture Sample ({samples.length}/{maxSamples})
            </button>
            <label className="btn secondary">
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => addFile(e.target.files[0])} />
              Upload Photo
            </label>
          </div>
        </div>
      )}

      <div className="flex" style={{ flexWrap: 'wrap', marginTop: 10 }}>
        {samples.map((s, i) => (
          <div key={i} style={{ position: 'relative', width: 90 }}>
            <img src={s} alt={`sample ${i + 1}`} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
            <button
              onClick={() => remove(i)}
              title="Remove sample"
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--red)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ×
            </button>
            <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8 }}>
              #{i + 1}
            </div>
          </div>
        ))}
        {samples.length === 0 && (
          <div className="empty" style={{ border: '1px dashed var(--border)', borderRadius: 10, padding: '16px 30px' }}>
            No samples captured yet
          </div>
        )}
      </div>
    </div>
  )
}
