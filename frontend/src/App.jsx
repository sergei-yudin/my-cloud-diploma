import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { loadMe, logout } from './store'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import FilesPage from './pages/FilesPage'
import HomePage from './pages/HomePage'

function Protected({ children, admin = false }) {
  const { user, loading } = useSelector((state) => state.auth)
  if (loading) return <div className="loader">Загрузка…</div>
  if (!user) return <Navigate to="/login" replace />
  if (admin && !user.is_staff) return <Navigate to="/files" replace />
  return children
}

export default function App() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  useEffect(() => { dispatch(loadMe()) }, [dispatch])
  const signOut = async () => { await dispatch(logout()); navigate('/') }
  return <div className="app-shell">
    <header>
      <Link className="brand" to="/"><span>☁</span> My Cloud</Link>
      <nav aria-label="Главное меню">
        {user ? <>
          <Link to="/files">Мои файлы</Link>
          {user.is_staff && <Link to="/admin">Администрирование</Link>}
          <button className="link-button" onClick={signOut}>Выйти</button>
        </> : <><Link to="/login">Войти</Link><Link className="button small" to="/register">Регистрация</Link></>}
      </nav>
    </header>
    <main><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/files" element={<Protected><FilesPage /></Protected>} />
      <Route path="/admin" element={<Protected admin><AdminPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></main>
    <footer>Учебный дипломный проект · Fullstack-разработчик на Python</footer>
  </div>
}

