'use client';
import {useRef, useState} from 'react';
import {MapPin, Plus, X} from 'lucide-react';
import {Button} from '@/components/ui/button';

export function CreateMarkerPlace({onCreated}: {onCreated: (id: string) => void}) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const requestId = useRef<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    requestId.current ??= crypto.randomUUID();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/bff/marker-targets', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({kind: 'create-place', place: {
          requestId: requestId.current, title: data.get('title'), type: data.get('type'), locale: data.get('locale'),
          lat: Number(data.get('lat')), lon: Number(data.get('lon')), history: data.get('history'),
          address: data.get('address'), source: data.get('source'),
        }}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details ?? result.message ?? 'Не удалось создать место');
      onCreated(result.placeId); requestId.current = null; setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка сохранения'); }
    finally { setBusy(false); }
  }
  if (!open) return <Button type="button" onClick={() => setOpen(true)}><Plus/>Добавить место</Button>;
  return <form onSubmit={submit} className="max-w-3xl space-y-4 border-b pb-6">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Новое место на глобусе</h2><Button type="button" variant="ghost" size="icon" aria-label="Закрыть" disabled={busy} onClick={() => setOpen(false)}><X/></Button></div>
    <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2">Название<input name="title" required maxLength={200} className="block w-full rounded border p-2"/></label>
      <label>Тип<select name="type" className="block w-full rounded border p-2" defaultValue="church">
        <option value="city">Город</option><option value="village">Село</option><option value="church">Церковь / храм / собор</option><option value="monastery">Монастырь</option><option value="shrine">Святыня</option><option value="pilgrimage_place">Место паломничества</option><option value="other">Другое место</option>
      </select></label>
      <label>Язык<select name="locale" className="block w-full rounded border p-2"><option value="uk">Українська</option><option value="ru">Русский</option><option value="en">English</option></select></label>
      <label>Широта<input name="lat" type="number" step="any" min={-90} max={90} required className="block w-full rounded border p-2"/></label>
      <label>Долгота<input name="lon" type="number" step="any" min={-180} max={180} required className="block w-full rounded border p-2"/></label>
      <label className="sm:col-span-2">Адрес<input name="address" maxLength={500} className="block w-full rounded border p-2"/></label>
      <label className="sm:col-span-2">Описание / история<textarea name="history" required maxLength={20000} rows={5} className="block w-full rounded border p-2"/></label>
      <label className="sm:col-span-2">Источник сведений и координат<input name="source" type="url" required maxLength={2000} className="block w-full rounded border p-2"/></label>
    </fieldset>
    {error ? <p role="alert" className="text-destructive">{error}</p> : null}
    <Button type="submit" disabled={busy}><MapPin/>{busy ? 'Сохранение…' : 'Добавить на глобус'}</Button>
  </form>;
}
