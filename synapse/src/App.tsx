import './App.css'
import { useMemo, useRef, useState } from 'react'
import { Camera, Database, Factory, ImagePlus, Loader2, Upload, ClipboardCopy, Check, Search } from 'lucide-react'

type LoadingStep = {
  icon: 'processing' | 'database' | 'warehouse'
  label: string
  active: boolean
  done: boolean
}

type PartResult = {
  partNumber: string
  name: string
  imageUrl: string
}

type Inventory = {
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  quantity: number
}

function StatusLozenge({ status }: { status: Inventory['status'] }) {
  const map = {
    IN_STOCK: { cls: 'status-success', text: 'IN STOCK' },
    LOW_STOCK: { cls: 'status-warning', text: 'LOW STOCK' },
    OUT_OF_STOCK: { cls: 'status-error', text: 'OUT OF STOCK' },
  } as const
  const { cls, text } = map[status]
  return <span className={`status-lozenge ${cls}`} aria-live="polite">{text}</span>
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label="Copy part number"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium hocus:hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[--color-accent]"
    >
      {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
      {copied ? 'Copied' : 'Copy Part Number'}
    </button>
  )
}

function PartCard({ part }: { part: PartResult }) {
  return (
    <article className="card p-4 flex gap-4" aria-label="Part identification result">
      <img src={part.imageUrl} alt={`Part ${part.partNumber}`} className="h-20 w-20 rounded-md object-cover bg-black/30" />
      <div className="flex-1">
        <h2 className="text-xl font-semibold tracking-wide">{part.partNumber}</h2>
        <p className="text-sm text-[--color-text-secondary]">{part.name}</p>
        <div className="mt-3"><CopyButton text={part.partNumber} /></div>
      </div>
    </article>
  )
}

function InventoryCard({ inventory }: { inventory: Inventory }) {
  return (
    <article className="card p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <StatusLozenge status={inventory.status} />
        <span className="text-sm text-[--color-text-secondary]">Patna Warehouse</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{inventory.quantity}</div>
    </article>
  )
}

function DisambiguationCard({ options, onSelect }: { options: PartResult[]; onSelect: (p: PartResult) => void }) {
  return (
    <section className="card p-4" aria-labelledby="disambiguation-title">
      <h3 id="disambiguation-title" className="text-base font-medium mb-3">I found a couple of possibilities. Which one looks correct?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt) => (
          <button
            key={opt.partNumber}
            onClick={() => onSelect(opt)}
            className="rounded-md border border-white/10 bg-white/5 p-3 text-left hocus:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[--color-accent]"
          >
            <img src={opt.imageUrl} alt="candidate part" className="h-24 w-full object-cover rounded" />
            <div className="mt-2">
              <div className="font-semibold">{opt.partNumber}</div>
              <div className="text-xs text-[--color-text-secondary]">{opt.name}</div>
            </div>
            <div className="mt-3 btn-primary w-full inline-flex gap-2"><Check size={16}/> Select This Part</div>
          </button>
        ))}
      </div>
    </section>
  )
}

