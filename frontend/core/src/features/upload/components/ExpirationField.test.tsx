import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpirationField from './ExpirationField';
import { DEFAULT_EXPIRATION_HOURS, EXPIRATION_STEPS, hoursUntil, toDateTimeLocalValue } from '../lib/sendLimits';

const NOW = new Date(2026, 10, 17, 14, 45, 0);
const HOUR = 60 * 60 * 1000;

function Harness({ onChange }: { onChange: (h: number) => void }) {
  const [hours, setHours] = useState(DEFAULT_EXPIRATION_HOURS);
  return (
    <>
      <ExpirationField value={hours} onChange={(h) => { setHours(h); onChange(h); }} />
      <output data-testid="hours">{hours}</output>
    </>
  );
}

const slider = () => screen.getByRole('slider');
const deadlineButton = () => screen.getByRole('button', { name: /expirationDateTime/ });

describe('ExpirationField', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('defaults to the 1 day step', () => {
    render(<Harness onChange={vi.fn()} />);
    expect(slider()).toHaveValue('3');
    expect(slider()).toHaveAttribute('aria-valuetext', 'upload.form.expirationSteps.24.long');
    expect(screen.getByText('upload.form.expirationSteps.24.long')).toBeInTheDocument();
    expect(screen.getByTestId('hours')).toHaveTextContent('24');
  });

  it.each(EXPIRATION_STEPS.map((h, i) => [i, h]))('maps slider position %i to %i hours', (idx, hours) => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    // Start from a different position so every step triggers a change event.
    fireEvent.change(slider(), { target: { value: idx === 0 ? '5' : '0' } });
    fireEvent.change(slider(), { target: { value: String(idx) } });
    expect(onChange).toHaveBeenLastCalledWith(hours);
    expect(slider()).toHaveAttribute('aria-valuetext', `upload.form.expirationSteps.${hours}.long`);
  });

  it('jumps to a step when its tick label is clicked', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'upload.form.expirationSteps.72.long' }));
    expect(onChange).toHaveBeenLastCalledWith(72);
    expect(slider()).toHaveValue('4');
  });

  it('applies a custom date, rounding up to whole hours', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(deadlineButton());
    const dialog = screen.getByRole('dialog');
    expect(deadlineButton()).toHaveAttribute('aria-expanded', 'true');

    const input = screen.getByLabelText('upload.form.expirationCustomLabel');
    expect(input).toHaveAttribute('min', toDateTimeLocalValue(NOW));
    expect(input).toHaveAttribute('max', toDateTimeLocalValue(new Date(NOW.getTime() + 168 * HOUR)));

    // 30 h 15 min from now → 31 h
    const target = new Date(NOW.getTime() + 30 * HOUR + 15 * 60 * 1000);
    fireEvent.change(input, { target: { value: toDateTimeLocalValue(target) } });
    fireEvent.click(screen.getByRole('button', { name: 'common.apply' }));

    expect(onChange).toHaveBeenLastCalledWith(31);
    expect(dialog).not.toBeInTheDocument();
    expect(screen.getByText('upload.form.expirationCustom')).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-valuetext', 'upload.form.expirationCustom');

    // Moving the slider again goes back to step mode
    fireEvent.change(slider(), { target: { value: '1' } });
    expect(onChange).toHaveBeenLastCalledWith(6);
    expect(screen.queryByText('upload.form.expirationCustom')).not.toBeInTheDocument();
  });

  it('disables Apply for a date outside the allowed range', () => {
    render(<Harness onChange={vi.fn()} />);
    fireEvent.click(deadlineButton());
    const input = screen.getByLabelText('upload.form.expirationCustomLabel');
    fireEvent.change(input, { target: { value: toDateTimeLocalValue(new Date(NOW.getTime() + 8 * 24 * HOUR)) } });
    expect(screen.getByRole('button', { name: 'common.apply' })).toBeDisabled();
  });

  it('closes the popover on Escape and on Cancel without changing the value', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(deadlineButton());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(deadlineButton());
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('hoursUntil', () => {
  const now = NOW.getTime();
  it('rounds up partial hours', () => {
    expect(hoursUntil(new Date(now + 1), now)).toBe(1);
    expect(hoursUntil(new Date(now + 2 * HOUR), now)).toBe(2);
    expect(hoursUntil(new Date(now + 2 * HOUR + 1), now)).toBe(3);
  });
  it('clamps to [1, 168]', () => {
    expect(hoursUntil(new Date(now - HOUR), now)).toBe(1);
    expect(hoursUntil(new Date(now + 200 * HOUR), now)).toBe(168);
  });
});
