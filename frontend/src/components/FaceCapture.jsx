import React, { useRef, useState } from 'react'
import { startCamera, stopCamera, canvasToDataUrl, fileToDataUrl, imageFileToCanvas } from '../webcam'

const waitForVideo = (video, timeout = 4000) =>
  new Promise((resolve, reject) => {
    if (video.videoWidth > 0 && video.readyState >= 2) return resolve(true)
    const start = Date.now()
    const check = () => {
      if (video.videoWidth > 0 && video.readyState >= 2) return resolve(true)
      if (Date.now() - start > timeout) {
        return reject(new Error('Camera is still starting up. Please wait a second and click "Capture Sample" again.'))
      }
      setTimeout(check, 120)
    }
    check()
  })

export default function FaceCapture({ samples, onChange, maxSamples = 6 }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(false)
  const [lastSample, setLastSample] = useState(null)

  const toggleCamera = async () => {
    if (cameraOn) {
      stopCamera(streamRef.current)
      streamRef.current = null
      setCameraOn(false)
      if (videoRef.current) videoRef.current.srcObject = null
      return
    }
    setError('')
    setStarting(true)
    try {
      const stream = await startCamera(videoRef.current)
      streamRef.current = stream
      setCameraOn(true)
    } catch (e) {
      const name = e?.name || ''
      if (name === 'NotAllowedError' || /denied|permission/i.test(e.message)) {
        setError('Camera permission was blocked. Click the camera/lock icon in the browser address bar and allow camera access, then try again.')
      } else if (name === 'NotFoundError') {
        setError('No camera was found on this device.')
      } else {
        setError(e.message || 'Camera unavailable')
      }
    } finally {
      setStarting(false)
    }
  }

  const capture = async () => {
    const video = videoRef.current
    if (!video) return
    setError('')
    try {
      await waitForVideo(video)
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      const dataUrl = canvasToDataUrl(canvas)
      onChange([...samples, dataUrl].slice(0, maxSamples))
      setLastSample(dataUrl)
      setFlash(true)
      setTimeout(() => setFlash(false), 380)
    } catch (e) {
      setError(e.message)
    }
  }

  const addFile = async (file) => {
    if (!file) return
    setError('')
    try {
      const canvas = await imageFileToCanvas(file, 640)
      const dataUrl = canvasToDataUrl(canvas)
      onChange([...samples, dataUrl].slice(0, maxSamples))
      setLastSample(dataUrl)
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
        <button className="btn secondary sm" onClick={toggleCamera} disabled={starting}>
          {starting ? 'Starting camera...' : cameraOn ? 'Close Camera' : 'Open Camera'}
        </button>
      </div>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
        Capture {samples.length < 3 ? 'at least 3' : 'more'} samples under different angles and lighting for better accuracy (recommended 3-5).
      </p>

      {error && <div className="alert error">{error}</div>}

      {cameraOn && (
        <div style={{ display: 'flex', gap: 12, margin: '10px 0', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 240 }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: 240, borderRadius: 12, background: '#000', transform: 'scaleX(-1)', display: 'block' }}
            />
            {flash && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(255,255,255,0.85)',
                  borderRadius: 12,
                  animation: 'flashOut 0.38s ease-out',
                }}
              />
            )}
          </div>
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
            <img
              src={s}
              alt={`sample ${i + 1}`}
              style={{
                width: 90,
                height: 90,
                objectFit: 'cover',
                borderRadius: 10,
                border: lastSample === s ? '2px solid var(--green)' : '1px solid var(--border)',
              }}
            />
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
