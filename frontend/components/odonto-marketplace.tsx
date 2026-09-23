'use client'

import { useMemo, useState } from 'react'
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

const orders = [
  { id: 'OS-24091', patient: 'M. Andrade', work: 'Coroa monolítica · 16', status: 'Em Revisão', date: 'Hoje, 09:42', price: 'R$ 460,00' },
  { id: 'OS-24088', patient: 'L. Ferreira', work: 'Faceta · 11, 21', status: 'Em Desenho', date: 'Ontem, 16:20', price: 'R$ 620,00' },
  { id: 'OS-24084', patient: 'C. Lima', work: 'Implante · 36', status: 'Aguardando Cadista', date: '12 Jun, 11:08', price: 'R$ 780,00' },
  { id: 'OS-24077', patient: 'R. Nunes', work: 'Coroa · 46, 47', status: 'Concluído', date: '10 Jun, 14:36', price: 'R$ 920,00' },
]

const designers = [
  { initials: 'RS', name: 'Rafael Souza', specialty: 'Prótese fixa · Exocad', rating: '4.9', cases: '128 casos', available: true },
  { initials: 'MC', name: 'Marina Costa', specialty: 'Implantodontia digital', rating: '4.8', cases: '94 casos', available: true },
  { initials: 'GV', name: 'Gustavo Vieira', specialty: 'Estética anterior', rating: '5.0', cases: '76 casos', available: false },
]

const teeth = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28','48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']
const navItems = [
  { label: 'Visão geral', icon: LayoutDashboard },
  { label: 'Minhas OS', icon: FileCheck2 },
  { label: 'Novo caso', icon: Plus },
]

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

function Sidebar({ active, setActive, role }: { active: string; setActive: (label: string) => void; role: string }) {
  return <aside className="sidebar"><div className="sidebar-profile"><div className="large-avatar">DM</div><div><strong>Dr. Daniel Martins</strong><span>{role} · Clínica Sorriso</span></div><MoreHorizontal className="muted-icon" /></div><nav className="main-nav">{navItems.map(({ label, icon: Icon }) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => setActive(label)}><Icon />{label}{label === 'Minhas OS' && <span className="nav-count">4</span>}</button>)}</nav><div className="sidebar-label">GESTÃO</div><nav className="main-nav"><button className="nav-item"><WalletCards />Financeiro</button><button className="nav-item"><MessageCircle />Mensagens<span className="nav-count blue">2</span></button><button className="nav-item"><Settings2 />Configurações</button></nav><div className="sidebar-bottom"><div className="secure-card"><ShieldCheck /><div><strong>Ambiente seguro</strong><span>Seus dados são protegidos</span></div></div><div className="sidebar-help"><span>Precisa de ajuda?</span><button>Falar com suporte <ArrowRight /></button></div></div></aside>
}

