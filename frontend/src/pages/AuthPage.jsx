import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { login, register } from '../store'

const loginPattern = /^[A-Za-z][A-Za-z0-9]{3,19}$/
const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const [form, setForm] = useState({ username: '', full_name: '', email: '', password: '' })
  const [localError, setLocalError] = useState('')
  const dispatch = useDispatch(); const navigate = useNavigate()
  const { user, error } = useSelector((state) => state.auth)
  if (user) return <Navigate to="/files" replace />
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const submit = async (event) => {
    event.preventDefault(); setLocalError('')
    if (!loginPattern.test(form.username)) return setLocalError('Логин: 4–20 латинских букв/цифр, первый символ — буква.')
    if (isRegister && !passwordPattern.test(form.password)) return setLocalError('Пароль: минимум 6 символов, заглавная буква, цифра и специальный символ.')
    const result = await dispatch(isRegister ? register(form) : login({ username: form.username, password: form.password }))
    if (!result.error) navigate('/files')
  }
  return <section className="auth-card">
    <h1>{isRegister ? 'Создать хранилище' : 'Войти в My Cloud'}</h1>
    <p>{isRegister ? 'Заполните четыре поля — и облако готово.' : 'Введите данные своего аккаунта.'}</p>
    <form onSubmit={submit} noValidate>
      <label>Логин<input name="username" value={form.username} onChange={change} autoComplete="username" required /></label>
      {isRegister && <><label>Полное имя<input name="full_name" value={form.full_name} onChange={change} required /></label><label>Email<input name="email" type="email" value={form.email} onChange={change} required /></label></>}
      <label>Пароль<input name="password" type="password" value={form.password} onChange={change} autoComplete={isRegister ? 'new-password' : 'current-password'} required /></label>
      {(localError || error) && <div className="alert error">{localError || error}</div>}
      <button className="button" type="submit">{isRegister ? 'Зарегистрироваться' : 'Войти'}</button>
    </form>
    <p className="muted">{isRegister ? <>Уже зарегистрированы? <Link to="/login">Войти</Link></> : <>Нет аккаунта? <Link to="/register">Создать</Link></>}</p>
  </section>
}

