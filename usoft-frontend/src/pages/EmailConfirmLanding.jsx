import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function maskEmail(email = '') {
  const [name, domain] = String(email).split('@');
  if (!name || !domain) return email || '—';
  if (name.length <= 2) return `${name[0] || ''}***@${domain}`;
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

export default function EmailConfirmLanding() {
  const { search } = useLocation();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [confirmedEmail, setConfirmedEmail] = useState(null);

  useEffect(() => {
    const sp = new URLSearchParams(search);
    const token = sp.get('token') || '';
    if (!token) {
      setErr('Missing token');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`/api/auth/confirm/${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }

        setConfirmedEmail(maskEmail(data.email));
      } catch (e) {
        setErr(e?.message || 'Failed to confirm email');
      } finally {
        setLoading(false);
      }
    })();
  }, [search]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg-main)',
      color: 'var(--text)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-1)',
        padding: '32px',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '10px', color: 'var(--accent)' }}>Email Confirmation</h1>

        {loading && <p>Confirming your email…</p>}

        {!loading && err && (
          <>
            <p style={{ color: 'var(--danger-500)', fontWeight: 600 }}>
              Error: {String(err)}
            </p>
            <p style={{ color: 'var(--text-muted)' }}>
              The link may have already been used or has expired.
            </p>
          </>
        )}

        {!loading && !err && confirmedEmail && (
          <>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
              The email <strong style={{ color: 'var(--accent)' }}>{confirmedEmail}</strong> has been successfully verified!
            </p>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
              You can now log in to your account.
            </p>
            <a
              href="/login"
              style={{
                display: 'inline-block',
                marginTop: '20px',
                padding: '10px 20px',
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Go to login
            </a>
          </>
        )}
      </div>
    </div>
  );
}
