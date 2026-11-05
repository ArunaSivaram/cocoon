import { Link } from 'react-router-dom';

export function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Home</h1>
      <p>Placeholder — &ldquo;Today&apos;s page&rdquo; is built in step 7 (SPEC §2.2).</p>
      <nav style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link to="/signin">/signin</Link>
        <Link to="/entry/example">/entry/example</Link>
        <Link to="/calendar">/calendar</Link>
        <Link to="/memories">/memories</Link>
      </nav>
    </main>
  );
}
