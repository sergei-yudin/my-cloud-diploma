function csrfFromCookie() {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith('csrftoken='))
  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : null
}

async function ensureCsrf() {
  const currentToken = csrfFromCookie()
  if (currentToken) return currentToken
  const response = await fetch('/api/csrf/', { credentials: 'include' })
  if (!response.ok) throw new Error('Не удалось получить защитный CSRF-токен.')
  const data = await response.json()
  return csrfFromCookie() || data.csrfToken
}

export async function api(path, options = {}) {
  const method = options.method || 'GET'
  const headers = { ...(options.headers || {}) }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['X-CSRFToken'] = await ensureCsrf()
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const response = await fetch(`/api${path}`, { credentials: 'include', ...options, headers })
  if (response.status === 204) return null
  const type = response.headers.get('content-type') || ''
  const data = type.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const message = data?.error || Object.values(data || {}).flat().join(' ') || `Ошибка ${response.status}`
    throw new Error(message)
  }
  return data
}

export function humanSize(bytes = 0) {
  if (!bytes) return '0 Б'
  const units = ['Б', 'КБ', 'МБ', 'ГБ']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

