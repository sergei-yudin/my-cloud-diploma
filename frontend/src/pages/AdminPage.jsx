import { useEffect, useState } from 'react'
import { api, humanSize } from '../api'
import FilesPage from './FilesPage'

export default function AdminPage() {
  const [users, setUsers] = useState([]); const [selected, setSelected] = useState(null); const [error, setError] = useState('')
  const load = async () => { try { setUsers(await api('/users/')); setError('') } catch (e) { setError(e.message) } }
  useEffect(() => { load() }, [])
  const toggle = async (user) => { try { await api(`/users/${user.id}/`, { method: 'PATCH', body: JSON.stringify({ is_staff: !user.is_staff }) }); await load() } catch (e) { setError(e.message) } }
  const remove = async (user) => { if (!window.confirm(`Удалить пользователя ${user.username} и его файлы?`)) return; try { await api(`/users/${user.id}/`, { method: 'DELETE' }); if (selected === user.id) setSelected(null); await load() } catch (e) { setError(e.message) } }
  return <section className="page"><div className="page-heading"><div><span className="eyebrow">Администрирование</span><h1>Пользователи</h1></div><span className="pill">{users.length} аккаунтов</span></div>{error && <div className="alert error">{error}</div>}<div className="user-grid">{users.map((user) => <article className="user-card" key={user.id}><div className="avatar">{user.full_name?.[0] || user.username[0]}</div><div className="user-main"><h3>{user.full_name || user.username}</h3><p>@{user.username} · {user.email}</p><div className="stats"><span>{user.file_count} файлов</span><span>{humanSize(user.storage_size)}</span></div></div><label className="admin-switch"><input type="checkbox" checked={user.is_staff} onChange={() => toggle(user)} /> Администратор</label><div className="row-actions"><button onClick={() => setSelected(selected === user.id ? null : user.id)}>Файлы</button><button className="danger" onClick={() => remove(user)}>Удалить</button></div>{selected === user.id && <div className="user-storage"><FilesPage ownerId={user.id} embedded /></div>}</article>)}</div></section>
}

