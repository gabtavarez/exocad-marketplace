'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import type { OrderAttachment } from '@/types/order'

type ViewerMode = 'shaded' | 'wireframe'

type MeshState = {
  id: string
  name: string
  visible: boolean
  opacity: number
}

const palette = ['#d9e6f2', '#f5c7a9', '#b8e0d2', '#d7c4f2', '#f2d98d']

function isMeshAttachment(attachment: OrderAttachment) {
  const fileName = attachment.fileName.toLowerCase()
  return (fileName.endsWith('.stl') || fileName.endsWith('.ply')) && Boolean(attachment.viewerUrl || attachment.downloadUrl)
}

function isHtmlAttachment(attachment: OrderAttachment) {
  return attachment.fileName.toLowerCase().endsWith('.html') && Boolean(attachment.viewerUrl || attachment.downloadUrl)
}

export default function Clinical3DViewer({ attachments }: { attachments: OrderAttachment[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const meshesRef = useRef<Record<string, THREE.Mesh>>({})
  const [mode, setMode] = useState<ViewerMode>('shaded')
  const [meshes, setMeshes] = useState<MeshState[]>([])
  const [showWebview, setShowWebview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const meshAttachments = useMemo(() => attachments.filter(isMeshAttachment), [attachments])
  const htmlAttachment = useMemo(() => attachments.find(isHtmlAttachment), [attachments])
  const webviewUrl = htmlAttachment?.viewerUrl ?? htmlAttachment?.downloadUrl

  useEffect(() => {
    const container = containerRef.current

    if (!container || showWebview) {
      return
    }
    if (meshAttachments.length === 0) {
      setMeshes([])
      setLoading(false)
      setLoadError(null)
      return
    }

    setLoading(true)
    setLoadError(null)
    setMeshes([])

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#f8fafc')

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 10000)
    camera.position.set(0, -95, 65)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.screenSpacePanning = true

    scene.add(new THREE.HemisphereLight('#ffffff', '#b7c4d6', 2.2))

    const keyLight = new THREE.DirectionalLight('#ffffff', 2.1)
    keyLight.position.set(75, -65, 90)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight('#dbeafe', 1.15)
    fillLight.position.set(-65, 55, 45)
    scene.add(fillLight)

    const group = new THREE.Group()
    scene.add(group)

    const stlLoader = new STLLoader()
    const plyLoader = new PLYLoader()
    const abortController = new AbortController()
    let disposed = false

    Promise.all(meshAttachments.map(async (attachment, index) => {
      const response = await fetch(attachment.viewerUrl ?? attachment.downloadUrl!, { signal: abortController.signal })
      if (!response.ok) throw new Error(`Falha ao carregar ${attachment.fileName}`)
      const buffer = await response.arrayBuffer()
      const geometry = attachment.fileName.toLowerCase().endsWith('.ply')
        ? plyLoader.parse(buffer)
        : stlLoader.parse(buffer)
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
      geometry.computeBoundingBox()

      const material = new THREE.MeshStandardMaterial({
        color: palette[index % palette.length],
        metalness: 0.02,
        roughness: 0.58,
        transparent: true,
        opacity: index === 0 ? 0.95 : 0.48,
        wireframe: mode === 'wireframe',
        vertexColors: Boolean(geometry.getAttribute('color')),
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = String(attachment.id)
      group.add(mesh)
      meshesRef.current[String(attachment.id)] = mesh

      return {
        id: String(attachment.id),
        name: attachment.fileName,
        visible: true,
        opacity: material.opacity,
      }
    })).then((loadedMeshes) => {
      if (disposed) return

      const box = new THREE.Box3().setFromObject(group)
      const size = box.getSize(new THREE.Vector3()).length()
      const center = box.getCenter(new THREE.Vector3())
      group.position.sub(center)
      camera.position.set(size * 0.55, -size * 1.2, size * 0.7)
      controls.target.set(0, 0, 0)
      controls.update()
      setMeshes(loadedMeshes)
      setLoading(false)
    }).catch((cause) => {
      if (disposed || cause instanceof DOMException && cause.name === 'AbortError') return
      setMeshes([])
      setLoading(false)
      setLoadError('Não foi possível abrir esta malha. Verifique o arquivo ou tente gerar um novo link.')
    })

    const resizeObserver = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    })
    resizeObserver.observe(container)

    let animationFrame = 0
    const animate = () => {
      if (disposed) return
      controls.update()
      renderer.render(scene, camera)
      animationFrame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      disposed = true
      abortController.abort()
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      controls.dispose()
      Object.values(meshesRef.current).forEach((mesh) => {
        mesh.geometry.dispose()
        const material = mesh.material
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose())
        } else {
          material.dispose()
        }
      })
      meshesRef.current = {}
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [showWebview, meshAttachments])

  const updateMesh = (id: string, updates: Partial<MeshState>) => {
    setMeshes((current) => current.map((meshState) => {
      if (meshState.id !== id) return meshState

      const next = { ...meshState, ...updates }
      const mesh = meshesRef.current[id]

      if (mesh) {
        mesh.visible = next.visible
        const material = mesh.material as THREE.MeshStandardMaterial
        material.opacity = next.opacity
        material.transparent = next.opacity < 1
        material.wireframe = mode === 'wireframe'
        material.needsUpdate = true
      }

      return next
    }))
  }

  useEffect(() => {
    Object.values(meshesRef.current).forEach((mesh) => {
      const material = mesh.material as THREE.MeshStandardMaterial
      material.wireframe = mode === 'wireframe'
      material.needsUpdate = true
    })
  }, [mode])

  return (
    <div className="clinical-viewer">
      <div className="clinical-viewer-toolbar">
        <div className="toolbar-group">
          <button className={mode === 'shaded' ? 'tool-button active' : 'tool-button'} onClick={() => setMode('shaded')}>Shaded</button>
          <button className={mode === 'wireframe' ? 'tool-button active' : 'tool-button'} onClick={() => setMode('wireframe')}>Wireframe</button>
        </div>
        {webviewUrl && <button className={showWebview ? 'tool-button active' : 'tool-button'} onClick={() => setShowWebview(!showWebview)}>Abrir Webview 3D</button>}
      </div>
      {showWebview && webviewUrl ? (
        <iframe className="clinical-webview" src={webviewUrl} sandbox="allow-scripts allow-same-origin" title="Exocad Webview 3D" />
      ) : (
        <div className="clinical-canvas" ref={containerRef}>
          {meshAttachments.length === 0 && <div className="viewer-empty"><strong>Nenhuma malha disponível</strong><span>Selecione um arquivo .stl ou .ply para inspeção 3D.</span></div>}
          {loading && <div className="viewer-feedback"><span className="viewer-spinner" /><strong>Preparando visualização 3D...</strong></div>}
          {loadError && <div className="viewer-feedback error"><strong>Não foi possível abrir a malha</strong><span>{loadError}</span></div>}
        </div>
      )}
      <div className="mesh-controls">
        {meshes.map((mesh) => (
          <div className="mesh-control" key={mesh.id}>
            <label>
              <input type="checkbox" checked={mesh.visible} onChange={(event) => updateMesh(mesh.id, { visible: event.target.checked })} />
              <span>{mesh.name}</span>
            </label>
            <input type="range" min="0.15" max="1" step="0.05" value={mesh.opacity} onChange={(event) => updateMesh(mesh.id, { opacity: Number(event.target.value) })} />
          </div>
        ))}
      </div>
    </div>
  )
}
