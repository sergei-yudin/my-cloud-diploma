import { Link } from 'react-router-dom'

export default function HomePage() {
  return <section className="hero">
    <div className="hero-copy">
      <span className="eyebrow">Ваши файлы — в надёжном месте</span>
      <h1>Личное облако без лишней сложности</h1>
      <p>Загружайте документы, управляйте ими с любого устройства и делитесь безопасными обезличенными ссылками.</p>
      <div className="actions"><Link className="button" to="/register">Создать хранилище</Link><Link className="button ghost" to="/login">У меня есть аккаунт</Link></div>
    </div>
    <div className="cloud-card"><div className="cloud-icon">☁</div><strong>Просто. Безопасно. Доступно.</strong><span>Управление файлами в одном окне</span></div>
  </section>
}

