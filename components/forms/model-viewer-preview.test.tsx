import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModelViewerPreview } from './model-viewer-preview';
vi.mock('@google/model-viewer', () => ({}));
describe('model preview controls', () => {
  it('offers animation playback, clip selection and camera reset after load', () => {
    const { container } = render(<ModelViewerPreview src="/api/bff/visualizer-models/one/file" />);
    const element = container.querySelector('model-viewer')!;
    const play = vi.fn(); const pause = vi.fn();
    Object.assign(element, { availableAnimations: ['First', 'Second'], paused: true, loaded: true, play, pause, cameraOrbit: '0deg 75deg 100%' });
    act(() => element.dispatchEvent(new Event('load')));
    expect(screen.getByText(/Анімація виявлена/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Відтворити' })); expect(play).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText('Анімація'), { target: { value: 'Second' } });
    expect((element as unknown as { animationName: string }).animationName).toBe('Second');
    Object.assign(element, { cameraOrbit: '90deg 90deg 200%' });
    fireEvent.click(screen.getByRole('button', { name: 'Скинути камеру' }));
    expect((element as unknown as { cameraOrbit: string }).cameraOrbit).toBe('0deg 75deg 100%');
  });
  it('shows a recoverable error instead of an endless spinner', () => {
    const { container } = render(<ModelViewerPreview src="/api/bff/visualizer-models/missing/file" />);
    act(() => container.querySelector('model-viewer')!.dispatchEvent(new Event('error')));
    expect(screen.getByRole('alert')).toHaveTextContent('Не вдалося');
    fireEvent.click(screen.getByRole('button', { name: 'Спробувати ще раз' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
