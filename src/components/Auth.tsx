import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    setLoading(false)

    if (error) alert(error.message)
    else alert('Compte créé ! Vérifie ton email 🚀')
  }

  const handleLogin = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    setLoading(false)

    if (error) alert(error.message)
    else alert('Connecté ✅')
  }

  return (
    <div className="flex flex-col gap-2 w-64 mx-auto mt-10">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 rounded"
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 rounded"
      />
      <button
        onClick={handleSignup}
        disabled={loading}
        className="bg-blue-500 text-white p-2 rounded"
      >
        S'inscrire
      </button>
      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-green-500 text-white p-2 rounded"
      >
        Se connecter
      </button>
    </div>
  )
}