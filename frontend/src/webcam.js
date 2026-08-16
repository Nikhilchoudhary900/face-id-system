export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function imageFileToCanvas(file, maxDim = 1280) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      const scale = Math.min(1, maxDim / Math.max(width, height))
      width = Math.round(width * scale)
      height = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load image'))
    }
    img.src = url
  })
}

export async function startCamera(videoEl) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia is not supported in this browser')
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  })
  videoEl.srcObject = stream
  await new Promise((resolve) => {
    videoEl.onloadedmetadata = () => {
      videoEl.play()
      resolve()
    }
  })
  return stream
}

export function stopCamera(stream) {
  if (stream) stream.getTracks().forEach((t) => t.stop())
}

/**
 * Draw the current video frame (mirrored) onto a canvas and render face boxes.
 * Coordinates are in original frame pixel space; canvas keeps the same intrinsic
 * size so object-fit: contain keeps boxes aligned with the video element.
 */
export function renderFrame(videoEl, canvasEl, faces, flip = false) {
  const w = videoEl.videoWidth || 640
  const h = videoEl.videoHeight || 480
  if (!w || !h) return
  if (canvasEl.width !== w) canvasEl.width = w
  if (canvasEl.height !== h) canvasEl.height = h
  const ctx = canvasEl.getContext('2d')

  ctx.save()
  if (flip) {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(videoEl, 0, 0, w, h)
  ctx.restore()

  if (!faces || !faces.length) return

  for (const f of faces) {
    const [x, y, fw, fh] = f.bbox
    const boxX = flip ? w - x - fw : x
    const known = f.is_known
    ctx.strokeStyle = known ? '#2dd4a7' : '#ff5d73'
    ctx.lineWidth = 3
    ctx.strokeRect(boxX, y, fw, fh)

    const label = known && f.matched_user ? f.matched_user.name : `Unknown (${(f.score * 100).toFixed(0)}%)`
    ctx.font = 'bold 15px Inter, sans-serif'
    const tw = ctx.measureText(label).width
    const pad = 6
    ctx.fillStyle = known ? 'rgba(45,212,167,0.92)' : 'rgba(255,93,115,0.92)'
    ctx.fillRect(boxX, y - 28, tw + pad * 2, 26)
    ctx.fillStyle = '#0a0f1d'
    ctx.fillText(label, boxX + pad, y - 10)
  }
}

export function canvasToDataUrl(canvasEl, type = 'image/jpeg', quality = 0.85) {
  return canvasEl.toDataURL(type, quality)
}
