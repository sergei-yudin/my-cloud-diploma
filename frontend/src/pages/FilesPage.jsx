import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { api, humanSize } from '../api'

const imagePattern = /\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i

export default function FilesPage({ ownerId = null, embedded = false }) {
  const currentUser = useSelector((state) => state.auth.user)
  const [files, setFiles] = useState([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null); const [comment, setComment] = useState('')
  const [openMenu, setOpenMenu] = useState(null)
  const suffix = ownerId ? `?user_id=${ownerId}` : ''
  const load = useCallback(async () => { try { setFiles(await api(`/files/${suffix}`)); setError('') } catch (e) { setError(e.message) } }, [suffix])
  useEffect(() => { load() }, [load])
  const upload = async (event) => {
    event.preventDefault(); if (!selectedFile) return setError('Сначала выберите файл.')
    const data = new FormData(); data.append('file', selectedFile); data.append('comment', comment); if (ownerId) data.append('user_id', ownerId)
    try { setBusy(true); setError(''); await api('/files/', { method: 'POST', body: data }); event.target.reset(); setSelectedFile(null); setComment(''); await load() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const edit = async (item, field) => {
    setOpenMenu(null)
    const value = window.prompt(field === 'original_name' ? 'Новое имя файла' : 'Комментарий', item[field] || '')
    if (value === null) return
    try { await api(`/files/${item.id}/`, { method: 'PATCH', body: JSON.stringify({ [field]: value }) }); await load() } catch (e) { setError(e.message) }
  }
  const remove = async (item) => { setOpenMenu(null); if (!window.confirm(`Удалить «${item.original_name}»?`)) return; try { await api(`/files/${item.id}/`, { method: 'DELETE' }); await load() } catch (e) { setError(e.message) } }
  const share = async (item) => {
    setOpenMenu(null)
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
    {!files.length ? <div className="empty"><span>☁</span><h2>Здесь пока пусто</h2><p>Загрузите первый файл — он появится в этом списке.</p></div> : <div className="file-gallery">{files.map((item) => {
      const isImage = imagePattern.test(item.original_name)
      return <article className={`file-card ${isImage ? 'image-card' : 'document-card'}`} key={item.id}>
        <div className="card-media">
          {isImage ? <a href={`/api/files/${item.id}/preview/`} target="_blank" rel="noreferrer" aria-label={`Открыть ${item.original_name}`}><img src={`/api/files/${item.id}/preview/`} alt={item.original_name} loading="lazy" /></a> : <div className="document-preview"><span>▤</span><small>{item.original_name.split('.').pop()?.toUpperCase()}</small></div>}
          <div className="card-actions">
            <a className="media-action" data-tooltip="Скачать" aria-label="Скачать файл" href={`/api/files/${item.id}/download/`}>↓</a>
            <button className="media-action menu-trigger" data-tooltip="Другие действия" aria-label="Другие действия" aria-expanded={openMenu === item.id} onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}>⋮</button>
          </div>
          {openMenu === item.id && <div className="card-menu">
            <button onClick={() => edit(item, 'original_name')}><span>✎</span> Переименовать</button>
            <button onClick={() => edit(item, 'comment')}><span>☰</span> Изменить комментарий</button>
            <button onClick={() => share(item)}><span>↗</span> {item.share_url ? 'Отключить ссылку' : 'Создать публичную ссылку'}</button>
            <button className="danger" onClick={() => remove(item)}><span>×</span> Удалить</button>
          </div>}
        </div>
        <div className="card-info"><strong title={item.original_name}>{item.original_name}</strong>{item.comment && <p>{item.comment}</p>}<div className="card-meta"><span>{humanSize(item.size)}</span><span>{new Date(item.uploaded_at).toLocaleDateString('ru')}</span></div></div>
      </article>
    })}</div>}
  </section>
}

