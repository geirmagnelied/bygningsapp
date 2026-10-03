import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../shared/Modal'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

export default function EigedomForm({ eigedom, onClose, onSaved }) {
  const [address, setAddress] = useState(eigedom?.address ?? '')
  const [name, setName] = useState(eigedom && eigedom.name !== eigedom.address ? eigedom.name : '')
  const [gardsnr, setGardsnr] = useState(eigedom?.gardsnr ?? '')
  const [bruksnr, setBruksnr] = useState(eigedom?.bruksnr ?? '')
  const [seksjonsnr, setSeksjonsnr] = useState(eigedom?.seksjonsnr ?? '')
  const [purchaseDate, setPurchaseDate] = useState(eigedom?.purchase_date ?? '')
  const [description, setDescription] = useState(eigedom?.description ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const payload = {
      address: address.trim(),
      name: name.trim() || address.trim(),
      gardsnr: gardsnr.trim() || null,
      bruksnr: bruksnr.trim() || null,
      seksjonsnr: seksjonsnr.trim() || null,
      purchase_date: purchaseDate || null,
      description: description.trim() || null,
    }

    const query = eigedom
      ? supabase.from('bg_projects').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', eigedom.id)
      : supabase.from('bg_projects').insert(payload)

    const { error } = await query
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved?.()
    onClose()
  }

  return (
    <Modal title={eigedom ? 'Rediger eigedom' : 'Ny eigedom'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="address">
            Adresse
          </label>
          <input id="address" required value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="name">
            Kallenamn (valfritt)
          </label>
          <input
            id="name"
            placeholder="Viss tomt, vert adressa brukt"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="gardsnr">
              Gardsnr
            </label>
            <input id="gardsnr" value={gardsnr} onChange={(e) => setGardsnr(e.target.value)} className={inputClass} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="bruksnr">
              Bruksnr
            </label>
            <input id="bruksnr" value={bruksnr} onChange={(e) => setBruksnr(e.target.value)} className={inputClass} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="seksjonsnr">
              Seksjonsnr
            </label>
            <input
              id="seksjonsnr"
              value={seksjonsnr}
              onChange={(e) => setSeksjonsnr(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="purchaseDate">
            Kjøpsdato
          </label>
          <input
            id="purchaseDate"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="description">
            Beskriving av eigedomen
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-status-open">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-brand-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? 'Lagrar …' : eigedom ? 'Lagre endringar' : 'Opprett eigedom'}
        </button>
      </form>
    </Modal>
  )
}
