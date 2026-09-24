'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Bell,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  FileArchive,
  FileCheck2,
  FileUp,
  GitCompare,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  PackageCheck,
  PanelLeft,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  UsersRound,
  WalletCards,
  Wifi,
  X,
  ZoomIn,
} from 'lucide-react'
import Clinical3DViewer from '@/components/Clinical3DViewer'
import { useAuth } from '@/contexts/AuthContext'
import {
  acceptOrder,
  approveOrder,
  completeAttachmentUpload,
  createOrder,
  createUploadUrl,
  getAttachmentDownloadUrl,
  getOrderById,
  getOrders,
  requestOrderRevision,
  submitOrderDelivery,
  uploadFileToStorage,
} from '@/services/orderService'
import type { AttachmentStage, CreateOrderRequest, OrderAttachment, OrderResponse, OrderStatus } from '@/types/order'

type RoleLabel = 'Dentista' | 'Cadista'
type CaseFile = {
  id: string
  file: File
  stage: AttachmentStage
  status: 'ready' | 'uploading' | 'uploaded' | 'error'
}

const clinicalInputExtensions = ['.stl', '.ply']
const cadDeliveryExtensions = ['.stl', '.constructioninfo', '.html']
const teeth = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28','48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`
  }
  return `${(size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}

function formatDate(value?: string) {
  if (!value) return 'Agora'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function mapStatus(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    OPEN: 'Aguardando Cadista',
    IN_PROGRESS: 'Em Produção',
    IN_REVIEW: 'Em Revisão',
    REVISION_REQUESTED: 'Ajuste Solicitado',
    COMPLETED: 'Concluído',
  }
  return labels[status]
}

function statusTone(status: OrderStatus) {
  if (status === 'COMPLETED') return 'success'
  if (status === 'IN_REVIEW' || status === 'REVISION_REQUESTED') return 'review'
  if (status === 'IN_PROGRESS') return 'drawing'
  return 'waiting'
}

function isSupportedCaseFile(fileName: string, acceptedExtensions: string[]) {
  const lowerCaseName = fileName.toLowerCase()
  return acceptedExtensions.some((extension) => lowerCaseName.endsWith(extension))
}

function orderWork(order: OrderResponse) {
  const selectedTeeth = order.items.map((item) => item.toothNumber).join(', ')
  const serviceType = order.items[0]?.serviceType ?? 'Caso odontológico'
  return `${serviceType} · ${selectedTeeth || 'Sem dentes'}`
}

function Brand() {
  return <div className="brand"><div className="brand-mark"><span className="brand-cross">+</span></div><div><div className="brand-name">dentform</div><div className="brand-caption">DIGITAL DENTISTRY</div></div></div>
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status-badge ${statusTone(status)}`}><span className="status-dot" />{mapStatus(status)}</span>
}

function Header({ role, userName, onLogout }: { role: RoleLabel; userName: string; onLogout: () => void }) {
  const initials = userName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <header className="topbar"><div className="topbar-left"><button className="mobile-menu" aria-label="Abrir menu"><PanelLeft /></button><Brand /></div><div className="topbar-actions"><div className="role-switcher" aria-label="Perfil autenticado"><button className="active" type="button">{role === 'Dentista' ? <UserRound /> : <UsersRound />}{role}</button></div><button className="notification-button" aria-label="Notificações"><Bell /><span /></button><div className="profile-avatar">{initials || 'U'}</div><button className="icon-button" aria-label="Terminar sessão" title="Terminar sessão" onClick={onLogout}><LogOut /></button></div></header>
}

function Sidebar({ active, setActive, role, orderCount, userName }: { active: string; setActive: (label: string) => void; role: RoleLabel; orderCount: number; userName: string }) {
  const initials = userName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
  const navItems = role === 'Dentista'
    ? [{ label: 'Visão geral', icon: LayoutDashboard }, { label: 'Meus Casos', icon: FileCheck2 }, { label: 'Novo Caso', icon: Plus }]
    : [{ label: 'Visão geral', icon: LayoutDashboard }, { label: 'Meus Casos', icon: FileCheck2 }]

  return <aside className="sidebar"><div className="sidebar-profile"><div className="large-avatar">{initials}</div><div><strong>{userName}</strong><span>{role} · dentform</span></div><MoreHorizontal className="muted-icon" /></div><nav className="main-nav">{navItems.map(({ label, icon: Icon }) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => setActive(label)}><Icon />{label}{label === 'Meus Casos' && <span className="nav-count">{orderCount}</span>}</button>)}</nav><div className="sidebar-label">GESTÃO</div><nav className="main-nav"><button className="nav-item"><WalletCards />Financeiro</button><button className="nav-item"><MessageCircle />Mensagens</button><button className="nav-item"><Settings2 />Configurações</button></nav><div className="sidebar-bottom"><div className="secure-card"><ShieldCheck /><div><strong>Ambiente seguro</strong><span>Arquivos 3D por URLs assinadas</span></div></div></div></aside>
}

function StatCard({ icon: Icon, label, value, trend, tone }: { icon: typeof Activity; label: string; value: string; trend: string; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon /></div><div><span className="eyebrow">{label}</span><div className="stat-value">{value}</div><span className="stat-trend">{trend}</span></div></div>
}

function CaseFileUpload({ files, onFilesChange, stage, acceptedExtensions, helperText }: { files: CaseFile[]; onFilesChange: (files: CaseFile[]) => void; stage: AttachmentStage; acceptedExtensions: string[]; helperText: string }) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = (fileList: FileList | File[]) => {
    const nextFiles = Array.from(fileList)
    const validFiles = nextFiles.filter((file) => isSupportedCaseFile(file.name, acceptedExtensions))
    setError(nextFiles.length === validFiles.length ? null : `Use apenas ${acceptedExtensions.join(', ')}.`)
    onFilesChange([...files, ...validFiles.map((file) => ({ id: `${file.name}-${file.size}-${file.lastModified}`, file, stage, status: 'ready' as const }))])
  }

  return <div><label className={dragActive ? 'upload-zone active' : 'upload-zone'} onDragOver={(event) => { event.preventDefault(); setDragActive(true) }} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); addFiles(event.dataTransfer.files) }}><UploadCloud /><strong>Arraste os arquivos aqui ou <span>selecione do computador</span></strong><small>{helperText}</small><input type="file" multiple accept={acceptedExtensions.join(',')} onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = '' }} /></label>{error && <p className="escrow-note">{error}</p>}<div className="file-checklist">{files.length === 0 ? <div className="file-row"><div className="file-status"><FileUp /></div><div><strong>Nenhum arquivo selecionado</strong><span>O upload será feito direto para o storage</span></div></div> : files.map((item) => <div className="file-row" key={item.id}><div className={item.status === 'uploaded' ? 'file-status checked' : 'file-status'}>{item.status === 'uploaded' ? <Check /> : <FileArchive />}</div><div><strong>{item.file.name}</strong><span>{formatFileSize(item.file.size)} · {item.status === 'uploading' ? 'enviando' : item.status === 'uploaded' ? 'enviado' : item.status === 'error' ? 'falhou' : 'pronto'}</span></div><button className="remove-file" onClick={() => onFilesChange(files.filter((file) => file.id !== item.id))}><X /></button></div>)}</div></div>
}

function Dashboard({ orders, usingFallback, onNewCase, onOpenCase }: { orders: OrderResponse[]; usingFallback: boolean; onNewCase: () => void; onOpenCase: (order: OrderResponse) => void }) {
  return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">PAINEL DO DENTISTA</div><h1>Meus Casos</h1><p>Acompanhe seus casos clínicos e aprove entregas CAD.</p></div><button className="primary-button" onClick={onNewCase}><Plus />Novo Caso</button></div><div className="stats-grid"><StatCard icon={Activity} label="Casos ativos" value={String(orders.filter((order) => order.status !== 'COMPLETED').length).padStart(2, '0')} trend="Sincronizado com a API" tone="blue"/><StatCard icon={Clock3} label="Aguardando aprovação" value={String(orders.filter((order) => order.status === 'IN_REVIEW').length).padStart(2, '0')} trend="Revisar 3D" tone="amber"/><StatCard icon={CircleDollarSign} label="Último valor" value={orders[0] ? formatCurrency(orders[0].totalAmount) : 'R$ 0,00'} trend="Caso mais recente" tone="green"/><StatCard icon={PackageCheck} label="Concluídos" value={String(orders.filter((order) => order.status === 'COMPLETED').length).padStart(2, '0')} trend="Total aprovado" tone="violet"/></div><section className="panel orders-panel"><div className="panel-header"><div><h2>Lista de Casos</h2><p>{usingFallback ? 'Sem conexão com a API. Exibindo lista vazia segura.' : 'Casos carregados da API'}</p></div></div><div className="filter-row"><div className="search-box"><Search /><input placeholder="Buscar por paciente ou caso..." /></div><button className="filter-button">Todos os status <ChevronDown /></button></div><OrderList orders={orders} onOpenCase={onOpenCase} /></section></div>
}

function OrderList({ orders, onOpenCase }: { orders: OrderResponse[]; onOpenCase: (order: OrderResponse) => void }) {
  return <div className="orders-list">{orders.length === 0 ? <div className="empty-state">Nenhum caso encontrado.</div> : orders.map((order) => <button key={order.id} className="order-row" onClick={() => onOpenCase(order)}><div className="order-leading"><div className="order-icon selected"><FileCheck2 /></div><div><strong>Caso {String(order.id).padStart(5, '0')} <span>·</span> {order.title}</strong><span>{orderWork(order)}</span></div></div><div className="order-meta"><StatusBadge status={order.status}/><span>{formatDate(order.createdAt)}</span><strong>{formatCurrency(order.totalAmount)}</strong><ArrowRight /></div></button>)}</div>
}

function NewCase({ onBack, onSubmit }: { onBack: () => void; onSubmit: (request: CreateOrderRequest, files: CaseFile[], onFilesChange: (files: CaseFile[]) => void) => Promise<void> }) {
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(['16'])
  const [work, setWork] = useState('Coroa')
  const [patient, setPatient] = useState('')
  const [reference, setReference] = useState('')
  const [files, setFiles] = useState<CaseFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const total = selectedTeeth.length * (work === 'Implante' ? 780 : work === 'Faceta' ? 310 : 460)
  const toggleTooth = (tooth: string) => setSelectedTeeth((current) => current.includes(tooth) ? current.filter((item) => item !== tooth) : [...current, tooth])

  const handleSubmit = async () => {
    if (selectedTeeth.length === 0) {
      setSubmitError('Selecione ao menos um dente FDI.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit({
        title: patient.trim() || 'Paciente sem identificação',
        description: reference.trim() || undefined,
        items: selectedTeeth.map((tooth) => ({ toothNumber: Number(tooth), serviceType: work, notes: files.length > 0 ? `Arquivos anexados: ${files.map((item) => item.file.name).join(', ')}` : undefined })),
      }, files, setFiles)
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Não foi possível enviar o caso agora.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="page-content form-page"><div className="breadcrumb"><button onClick={onBack}>Visão geral</button><ArrowRight /><span>Novo Caso</span></div><div className="page-heading"><div><div className="eyebrow">NOVO CASO</div><h1>Novo Caso</h1><p>Defina o escopo do trabalho e envie os arquivos clínicos.</p></div></div><div className="form-layout"><div className="form-main"><section className="panel form-card"><div className="section-heading"><div className="section-number">01</div><div><h2>Identificação do caso</h2><p>Informações básicas para o cadista</p></div></div><div className="field-grid"><label className="field"><span>Paciente <em>*</em></span><input value={patient} onChange={(event) => setPatient(event.target.value)} placeholder="Nome ou código do paciente"/></label><label className="field"><span>Referência interna</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ex.: Caso família Silva"/></label></div></section><section className="panel form-card"><div className="section-heading"><div className="section-number">02</div><div><h2>Planejamento odontológico</h2><p>Selecione os dentes e o tipo de trabalho</p></div></div><div className="field-label">Odontograma FDI <span>· Selecione um ou mais dentes</span></div><div className="odontogram"><div className="arch-label"><span>MAXILA</span><span>MAXILA</span></div><div className="teeth-row">{teeth.slice(0,16).map((tooth) => <button key={tooth} type="button" className={selectedTeeth.includes(tooth) ? 'tooth selected' : 'tooth'} onClick={() => toggleTooth(tooth)}>{tooth}</button>)}</div><div className="midline"/><div className="teeth-row mandibular">{teeth.slice(16).map((tooth) => <button key={tooth} type="button" className={selectedTeeth.includes(tooth) ? 'tooth selected' : 'tooth'} onClick={() => toggleTooth(tooth)}>{tooth}</button>)}</div><div className="arch-label bottom"><span>MANDÍBULA</span><span>MANDÍBULA</span></div></div><div className="field-label work-label">Tipo de trabalho</div><div className="choice-grid">{['Coroa','Faceta','Implante'].map((item) => <button key={item} type="button" className={work === item ? 'choice-card selected' : 'choice-card'} onClick={() => setWork(item)}><div className="choice-symbol">{item === 'Coroa' ? '◒' : item === 'Faceta' ? '◓' : '⊙'}</div><div><strong>{item}</strong><span>{item === 'Coroa' ? 'Monolítica ou estratificada' : item === 'Faceta' ? 'Lente de contato dental' : 'Coroa sobre implante'}</span></div>{work === item && <CheckCircle2 />}</button>)}</div></section><section className="panel form-card"><div className="section-heading"><div className="section-number">03</div><div><h2>Arquivos Clínicos do Caso</h2><p>Formatos aceitos: .stl, .ply</p></div></div><CaseFileUpload files={files} onFilesChange={setFiles} stage="CLINICAL_INPUT" acceptedExtensions={clinicalInputExtensions} helperText=".stl ou .ply · envio direto para o storage" /></section></div><aside className="case-summary panel"><div className="summary-top"><span className="eyebrow">RESUMO DO CASO</span><div className="summary-icon"><LockKeyhole /></div></div><h2>Novo Caso</h2><p className="summary-subtitle">Aberto após envio</p><div className="summary-divider"/><div className="summary-line"><span>Dentes selecionados</span><strong>{selectedTeeth.length > 0 ? selectedTeeth.join(', ') : 'Nenhum'}</strong></div><div className="summary-line"><span>Tipo de trabalho</span><strong>{work}</strong></div><div className="summary-line"><span>Arquivos anexados</span><strong>{files.length}</strong></div><div className="escrow-box"><div><span>Valor estimado</span><strong>{formatCurrency(total)}</strong></div><CircleDollarSign /></div><p className="escrow-note"><ShieldCheck /> O valor só é liberado após sua aprovação final.</p>{submitError && <p className="escrow-note">{submitError}</p>}<button className="primary-button full" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Enviando caso...' : 'Criar caso'} <ArrowRight /></button><button className="secondary-button full" onClick={onBack}>Cancelar</button></aside></div></div>
}

function CaseTimeline({ status }: { status: OrderStatus }) {
  const steps: { status: OrderStatus; label: string }[] = [{ status: 'OPEN', label: 'Aberto' }, { status: 'IN_PROGRESS', label: 'Em Produção' }, { status: 'IN_REVIEW', label: 'Em Revisão' }, { status: 'COMPLETED', label: 'Concluído' }]
  const activeIndex = status === 'REVISION_REQUESTED' ? 2 : steps.findIndex((step) => step.status === status)
  return <div className="case-timeline">{steps.map((step, index) => <div className={index <= activeIndex ? 'timeline-step active' : 'timeline-step'} key={step.status}><span>{index + 1}</span><strong>{step.label}</strong></div>)}{status === 'REVISION_REQUESTED' && <div className="timeline-step revision active"><span>!</span><strong>Ajuste Solicitado</strong></div>}</div>
}

function ReviewWorkspace({ order, role, onBack, onRefresh }: { order: OrderResponse; role: RoleLabel; onBack: () => void; onRefresh: (id: number) => Promise<OrderResponse> }) {
  const clinicalAttachments = order.attachments.filter((attachment) => attachment.stage === 'CLINICAL_INPUT')
  const cadAttachments = order.attachments.filter((attachment) => attachment.stage === 'CAD_DELIVERY')
  const [viewerAttachments, setViewerAttachments] = useState<OrderAttachment[]>([])
  const [deliveryFiles, setDeliveryFiles] = useState<CaseFile[]>([])
  const [revisionFeedback, setRevisionFeedback] = useState(order.revisionFeedback ?? '')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const hasDeliveryStl = cadAttachments.some((file) => file.fileName.toLowerCase().endsWith('.stl') && file.uploaded)

  const withDownloadUrl = async (attachment: OrderAttachment) => {
    if (attachment.downloadUrl) return attachment
    const response = await getAttachmentDownloadUrl(order.id, attachment.id)
    const next = { ...attachment, downloadUrl: response.downloadUrl, viewerUrl: attachment.fileName.toLowerCase().endsWith('.html') ? response.downloadUrl : attachment.viewerUrl }
    return next
  }

  const inspectAttachment = async (attachments: OrderAttachment[]) => {
    setStatusMessage(null)
    try {
      const hydrated = await Promise.all(attachments.filter((attachment) => attachment.uploaded !== false).map(withDownloadUrl))
      setViewerAttachments(hydrated)
    } catch {
      setStatusMessage('Não foi possível abrir a visualização agora.')
    }
  }

  const downloadAttachment = async (attachment: OrderAttachment) => {
    try {
      const response = await getAttachmentDownloadUrl(order.id, attachment.id)
      window.open(response.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch {
      setStatusMessage('Não foi possível gerar o link de download.')
    }
  }

  const uploadFiles = async (files: CaseFile[], onFilesChange: (files: CaseFile[]) => void) => {
    let nextFiles = files
    for (const item of files) {
      nextFiles = nextFiles.map((file) => file.id === item.id ? { ...file, status: 'uploading' } : file)
      onFilesChange(nextFiles)
      const upload = await createUploadUrl(order.id, { fileName: item.file.name, mimeType: item.file.type || 'application/octet-stream', size: item.file.size, attachmentStage: item.stage })
      await uploadFileToStorage(upload.uploadUrl, item.file)
      await completeAttachmentUpload(order.id, upload.attachmentId)
      nextFiles = nextFiles.map((file) => file.id === item.id ? { ...file, status: 'uploaded' } : file)
      onFilesChange(nextFiles)
    }
  }

  const uploadDelivery = async () => {
    setStatusMessage(null)
    try {
      await uploadFiles(deliveryFiles, setDeliveryFiles)
      await onRefresh(order.id)
      setStatusMessage('Entrega enviada para o storage.')
    } catch (cause) {
      setDeliveryFiles((current) => current.map((file) => file.status === 'uploading' ? { ...file, status: 'error' } : file))
      setStatusMessage(cause instanceof Error ? cause.message : 'Não foi possível enviar a entrega.')
    }
  }

  const runTransition = async (action: () => Promise<OrderResponse>, successMessage: string) => {
    try {
      setStatusMessage(null)
      const updated = await action()
      await onRefresh(updated.id)
      setStatusMessage(successMessage)
    } catch (cause) {
      setStatusMessage(cause instanceof Error ? cause.message : 'Não foi possível atualizar o caso.')
    }
  }

  return <div className="page-content workspace-page"><div className="breadcrumb"><button onClick={onBack}>Meus Casos</button><ArrowRight /><span>Caso {String(order.id).padStart(5, '0')} · Detalhes do Caso</span></div><div className="workspace-heading"><div><div className="eyebrow">CASO {String(order.id).padStart(5, '0')} · {mapStatus(order.status).toUpperCase()}</div><h1>Detalhes do Caso · {orderWork(order)}</h1><p>Paciente: {order.title}{order.designerId && <><span className="heading-separator">·</span> Cadista atribuído</>}</p></div><StatusBadge status={order.status} /></div><CaseTimeline status={order.status} /><div className="workspace-grid"><section className="viewer-panel panel"><Clinical3DViewer attachments={viewerAttachments} /></section><aside className="review-sidebar panel"><div className="review-header"><div><h2>Arquivos do caso</h2><p>Entrada clínica e entrega CAD</p></div><span className="online"><Wifi /> Online</span></div><div className="attachment-tabs"><section><div className="section-heading compact"><div className="section-number">01</div><div><h2>Arquivos Clínicos do Caso</h2><p>Enviados pelo dentista</p></div></div><AttachmentList attachments={clinicalAttachments} empty="Nenhum arquivo clínico anexado." onInspect={(attachment) => inspectAttachment([attachment])} onDownload={downloadAttachment} /></section><section><div className="section-heading compact"><div className="section-number">02</div><div><h2>Entrega do Design</h2><p>Arquivos finais enviados pelo cadista</p></div></div><AttachmentList attachments={cadAttachments} empty="Nenhuma entrega CAD recebida." onInspect={(attachment) => inspectAttachment(attachment.fileName.toLowerCase().endsWith('.html') ? [attachment] : [attachment, ...clinicalAttachments.filter((item) => item.fileName.toLowerCase().endsWith('.stl'))])} onDownload={downloadAttachment} />{role === 'Cadista' && (order.status === 'IN_PROGRESS' || order.status === 'REVISION_REQUESTED') && <div className="delivery-upload"><CaseFileUpload files={deliveryFiles} onFilesChange={setDeliveryFiles} stage="CAD_DELIVERY" acceptedExtensions={cadDeliveryExtensions} helperText=".stl, .constructioninfo ou .html · sem pastas brutas ou zips" /><button className="primary-button full" onClick={uploadDelivery} disabled={deliveryFiles.length === 0}>Enviar entrega CAD</button></div>}{role === 'Dentista' && <label className="field revision-field"><span>Observações para ajuste</span><textarea value={revisionFeedback} onChange={(event) => setRevisionFeedback(event.target.value)} placeholder="Descreva o ajuste clínico necessário..." /></label>}</section></div>{statusMessage && <p className="escrow-note status-message">{statusMessage}</p>}<div className="review-actions">{role === 'Cadista' && <><button className="request-button" onClick={() => runTransition(() => acceptOrder(order.id), 'Caso assumido pelo cadista.')} disabled={order.status !== 'OPEN'}><CheckCircle2 />Assumir Caso</button><button className="approve-button" onClick={() => runTransition(() => submitOrderDelivery(order.id), 'Caso enviado para aprovação.')} disabled={(order.status !== 'IN_PROGRESS' && order.status !== 'REVISION_REQUESTED') || !hasDeliveryStl}><UploadCloud />Enviar para Aprovação</button></>}{role === 'Dentista' && <><button className="approve-button" onClick={() => runTransition(() => approveOrder(order.id), 'Design aprovado.')} disabled={order.status !== 'IN_REVIEW' || !hasDeliveryStl}><CheckCircle2 />Aprovar Design</button><button className="request-button" onClick={() => runTransition(() => requestOrderRevision(order.id, revisionFeedback), 'Ajuste solicitado ao cadista.')} disabled={order.status !== 'IN_REVIEW' || revisionFeedback.trim().length === 0}><MessageCircle />Pedir Ajuste</button></>}</div></aside></div></div>
}

function AttachmentList({ attachments, empty, onInspect, onDownload }: { attachments: OrderAttachment[]; empty: string; onInspect: (attachment: OrderAttachment) => void; onDownload: (attachment: OrderAttachment) => void }) {
  return <div className="file-checklist">{attachments.length === 0 ? <div className="file-row"><div className="file-status"><FileArchive /></div><div><strong>{empty}</strong><span>Aguardando upload</span></div></div> : attachments.map((attachment) => <div className="file-row" key={attachment.id}><div className={attachment.uploaded ? 'file-status checked' : 'file-status'}>{attachment.stage === 'CAD_DELIVERY' ? <FileCheck2 /> : <FileArchive />}</div><div><strong>{attachment.fileName}</strong><span>{formatFileSize(attachment.size)} · {attachment.uploaded ? 'confirmado' : 'pendente'}</span></div>{(attachment.fileName.toLowerCase().endsWith('.stl') || attachment.fileName.toLowerCase().endsWith('.html')) && <button className="attach-button" onClick={() => onInspect(attachment)}>{attachment.fileName.toLowerCase().endsWith('.html') ? 'Webview 3D' : <><ZoomIn />Inspecionar 3D</>}</button>}<button className="remove-file" aria-label="Baixar arquivo" onClick={() => onDownload(attachment)}><Download /></button></div>)}</div>
}

function DesignerBoard({ orders, onOpenCase }: { orders: OrderResponse[]; onOpenCase: (order: OrderResponse) => void }) {
  const openOrders = orders.filter((order) => order.status === 'OPEN')
  const assignedOrders = orders.filter((order) => order.status !== 'OPEN')
  return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">CENTRAL DE OPORTUNIDADES</div><h1>Mural do Cadista</h1><p>Assuma casos abertos e acompanhe suas entregas.</p></div><div className="designer-balance"><CircleDollarSign /><div><span>Potencial aberto</span><strong>{formatCurrency(openOrders.reduce((sum, order) => sum + order.totalAmount, 0))}</strong></div></div></div><div className="designer-grid"><section className="panel open-cases"><div className="panel-header"><div><h2>Casos abertos</h2><p>Novos trabalhos na rede dentform</p></div><span className="live-pill"><span/> Atualizado agora</span></div><div className="case-filters"><button className="active">Todos <span>{openOrders.length}</span></button><button>Atribuídos <span>{assignedOrders.length}</span></button></div>{openOrders.length === 0 ? <div className="empty-state">Nenhum caso aberto no momento.</div> : openOrders.map((order) => <div className="open-case" key={order.id}><div className="case-type blue"><Box /></div><div className="case-info"><div><strong>{order.items[0]?.serviceType ?? 'Caso odontológico'}</strong><span>Caso {String(order.id).padStart(5, '0')} <i>·</i> {formatDate(order.createdAt)}</span></div><p>{order.title} · {orderWork(order)}</p><div className="case-tags"><span>Exocad</span><span>{order.attachments.length} arquivos</span></div></div><div className="case-price"><strong>{formatCurrency(order.totalAmount)}</strong><span>valor estimado</span><button onClick={() => onOpenCase(order)}>Ver caso <ArrowRight /></button></div></div>)}</section><aside className="panel designer-profile"><div className="profile-cover"/><div className="designer-avatar">CD<span><Check /></span></div><h2>Área do Cadista</h2><p>Produção CAD/CAM</p><div className="rating"><span>★</span> Marketplace <small>· {assignedOrders.length} casos atribuídos</small></div><div className="profile-stats"><div><strong>{assignedOrders.filter((order) => order.status === 'IN_REVIEW').length}</strong><span>Em revisão</span></div><div><strong>{assignedOrders.filter((order) => order.status === 'COMPLETED').length}</strong><span>Concluídos</span></div></div><div className="profile-skills"><span>Prótese fixa</span><span>Implante</span><span>Exocad</span></div></aside></div><section className="panel delivery-panel"><div className="panel-header"><div><h2>Meus Casos</h2><p>Casos assumidos e entregas em andamento</p></div></div><OrderList orders={assignedOrders} onOpenCase={onOpenCase} /></section></div>
}

export default function OdontoMarketplace() {
  const { user, signOut } = useAuth()
  const role: RoleLabel = user?.role === 'DESIGNER' ? 'Cadista' : 'Dentista'
  const [active, setActive] = useState('Visão geral')
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [usingFallback, setUsingFallback] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null)

  const loadOrders = async () => {
    try {
      const apiOrders = await getOrders()
      setOrders(apiOrders)
      setUsingFallback(false)
      return apiOrders
    } catch {
      setOrders([])
      setUsingFallback(true)
      return []
    }
  }

  useEffect(() => {
    void loadOrders()
  }, [user?.id, user?.role])

  useEffect(() => {
    if (role === 'Cadista' && active === 'Novo Caso') {
      setActive('Visão geral')
    }
  }, [active, role])

  const refreshOrder = async (id: number) => {
    const updated = await getOrderById(String(id))
    setSelectedOrder(updated)
    setOrders((current) => current.map((order) => order.id === updated.id ? updated : order))
    return updated
  }

  const openCase = async (order: OrderResponse) => {
    try {
      const detail = await getOrderById(String(order.id))
      setSelectedOrder(detail)
      setActive('Meus Casos')
    } catch {
      setSelectedOrder(order)
      setActive('Meus Casos')
    }
  }

  const uploadFiles = async (orderId: number, caseFiles: CaseFile[], onFilesChange: (files: CaseFile[]) => void) => {
    let uploadFiles = caseFiles
    for (const item of uploadFiles) {
      uploadFiles = uploadFiles.map((file) => file.id === item.id ? { ...file, status: 'uploading' } : file)
      onFilesChange(uploadFiles)
      const upload = await createUploadUrl(orderId, { fileName: item.file.name, mimeType: item.file.type || 'application/octet-stream', size: item.file.size, attachmentStage: item.stage })
      await uploadFileToStorage(upload.uploadUrl, item.file)
      await completeAttachmentUpload(orderId, upload.attachmentId)
      uploadFiles = uploadFiles.map((file) => file.id === item.id ? { ...file, status: 'uploaded' } : file)
      onFilesChange(uploadFiles)
    }
  }

  const handleCreateOrder = async (request: CreateOrderRequest, caseFiles: CaseFile[], onFilesChange: (files: CaseFile[]) => void) => {
    const createdOrder = await createOrder(request)
    await uploadFiles(createdOrder.id, caseFiles, onFilesChange)
    await loadOrders()
    setSelectedOrder(await getOrderById(String(createdOrder.id)))
    setActive('Meus Casos')
  }

  const screen = active === 'Novo Caso'
    ? <NewCase onBack={() => setActive('Visão geral')} onSubmit={handleCreateOrder} />
    : active === 'Meus Casos' && selectedOrder
      ? <ReviewWorkspace order={selectedOrder} role={role} onBack={() => { setSelectedOrder(null); setActive('Visão geral') }} onRefresh={refreshOrder} />
      : role === 'Cadista'
        ? <DesignerBoard orders={orders} onOpenCase={openCase} />
        : <Dashboard orders={orders} usingFallback={usingFallback} onNewCase={() => setActive('Novo Caso')} onOpenCase={openCase} />

  return <div className="app-shell"><Header role={role} userName={user?.name ?? 'Utilizador'} onLogout={signOut}/><div className="app-body"><Sidebar active={active} setActive={setActive} role={role} orderCount={orders.length} userName={user?.name ?? 'Utilizador'}/><main className="main-area">{screen}</main></div></div>
}
