import PageHeader from '../components/PageHeader'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Mail, Phone, Plus, Search, Trash2, X } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Contact } from '../api/types'

const TAG_COLOR: Record<string, string> = {
  Familie: '#8E5BFF', Uni: '#1C6BFF', Code: '#2F8F4E', Arbeit: '#1C6BFF',
  Admin: '#9A9A9F', Sport: '#C8344A', Freund: '#2F8F4E', Bekannt: '#C58A00', Kunde: '#8E5BFF',
}

function tagColor(tag: string | undefined | null) { return TAG_COLOR[tag ?? ''] ?? '#9A9A9F' }


const TAGS = ['Freund', 'Familie', 'Arbeit', 'Uni', 'Code', 'Admin', 'Sport', 'Bekannt', 'Kunde']

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

  const grouped = contacts.reduce<Record<string, Contact[]>>((acc, c) => {
    const L = c.name.charAt(0).toUpperCase()
    ;(acc[L] ||= []).push(c)
    return acc
  }, {})
  const letters = Object.keys(grouped).sort()

  const tagCounts = TAGS.map(t => ({ tag: t, count: contacts.filter(c => c.tag === t).length })).filter(x => x.count > 0)

  return (
    <div className="content">
      <PageHeader
        eyebrow={`${contacts.length} Kontakte`}
        title="Kontakte"
        sub="Beziehungen sind das einzige, was am Ende zählt."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" onClick={() => { setShowForm(true); setEditing(null) }}><Plus size={14} /> Neuer Kontakt</button>
          </div>
        }
      />

      {(showForm || editing) && (
        <ContactForm
          contact={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); qc.invalidateQueries({ queryKey: ['contacts'] }) }}
        />
      )}

      <div className="bento">
        <div className="col-8 card">
          <div className="card-b" style={{ padding: 0 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-sunk)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 10px' }}>
                <Search size={13} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen…"
                  style={{ flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 13, color: 'var(--fg)' }} />
              </div>
            </div>
            {contacts.length === 0 && <div className="empty" style={{ padding: 60 }}>Noch keine Kontakte.</div>}
            {letters.map(L => (
              <div key={L}>
                <div style={{ padding: '10px 20px 5px', fontSize: 10.5, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.12em', background: 'var(--surface-sunk)', borderTop: '1px solid var(--line)' }}>{L}</div>
                {grouped[L].map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 20px', borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                    onClick={() => setEditing(c)}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${tagColor(c.tag)}, ${tagColor(c.tag)}88)`,
                      display: 'grid', placeItems: 'center', color: 'white', fontSize: 12, fontWeight: 600 }}>
                      {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>{c.company}</div>
                    </div>
                    {c.tag && <span className="pill" style={{ background: `${tagColor(c.tag)}1A`, color: tagColor(c.tag) }}>{c.tag}</span>}
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      {c.phone && <a href={`tel:${c.phone}`} style={{ padding: 4, color: 'var(--green)' }}><Phone size={13} /></a>}
                      {c.email && <a href={`mailto:${c.email}`} style={{ padding: 4, color: 'var(--accent)' }}><Mail size={13} /></a>}
                      <button onClick={() => del.mutate(c.id)} style={{ padding: 4, color: 'var(--fg-5)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-5)')}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-h"><span className="accent-dot" /><span className="title">Tags</span></div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tagCounts.length === 0 && <div className="empty">Keine Tags</div>}
              {tagCounts.map(({ tag, count }) => (
                <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: tagColor(tag), flexShrink: 0 }} />
                  <span style={{ fontSize: 13 }}>{tag}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--fg-4)' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactForm({ contact, onClose, onSaved }: { contact: Contact | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: contact?.name ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '',
    company: contact?.company ?? '', notes: contact?.notes ?? '', tag: contact?.tag ?? '',
    lastContact: contact?.last_contact ?? '',
  })

  const create = useMutation({ mutationFn: () => endpoints.createContact(form), onSuccess: onSaved })
  const update = useMutation({ mutationFn: () => endpoints.updateContact(contact!.id, form), onSuccess: onSaved })
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))
  const inputStyle = { background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)', width: '100%' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 480, margin: 16 }} onClick={e => e.stopPropagation()}>
        <div className="card-h">
          <span className="accent-dot" />
          <span className="title">{contact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</span>
          <div className="spacer" />
          <button onClick={onClose} style={{ color: 'var(--fg-4)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder="Name *" value={form.name} onChange={f('name')} style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input placeholder="E-Mail" value={form.email} onChange={f('email')} type="email" style={inputStyle} />
            <input placeholder="Telefon" value={form.phone} onChange={f('phone')} type="tel" style={inputStyle} />
          </div>
          <input placeholder="Unternehmen / Kontext" value={form.company} onChange={f('company')} style={inputStyle} />
          <input placeholder="Letzter Kontakt" value={form.lastContact} onChange={f('lastContact')} type="date" style={inputStyle} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Kategorie</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => setForm(p => ({ ...p, tag: p.tag === t ? '' : t }))}
                  style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                    background: form.tag === t ? `${tagColor(t)}1A` : 'var(--surface-sunk)',
                    color: form.tag === t ? tagColor(t) : 'var(--fg-3)',
                    border: `1px solid ${form.tag === t ? tagColor(t) : 'var(--line)'}` }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <textarea placeholder="Notizen…" value={form.notes} onChange={f('notes')} rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
          <button onClick={() => contact ? update.mutate() : create.mutate()} disabled={!form.name.trim()}
            style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: 'white', cursor: 'pointer', opacity: form.name.trim() ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={15} /> {contact ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}
