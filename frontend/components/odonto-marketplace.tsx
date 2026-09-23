'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
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
  MessageCircle,
  Moon,
  MoreHorizontal,
  PackageCheck,
  PanelLeft,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  UserRound,
  UsersRound,
  WalletCards,
  Wifi,
  X,
  ZoomIn,
} from 'lucide-react'
import Clinical3DViewer from '@/components/Clinical3DViewer'
import { createOrder, createUploadUrl, getOrders, uploadFileToStorage } from '@/services/orderService'
import type { AttachmentStage, CreateOrderRequest, OrderAttachment, OrderResponse } from '@/types/order'

type DashboardOrder = {
  id: string
  patient: string
  work: string
  status: string
  date: string
  price: string
}

type CaseFile = {
  id: string
  file: File
  stage: AttachmentStage
  status: 'ready' | 'uploading' | 'uploaded' | 'error'
}

const FALLBACK_USER_ID = 1
const clinicalInputExtensions = ['.stl', '.ply']
const cadDeliveryExtensions = ['.stl', '.constructioninfo', '.html']

const fallbackOrders: DashboardOrder[] = [
  { id: 'Caso 24091', patient: 'M. Andrade', work: 'Coroa monolítica · 16', status: 'Em Revisão', date: 'Hoje, 09:42', price: 'R$ 460,00' },
  { id: 'Caso 24088', patient: 'L. Ferreira', work: 'Faceta · 11, 21', status: 'Em Desenho', date: 'Ontem, 16:20', price: 'R$ 620,00' },
  { id: 'Caso 24084', patient: 'C. Lima', work: 'Implante · 36', status: 'Aguardando Cadista', date: '12 Jun, 11:08', price: 'R$ 780,00' },
  { id: 'Caso 24077', patient: 'R. Nunes', work: 'Coroa · 46, 47', status: 'Concluído', date: '10 Jun, 14:36', price: 'R$ 920,00' },
]

const designers = [
  { initials: 'RS', name: 'Rafael Souza', specialty: 'Prótese fixa · Exocad', rating: '4.9', cases: '128 casos', available: true },
  { initials: 'MC', name: 'Marina Costa', specialty: 'Implantodontia digital', rating: '4.8', cases: '94 casos', available: true },
  { initials: 'GV', name: 'Gustavo Vieira', specialty: 'Estética anterior', rating: '5.0', cases: '76 casos', available: false },
]

