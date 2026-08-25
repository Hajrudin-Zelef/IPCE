export async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (res.status === 401) {
    window.location.href = '/';
    throw new Error('Unauthorized');
  }
  return res;
}

export async function apiGet(url) {
  return api('GET', url);
}

export async function apiPost(url, body) {
  return api('POST', url, body);
}

export async function apiPatch(url, body) {
  return api('PATCH', url, body);
}

export async function fetchJSON(url) {
  const res = await apiGet(url);
  return res.json();
}
