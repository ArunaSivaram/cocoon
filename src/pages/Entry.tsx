import { useParams } from 'react-router-dom';

export function Entry() {
  const { id } = useParams<{ id: string }>();
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Entry</h1>
      <p>
        Placeholder — reading view is built in step 8 (SPEC §2.4). Route param:{' '}
        <code>{id}</code>
      </p>
    </main>
  );
}