const teeth = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28','48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']
const navItems = [
  { label: 'Visão geral', icon: LayoutDashboard },
  { label: 'Meus Casos', icon: FileCheck2 },
  { label: 'Novo Caso', icon: Plus },
]

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
  if (!value) {
    return 'Agora'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function mapStatus(status: OrderResponse['status']) {
  const labels: Record<OrderResponse['status'], string> = {
    OPEN: 'Aguardando Cadista',
    IN_PROGRESS: 'Em Desenho',
    REVIEW: 'Em Revisão',
    COMPLETED: 'Concluído',
  }

  return labels[status]
}

function mapOrder(order: OrderResponse): DashboardOrder {
  const teeth = order.items.map((item) => item.toothNumber).join(', ')
  const serviceType = order.items[0]?.serviceType ?? 'Caso odontológico'

  return {
    id: `Caso ${String(order.id).padStart(5, '0')}`,
    patient: order.title,
    work: `${serviceType} · ${teeth || 'Sem dentes'}`,
    status: mapStatus(order.status),
    date: formatDate(order.createdAt),
    price: formatCurrency(order.totalAmount),
  }
}

function isSupportedCaseFile(fileName: string, acceptedExtensions: string[]) {
  const lowerCaseName = fileName.toLowerCase()
  return acceptedExtensions.some((extension) => lowerCaseName.endsWith(extension))
}

function CaseFileUpload({ files, onFilesChange, stage, acceptedExtensions, helperText }: { files: CaseFile[]; onFilesChange: (files: CaseFile[]) => void; stage: AttachmentStage; acceptedExtensions: string[]; helperText: string }) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = (fileList: FileList | File[]) => {
    const nextFiles = Array.from(fileList)
    const validFiles = nextFiles.filter((file) => isSupportedCaseFile(file.name, acceptedExtensions))
    const invalidCount = nextFiles.length - validFiles.length

    if (invalidCount > 0) {
      setError(`Use apenas ${acceptedExtensions.join(', ')}.`)
    } else {
      setError(null)
    }

    onFilesChange([
      ...files,
      ...validFiles.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        stage,
        status: 'ready' as const,
      })),
    ])
  }

  return <div><label className={dragActive ? 'upload-zone active' : 'upload-zone'} onDragOver={(event) => { event.preventDefault(); setDragActive(true) }} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); addFiles(event.dataTransfer.files) }}><UploadCloud /><strong>Arraste os arquivos aqui ou <span>selecione do computador</span></strong><small>{helperText}</small><input type="file" multiple accept={acceptedExtensions.join(',')} onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = '' }} /></label>{error && <p className="escrow-note">{error}</p>}<div className="file-checklist">{files.length === 0 ? <div className="file-row"><div className="file-status"><FileUp /></div><div><strong>Nenhum arquivo selecionado</strong><span>Os arquivos serão enviados direto ao MinIO/S3 após criar o caso</span></div></div> : files.map((item) => <div className="file-row" key={item.id}><div className={item.status === 'uploaded' ? 'file-status checked' : 'file-status'}>{item.status === 'uploaded' ? <Check /> : <FileArchive />}</div><div><strong>{item.file.name}</strong><span>{formatFileSize(item.file.size)} · {item.status === 'uploading' ? 'enviando' : item.status === 'uploaded' ? 'enviado' : item.status === 'error' ? 'falhou' : 'pronto'}</span></div><button className="remove-file" onClick={() => onFilesChange(files.filter((file) => file.id !== item.id))}><X /></button></div>)}</div></div>
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'Concluído' ? 'success' : status === 'Em Revisão' ? 'review' : status === 'Em Desenho' ? 'drawing' : 'waiting'
  return <span className={`status-badge ${tone}`}><span className="status-dot" />{status}</span>
}

function Brand() {
  return <div className="brand"><div className="brand-mark"><span className="brand-cross">+</span></div><div><div className="brand-name">dentform</div><div className="brand-caption">DIGITAL DENTISTRY</div></div></div>
}

function Header({ role, setRole, dark, setDark }: { role: 'Dentista' | 'Cadista'; setRole: (role: 'Dentista' | 'Cadista') => void; dark: boolean; setDark: (value: boolean) => void }) {
  return <header className="topbar"><div className="topbar-left"><button className="mobile-menu" aria-label="Abrir menu"><PanelLeft /></button><Brand /></div><div className="topbar-actions"><div className="role-switcher" aria-label="Seletor de perfil"><button className={role === 'Dentista' ? 'active' : ''} onClick={() => setRole('Dentista')}><UserRound />Dentista</button><button className={role === 'Cadista' ? 'active' : ''} onClick={() => setRole('Cadista')}><UsersRound />Cadista</button></div><button className="icon-button" aria-label="Alternar tema" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</button><button className="notification-button" aria-label="Notificações"><Bell /><span /></button><div className="profile-avatar">DM</div><ChevronDown className="chevron" /></div></header>
}

