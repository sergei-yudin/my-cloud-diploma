import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { api, humanSize } from '../api'

const imagePattern = /\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i

export default function FilesPage({ ownerId = null, embedded = false }) {
  const currentUser = useSelector((state) => state.auth.user)
  const [files, setFiles] = useState([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null); const [comment, setComment] = useState('')
  const suffix = ownerId ? `?user_id=${ownerId}` : ''
  const load = useCallback(async () => { try { setFiles(await api(`/files/${suffix}`)); setError('') } catch (e) { setError(e.message) } }, [suffix])
  useEffect(() => { load() }, [load])
  const upload = async (event) => {
    event.preventDefault(); if (!selectedFile) return setError('Сначала выберите файл.')
    const data = new FormData(); data.append('file', selectedFile); data.append('comment', comment); if (ownerId) data.append('user_id', ownerId)
    try { setBusy(true); setError(''); await api('/files/', { method: 'POST', body: data }); event.target.reset(); setSelectedFile(null); setComment(''); await load() } catch (e) { setError(e.message) } finally { setBusy(false) }
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
    {!embedded && <div className="page-heading"><div><span className="eyebrow">Личное хранилище</span><h1>Мои файлы</h1><p className="page-subtitle">{currentUser.full_name}</p></div><span className="pill">{files.length} файлов · {humanSize(files.reduce((sum, item) => sum + item.size, 0))}</span></div>}
    <form className="upload-card" onSubmit={upload}>
      <label className={`file-drop ${selectedFile ? 'selected' : ''}`}>
        <span className="file-drop-title">{selectedFile ? '✓ Файл выбран' : 'Выберите файл'}</span>
        <span className="file-drop-name">{selectedFile ? `${selectedFile.name} · ${humanSize(selectedFile.size)}` : 'Фото, документ или архив'}</span>
        <input type="file" onChange={(event) => { setSelectedFile(event.target.files[0] || null); setError('') }} />
      </label>
      <input placeholder="Комментарий к файлу (необязательно)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="button" disabled={busy || !selectedFile}>{busy ? 'Загружаю…' : selectedFile ? 'Загрузить файл' : 'Сначала выберите файл'}</button>
      {selectedFile && <div className="upload-hint">Файл готов к загрузке. Нажмите «Загрузить файл».</div>}
    </form>
    {error && <div className="alert error">{error}</div>}
    {!files.length ? <div className="empty"><span>☁</span><h2>Здесь пока пусто</h2><p>Загрузите первый файл — он появится в этом списке.</p></div> : <div className="table-wrap"><table><thead><tr><th>Файл</th><th>Комментарий</th><th>Размер</th><th>Загружен</th><th>Скачан</th><th>Действия</th></tr></thead><tbody>{files.map((item) => <tr key={item.id}><td><div className="file-cell">{imagePattern.test(item.original_name) ? <a className="file-preview" href={`/api/files/${item.id}/preview/`} target="_blank" rel="noreferrer" aria-label={`Открыть ${item.original_name}`}><img src={`/api/files/${item.id}/preview/`} alt="" loading="lazy" /></a> : <span className="file-icon">▤</span>}<strong>{item.original_name}</strong></div></td><td>{item.comment || '—'}</td><td>{humanSize(item.size)}</td><td>{new Date(item.uploaded_at).toLocaleString('ru')}</td><td>{item.last_downloaded_at ? new Date(item.last_downloaded_at).toLocaleString('ru') : '—'}</td><td><div className="row-actions"><a data-tooltip="Скачать" aria-label="Скачать файл" href={`/api/files/${item.id}/download/`}>↓</a><button data-tooltip="Переименовать" aria-label="Переименовать файл" onClick={() => edit(item, 'original_name')}>✎</button><button data-tooltip="Изменить комментарий" aria-label="Изменить комментарий" onClick={() => edit(item, 'comment')}>☰</button><button data-tooltip={item.share_url ? 'Отключить публичную ссылку' : 'Создать и скопировать ссылку'} aria-label={item.share_url ? 'Отключить публичную ссылку' : 'Создать публичную ссылку'} onClick={() => share(item)}>↗</button><button className="danger" data-tooltip="Удалить" aria-label="Удалить файл" onClick={() => remove(item)}>×</button></div></td></tr>)}</tbody></table></div>}
  </section>
}

