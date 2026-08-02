import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Truck, Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', username: '', email: '', password: '', password2: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password2) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Welcome aboard 🚛')
      navigate('/planner')
    } catch (err) {
      const data = err.response?.data
      if (data) {
        let msg = ''
        if (typeof data === 'string') {
          msg = data
        } else if (typeof data === 'object') {
          msg = Object.entries(data)
            .map(([field, errors]) => {
              const errStr = Array.isArray(errors) ? errors.join(' ') : String(errors)
              return `${field !== 'detail' && field !== 'non_field_errors' ? field + ': ' : ''}${errStr}`
            })
            .join(' | ')
        }
        toast.error(msg || 'Registration failed')
      } else {
        toast.error('Registration failed. Please check network connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3b5bdb, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
      </div>

      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #3b5bdb, #5b7df8)', boxShadow: '0 0 40px rgba(91,125,248,0.4)' }}>
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1">Start planning HOS-compliant trips</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="reg-name" type="text" required placeholder="John Doe"
                  value={form.first_name} onChange={set('first_name')}
                  className="input-field pl-10" />
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="reg-username" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="reg-username" type="text" required placeholder="johndoe"
                  value={form.username} onChange={set('username')}
                  className="input-field pl-10" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="reg-email" type="email" required placeholder="john@example.com"
                  value={form.email} onChange={set('email')}
                  className="input-field pl-10" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="reg-password" type={showPw ? 'text' : 'password'} required placeholder="Min. 8 characters"
                  value={form.password} onChange={set('password')} minLength={8}
                  className="input-field pl-10 pr-10" />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="reg-password2" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="reg-password2" type={showPw ? 'text' : 'password'} required placeholder="Repeat password"
                  value={form.password2} onChange={set('password2')}
                  className="input-field pl-10" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2" id="register-submit-btn">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <div className="divider" />
          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
