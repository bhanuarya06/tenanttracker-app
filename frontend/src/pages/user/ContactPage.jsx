import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Mail, Phone, MapPin, Send, MessageSquare, Clock, ChevronDown, ChevronUp,
  HelpCircle, Zap, Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'How do I add a new tenant?',
    a: 'Go to Tenants → Add Tenant. Enter the tenant\'s name and email — the system auto-generates a password and sends them a welcome email with login instructions.',
  },
  {
    q: 'How are bills generated automatically?',
    a: 'Draft bills are created on the 1st of every month for all active tenants. Open the bill, add utility charges, then send it to the tenant.',
  },
  {
    q: 'Can a tenant change their password?',
    a: 'Yes. Tenants can log in with the auto-generated password and change it from their Profile page, or use "Forgot Password" from the login screen.',
  },
  {
    q: 'How does the security deposit refund work?',
    a: 'Go to the tenant\'s profile → Security Deposit section. Add any deductions, then record the refund with amount, date, and payment mode.',
  },
];

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left bg-white rounded-xl border border-slate-200 px-5 py-4 hover:border-primary-200 transition group"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-slate-800 group-hover:text-primary-700 transition">{q}</span>
        {open
          ? <ChevronUp size={16} className="text-primary-500 flex-shrink-0 mt-0.5" />
          : <ChevronDown size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />}
      </div>
      {open && <p className="mt-3 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3">{a}</p>}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const { user } = useSelector((s) => s.auth);
  const [form, setForm] = useState({
    name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }
    setSending(true);
    setTimeout(() => {
      toast.success('Message sent! We\'ll get back to you within 24 hours.');
      setForm((f) => ({ ...f, subject: '', message: '' }));
      setSending(false);
    }, 600);
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition';

  return (
    <div className="space-y-10 max-w-5xl mx-auto">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 px-8 py-12 text-white">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute top-6 right-32 h-20 w-20 rounded-full bg-white/5" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-5">
            <MessageSquare size={14} className="text-primary-200" />
            <span className="text-xs font-medium text-primary-100">We're here to help</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">Get in Touch</h1>
          <p className="text-primary-100 text-base max-w-lg leading-relaxed">
            Have a question, found a bug, or need help setting something up? Send us a message and we'll respond within 24 hours.
          </p>

          <div className="mt-8 flex flex-wrap gap-6">
            {[
              { icon: Clock, text: '24h response time' },
              { icon: Shield, text: 'Secure & private' },
              { icon: Zap, text: 'Quick resolutions' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-primary-100">
                <Icon size={15} className="text-primary-300" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid lg:grid-cols-5 gap-8">

        {/* Left — contact details */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Contact Details</h2>

          {[
            {
              icon: Mail,
              label: 'Email',
              value: 'support@tenanttracker.online',
              href: 'mailto:support@tenanttracker.online',
              sub: 'Best for detailed queries',
            },
            {
              icon: Phone,
              label: 'Phone',
              value: '+91 98765 43210',
              href: 'tel:+919876543210',
              sub: 'Mon – Sat, 10am – 6pm IST',
            },
            {
              icon: MapPin,
              label: 'Location',
              value: 'Hyderabad, India',
              href: null,
              sub: 'Serving pan-India',
            },
          ].map(({ icon: Icon, label, value, href, sub }) => {
            const Wrapper = href ? 'a' : 'div';
            return (
              <Wrapper
                key={label}
                href={href}
                className={`flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 ${href ? 'hover:border-primary-300 hover:shadow-sm transition cursor-pointer group' : ''}`}
              >
                <div className="h-11 w-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition">
                  <Icon size={18} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
              </Wrapper>
            );
          })}

          {/* Response time notice */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Typical Response Time</p>
                <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                  We respond to all messages within 24 hours on business days. Urgent issues are prioritised.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Send size={17} className="text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Send a Message</h2>
                <p className="text-xs text-slate-400">We read every message personally</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Your Name</label>
                  <input type="text" value={form.name} onChange={set('name')} placeholder="Full name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Email Address</label>
                  <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Subject</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={set('subject')}
                  placeholder="What's this about?"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Message</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={set('message')}
                  placeholder="Describe your question or issue in detail…"
                  className={`${inputCls} resize-none`}
                />
              </div>

              <Button type="submit" disabled={sending} className="w-full justify-center">
                <Send size={15} />
                {sending ? 'Sending…' : 'Send Message'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <HelpCircle size={17} className="text-primary-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Common Questions</h2>
            <p className="text-xs text-slate-400">Quick answers before you write to us</p>
          </div>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq) => <FAQ key={faq.q} {...faq} />)}
        </div>
      </div>
    </div>
  );
}
