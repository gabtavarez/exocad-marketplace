'use client'

import { useState, type FormEvent } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/auth'

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<UserRole>('DENTIST')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp({ name, email, password, role })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível autenticar.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="auth-page"><section className="auth-panel"><div className="auth-brand"><div className="brand-mark"><span className="brand-cross">+</span></div><div><strong>dentform</strong><span>DIGITAL DENTISTRY</span></div></div><div className="auth-heading"><h1>{mode === 'login' ? 'Entre na sua conta' : 'Crie a sua conta'}</h1><p>Aceda aos seus casos clínicos e entregas CAD.</p></div><div className="auth-toggle"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(null) }}>Entrar</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(null) }}>Registar</button></div><form className="auth-form" onSubmit={submit}>{mode === 'register' && <label><span>Nome</span><div><UserRound /><input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="O seu nome" /></div></label>}<label><span>Email</span><div><Mail /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nome@clinica.com" /></div></label><label><span>Senha</span><div><LockKeyhole /><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Mínimo de 8 caracteres" /></div></label>{mode === 'register' && <RoleSelector role={role} onChange={setRole} />}{error && <p className="auth-error">{error}</p>}<button className="auth-submit" disabled={submitting}>{submitting ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button></form><div className="auth-divider"><span>Ou entre com o Google</span></div><div className="google-login"><GoogleLogin onSuccess={(response) => { if (!response.credential) return; setError(null); void signInWithGoogle(response.credential, role).catch((cause) => setError(cause instanceof Error ? cause.message : 'Falha no login com Google.')) }} onError={() => setError('Falha no login com Google.')} /></div>{mode === 'login' && <><p className="auth-role-note">No protótipo, o perfil escolhido abaixo também atualiza a sua conta Google.</p><RoleSelector role={role} onChange={setRole} /></>}</section></main>
}

function RoleSelector({ role, onChange }: { role: UserRole; onChange: (role: UserRole) => void }) {
  return <fieldset className="auth-roles"><legend>O seu perfil</legend><label><input type="radio" checked={role === 'DENTIST'} onChange={() => onChange('DENTIST')} /><span>Sou Dentista</span></label><label><input type="radio" checked={role === 'DESIGNER'} onChange={() => onChange('DESIGNER')} /><span>Sou Cadista</span></label></fieldset>
}
