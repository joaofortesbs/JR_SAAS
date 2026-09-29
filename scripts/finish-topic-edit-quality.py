from pathlib import Path

root = Path('/home/ubuntu/jr-saas')
exam_path = root / 'client/src/pages/Exams.tsx'
text = exam_path.read_text()
text = text.replace(
    'function TopicEditor({ topic, onCancel, onSaved }: { topic: any; onCancel: () => void; onSaved: (input: TopicFormState) => void }) {\n  const [form, setForm] = useState<TopicFormState>({ name: topic.name, subject: topic.subject, weight: topic.weight });\n  return <div className="topic-edit-form"><Input aria-label="Nome do conteúdo" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><Input className="mt-2" aria-label="Disciplina do conteúdo" value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} /><label className="field-label mt-2"><span>Peso</span><select className="soft-select" value={form.weight} onChange={event => setForm({ ...form, weight: Number(event.target.value) })}><option value={1}>1 — apoio</option><option value={2}>2</option><option value={3}>3 — médio</option><option value={4}>4</option><option value={5}>5 — alto</option></select></label><div className="flex gap-2 mt-3"><Button size="sm" className="soft-button-primary" disabled={!form.name.trim() || !form.subject.trim()} onClick={() => onSaved(form)}><Check size={14} /> Salvar</Button><Button size="sm" variant="outline" className="soft-button-secondary" onClick={onCancel}>Cancelar</Button></div></div>;\n}',
    'function TopicEditor({ topic, onCancel, onSaved, pending, error }: { topic: any; onCancel: () => void; onSaved: (input: TopicFormState) => void; pending: boolean; error?: string }) {\n  const [form, setForm] = useState<TopicFormState>({ name: topic.name, subject: topic.subject, weight: topic.weight });\n  return <div className="topic-edit-form"><Input aria-label="Nome do conteúdo" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><Input className="mt-2" aria-label="Disciplina do conteúdo" value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} /><label className="field-label mt-2"><span>Peso</span><select className="soft-select" value={form.weight} onChange={event => setForm({ ...form, weight: Number(event.target.value) })}><option value={1}>1 — apoio</option><option value={2}>2</option><option value={3}>3 — médio</option><option value={4}>4</option><option value={5}>5 — alto</option></select></label>{error && <p className="inline-error mt-3" role="alert"><CircleAlert size={14} /> {error}</p>}<div className="flex gap-2 mt-3"><Button size="sm" className="soft-button-primary" disabled={pending || !form.name.trim() || !form.subject.trim()} onClick={() => onSaved(form)}><Check size={14} /> {pending ? "Salvando…" : "Salvar"}</Button><Button size="sm" variant="outline" className="soft-button-secondary" disabled={pending} onClick={onCancel}>Cancelar</Button></div></div>;\n}'
)
text = text.replace(
    '  const [editingTopic, setEditingTopic] = useState<any>(null);\n  const updateTopic = trpc.exams.updateTopic.useMutation({ onSuccess: async () => { await utils.exams.detail.invalidate({ id }); setEditingTopic(null); } });',
    '  const [editingTopic, setEditingTopic] = useState<any>(null);\n  const [topicError, setTopicError] = useState("");\n  const updateTopic = trpc.exams.updateTopic.useMutation({ onSuccess: async () => { await utils.exams.detail.invalidate({ id }); setTopicError(""); setEditingTopic(null); }, onError: error => setTopicError(error.message || "Não foi possível salvar este conteúdo.") });'
)
text = text.replace(
    'onCancel={() => setEditingTopic(null)} onSaved={input => updateTopic.mutate({ id: topic.id, ...input })}',
    'onCancel={() => { setTopicError(""); setEditingTopic(null); }} pending={updateTopic.isPending} error={editingTopic?.id === topic.id ? topicError : ""} onSaved={input => { setTopicError(""); updateTopic.mutate({ id: topic.id, ...input }); }}'
)
exam_path.write_text(text)

test_path = root / 'server/flow.integration.test.ts'
test = test_path.read_text()
test = test.replace('import { exams, getDb, studyBlocks, studySessions, users } from "./db";', 'import { exams, getDb, studyBlocks, studySessions, topics, users } from "./db";')
test = test.replace('let blockId: number | undefined;', 'let blockId: number | undefined;\nlet topicId: number | undefined;')
test = test.replace(
    '    const caller = appRouter.createCaller(createContext(userRow));\n\n    const started = await caller.flows.start({ blockId });',
    '    const caller = appRouter.createCaller(createContext(userRow));\n\n    const createdTopic = await caller.exams.createTopic({ examId, name: "Funções", subject: "Matemática", weight: 3 });\n    topicId = createdTopic.id;\n    await caller.exams.updateTopic({ id: topicId, name: "Funções e gráficos", subject: "Matemática", weight: 5 });\n    expect((await caller.dashboard()).topics.find(topic => topic.id === topicId)).toMatchObject({ name: "Funções e gráficos", subject: "Matemática", weight: 5 });\n\n    const started = await caller.flows.start({ blockId });'
)
test = test.replace('  if (blockId) await db.delete(studyBlocks).where(and(eq(studyBlocks.userId, userId), eq(studyBlocks.id, blockId)));', '  if (blockId) await db.delete(studyBlocks).where(and(eq(studyBlocks.userId, userId), eq(studyBlocks.id, blockId)));\n  if (topicId) await db.delete(topics).where(and(eq(topics.userId, userId), eq(topics.id, topicId)));')
test_path.write_text(test)
