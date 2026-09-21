import { supabase } from './supabase'

const BUCKET = 'bygningsapp-files'

export async function uploadImage(file, folder) {
  if (!file) return null
  const ext = file.name.split('.').pop()
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
