import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured } from '../config/supabase'

export default function AdminConfig() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const storedUrl = localStorage.getItem('supabase_url') || ''
    const storedKey = localStorage.getItem('supabase_anon_key') || ''
    setUrl(storedUrl)
    setAnonKey(storedKey)
  }, [])

  const handleSave = () => {
    if (url && anonKey) {
      localStorage.setItem('supabase_url', url.trim())
      localStorage.setItem('supabase_anon_key', anonKey.trim())
      setSaved(true)
      setTimeout(() => {
        navigate('/teacher/dashboard')
      }, 1500)
    }
  }

  const handleTest = async () => {
    if (url && anonKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const testClient = createClient(url.trim(), anonKey.trim())
        const { error } = await testClient.from('sessions').select('count').limit(1)
        if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist" which is OK
          alert('Connection test failed: ' + error.message)
        } else {
          alert('Connection successful! Make sure to run the database.sql script in your Supabase SQL editor.')
        }
      } catch (err) {
        alert('Connection test failed: ' + err.message)
      }
    }
  }

  return (
    <div className="container container-sm">
      <div className="header">
        <div className="header-content">
          <h1>Math Learning Research Tool</h1>
        </div>
      </div>

      <div className="panel">
        <h2>Supabase Configuration</h2>
        <p className="text-muted">
          Configure your Supabase connection. You can find these values in your Supabase project settings.
        </p>

        {saved && (
          <div className="alert alert-success">
            Configuration saved! Redirecting to teacher login...
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Supabase URL</label>
          <input
            type="text"
            className="form-input"
            placeholder="https://your-project.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <div className="form-help">
            Found in: Project Settings → API → Project URL
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Supabase Anon Key</label>
          <textarea
            className="form-textarea"
            rows="3"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
          />
          <div className="form-help">
            Found in: Project Settings → API → anon/public key
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn" onClick={handleSave}>
            Save Configuration
          </button>
          <button className="btn btn-secondary" onClick={handleTest}>
            Test Connection
          </button>
        </div>

        <div className="mt-3">
          <h3>Database Setup</h3>
          <p className="text-muted">
            After configuring Supabase, run the SQL script from{' '}
            <code>src/config/database.sql</code> in your Supabase SQL editor to create the required tables.
          </p>
        </div>
      </div>
    </div>
  )
}
