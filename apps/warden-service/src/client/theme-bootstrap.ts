// Vite compiles this into a synchronous head script so saved themes apply before paint.
{
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  try {
    const saved = localStorage.getItem('warden.theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {
    /* Use system appearance when browser storage is unavailable. */
  }
  document.documentElement.dataset['theme'] = theme;
}
