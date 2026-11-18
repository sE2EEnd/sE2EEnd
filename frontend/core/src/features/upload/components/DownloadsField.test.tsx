import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DownloadsField from './DownloadsField';
import { DEFAULT_MAX_DOWNLOADS, MAX_DOWNLOADS } from '../lib/sendLimits';

function Harness({ initial = DEFAULT_MAX_DOWNLOADS, onChange = vi.fn() }: { initial?: number; onChange?: (n: number) => void }) {
  const [value, setValue] = useState(initial);
  return <DownloadsField value={value} onChange={(n) => { setValue(n); onChange(n); }} />;
}

const field = () => screen.getByLabelText('upload.form.maxDownloads');
const minus = () => screen.getByRole('button', { name: 'upload.form.decreaseDownloads' });
const plus = () => screen.getByRole('button', { name: 'upload.form.increaseDownloads' });
const chip = (n: number) => screen.getByRole('button', { name: String(n) });

describe('DownloadsField', () => {
  it('defaults to 5 with the matching quick pick pressed', () => {
    render(<Harness />);
    expect(field()).toHaveValue('5');
    expect(chip(5)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(1)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('upload.form.maxDownloadsHelpMany')).toBeInTheDocument();
  });

  it('increments and decrements with the stepper buttons', () => {
    render(<Harness />);
    fireEvent.click(plus());
    expect(field()).toHaveValue('6');
    fireEvent.click(minus());
    fireEvent.click(minus());
    expect(field()).toHaveValue('4');
  });

  it('does not go below 1', () => {
    const onChange = vi.fn();
    render(<Harness initial={1} onChange={onChange} />);
    expect(minus()).toBeDisabled();
    fireEvent.click(minus());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('upload.form.maxDownloadsHelpOnce')).toBeInTheDocument();
  });

  it(`does not go above ${MAX_DOWNLOADS}`, () => {
    render(<Harness initial={MAX_DOWNLOADS} />);
    expect(plus()).toBeDisabled();
    expect(minus()).toBeEnabled();
  });

  it('clamps typed values into range', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.focus(field());

    fireEvent.change(field(), { target: { value: '999' } });
    expect(onChange).toHaveBeenLastCalledWith(MAX_DOWNLOADS);

    fireEvent.change(field(), { target: { value: '0' } });
    expect(onChange).toHaveBeenLastCalledWith(1);

    fireEvent.change(field(), { target: { value: '12' } });
    expect(onChange).toHaveBeenLastCalledWith(12);

    fireEvent.blur(field());
    expect(field()).toHaveValue('12');
  });

  it('ignores non-numeric input', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: 'abc' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(field());
    expect(field()).toHaveValue('5');
  });

  it('selects a quick pick', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(chip(10));
    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(chip(10)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(5)).toHaveAttribute('aria-pressed', 'false');
  });
});
