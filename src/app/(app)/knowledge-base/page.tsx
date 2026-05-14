'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Trash2, FileText, Loader2, CheckCircle, AlertTriangle, Brain, Type, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { renderPdfPagesToImages } from '@/lib/pdf-extract-browser'

interface KnowledgeDoc {
  id: string
  name: string
  file_size: number
  status: 'processing' | 'ready' | 'error'
  error_message: string | null
  created_at: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Tab = 'pdf' | 'text'

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [tab, setTab] = useState<Tab>('pdf')
  const [textName, setTextName] = useState('')
  const [textContent, setTextContent] = useState('')
  const [savingText, setSavingText] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/knowledge-base')
    const data = await res.json()
    setDocs(data.documents ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const uploadFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Nur PDF-Dateien erlaubt')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Datei zu groß (max. 100 MB)')
      return
    }
    setUploading(true)
    const name = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()
    try {
      // Step 1: Render PDF pages as images in the browser
      setUploadStatus('Seiten werden vorbereitet…')
      const pageImages = await renderPdfPagesToImages(file, 8)

      if (pageImages.length === 0) {
        toast.error('PDF konnte nicht gerendert werden.')
        return
      }

      // Step 2: Send images to Claude Vision for extraction
      setUploadStatus(`KI analysiert ${pageImages.length} Seite${pageImages.length !== 1 ? 'n' : ''} (Text + Zeichnungen)…`)
      const res = await fetch('/api/knowledge-base/vision-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, fileSize: file.size, pageImages }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Verarbeitung fehlgeschlagen')
        return
      }
      toast.success(`"${name}" hochgeladen — ${data.document?.pages ?? pageImages.length} Seiten mit KI analysiert`)
      load()
    } catch (err) {
      toast.error('Fehler beim Verarbeiten der Datei.')
      console.error(err)
    } finally {
      setUploading(false)
      setUploadStatus('')
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(uploadFile)
  }

  const handleSaveText = async () => {
    if (!textName.trim() || !textContent.trim()) {
      toast.error('Bitte Name und Inhalt ausfüllen')
      return
    }
    setSavingText(true)
    const res = await fetch('/api/knowledge-base/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: textName.trim(), text: textContent.trim() }),
    })
    const data = await res.json()
    setSavingText(false)
    if (!res.ok) {
      toast.error(data.error ?? 'Fehler beim Speichern')
      return
    }
    toast.success(`"${textName}" gespeichert`)
    setTextName('')
    setTextContent('')
    load()
  }

  const startRename = (doc: KnowledgeDoc) => {
    setRenamingId(doc.id)
    setRenameValue(doc.name)
  }

  const commitRename = async (id: string) => {
    const name = renameValue.trim()
    if (!name) { setRenamingId(null); return }
    await fetch(`/api/knowledge-base/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setDocs(prev => prev.map(d => d.id === id ? { ...d, name } : d))
    setRenamingId(null)
  }

  const handleDelete = async (id: string, name: string) => {
    setDeletingId(id)
    const res = await fetch(`/api/knowledge-base/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.id !== id))
      toast.success(`"${name}" gelöscht`)
    } else {
      toast.error('Löschen fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <div className="eyebrow mb-1">KI-Kontext</div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}>
          Knowledge Base
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
          Lade deine Trading-Unterlagen hoch — die KI nutzt sie für alle Analysen und Coachings.
        </p>
      </div>

      {/* How it works */}
      <div
        className="rounded-lg px-5 py-4 flex items-start gap-3"
        style={{ background: 'rgba(41,98,255,0.08)', border: '1px solid rgba(41,98,255,0.2)' }}
      >
        <Brain className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--brand-blue)' }} />
        <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
          Die KI liest deine hochgeladenen Dokumente (Strategie-Dokumente, Regelsets, Kurs-Unterlagen) und bezieht sich bei Trade-Analysen und der Wochenvorbereitung explizit darauf — kein generisches Feedback mehr.
        </p>
      </div>

      {/* Upload tabs */}
      <div className="space-y-3">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
          {([
            { id: 'pdf', label: 'PDF hochladen', icon: Upload },
            { id: 'text', label: 'Text einfügen', icon: Type },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors"
              style={{
                background: tab === id ? 'var(--bg-3)' : 'transparent',
                color: tab === id ? 'var(--fg-1)' : 'var(--fg-3)',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* PDF Upload Zone */}
        {tab === 'pdf' && (
          <div
            className="rounded-lg border-2 border-dashed transition-colors"
            style={{ borderColor: dragOver ? 'var(--brand-blue)' : 'var(--border-raw)' }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          >
            <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--brand-blue)' }} />
                  <p className="text-sm" style={{ color: 'var(--fg-3)' }}>{uploadStatus || 'PDF wird verarbeitet…'}</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 opacity-30" style={{ color: 'var(--fg-3)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>
                      PDF hierher ziehen oder
                    </p>
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="text-sm underline"
                      style={{ color: 'var(--brand-blue)' }}
                    >
                      Datei auswählen
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                    Nur PDF · max. 20 MB · max. 10 Dokumente
                  </p>
                  <p className="text-xs px-4" style={{ color: 'var(--fg-4)' }}>
                    Bei passwortgeschützten PDFs: Tab "Text einfügen" verwenden und Text manuell hineinkopieren.
                  </p>
                </>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </div>
        )}

        {/* Text Paste */}
        {tab === 'text' && (
          <div className="rounded-lg p-5 space-y-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
            <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
              Für passwortgeschützte PDFs oder andere Formate: Kopiere den Inhalt direkt hier hinein.
            </p>
            <Input
              value={textName}
              onChange={e => setTextName(e.target.value)}
              placeholder="Name des Dokuments, z.B. WSI Kurs Klasse 1-3"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)', color: 'var(--fg-1)' }}
            />
            <Textarea
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              placeholder="Inhalt hier einfügen…"
              rows={10}
              className="resize-none font-mono text-xs"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)', color: 'var(--fg-1)' }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--fg-4)' }}>
                {textContent.length.toLocaleString('de-DE')} / 200.000 Zeichen
              </span>
              <Button
                onClick={handleSaveText}
                disabled={savingText || !textName.trim() || !textContent.trim()}
                className="h-8 px-4 text-[13px] font-semibold rounded"
                style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
              >
                {savingText ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                Speichern
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Document List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>
            Dokumente ({docs.length}/10)
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4" style={{ color: 'var(--fg-4)' }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Laden…</span>
          </div>
        ) : docs.length === 0 ? (
          <div
            className="rounded-lg py-8 text-center"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
          >
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--fg-4)' }} />
            <p className="text-sm" style={{ color: 'var(--fg-4)' }}>Noch keine Dokumente hochgeladen</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
              >
                <FileText className="h-4 w-4 shrink-0" style={{ color: 'var(--fg-4)' }} />

                <div className="flex-1 min-w-0">
                  {renamingId === doc.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename(doc.id)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        onBlur={() => commitRename(doc.id)}
                        className="flex-1 min-w-0 text-sm font-medium bg-transparent border-b outline-none"
                        style={{ color: 'var(--fg-1)', borderColor: 'var(--brand-blue)' }}
                      />
                      <button onClick={() => commitRename(doc.id)} className="shrink-0">
                        <Check className="h-3.5 w-3.5" style={{ color: 'var(--long)' }} />
                      </button>
                      <button onClick={() => setRenamingId(null)} className="shrink-0">
                        <X className="h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startRename(doc)}
                      className="flex items-center gap-1.5 group/name w-full text-left"
                    >
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--fg-1)' }}>{doc.name}</p>
                      <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity" style={{ color: 'var(--fg-4)' }} />
                    </button>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-4)' }}>
                    {formatBytes(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('de-DE')}
                  </p>
                  {doc.status === 'error' && doc.error_message && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--short)' }}>
                      {doc.error_message} — Text manuell über Tab "Text einfügen" einf&uuml;gen
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="shrink-0">
                  {doc.status === 'processing' && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-4)' }}>
                      <Loader2 className="h-3 w-3 animate-spin" /> Verarbeitung…
                    </span>
                  )}
                  {doc.status === 'ready' && (
                    <CheckCircle className="h-4 w-4" style={{ color: 'var(--long)' }} />
                  )}
                  {doc.status === 'error' && (
                    <AlertTriangle className="h-4 w-4" style={{ color: 'var(--short)' }} />
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(doc.id, doc.name)}
                  disabled={deletingId === doc.id}
                  className="shrink-0 p-1 rounded transition-colors"
                  style={{ color: 'var(--fg-4)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--short)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--fg-4)')}
                >
                  {deletingId === doc.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