function LoadingSteps({ steps }: { steps: LoadingStep[] }) {
  const iconFor = (t: LoadingStep['icon']) => {
    if (t === 'processing') return <Camera className="animate-pulse motion-reduce:animate-none" size={16} />
    if (t === 'database') return <Database size={16} />
    return <Factory size={16} />
  }
  return (
    <div className="card p-4" aria-live="polite">
      <ol className="space-y-2">
        {steps.map((s, idx) => (
          <li key={idx} className="flex items-center gap-3">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center ${s.done ? 'bg-white/20' : 'bg-white/10'}`}>
              {s.active && !s.done ? <Loader2 className="animate-spin motion-reduce:animate-none" size={16}/> : iconFor(s.icon)}
            </div>
            <span className={`${s.done ? 'text-[--color-text-secondary]' : ''}`}>{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

type Message =
  | { kind: 'system'; text: string }
  | { kind: 'loading'; steps: LoadingStep[]; thumbnailUrl?: string }
  | { kind: 'result'; part: PartResult; inventory: Inventory }
  | { kind: 'disambiguate'; options: PartResult[] }

function App() {
  const [messages, setMessages] = useState<Message[]>([
    { kind: 'system', text: 'Synapse is ready. Upload a photo or describe the part you need.' },
  ])
  const [uploading, setUploading] = useState(false)
  const [inputText, setInputText] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleImage = async (file: File) => {
    setUploading(true)
    const url = URL.createObjectURL(file)

    const initialSteps: LoadingStep[] = [
      { icon: 'processing', label: 'Query Received: Analyzing your photo…', active: true, done: false },
      { icon: 'database', label: 'Searching Records: Cross-referencing Machine BOM…', active: false, done: false },
      { icon: 'warehouse', label: 'Checking Live Inventory: Contacting Patna Warehouse System…', active: false, done: false },
    ]
    setMessages((m) => [...m, { kind: 'loading', steps: initialSteps, thumbnailUrl: url }])

    // Simulate progress over ~3s
    await new Promise((r) => setTimeout(r, 1000))
    setMessages((m) => {
      const last = m[m.length - 1]
      if (last?.kind !== 'loading') return m
      const steps = last.steps.map((s, i) => (i === 0 ? { ...s, active: false, done: true } : i === 1 ? { ...s, active: true } : s))
      return [...m.slice(0, -1), { ...last, steps }]
    })

    await new Promise((r) => setTimeout(r, 900))
    setMessages((m) => {
      const last = m[m.length - 1]
      if (last?.kind !== 'loading') return m
      const steps = last.steps.map((s, i) => (i === 1 ? { ...s, active: false, done: true } : i === 2 ? { ...s, active: true } : s))
      return [...m.slice(0, -1), { ...last, steps }]
    })

    await new Promise((r) => setTimeout(r, 900))

    // Simulate confidence: sometimes require disambiguation
    const requireDisambiguation = Math.random() < 0.4
    setMessages((m) => {
      const next = m.slice()
      // finalize loading card
      const last = next[next.length - 1]
      if (last?.kind === 'loading') {
        last.steps = last.steps.map((s, i) => (i === 2 ? { ...s, active: false, done: true } : s))
      }
      if (requireDisambiguation) {
        next.push({
          kind: 'disambiguate',
          options: [
            { partNumber: 'BRG-6203', name: 'Deep Groove Ball Bearing 17x40x12', imageUrl: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?q=80&w=400&auto=format&fit=crop' },
            { partNumber: 'BRG-6204', name: 'Deep Groove Ball Bearing 20x47x14', imageUrl: 'https://images.unsplash.com/photo-1581091014534-7d9b50d0ce06?q=80&w=400&auto=format&fit=crop' },
          ],
        })
      } else {
        next.push({
          kind: 'result',
          part: { partNumber: 'BRG-6203', name: 'Deep Groove Ball Bearing 17x40x12', imageUrl: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?q=80&w=400&auto=format&fit=crop' },
          inventory: { status: 'IN_STOCK', quantity: 7 },
        })
      }
      return next
    })

    setUploading(false)
  }

  const onSubmitText = async () => {
    if (!inputText.trim()) return
    setMessages((m) => [...m, { kind: 'system', text: `Searching for: ${inputText.trim()}` }])
    setInputText('')
    // simulate loading as with image
    await handleImage(new File([new Blob()], 'query.jpg', { type: 'image/jpeg' }))
  }

  const disambiguationHandler = (p: PartResult) => {
    setMessages((m) => [
      ...m,
      {
        kind: 'result',
        part: p,
        inventory: { status: p.partNumber.endsWith('204') ? 'LOW_STOCK' : 'IN_STOCK', quantity: p.partNumber.endsWith('204') ? 3 : 7 },
      },
    ])
  }

  const header = useMemo(() => (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[--color-bg]/90 backdrop-blur supports-[backdrop-filter]:bg-[--color-bg]/70">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search aria-hidden size={18} className="text-[--color-accent]" />
          <span className="font-semibold tracking-wide">Synapse</span>
        </div>
        <div className="text-xs text-[--color-text-secondary]">Industrial Precision</div>
      </div>
    </header>
  ), [])

  return (
    <div className="min-h-full flex flex-col">
      {header}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="space-y-4" role="feed" aria-busy={uploading}>
          {messages.map((m, idx) => (
            <div key={idx} className="w-full">
              {m.kind === 'system' && (
                <div className="card p-4 text-sm text-[--color-text-secondary]">{m.text}</div>
              )}
              {m.kind === 'loading' && (
                <div className="space-y-3">
                  {m.thumbnailUrl && (
                    <div className="flex items-center gap-3">
                      <img src={m.thumbnailUrl} alt="uploaded thumbnail" className="h-16 w-16 rounded object-cover border border-white/10" />
                      <div className="h-1 flex-1 bg-white/10 rounded">
                        <div className="h-1 bg-[--color-accent] rounded animate-pulse motion-reduce:animate-none" style={{ width: '66%' }} />
                      </div>
                    </div>
                  )}
                  <LoadingSteps steps={m.steps} />
                </div>
              )}
              {m.kind === 'result' && (
                <div className="space-y-3">
                  <PartCard part={m.part} />
                  <InventoryCard inventory={m.inventory} />
                </div>
              )}
              {m.kind === 'disambiguate' && (
                <DisambiguationCard options={m.options} onSelect={disambiguationHandler} />
              )}
            </div>
          ))}
        </div>
      </main>

      <form
        onSubmit={(e) => { e.preventDefault(); onSubmitText() }}
        className="sticky bottom-0 border-t border-white/10 bg-[--color-bg]"
        aria-label="Message input"
      >
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImage(f) }}
            className="sr-only"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary inline-flex gap-2"
          >
            <ImagePlus size={18} /> Upload Photo
          </button>
          <div className="relative flex-1">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe the part"
              className="w-full rounded-md bg-white/5 px-3 py-2 pr-24 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-[--color-accent]"
            />
            <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 btn-primary h-8 px-3 inline-flex gap-2">
              <Upload size={16} /> Send
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default App
