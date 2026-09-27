import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {CreateMarkerPlace} from './create-marker-place';

afterEach(() => vi.unstubAllGlobals());
function fill() {
  fireEvent.click(screen.getByRole('button', {name: 'Добавить место'}));
  for (const [label, value] of [['Название', 'Test church'], ['Широта', '50'], ['Долгота', '30'], ['Описание / история', 'Test history'], ['Источник сведений и координат', 'https://example.org/church']]) {
    fireEvent.change(screen.getByLabelText(label), {target: {value}});
  }
}
it('creates a geolocated place and opens its image editor using the returned ID', async () => {
  const fetcher = vi.fn().mockResolvedValue({ok: true, json: async () => ({placeId: 'returned-id'})});
  vi.stubGlobal('fetch', fetcher);
  const onCreated = vi.fn();
  render(<CreateMarkerPlace onCreated={onCreated}/>);
  fill();
  fireEvent.click(screen.getByRole('button', {name: 'Добавить на глобус'}));
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith('returned-id'));
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({kind: 'create-place', place: {title: 'Test church', lat: 50, lon: 30, type: 'church'}});
});
it('retains the request identity after failure and reports the error', async () => {
  const fetcher = vi.fn().mockResolvedValue({ok: false, json: async () => ({message: 'Unavailable'})});
  vi.stubGlobal('fetch', fetcher);
  const onCreated = vi.fn();
  render(<CreateMarkerPlace onCreated={onCreated}/>);
  fill();
  fireEvent.click(screen.getByRole('button', {name: 'Добавить на глобус'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable');
  fireEvent.click(screen.getByRole('button', {name: 'Добавить на глобус'}));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(JSON.parse(fetcher.mock.calls[0][1].body).place.requestId).toBe(JSON.parse(fetcher.mock.calls[1][1].body).place.requestId);
  expect(onCreated).not.toHaveBeenCalled();
});
