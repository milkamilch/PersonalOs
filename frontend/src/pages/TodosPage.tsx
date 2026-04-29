import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Todo } from '../api/types'
import PageHeader from '../components/PageHeader'

export default function TodosPage() {
  const qc = useQueryClient()
  const [text, setText] = useState('')

  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: () => endpoints.todos().then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => endpoints.createTodo(text),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['todos'] }); setText('') },
  })

  const done = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => endpoints.doneTodo(id, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })

  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteTodo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })

  const open = todos.filter(t => !t.done)
  const closed = todos.filter(t => t.done)

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Todos" subtitle="Aufgaben ohne Projekt-Zuordnung." />

      <div className="flex gap-2 mb-6">
        <input
          placeholder="Neue Aufgabe…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && text && create.mutate()}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none focus:ring-1 ring-violet-500"
        />
        <button
          onClick={() => text && create.mutate()}
          className="px-4 bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      {open.length > 0 && (
        <div className="space-y-1.5 mb-6">
          {open.map(t => (
            <TodoRow key={t.id} todo={t} onDone={() => done.mutate({ id: t.id, done: true })} onDelete={() => del.mutate(t.id)} />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Erledigt</p>
          <div className="space-y-1.5">
            {closed.map(t => (
              <TodoRow key={t.id} todo={t} onDone={() => done.mutate({ id: t.id, done: false })} onDelete={() => del.mutate(t.id)} />
            ))}
          </div>
        </>
      )}

      {todos.length === 0 && (
        <p className="text-sm text-gray-600 text-center py-12">Noch keine Todos.</p>
      )}
    </div>
  )
}

function TodoRow({ todo, onDone, onDelete }: { todo: Todo; onDone: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-xl group hover:border-gray-700 transition-colors">
      <button
        onClick={onDone}
        className={`w-5 h-5 rounded border flex-shrink-0 transition-colors flex items-center justify-center ${
          todo.done ? 'bg-violet-600 border-violet-600' : 'border-gray-600 hover:border-violet-500'
        }`}
      >
        {todo.done && <svg viewBox="0 0 12 12" className="w-3 h-3"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" fill="none"/></svg>}
      </button>
      <span className={`flex-1 text-sm ${todo.done ? 'line-through text-gray-600' : 'text-gray-200'}`}>
        {todo.text}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
