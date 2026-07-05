import React, { useState } from 'react';
import { api } from '../api.js';

export default function Login({ mode, onAuthed }) {
  const isRegister = mode === 'register';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || password.length < 4) {
      setError('Vul een gebruikersnaam en wachtwoord (min. 4 tekens) in');
      return;
    }
    if (isRegister && password !== password2) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }
    setBusy(true);
    try {
      const user = isRegister
        ? await api.register(username.trim(), password)
        : await api.login(username.trim(), password);
      onAuthed(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="brand"><span className="z">◤</span> Trade<span className="z">zilla</span></div>
        <h2>{isRegister ? 'Maak je account aan' : 'Inloggen'}</h2>
        {isRegister && <p className="hint">Eerste keer? Maak hier je persoonlijke login aan.</p>}
        <div className="field">
          <label>Gebruikersnaam</label>
          <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label>Wachtwoord</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {isRegister && (
          <div className="field">
            <label>Bevestig wachtwoord</label>
            <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </div>
        )}
        {error && <div className="login-error">{error}</div>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Bezig…' : isRegister ? 'Account aanmaken' : 'Inloggen'}
        </button>
      </form>
    </div>
  );
}