function StatCard({ icon: Icon, label, value, trend, tone }: { icon: typeof Activity; label: string; value: string; trend: string; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon /></div><div><span className="eyebrow">{label}</span><div className="stat-value">{value}</div><span className="stat-trend">{trend}</span></div></div>
}

function Dashboard({ onNewCase, onReview }: { onNewCase: () => void; onReview: () => void }) {
  return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">TERÇA-FEIRA, 18 DE JUNHO DE 2024</div><h1>Bom dia, Dr. Daniel</h1><p>Acompanhe seus casos e mantenha seu fluxo digital em dia.</p></div><button className="primary-button" onClick={onNewCase}><Plus />Novo caso</button></div><div className="stats-grid"><StatCard icon={Activity} label="Casos ativos" value="12" trend="↑ 8% este mês" tone="blue"/><StatCard icon={Clock3} label="Aguardando ação" value="04" trend="2 precisam de revisão" tone="amber"/><StatCard icon={CircleDollarSign} label="Em garantia" value="R$ 4.280" trend="↑ 12% este mês" tone="green"/><StatCard icon={PackageCheck} label="Concluídos" value="28" trend="↑ 6 este mês" tone="violet"/></div><div className="content-grid"><section className="panel orders-panel"><div className="panel-header"><div><h2>Ordens de serviço</h2><p>Seus casos mais recentes</p></div><button className="text-button">Ver todas <ArrowRight /></button></div><div className="filter-row"><div className="search-box"><Search /><input placeholder="Buscar por paciente ou OS..." /></div><button className="filter-button">Todos os status <ChevronDown /></button></div><div className="orders-list">{orders.map((order, index) => <button key={order.id} className="order-row" onClick={index === 0 ? onReview : undefined}><div className="order-leading"><div className={`order-icon ${index === 0 ? 'selected' : ''}`}><FileCheck2 /></div><div><strong>{order.id} <span>·</span> {order.patient}</strong><span>{order.work}</span></div></div><div className="order-meta"><StatusBadge status={order.status}/><span>{order.date}</span><strong>{order.price}</strong><ArrowRight /></div></button>)}</div></section><section className="panel quick-panel"><div className="panel-header"><div><h2>Atalhos rápidos</h2><p>O que você precisa fazer hoje?</p></div></div><div className="quick-actions"><button onClick={onNewCase}><div className="quick-icon blue"><Plus /></div><div><strong>Criar novo caso</strong><span>Envie um novo trabalho para a rede</span></div><ArrowRight /></button><button onClick={onReview}><div className="quick-icon purple"><GitCompare /></div><div><strong>Revisar caso</strong><span>OS-24091 aguarda sua aprovação</span></div><ArrowRight /></button><button><div className="quick-icon green"><CircleDollarSign /></div><div><strong>Consultar financeiro</strong><span>Saldo disponível: R$ 8.420</span></div><ArrowRight /></button></div><div className="tip-card"><Sparkles /><div><strong>Dica do dia</strong><p>Casos com fotos clínicas têm 24% menos ciclos de revisão.</p></div></div></section></div><section className="activity-section"><div className="panel-header"><div><h2>Atividade recente</h2><p>Atualizações do seu fluxo de trabalho</p></div><button className="text-button">Ver histórico <ArrowRight /></button></div><div className="activity-list"><div className="activity-item"><div className="activity-bullet green"><Check /></div><div><strong>OS-24077 foi concluída</strong><span>O pagamento de R$ 920,00 foi liberado · há 2h</span></div><div className="activity-avatar">RS</div></div><div className="activity-item"><div className="activity-bullet blue"><MessageCircle /></div><div><strong>Nova mensagem em OS-24091</strong><span>Rafael Souza enviou uma atualização · há 4h</span></div><div className="activity-avatar warm">RS</div></div></div></section></div>
}

function NewCase({ onBack, onSubmit }: { onBack: () => void; onSubmit: () => void }) {
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(['16'])
  const [work, setWork] = useState('Coroa')
  const [files, setFiles] = useState(['Preparo_16.stl', 'Antagonista_16.stl'])
  const toggleTooth = (tooth: string) => setSelectedTeeth((current) => current.includes(tooth) ? current.filter((item) => item !== tooth) : [...current, tooth])
  const total = useMemo(() => selectedTeeth.length * (work === 'Implante' ? 780 : work === 'Faceta' ? 310 : 460), [selectedTeeth.length, work])
  return <div className="page-content form-page"><div className="breadcrumb"><button onClick={onBack}>Visão geral</button><ArrowRight /><span>Novo caso</span></div><div className="page-heading"><div><div className="eyebrow">NOVA ORDEM DE SERVIÇO</div><h1>Configurar novo caso</h1><p>Defina o escopo do trabalho e envie os arquivos do paciente.</p></div><div className="stepper"><span className="step active">1</span><span className="step-line"/><span className="step">2</span><span className="step-line"/><span className="step">3</span></div></div><div className="form-layout"><div className="form-main"><section className="panel form-card"><div className="section-heading"><div className="section-number">01</div><div><h2>Identificação do caso</h2><p>Informações básicas para o cadista</p></div></div><div className="field-grid"><label className="field"><span>Paciente <em>*</em></span><input placeholder="Nome ou código do paciente"/></label><label className="field"><span>Referência interna</span><input placeholder="Ex.: Caso família Silva"/></label></div></section><section className="panel form-card"><div className="section-heading"><div className="section-number">02</div><div><h2>Planejamento odontológico</h2><p>Selecione os dentes e o tipo de trabalho</p></div></div><div className="field-label">Odontograma FDI <span>· Selecione um ou mais dentes</span></div><div className="odontogram"><div className="arch-label"><span>MAXILA</span><span>MAXILA</span></div><div className="teeth-row">{teeth.slice(0,16).map((tooth) => <button key={tooth} className={selectedTeeth.includes(tooth) ? 'tooth selected' : 'tooth'} onClick={() => toggleTooth(tooth)}>{tooth}</button>)}</div><div className="midline"/><div className="teeth-row mandibular">{teeth.slice(16).map((tooth) => <button key={tooth} className={selectedTeeth.includes(tooth) ? 'tooth selected' : 'tooth'} onClick={() => toggleTooth(tooth)}>{tooth}</button>)}</div><div className="arch-label bottom"><span>MANDÍBULA</span><span>MANDÍBULA</span></div></div><div className="field-label work-label">Tipo de trabalho</div><div className="choice-grid">{['Coroa','Faceta','Implante'].map((item) => <button key={item} className={work === item ? 'choice-card selected' : 'choice-card'} onClick={() => setWork(item)}><div className="choice-symbol">{item === 'Coroa' ? '◒' : item === 'Faceta' ? '◓' : '⊙'}</div><div><strong>{item}</strong><span>{item === 'Coroa' ? 'Monolítica ou estratificada' : item === 'Faceta' ? 'Lente de contato dental' : 'Coroa sobre implante'}</span></div>{work === item && <CheckCircle2 />}</button>)}</div></section><section className="panel form-card"><div className="section-heading"><div className="section-number">03</div><div><h2>Parâmetros de produção</h2><p>Especificações para o desenho e fabricação</p></div></div><div className="field-grid three"><label className="field"><span>Escala de cor</span><select defaultValue="A1"><option>A1 — VITA Classical</option><option>A2 — VITA Classical</option><option>B1 — VITA Classical</option><option>D4 — VITA Classical</option></select></label><label className="field"><span>Espaço de cimento</span><div className="input-suffix"><input defaultValue="50"/><span>μm</span></div></label><label className="field"><span>Máquina de produção</span><select defaultValue="Zirkonzahn"><option>Zirkonzahn M5</option><option>Roland DWX-52D</option><option>Ivoclar PrograMill</option></select></label></div></section><section className="panel form-card"><div className="section-heading"><div className="section-number">04</div><div><h2>Arquivos do caso</h2><p>Formatos aceitos: .stl, .ply, .obj, .dcm</p></div></div><div className="upload-zone"><UploadCloud /><strong>Arraste os arquivos aqui ou <span>selecione do computador</span></strong><small>Até 500 MB por arquivo · Seus dados são criptografados</small></div><div className="file-checklist">{['Preparo','Antagonista','Registro de mordida'].map((label, index) => <div className="file-row" key={label}><div className={index < 2 ? 'file-status checked' : 'file-status'}>{index < 2 ? <Check /> : <FileUp />}</div><div><strong>{label}</strong><span>{files[index] || 'Arquivo obrigatório'}</span></div>{index < 2 ? <button className="remove-file" onClick={() => setFiles(files.filter((_, fileIndex) => fileIndex !== index))}><X /></button> : <button className="attach-button"><Plus />Anexar</button>}</div>)}</div></section></div><aside className="case-summary panel"><div className="summary-top"><span className="eyebrow">RESUMO DO CASO</span><div className="summary-icon"><LockKeyhole /></div></div><h2>OS-24092</h2><p className="summary-subtitle">Rascunho · Não enviado</p><div className="summary-divider"/><div className="summary-line"><span>Dentes selecionados</span><strong>{selectedTeeth.length > 0 ? selectedTeeth.join(', ') : 'Nenhum'}</strong></div><div className="summary-line"><span>Tipo de trabalho</span><strong>{work}</strong></div><div className="summary-line"><span>Arquivos anexados</span><strong>{files.length} de 3</strong></div><div className="escrow-box"><div><span>Valor em garantia (Escrow)</span><strong>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><CircleDollarSign /></div><p className="escrow-note"><ShieldCheck /> O valor só é liberado após sua aprovação final.</p><button className="primary-button full" onClick={onSubmit}>Continuar e encontrar cadista <ArrowRight /></button><button className="secondary-button full" onClick={onBack}>Salvar como rascunho</button></aside></div></div>
}

function ReviewWorkspace({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState('Sólido')
  const [heat, setHeat] = useState(false)
  const [message, setMessage] = useState('')
  return <div className="page-content workspace-page"><div className="breadcrumb"><button onClick={onBack}>Minhas OS</button><ArrowRight /><span>OS-24091 · Revisão</span></div><div className="workspace-heading"><div><div className="eyebrow">OS-24091 · EM REVISÃO</div><h1>Coroa monolítica · Dente 16</h1><p>Paciente: M. Andrade <span className="heading-separator">·</span> Cadista: Rafael Souza</p></div><StatusBadge status="Em Revisão" /></div><div className="workspace-grid"><section className="viewer-panel panel"><div className="viewer-toolbar"><div className="toolbar-group"><button className={view === 'Sólido' ? 'tool-button active' : 'tool-button'} onClick={() => setView('Sólido')}><Box />Sólido</button><button className={view === 'Wireframe' ? 'tool-button active' : 'tool-button'} onClick={() => setView('Wireframe')}><GitCompare />Wireframe</button><button className={heat ? 'tool-button active heat' : 'tool-button'} onClick={() => setHeat(!heat)}><Activity />Mapa de calor</button></div><div className="toolbar-group"><button className="icon-tool" aria-label="Zoom"><ZoomIn /></button><button className="icon-tool" aria-label="Mais opções"><MoreHorizontal /></button></div></div><div className={`model-stage ${heat ? 'heat-stage' : ''}`}><div className="stage-grid"/><div className="model-shadow"/><div className={`tooth-model ${view === 'Wireframe' ? 'wireframe' : ''}`}><div className="tooth-cusp c1"/><div className="tooth-cusp c2"/><div className="tooth-cusp c3"/><div className="tooth-cusp c4"/><div className="tooth-center"/></div><div className="model-label"><span className="live-dot"/>Visualização interativa <span>·</span> Arraste para rotacionar</div><div className="axis"><span>X</span><span>Y</span><span>Z</span></div></div><div className="viewer-footer"><div><span className="eyebrow">ARQUIVO ATUAL</span><strong><FileArchive />OS-24091_coroa_final.stl</strong></div><button className="secondary-button"><Download />Baixar STL</button></div></section><aside className="review-sidebar panel"><div className="review-header"><div><h2>Revisão clínica</h2><p>Converse com o cadista</p></div><span className="online"><Wifi /> Online</span></div><div className="chat-messages"><div className="message received"><div className="chat-avatar">RS</div><div><span className="message-author">Rafael Souza <small>09:18</small></span><p>Olá, Dr. Daniel. Finalizei o desenho da coroa. Ajustei a anatomia oclusal conforme o antagonista enviado.</p></div></div><div className="message sent"><div><span className="message-author">Você <small>09:36</small></span><p>Perfeito, Rafael. A cúspide mesial parece um pouco alta no contato.</p></div></div><div className="message received"><div className="chat-avatar">RS</div><div><span className="message-author">Rafael Souza <small>09:40</small></span><p>Fiz o ajuste. Pode conferir na visualização com o mapa de calor.</p><div className="message-file"><FileArchive /><span>OS-24091_v2.stl</span><Download /></div></div></div></div><div className="chat-composer"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva uma mensagem..."/><button aria-label="Enviar mensagem" onClick={() => setMessage('')}><Send /></button></div><div className="review-actions"><button className="approve-button"><CheckCircle2 />Aprovar e liberar pagamento</button><button className="request-button"><MessageCircle />Pedir revisão</button></div></aside></div></div>
}

function DesignerBoard() {
  return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">CENTRAL DE OPORTUNIDADES</div><h1>Mural do Cadista</h1><p>Encontre casos alinhados ao seu perfil e aumente sua produção.</p></div><div className="designer-balance"><CircleDollarSign /><div><span>Disponível este mês</span><strong>R$ 3.840,00</strong></div></div></div><div className="designer-grid"><section className="panel open-cases"><div className="panel-header"><div><h2>Casos abertos</h2><p>Novos trabalhos na rede dentform</p></div><span className="live-pill"><span/> Atualizado agora</span></div><div className="case-filters"><button className="active">Todos <span>12</span></button><button>Prótese fixa <span>6</span></button><button>Estética <span>4</span></button><button>Implante <span>2</span></button></div>{[{id:'OS-24092',title:'Coroa monolítica',detail:'Dente 16 · Zircônia translúcida',time:'Enviado há 12 min',value:'R$ 460,00',color:'blue'},{id:'OS-24089',title:'Facetas em dissilicato',detail:'Dentes 11, 12, 21 e 22 · E.max',time:'Enviado há 38 min',value:'R$ 1.240,00',color:'purple'},{id:'OS-24086',title:'Coroa sobre implante',detail:'Dente 36 · Parafusada',time:'Enviado há 1h',value:'R$ 780,00',color:'green'}].map((item) => <div className="open-case" key={item.id}><div className={`case-type ${item.color}`}><Box /></div><div className="case-info"><div><strong>{item.title}</strong><span>{item.id} <i>·</i> {item.time}</span></div><p>{item.detail}</p><div className="case-tags"><span>Exocad</span><span>Prazo: 48h</span></div></div><div className="case-price"><strong>{item.value}</strong><span>valor líquido</span><button>Aceitar caso <ArrowRight /></button></div></div>)}</section><aside className="panel designer-profile"><div className="profile-cover"/><div className="designer-avatar">RS<span><Check /></span></div><h2>Rafael Souza</h2><p>Cadista especialista</p><div className="rating"><span>★</span> 4.9 <small>· 128 casos concluídos</small></div><div className="profile-stats"><div><strong>98%</strong><span>Taxa de aprovação</span></div><div><strong>4.8h</strong><span>Tempo médio</span></div></div><div className="profile-skills"><span>Prótese fixa</span><span>Implante</span><span>Exocad</span><span>DentalCAD</span></div><button className="secondary-button full"><UserRound />Ver meu perfil</button></aside></div><section className="panel delivery-panel"><div className="panel-header"><div><h2>Entregas recentes</h2><p>Arquivos enviados para seus clientes</p></div><button className="primary-button"><UploadCloud />Nova entrega</button></div><div className="delivery-table"><div className="delivery-table-head"><span>CASO</span><span>ARQUIVOS</span><span>STATUS</span><span>DATA</span><span/></div><div className="delivery-row"><div><strong>OS-24077 · Coroa 46, 47</strong><span>Dr. Lucas Almeida</span></div><div className="delivery-files"><FileArchive /> <span>2 arquivos</span></div><StatusBadge status="Concluído"/><span>10 Jun, 14:36</span><button className="icon-tool"><MoreHorizontal /></button></div><div className="delivery-row"><div><strong>OS-24071 · Faceta 21</strong><span>Clínica Sorriso</span></div><div className="delivery-files"><FileArchive /> <span>3 arquivos</span></div><StatusBadge status="Em Revisão"/><span>08 Jun, 11:20</span><button className="icon-tool"><MoreHorizontal /></button></div></div></section></div>
}

export default function OdontoMarketplace() {
  const [role, setRole] = useState<'Dentista' | 'Cadista'>('Dentista')
  const [active, setActive] = useState('Visão geral')
  const [dark, setDark] = useState(false)
  const screen = active === 'Novo caso' ? <NewCase onBack={() => setActive('Visão geral')} onSubmit={() => setActive('Visão geral')} /> : active === 'Minhas OS' ? <ReviewWorkspace onBack={() => setActive('Visão geral')} /> : role === 'Cadista' ? <DesignerBoard /> : <Dashboard onNewCase={() => setActive('Novo caso')} onReview={() => setActive('Minhas OS')} />
  return <div className={dark ? 'app-shell dark' : 'app-shell'}><Header role={role} setRole={(nextRole) => { setRole(nextRole); setActive('Visão geral') }} dark={dark} setDark={setDark}/><div className="app-body"><Sidebar active={active} setActive={setActive} role={role}/><main className="main-area">{screen}</main></div></div>
}
