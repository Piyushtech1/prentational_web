import { useEffect, useState } from 'react';
import pageMarkup from './content.json';

const pageList = [
  ['home', 'Home'],
  ['about', 'About Us'],
  ['product', 'Product'],
  ['team', 'Our Team'],
  ['contact', 'Contact Us'],
];

function currentRoute() {
  const route = window.location.hash.slice(1);
  return pageList.some(([id]) => id === route) ? route : 'home';
}

export default function App() {
  const [page, setPage] = useState(currentRoute);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formState, setFormState] = useState({ loading: false, message: '', kind: '' });
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem('northline-theme');
    return saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('northline-theme', theme);
  }, [theme]);

  useEffect(() => {
    const changeRoute = () => {
      setPage(currentRoute());
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', changeRoute);
    document.title = `${pageList.find(([id]) => id === page)?.[1] || 'Home'} — Northline`;
    return () => window.removeEventListener('hashchange', changeRoute);
  }, [page]);

  useEffect(() => {
    const form = document.querySelector('#contact-form');
    if (!form) return;
    const inputs = [...form.querySelectorAll('input, textarea')];
    const validate = (field) => {
      const error = field.parentElement.querySelector('.field-error');
      const value = field.value.trim();
      let message = '';
      if (field.required && !value) message = 'This field is required.';
      else if (field.name === 'fullName' && value.length < 2) message = 'Please enter your full name.';
      else if (field.name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = 'Enter a valid email address.';
      else if (field.name === 'subject' && value.length < 2) message = 'Please add a subject.';
      else if (field.name === 'message' && value.length < 10) message = 'Please write at least 10 characters.';
      field.setAttribute('aria-invalid', String(Boolean(message)));
      error.textContent = message;
      return !message;
    };
    const onBlur = (event) => validate(event.target);
    const onInput = (event) => { if (event.target.hasAttribute('aria-invalid')) validate(event.target); };
    const onSubmit = async (event) => {
      event.preventDefault();
      setFormState({ loading: false, message: '', kind: '' });
      if (!inputs.map(validate).every(Boolean)) {
        setFormState({ loading: false, message: 'Please check the highlighted fields and try again.', kind: 'error' });
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      setFormState({ loading: true, message: 'Sending your message…', kind: '' });
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'We couldn’t send your message right now. Please try again shortly.');
        form.reset();
        inputs.forEach((field) => field.removeAttribute('aria-invalid'));
        form.querySelectorAll('.field-error').forEach((error) => { error.textContent = ''; });
        setFormState({ loading: false, message: 'Thanks for reaching out. Your message has been sent, and our team will be in touch.', kind: 'success' });
      } catch (error) {
        setFormState({ loading: false, message: error instanceof TypeError ? 'We couldn’t reach our server. Please check your connection and try again.' : error.message, kind: 'error' });
      }
    };
    inputs.forEach((field) => { field.addEventListener('blur', onBlur); field.addEventListener('input', onInput); });
    form.addEventListener('submit', onSubmit);
    return () => {
      inputs.forEach((field) => { field.removeEventListener('blur', onBlur); field.removeEventListener('input', onInput); });
      form.removeEventListener('submit', onSubmit);
    };
  }, [page]);

  useEffect(() => {
    const status = document.querySelector('#contact-form .form-status');
    if (!status) return;
    status.textContent = formState.message;
    status.className = `form-status ${formState.kind}`;
    const button = status.closest('form')?.querySelector('button[type="submit"]');
    const label = button?.querySelector('.button-label');
    if (button) {
      button.disabled = formState.loading;
      button.setAttribute('aria-busy', String(formState.loading));
    }
    if (label) label.textContent = formState.loading ? 'Sending your note…' : 'Send your message';
  }, [formState, page]);

  const navigate = (route) => {
    if (route === page) { setMenuOpen(false); return; }
    window.location.hash = route;
  };

  return <>
    <header className="site-header glass-panel">
      <a className="brand" href="#home" aria-label="Northline home"><span className="brand-mark">N</span><span>NORTHLINE</span></a>
      <button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span></span><span></span></button>
      <nav className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
        {pageList.map(([id, label]) => <a key={id} href={`#${id}`} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate(id); }}>{label}</a>)}
      </nav>
      <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span></button>
      <a className="header-contact" href="#contact" onClick={(event) => { event.preventDefault(); navigate('contact'); }}>Let’s talk <span>↗</span></a>
    </header>
    <main>
      <section id={page} className="page active" key={page}>
        <div dangerouslySetInnerHTML={{ __html: pageMarkup[page] }} />
      </section>
    </main>
    <footer className="site-footer"><div className="footer-main"><div><a className="brand footer-brand" href="#home"><span className="brand-mark">N</span><span>NORTHLINE</span></a><p>Light for the long way round.</p></div><div className="footer-links"><span className="eyebrow light">EXPLORE</span>{pageList.slice(1).map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</div><div className="footer-note"><span className="eyebrow light">A NOTE FROM NORTHLINE</span><p>Make a little room<br />for the outside.</p><a href="#contact">We’d love to hear from you ↗</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} NORTHLINE. MADE FOR OUTSIDE.</span><span>DESIGNED WITH THE EVENING IN MIND</span></div></footer>
  </>;
}
