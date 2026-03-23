import { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ContactPage() {
  const [form, setForm] = useState({ subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setSending(true);
    // Placeholder — wire to backend when ready
    setTimeout(() => {
      toast.success('Message sent! We\'ll get back to you soon.');
      setForm({ subject: '', message: '' });
      setSending(false);
    }, 600);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contact Us</h1>
        <p className="text-slate-500 mt-1">Have a question or need help? Reach out to us.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Mail, label: 'Email', value: 'support@tenanttracker.com' },
          { icon: Phone, label: 'Phone', value: '+91 98765 43210' },
          { icon: MapPin, label: 'Location', value: 'Hyderabad, India' },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <div className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-primary-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="text-sm font-semibold text-slate-900">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Send a Message</h2>
          <Input label="Subject" value={form.subject} onChange={set('subject')} placeholder="What's this about?" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
            <textarea
              value={form.message}
              onChange={set('message')}
              rows={5}
              placeholder="Describe your issue or question..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={sending}>
              <Send size={16} className="mr-1.5" /> Send Message
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
