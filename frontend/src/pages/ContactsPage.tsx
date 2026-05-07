import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Users, Mail, Phone, Building2, Search, X, Check, Tag } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Contact } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Input, EmptyState } from '../components/ui'

const TAG_COLORS: Record<string, string> = {
  'Freund':    'rgba(48,209,88,0.15)',
  'Arbeit':    'rgba(10,132,255,0.15)',
  'Familie':   'rgba(255,69,58,0.15)',
  'Bekannt':   'rgba(255,214,10,0.15)',
  'Kunde':     'rgba(191,90,242,0.15)',
}

const TAG_FG: Record<string, string> = {
  'Freund':  'var(--green)',
  'Arbeit':  'var(--accent)',
  'Familie': 'var(--red)',
  'Bekannt': 'var(--yellow)',
  'Kunde':   '#bf5af2',
}

export default function ContactsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts', search],
    queryFn: () => endpoints.contacts(search || undefined).then(r => r.data),
  })

  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })

  // Group by first letter
  const grouped = contacts.reduce<Record<string, Contact[]>>((acc, c) => {
    const letter = c.name.charAt(0).toUpperCase()
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(c)
    return acc
  }, {})

  return (
    <div className="page-root page-medium">
      <PageHeader
        title="Kontakte"
        subtitle="Dein persönliches Netzwerk."
        actions={
          <button onClick={() => { setShowForm(true); setEditing(null) }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                  style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
            <Plus size={15} /> Kontakt
          </button>
        }
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Suchen…"
          className="pl-9"
        />
      </div>

      {/* Form modal */}
      {(showForm || editing) && (
        <ContactForm
          contact={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); qc.invalidateQueries({ queryKey: ['contacts'] }) }}
        />
      )}

      {contacts.length === 0 && !showForm && (
        <EmptyState icon={<Users size={22} />} title="Noch keine Kontakte"
          description="Füge Personen hinzu und behalte dein Netzwerk im Blick." />
      )}

      <div className="space-y-4">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([letter, group]) => (
          <div key={letter}>
            <p className="text-xs font-bold px-1 mb-2" style={{ color: 'var(--text-muted)' }}>{letter}</p>
            <div className="space-y-1.5">
              {group.map(c => (
                <div key={c.id}
                     className="flex items-center gap-3 px-4 py-3 rounded-2xl group cursor-pointer transition-all"
                     style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                     onClick={() => setEditing(c)}>
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                       style={{ background: 'rgba(10,132,255,0.15)', color: 'var(--accent)' }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      {c.tag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0"
                              style={{ background: TAG_COLORS[c.tag] ?? 'rgba(255,255,255,0.08)', color: TAG_FG[c.tag] ?? 'var(--text-muted)' }}>
                          {c.tag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.company && <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.company}</span>}
                      {c.email && <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.email}</span>}
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="p-2 rounded-lg" style={{ color: 'var(--green)' }}>
                        <Phone size={14} />
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="p-2 rounded-lg" style={{ color: 'var(--accent)' }}>
                        <Mail size={14} />
                      </a>
                    )}
                    <button onClick={() => del.mutate(c.id)} className="p-2 rounded-lg" style={{ color: 'var(--red)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const TAGS = ['Freund', 'Familie', 'Arbeit', 'Bekannt', 'Kunde', '']

function ContactForm({ contact, onClose, onSaved }: {
  contact: Contact | null; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name:        contact?.name        ?? '',
    email:       contact?.email       ?? '',
    phone:       contact?.phone       ?? '',
    company:     contact?.company     ?? '',
    notes:       contact?.notes       ?? '',
    tag:         contact?.tag         ?? '',
    lastContact: contact?.last_contact ?? '',
  })

  const create = useMutation({
    mutationFn: () => endpoints.createContact(form),
    onSuccess: onSaved,
  })
  const update = useMutation({
    mutationFn: () => endpoints.updateContact(contact!.id, form),
    onSuccess: onSaved,
  })

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
         onClick={onClose}>
      <div className="w-full sm:max-w-md mx-4 mb-safe rounded-t-3xl sm:rounded-2xl overflow-hidden"
           style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
           onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {contact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
          </p>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <Input placeholder="Name *" value={form.name} onChange={f('name')} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="E-Mail" value={form.email} onChange={f('email')} type="email" />
            <Input placeholder="Telefon" value={form.phone} onChange={f('phone')} type="tel" />
          </div>
          <Input placeholder="Unternehmen" value={form.company} onChange={f('company')} icon={<Building2 size={14} />} />
          <Input placeholder="Letzter Kontakt" value={form.lastContact} onChange={f('lastContact')} type="date" />

          {/* Tags */}
          <div>
            <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Tag size={12} /> Kategorie
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map(t => (
                <button key={t} onClick={() => setForm(p => ({ ...p, tag: t }))}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                        style={form.tag === t
                          ? { background: TAG_COLORS[t] ?? 'rgba(255,255,255,0.1)', color: TAG_FG[t] ?? 'var(--text-primary)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                  {t || 'Keine'}
                </button>
              ))}
            </div>
          </div>

          <textarea value={form.notes} onChange={f('notes')} placeholder="Notizen…" rows={2}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />

          <button
            onClick={() => contact ? update.mutate() : create.mutate()}
            disabled={!form.name.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-[0.98]"
            style={{ background: 'var(--accent)', color: '#000' }}>
            <Check size={15} /> {contact ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}
