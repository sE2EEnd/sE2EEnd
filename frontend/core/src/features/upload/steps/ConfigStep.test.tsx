import { useEffect, useRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import ConfigStep from './ConfigStep';
import { useUploadForm } from '../hooks/useUploadForm';
import { toDateTimeLocalValue } from '../lib/sendLimits';
import { sendApi, configApi } from '@/services/api';
import type { FileMetadata, SendPolicy, SendResponse } from '@/services/api';

vi.mock('@/services/api', () => ({
  sendApi: {
    createSend: vi.fn(),
    uploadFile: vi.fn(),
  },
  configApi: {
    getSendPolicy: vi.fn(),
  },
}));

vi.mock('@/lib/crypto', () => ({
  generateKey: vi.fn().mockResolvedValue({}),
  exportKeyToBase64: vi.fn().mockResolvedValue('KEY'),
  encryptFile: vi.fn().mockResolvedValue(new Blob(['x'])),
  encryptText: vi.fn().mockResolvedValue('encrypted'),
  encryptChunk: vi.fn(),
}));

vi.mock('@/lib/sendKeysDB', () => ({
  storeSendKey: vi.fn().mockResolvedValue(undefined),
}));

const NOW = new Date(2026, 10, 17, 14, 45, 0);
const HOUR = 60 * 60 * 1000;

/** Formats a date the way useUploadForm builds `expiresAt` (local time, no zone). */
const localIso = (d: Date) => `${toDateTimeLocalValue(d)}:${String(d.getSeconds()).padStart(2, '0')}`;

function Harness() {
  const form = useUploadForm();
  const { setMode, setTextContent } = form;
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setMode('text');
    setTextContent('hello');
  }, [setMode, setTextContent]);

  return (
    <ConfigStep
      mode={form.mode}
      selectedFiles={form.selectedFiles}
      removeFile={form.removeFile}
      textContent={form.textContent}
      sendName={form.sendName}
      setSendName={form.setSendName}
      maxDownloads={form.maxDownloads}
      setMaxDownloads={form.setMaxDownloads}
      expirationHours={form.expirationHours}
      setExpirationHours={form.setExpirationHours}
      usePassword={form.usePassword}
      setUsePassword={form.setUsePassword}
      requireSendPassword={form.requireSendPassword}
      passwordRef={form.passwordRef}
      passwordHasValue={form.passwordHasValue}
      setPasswordHasValue={form.setPasswordHasValue}
      allowRecipientDestroy={form.allowRecipientDestroy}
      setAllowRecipientDestroy={form.setAllowRecipientDestroy}
      recipientDestroyAvailable={form.recipientDestroyAvailable}
      error={form.error}
      uploading={form.uploading}
      onBack={form.goBack}
      onUpload={form.handleUpload}
    />
  );
}

function renderForm() {
  const router = createMemoryRouter([{ path: '/', element: <Harness /> }]);
  return render(<RouterProvider router={router} />);
}

const submit = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'common.upload' }));
  await waitFor(() => expect(sendApi.createSend).toHaveBeenCalledOnce());
  return vi.mocked(sendApi.createSend).mock.calls[0][0];
};

describe('ConfigStep submit payload', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.mocked(configApi.getSendPolicy).mockResolvedValue({ requireSendPassword: false, maxUploadSizeBytes: 0 } as SendPolicy);
    vi.mocked(sendApi.createSend).mockResolvedValue({ id: 'send-1', accessId: 'access-1' } as SendResponse);
    vi.mocked(sendApi.uploadFile).mockResolvedValue({} as FileMetadata);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('sends the defaults: 5 downloads, expiring in 24 h', async () => {
    renderForm();
    const payload = await submit();
    expect(payload.maxDownloads).toBe(5);
    expect(payload.expiresAt).toBe(localIso(new Date(NOW.getTime() + 24 * HOUR)));
  });

  it('sends the selected slider step and download limit', async () => {
    renderForm();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: '10' }));
    fireEvent.click(screen.getByRole('button', { name: 'upload.form.increaseDownloads' }));

    const payload = await submit();
    expect(payload.maxDownloads).toBe(11);
    expect(payload.expiresAt).toBe(localIso(new Date(NOW.getTime() + 168 * HOUR)));
  });

  it('sends a custom date rounded up to whole hours', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /expirationDateTime/ }));
    fireEvent.change(screen.getByLabelText('upload.form.expirationCustomLabel'), {
      target: { value: toDateTimeLocalValue(new Date(NOW.getTime() + 30 * HOUR + 15 * 60 * 1000)) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.apply' }));

    const payload = await submit();
    expect(payload.expiresAt).toBe(localIso(new Date(NOW.getTime() + 31 * HOUR)));
  });
});

describe('ConfigStep file row', () => {
  it('labels the remove button through i18n', () => {
    const removeFile = vi.fn();
    render(
      <ConfigStep
        mode="file"
        selectedFiles={[new File(['x'], 'report.pdf')]}
        removeFile={removeFile}
        textContent=""
        sendName=""
        setSendName={vi.fn()}
        maxDownloads={5}
        setMaxDownloads={vi.fn()}
        expirationHours={24}
        setExpirationHours={vi.fn()}
        usePassword={false}
        setUsePassword={vi.fn()}
        requireSendPassword={false}
        passwordRef={{ current: null }}
        passwordHasValue={false}
        setPasswordHasValue={vi.fn()}
        allowRecipientDestroy={false}
        setAllowRecipientDestroy={vi.fn()}
        recipientDestroyAvailable={false}
        error=""
        uploading={false}
        onBack={vi.fn()}
        onUpload={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.remove' }));
    expect(removeFile).toHaveBeenCalledWith(0);
  });
});