function Sidebar({ active, setActive, role, orderCount }: { active: string; setActive: (label: string) => void; role: string; orderCount: number }) {
  return <aside className="sidebar"><div className="sidebar-profile"><div className="large-avatar">DM</div><div><strong>Dr. Daniel Martins</strong><span>{role} · Clínica Sorriso</span></div><MoreHorizontal className="muted-icon" /></div><nav className="main-nav">{navItems.map(({ label, icon: Icon }) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => setActive(label)}><Icon />{label}{label === 'Meus Casos' && <span className="nav-count">{orderCount}</span>}</button>)}</nav><div className="sidebar-label">GESTÃO</div><nav className="main-nav"><button className="nav-item"><WalletCards />Financeiro</button><button className="nav-item"><MessageCircle />Mensagens<span className="nav-count blue">2</span></button><button className="nav-item"><Settings2 />Configurações</button></nav><div className="sidebar-bottom"><div className="secure-card"><ShieldCheck /><div><strong>Ambiente seguro</strong><span>Seus dados são protegidos</span></div></div><div className="sidebar-help"><span>Precisa de ajuda?</span><button>Falar com suporte <ArrowRight /></button></div></div></aside>
}

function StatCard({ icon: Icon, label, value, trend, tone }: { icon: typeof Activity; label: string; value: string; trend: string; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon /></div><div><span className="eyebrow">{label}</span><div className="stat-value">{value}</div><span className="stat-trend">{trend}</span></div></div>
}

function Dashboard({ orders, usingFallback, onNewCase, onReview }: { orders: DashboardOrder[]; usingFallback: boolean; onNewCase: () => void; onReview: () => void }) {
  return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">TERÇA-FEIRA, 18 DE JUNHO DE 2024</div><h1>Bom dia, Dr. Daniel</h1><p>Acompanhe seus casos e mantenha seu fluxo digital em dia.</p></div><button className="primary-button" onClick={onNewCase}><Plus />Novo Caso</button></div><div className="stats-grid"><StatCard icon={Activity} label="Casos ativos" value={String(orders.filter((order) => order.status !== 'Concluído').length).padStart(2, '0')} trend="Sincronizado com a API" tone="blue"/><StatCard icon={Clock3} label="Aguardando ação" value={String(orders.filter((order) => order.status === 'Em Revisão').length).padStart(2, '0')} trend="Casos em revisão" tone="amber"/><StatCard icon={CircleDollarSign} label="Em garantia" value={orders[0]?.price ?? 'R$ 0,00'} trend="Último caso aberto" tone="green"/><StatCard icon={PackageCheck} label="Concluídos" value={String(orders.filter((order) => order.status === 'Concluído').length).padStart(2, '0')} trend="Total listado" tone="violet"/></div><div className="content-grid"><section className="panel orders-panel"><div className="panel-header"><div><h2>Lista de Casos</h2><p>{usingFallback ? 'Exibindo dados locais enquanto a API não responde' : 'Seus casos mais recentes'}</p></div><button className="text-button">Ver todas <ArrowRight /></button></div><div className="filter-row"><div className="search-box"><Search /><input placeholder="Buscar por paciente ou caso..." /></div><button className="filter-button">Todos os status <ChevronDown /></button></div><div className="orders-list">{orders.map((order, index) => <button key={order.id} className="order-row" onClick={index === 0 ? onReview : undefined}><div className="order-leading"><div className={`order-icon ${index === 0 ? 'selected' : ''}`}><FileCheck2 /></div><div><strong>{order.id} <span>·</span> {order.patient}</strong><span>{order.work}</span></div></div><div className="order-meta"><StatusBadge status={order.status}/><span>{order.date}</span><strong>{order.price}</strong><ArrowRight /></div></button>)}</div></section><section className="panel quick-panel"><div className="panel-header"><div><h2>Atalhos rápidos</h2><p>O que você precisa fazer hoje?</p></div></div><div className="quick-actions"><button onClick={onNewCase}><div className="quick-icon blue"><Plus /></div><div><strong>Criar Novo Caso</strong><span>Envie um novo trabalho para a rede</span></div><ArrowRight /></button><button onClick={onReview}><div className="quick-icon purple"><GitCompare /></div><div><strong>Revisar caso</strong><span>{orders[0]?.id ?? 'Caso'} aguarda sua aprovação</span></div><ArrowRight /></button><button><div className="quick-icon green"><CircleDollarSign /></div><div><strong>Consultar financeiro</strong><span>Saldo disponível: R$ 8.420</span></div><ArrowRight /></button></div><div className="tip-card"><Sparkles /><div><strong>Dica do dia</strong><p>Casos com fotos clínicas têm 24% menos ciclos de revisão.</p></div></div></section></div><section className="activity-section"><div className="panel-header"><div><h2>Atividade recente</h2><p>Atualizações do seu fluxo de trabalho</p></div><button className="text-button">Ver histórico <ArrowRight /></button></div><div className="activity-list"><div className="activity-item"><div className="activity-bullet green"><Check /></div><div><strong>{orders[0]?.id ?? 'Caso'} foi atualizada</strong><span>{usingFallback ? 'A API será sincronizada quando estiver acessível' : 'Dados carregados da API'} · agora</span></div><div className="activity-avatar">RS</div></div><div className="activity-item"><div className="activity-bullet blue"><MessageCircle /></div><div><strong>Nova mensagem em {orders[0]?.id ?? 'Caso'}</strong><span>Rafael Souza enviou uma atualização · há 4h</span></div><div className="activity-avatar warm">RS</div></div></div></section></div>
}

function NewCase({ onBack, onSubmit }: { onBack: () => void; onSubmit: (request: CreateOrderRequest, files: CaseFile[], onFilesChange: (files: CaseFile[]) => void) => Promise<void> }) {
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(['16'])
  const [work, setWork] = useState('Coroa')
  const [patient, setPatient] = useState('')
  const [reference, setReference] = useState('')
  const [files, setFiles] = useState<CaseFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const toggleTooth = (tooth: string) => setSelectedTeeth((current) => current.includes(tooth) ? current.filter((item) => item !== tooth) : [...current, tooth])
  const total = useMemo(() => selectedTeeth.length * (work === 'Implante' ? 780 : work === 'Faceta' ? 310 : 460), [selectedTeeth.length, work])
  const handleSubmit = async () => {
    if (selectedTeeth.length === 0) {
      setSubmitError('Selecione ao menos um dente FDI.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      await onSubmit({
        userId: FALLBACK_USER_ID,
        title: patient.trim() || 'Paciente sem identificação',
        description: reference.trim() || undefined,
        items: selectedTeeth.map((tooth) => ({
          toothNumber: Number(tooth),
          serviceType: work,
          notes: files.length > 0 ? `Arquivos anexados: ${files.map((item) => item.file.name).join(', ')}` : undefined,
        })),
      }, files, setFiles)
    } catch {
      setSubmitError('Não foi possível enviar o caso agora.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="page-content form-page"><div className="breadcrumb"><button onClick={onBack}>Visão geral</button><ArrowRight /><span>Novo Caso</span></div><div className="page-heading"><div><div className="eyebrow">NOVO CASO</div><h1>Novo Caso</h1><p>Defina o escopo do trabalho e envie os arquivos do paciente.</p></div><div className="stepper"><span className="step active">1</span><span className="step-line"/><span className="step">2</span><span className="step-line"/><span className="step">3</span></div></div><div className="form-layout"><div className="form-main"><section className="panel form-card"><div className="section-heading"><div className="section-number">01</div><div><h2>Identificação do caso</h2><p>Informações básicas para o cadista</p></div></div><div className="field-grid"><label className="field"><span>Paciente <em>*</em></span><input value={patient} onChange={(event) => setPatient(event.target.value)} placeholder="Nome ou código do paciente"/></label><label className="field"><span>Referência interna</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ex.: Caso família Silva"/></label></div></section><section className="panel form-card"><div className="section-heading"><div className="section-number">02</div><div><h2>Planejamento odontológico</h2><p>Selecione os dentes e o tipo de trabalho</p></div></div><div className="field-label">Odontograma FDI <span>· Selecione um ou mais dentes</span></div><div className="odontogram"><div className="arch-label"><span>MAXILA</span><span>MAXILA</span></div><div className="teeth-row">{teeth.slice(0,16).map((tooth) => <button key={tooth} type="button" className={selectedTeeth.includes(tooth) ? 'tooth selected' : 'tooth'} onClick={() => toggleTooth(tooth)}>{tooth}</button>)}</div><div className="midline"/><div className="teeth-row mandibular">{teeth.slice(16).map((tooth) => <button key={tooth} type="button" className={selectedTeeth.includes(tooth) ? 'tooth selected' : 'tooth'} onClick={() => toggleTooth(tooth)}>{tooth}</button>)}</div><div className="arch-label bottom"><span>MANDÍBULA</span><span>MANDÍBULA</span></div></div><div className="field-label work-label">Tipo de trabalho</div><div className="choice-grid">{['Coroa','Faceta','Implante'].map((item) => <button key={item} type="button" className={work === item ? 'choice-card selected' : 'choice-card'} onClick={() => setWork(item)}><div className="choice-symbol">{item === 'Coroa' ? '◒' : item === 'Faceta' ? '◓' : '⊙'}</div><div><strong>{item}</strong><span>{item === 'Coroa' ? 'Monolítica ou estratificada' : item === 'Faceta' ? 'Lente de contato dental' : 'Coroa sobre implante'}</span></div>{work === item && <CheckCircle2 />}</button>)}</div></section><section className="panel form-card"><div className="section-heading"><div className="section-number">03</div><div><h2>Parâmetros de produção</h2><p>Especificações para o desenho e fabricação</p></div></div><div className="field-grid three"><label className="field"><span>Escala de cor</span><select defaultValue="A1"><option>A1 — VITA Classical</option><option>A2 — VITA Classical</option><option>B1 — VITA Classical</option><option>D4 — VITA Classical</option></select></label><label className="field"><span>Espaço de cimento</span><div className="input-suffix"><input defaultValue="50"/><span>μm</span></div></label><label className="field"><span>Máquina de produção</span><select defaultValue="Zirkonzahn"><option>Zirkonzahn M5</option><option>Roland DWX-52D</option><option>Ivoclar PrograMill</option></select></label></div></section><section className="panel form-card"><div className="section-heading"><div className="section-number">04</div><div><h2>Arquivos clínicos do caso</h2><p>Formatos aceitos: .stl, .ply</p></div></div><CaseFileUpload files={files} onFilesChange={setFiles} stage="CLINICAL_INPUT" acceptedExtensions={clinicalInputExtensions} helperText=".stl ou .ply · envio direto para o storage" /></section></div><aside className="case-summary panel"><div className="summary-top"><span className="eyebrow">RESUMO DO CASO</span><div className="summary-icon"><LockKeyhole /></div></div><h2>Caso 24092</h2><p className="summary-subtitle">Rascunho · Não enviado</p><div className="summary-divider"/><div className="summary-line"><span>Dentes selecionados</span><strong>{selectedTeeth.length > 0 ? selectedTeeth.join(', ') : 'Nenhum'}</strong></div><div className="summary-line"><span>Tipo de trabalho</span><strong>{work}</strong></div><div className="summary-line"><span>Arquivos anexados</span><strong>{files.length} de 3</strong></div><div className="escrow-box"><div><span>Valor em garantia (Escrow)</span><strong>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><CircleDollarSign /></div><p className="escrow-note"><ShieldCheck /> O valor só é liberado após sua aprovação final.</p>{submitError && <p className="escrow-note">{submitError}</p>}<button className="primary-button full" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Enviando caso...' : 'Continuar e encontrar cadista'} <ArrowRight /></button><button className="secondary-button full" onClick={onBack}>Salvar como rascunho</button></aside></div></div>
}

function ReviewWorkspace({ onBack }: { onBack: () => void }) {
  const clinicalAttachments: OrderAttachment[] = useMemo(() => [
    { id: 'clinical-1', fileName: 'upperjaw_preparo_16.stl', size: 18400000, stage: 'CLINICAL_INPUT', mimeType: 'model/stl', downloadUrl: '/samples/upperjaw_preparo_16.stl' },
    { id: 'clinical-2', fileName: 'lowerjaw_antagonist.ply', size: 12600000, stage: 'CLINICAL_INPUT', mimeType: 'application/octet-stream' },
  ], [])
  const cadAttachments: OrderAttachment[] = useMemo(() => [
    { id: 'cad-1', fileName: 'crown_16_final.stl', size: 8400000, stage: 'CAD_DELIVERY', mimeType: 'model/stl', downloadUrl: '/samples/crown_16_final.stl' },
    { id: 'cad-2', fileName: 'crown_16.constructioninfo', size: 420000, stage: 'CAD_DELIVERY', mimeType: 'application/octet-stream' },
    { id: 'cad-3', fileName: 'crown_16_webview.html', size: 2100000, stage: 'CAD_DELIVERY', mimeType: 'text/html', viewerUrl: '/samples/crown_16_webview.html' },
  ], [])
  const [viewerAttachments, setViewerAttachments] = useState<OrderAttachment[]>([clinicalAttachments[0], cadAttachments[0]])
  const [deliveryFiles, setDeliveryFiles] = useState<CaseFile[]>([])
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null)

  const uploadDelivery = async () => {
    setDeliveryStatus(null)
    let nextFiles = deliveryFiles

    try {
      for (const item of nextFiles) {
        nextFiles = nextFiles.map((file) => file.id === item.id ? { ...file, status: 'uploading' } : file)
        setDeliveryFiles(nextFiles)

        const upload = await createUploadUrl(1, {
          fileName: item.file.name,
          mimeType: item.file.type || 'application/octet-stream',
          size: item.file.size,
          attachmentStage: item.stage,
        })

        await uploadFileToStorage(upload.uploadUrl, item.file)
        nextFiles = nextFiles.map((file) => file.id === item.id ? { ...file, status: 'uploaded' } : file)
        setDeliveryFiles(nextFiles)
      }

      setDeliveryStatus('Entrega enviada para o storage.')
    } catch {
      setDeliveryStatus('Não foi possível enviar a entrega agora.')
      setDeliveryFiles(nextFiles.map((file) => file.status === 'uploading' ? { ...file, status: 'error' } : file))
    }
  }

  return <div className="page-content workspace-page"><div className="breadcrumb"><button onClick={onBack}>Meus Casos</button><ArrowRight /><span>Caso 24091 · Detalhes do Caso</span></div><div className="workspace-heading"><div><div className="eyebrow">Caso 24091 · EM REVISÃO</div><h1>Detalhes do Caso · Coroa monolítica · Dente 16</h1><p>Paciente: M. Andrade <span className="heading-separator">·</span> Cadista: Rafael Souza</p></div><StatusBadge status="Em Revisão" /></div><div className="workspace-grid"><section className="viewer-panel panel"><Clinical3DViewer attachments={viewerAttachments} /></section><aside className="review-sidebar panel"><div className="review-header"><div><h2>Arquivos do caso</h2><p>Entrada clínica e entrega CAD</p></div><span className="online"><Wifi /> Online</span></div><div className="attachment-tabs"><section><div className="section-heading compact"><div className="section-number">01</div><div><h2>Arquivos Clínicos do Caso</h2><p>Enviados pelo dentista</p></div></div><div className="file-checklist">{clinicalAttachments.map((attachment) => <div className="file-row" key={attachment.id}><div className="file-status checked"><FileArchive /></div><div><strong>{attachment.fileName}</strong><span>{formatFileSize(attachment.size)} · {attachment.stage}</span></div><button className="attach-button" onClick={() => setViewerAttachments([attachment])}><ZoomIn />Inspecionar 3D</button></div>)}</div></section><section><div className="section-heading compact"><div className="section-number">02</div><div><h2>Entrega do Design</h2><p>Arquivos finais enviados pelo cadista</p></div></div><div className="file-checklist">{cadAttachments.map((attachment) => <div className="file-row" key={attachment.id}><div className="file-status checked"><FileCheck2 /></div><div><strong>{attachment.fileName}</strong><span>{formatFileSize(attachment.size)}</span></div><button className="attach-button" onClick={() => setViewerAttachments(attachment.fileName.endsWith('.html') ? [attachment] : [attachment, ...clinicalAttachments.filter((item) => item.fileName.endsWith('.stl'))])}>{attachment.fileName.endsWith('.html') ? 'Webview 3D' : 'Visualizar 3D'}</button><button className="remove-file" aria-label="Baixar arquivo"><Download /></button></div>)}</div><div className="delivery-upload"><CaseFileUpload files={deliveryFiles} onFilesChange={setDeliveryFiles} stage="CAD_DELIVERY" acceptedExtensions={cadDeliveryExtensions} helperText=".stl, .constructioninfo ou .html · sem pastas brutas ou zips" />{deliveryStatus && <p className="escrow-note">{deliveryStatus}</p>}<button className="primary-button full" onClick={uploadDelivery} disabled={deliveryFiles.length === 0}>Enviar entrega CAD</button></div></section></div><div className="review-actions"><button className="approve-button"><CheckCircle2 />Aprovar entrega</button><button className="request-button"><MessageCircle />Pedir revisão</button></div></aside></div></div>
}
function DesignerBoard() {
  return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">CENTRAL DE OPORTUNIDADES</div><h1>Mural do Cadista</h1><p>Encontre casos alinhados ao seu perfil e aumente sua produção.</p></div><div className="designer-balance"><CircleDollarSign /><div><span>Disponível este mês</span><strong>R$ 3.840,00</strong></div></div></div><div className="designer-grid"><section className="panel open-cases"><div className="panel-header"><div><h2>Casos abertos</h2><p>Novos trabalhos na rede dentform</p></div><span className="live-pill"><span/> Atualizado agora</span></div><div className="case-filters"><button className="active">Todos <span>12</span></button><button>Prótese fixa <span>6</span></button><button>Estética <span>4</span></button><button>Implante <span>2</span></button></div>{[{id:'Caso 24092',title:'Coroa monolítica',detail:'Dente 16 · Zircônia translúcida',time:'Enviado há 12 min',value:'R$ 460,00',color:'blue'},{id:'Caso 24089',title:'Facetas em dissilicato',detail:'Dentes 11, 12, 21 e 22 · E.max',time:'Enviado há 38 min',value:'R$ 1.240,00',color:'purple'},{id:'Caso 24086',title:'Coroa sobre implante',detail:'Dente 36 · Parafusada',time:'Enviado há 1h',value:'R$ 780,00',color:'green'}].map((item) => <div className="open-case" key={item.id}><div className={`case-type ${item.color}`}><Box /></div><div className="case-info"><div><strong>{item.title}</strong><span>{item.id} <i>·</i> {item.time}</span></div><p>{item.detail}</p><div className="case-tags"><span>Exocad</span><span>Prazo: 48h</span></div></div><div className="case-price"><strong>{item.value}</strong><span>valor líquido</span><button>Aceitar caso <ArrowRight /></button></div></div>)}</section><aside className="panel designer-profile"><div className="profile-cover"/><div className="designer-avatar">RS<span><Check /></span></div><h2>Rafael Souza</h2><p>Cadista especialista</p><div className="rating"><span>★</span> 4.9 <small>· 128 casos concluídos</small></div><div className="profile-stats"><div><strong>98%</strong><span>Taxa de aprovação</span></div><div><strong>4.8h</strong><span>Tempo médio</span></div></div><div className="profile-skills"><span>Prótese fixa</span><span>Implante</span><span>Exocad</span><span>DentalCAD</span></div><button className="secondary-button full"><UserRound />Ver meu perfil</button></aside></div><section className="panel delivery-panel"><div className="panel-header"><div><h2>Entregas recentes</h2><p>Arquivos enviados para seus clientes</p></div><button className="primary-button"><UploadCloud />Nova entrega</button></div><div className="delivery-table"><div className="delivery-table-head"><span>CASO</span><span>ARQUIVOS</span><span>STATUS</span><span>DATA</span><span/></div><div className="delivery-row"><div><strong>Caso 24077 · Coroa 46, 47</strong><span>Dr. Lucas Almeida</span></div><div className="delivery-files"><FileArchive /> <span>2 arquivos</span></div><StatusBadge status="Concluído"/><span>10 Jun, 14:36</span><button className="icon-tool"><MoreHorizontal /></button></div><div className="delivery-row"><div><strong>Caso 24071 · Faceta 21</strong><span>Clínica Sorriso</span></div><div className="delivery-files"><FileArchive /> <span>3 arquivos</span></div><StatusBadge status="Em Revisão"/><span>08 Jun, 11:20</span><button className="icon-tool"><MoreHorizontal /></button></div></div></section></div>
}

export default function OdontoMarketplace() {
  const [role, setRole] = useState<'Dentista' | 'Cadista'>('Dentista')
  const [active, setActive] = useState('Visão geral')
  const [dark, setDark] = useState(false)
  const [orders, setOrders] = useState<DashboardOrder[]>(fallbackOrders)
  const [usingFallback, setUsingFallback] = useState(false)

  const loadOrders = async () => {
    try {
      const apiOrders = await getOrders()
      setOrders(apiOrders.length > 0 ? apiOrders.map(mapOrder) : [])
      setUsingFallback(false)
    } catch {
      setOrders(fallbackOrders)
      setUsingFallback(true)
    }
  }

  useEffect(() => {
    void loadOrders()
  }, [])

  const handleCreateOrder = async (request: CreateOrderRequest, caseFiles: CaseFile[], onFilesChange: (files: CaseFile[]) => void) => {
    const createdOrder = await createOrder(request)
    const createdDashboardOrder = mapOrder(createdOrder)
    setOrders((current) => [createdDashboardOrder, ...current.filter((order) => order.id !== createdDashboardOrder.id)])

    let uploadFiles = caseFiles

    for (const item of uploadFiles) {
      uploadFiles = uploadFiles.map((file) => file.id === item.id ? { ...file, status: 'uploading' } : file)
      onFilesChange(uploadFiles)

      try {
        const upload = await createUploadUrl(createdOrder.id, {
          fileName: item.file.name,
          mimeType: item.file.type || 'application/octet-stream',
          size: item.file.size,
          attachmentStage: item.stage,
        })

        await uploadFileToStorage(upload.uploadUrl, item.file)
        uploadFiles = uploadFiles.map((file) => file.id === item.id ? { ...file, status: 'uploaded' } : file)
        onFilesChange(uploadFiles)
      } catch {
        uploadFiles = uploadFiles.map((file) => file.id === item.id ? { ...file, status: 'error' } : file)
        onFilesChange(uploadFiles)
        throw new Error(`Falha no upload de ${item.file.name}`)
      }
    }

    setUsingFallback(false)
    await loadOrders()
    setActive('Visão geral')
  }

  const screen = active === 'Novo Caso'
    ? <NewCase onBack={() => setActive('Visão geral')} onSubmit={handleCreateOrder} />
    : active === 'Meus Casos'
      ? <ReviewWorkspace onBack={() => setActive('Visão geral')} />
      : role === 'Cadista'
        ? <DesignerBoard />
        : <Dashboard orders={orders} usingFallback={usingFallback} onNewCase={() => setActive('Novo Caso')} onReview={() => setActive('Meus Casos')} />

  return <div className={dark ? 'app-shell dark' : 'app-shell'}><Header role={role} setRole={(nextRole) => { setRole(nextRole); setActive('Visão geral') }} dark={dark} setDark={setDark}/><div className="app-body"><Sidebar active={active} setActive={setActive} role={role} orderCount={orders.length}/><main className="main-area">{screen}</main></div></div>
}
