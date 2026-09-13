import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, it, expect, vi } from 'vitest';
import { AlphabetLetterFormComponent } from './alphabet-letter-form';
import type { AlphabetLetter } from '@/types/entities';
const mocks = vi.hoisted(() => ({ request: vi.fn(), dirty: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/feedback/unsaved-changes-context', () => ({ useUnsavedChanges: () => ({ setDirty: mocks.dirty }) }));
vi.mock('@/features/ai-proposals/proposal-panel', () => ({ proposalRequest: mocks.request }));
vi.mock('@/lib/api', () => ({ apiClient: { alphabetLetters: { list: async () => ({ items: [] }) }, media: {} } }));
vi.mock('@/components/forms/media-upload-button', () => ({ MediaUploadButton: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('fills the actual fields and image; publishes only on the human button', async () => {
  const working = { letter: 'А', name: 'Азъ', sortOrder: 1, shortDescription: 'AI description', fullText: 'AI history', mainImageUrl: 'media/alphabet/az/main/photo.png', seoTitle: 'AI SEO', seoDescription: 'SEO description', numericValue: 1 };
  mocks.request.mockImplementation(async (_path, body) => body ? { current: working } : { working, current: {}, version: 'reviewed-version', hasChanges: true });
  const onSubmit = vi.fn();
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
    <AlphabetLetterFormComponent mode="edit" letter={{ id:'az',slug:'az',language:'uk',name:'Old',letter:'А',order:1 } as AlphabetLetter} onSubmit={onSubmit}/>
  </QueryClientProvider>);
  expect(await screen.findByDisplayValue('AI history')).toBeInTheDocument();
  expect(screen.getByRole('img', {name:'Попередній перегляд'})).toHaveAttribute('src','https://svetikony.com/media/alphabet/az/main/photo.png');
  expect(mocks.request.mock.calls.every(c => c[1] === undefined)).toBe(true);
  fireEvent.change(screen.getByDisplayValue('AI history'), {target:{value:'Human reviewed text'}});
  fireEvent.click(screen.getByRole('button',{name:'Опублікувати'}));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith('/editor/alphabet/az', expect.objectContaining({ version:'reviewed-version',confirmation:'PUBLISH az',patch:expect.objectContaining({fullText:'Human reviewed text',mainImageUrl:working.mainImageUrl}) })));
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.queryByText('CURRENT')).not.toBeInTheDocument();
});
