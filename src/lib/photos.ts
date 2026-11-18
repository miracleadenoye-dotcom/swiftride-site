import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/** Private bucket: photos need a short-lived signed URL. Files live under <user_id>/. */
export async function uploadPhoto(uid: string, file: File, name: string) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB')
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${uid}/${name}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return path
}

export function useSignedUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!path) { setUrl(null); return }
    supabase.storage.from('photos').createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null))
  }, [path])
  return url
}
