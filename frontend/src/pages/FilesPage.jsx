import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { api, humanSize } from '../api'

export default function FilesPage({ ownerId = null, embedded = false }) {
  const currentUser = useSelector((state) => state.auth.user)
  const [files, setFiles] = useState([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const fileRef = useRef(null); const [comment, setComment] = useState('')
  const suffix = ownerId ? `?user_id=${ownerId}` : ''
  const load = useCallback(async () => { try { setFiles(await api(`/files/${suffix}`)); setError('') } catch (e) { setError(e.message) } }, [suffix])
  useEffect(() => { load() }, [load])
  const upload = async (event) => {
    event.preventDefault(); const selected = fileRef.current.files[0]; if (!selected) return setError('Выберите файл.')
    const data = new FormData(); data.append('file', selected); data.append('comment', comment); if (ownerId) data.append('user_id', ownerId)
    try { setBusy(true); await api('/files/', { method: 'POST', body: data }); event.target.reset(); setComment(''); await load() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const edit = async (item, field) => {
    const value = window.prompt(field === 'original_name' ? 'Новое имя файла' : 'Комментарий', item[field] || '')
    if (value === null) return
    try { await api(`/files/${item.id}/`, { method: 'PATCH', body: JSON.stringify({ [field]: value }) }); await load() } catch (e) { setError(e.message) }
  }
  const remove = async (item) => { if (!window.confirm(`Удалить «${item.original_name}»?`)) return; try { await api(`/files/${item.id}/`, { method: 'DELETE' }); await load() } catch (e) { setError(e.message) } }
  const share = async (item) => {
    try { const updated = await api(`/files/${item.id}/share/`, { method: item.share_url ? 'DELETE' : 'POST' }); await load(); if (updated.share_url) { await navigator.clipboard.writeText(updated.share_url); window.alert('Ссылка скопирована') } } catch (e) { setError(e.message) }
  }
  return <section className={embedded ? 'embedded-files' : 'page'}>
    {!embedded && <div className="page-heading"><div><span className="eyebrow">Хранилище</span><h1>Файлы {currentUser.full_name}</h1></div><span className="pill">{files.length} файлов · {humanSize(files.reduce((sum, item) => sum + item.size, 0))}</span></div>}
    <form className="upload-card" onSubmit={upload}><label className="file-drop">Выберите файл<input ref={fileRef} type="file" /></label><input placeholder="Комментарий к файлу" value={comment} onChange={(e) => setComment(e.target.value)} /><button className="button" disabled={busy}>{busy ? 'Загрузка…' : 'Загрузить'}</button></form>
    {error && <div className="alert error">{error}</div>}
    {!files.length ? <div className="empty"><span>☁</span><h2>Здесь пока пусто</h2><p>Загрузите первый файл — он появится в этом списке.</p></div> : <div className="table-wrap"><table><thead><tr><th>Имя</th><th>Комментарий</th><th>Размер</th><th>Загружен</th><th>Скачан</th><th>Действия</th></tr></thead><tbody>{files.map((item) => <tr key={item.id}><td><strong>{item.original_name}</strong></td><td>{item.comment || '—'}</td><td>{humanSize(item.size)}</td><td>{new Date(item.uploaded_at).toLocaleString('ru')}</td><td>{item.last_downloaded_at ? new Date(item.last_downloaded_at).toLocaleString('ru') : '—'}</td><td><div className="row-actions"><a title="Скачать" href={`/api/files/${item.id}/download/`}>↓</a><button title="Переименовать" onClick={() => edit(item, 'original_name')}>✎</button><button title="Комментарий" onClick={() => edit(item, 'comment')}>☰</button><button title={item.share_url ? 'Отключить ссылку' : 'Создать и скопировать ссылку'} onClick={() => share(item)}>↗</button><button className="danger" title="Удалить" onClick={() => remove(item)}>×</button></div></td></tr>)}</tbody></table></div>}
  </section>
}

