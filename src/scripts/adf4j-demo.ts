import { loadAdf4j } from '@nthings.dev/adf4j-wasm';
import { renderMarkdownPreview } from '../lib/markdown-preview';

interface ConfluenceAdfResponse {
  title: string;
  adfJson: string;
}

interface ApiError {
  error: string;
}

type ConvertResult = ReturnType<
  Awaited<ReturnType<typeof loadAdf4j>>['convertJson']
>;

let converterPromise: ReturnType<typeof loadAdf4j> | undefined;

function loadConverter() {
  converterPromise ??= loadAdf4j();
  return converterPromise;
}

function initAdf4jDemo() {
  const root = document.querySelector<HTMLElement>('[data-adf4j-root]');
  if (!root?.querySelector('[data-adf4j-form]')) {
    return;
  }
  if (root.dataset.adf4jInit === 'true') {
    return;
  }
  root.dataset.adf4jInit = 'true';

  const form = root.querySelector<HTMLFormElement>('[data-adf4j-form]')!;
  const dialog = root.querySelector<HTMLDialogElement>('[data-adf4j-dialog]')!;
  const urlInput = form.querySelector<HTMLInputElement>('[name="url"]')!;
  const submitButton = form.querySelector<HTMLButtonElement>('[data-adf4j-submit]')!;
  const errorEl = root.querySelector<HTMLElement>('[data-adf4j-error]')!;
  const statusEl = root.querySelector<HTMLElement>('[data-adf4j-status]')!;
  const progressEl = root.querySelector<HTMLElement>('[data-adf4j-progress]')!;
  const titleEl = root.querySelector<HTMLElement>('[data-adf4j-dialog-title]')!;
  const diagnosticsEl = root.querySelector<HTMLElement>('[data-adf4j-diagnostics]')!;
  const previewPanel = root.querySelector<HTMLElement>('[data-adf4j-panel="preview"]')!;
  const markdownPanel = root.querySelector<HTMLElement>('[data-adf4j-panel="markdown"]')!;
  const rawCode = root.querySelector<HTMLElement>('[data-adf4j-raw]')!;
  const previewTab = root.querySelector<HTMLButtonElement>('[data-adf4j-view="preview"]')!;
  const markdownTab = root.querySelector<HTMLButtonElement>('[data-adf4j-view="markdown"]')!;

  const setError = (message: string) => {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  };

  const setStatus = (message: string) => {
    statusEl.textContent = message;
    progressEl.hidden = !message;
  };

  const setBusy = (busy: boolean) => {
    submitButton.disabled = busy;
    submitButton.setAttribute('aria-busy', String(busy));
    urlInput.disabled = busy;
  };

  const setView = (view: 'preview' | 'markdown') => {
    previewPanel.hidden = view !== 'preview';
    markdownPanel.hidden = view !== 'markdown';
    previewTab.setAttribute('aria-selected', String(view === 'preview'));
    markdownTab.setAttribute('aria-selected', String(view === 'markdown'));
  };

  const renderDiagnostics = (result: ConvertResult) => {
    if (!result.ok) {
      diagnosticsEl.hidden = false;
      diagnosticsEl.className =
        'adf4j-dialog__diagnostics adf4j-dialog__diagnostics--error';
      diagnosticsEl.textContent = result.error ?? 'Conversion failed.';
      return;
    }

    const warnings = result.warnings ?? 0;
    const errors = result.errors ?? 0;
    const lossy = result.lossy ?? false;

    if (!lossy && warnings === 0 && errors === 0) {
      diagnosticsEl.hidden = true;
      diagnosticsEl.textContent = '';
      return;
    }

    diagnosticsEl.hidden = false;
    const base = 'adf4j-dialog__diagnostics';
    diagnosticsEl.className =
      errors > 0
        ? `${base} ${base}--error`
        : warnings > 0 || lossy
          ? `${base} ${base}--warn`
          : base;
    diagnosticsEl.textContent = [
      lossy ? 'lossy' : 'lossless',
      `warnings=${warnings}`,
      `errors=${errors}`,
    ].join(' · ');
  };

  const openDialog = (title: string, markdown: string, result: ConvertResult) => {
    titleEl.textContent = title;
    rawCode.textContent = markdown;
    previewPanel.innerHTML = renderMarkdownPreview(markdown);
    renderDiagnostics(result);
    setView('preview');
    dialog.showModal();
  };

  const fetchAdf = async (pageUrl: string) => {
    const response = await fetch(
      `/api/confluence-adf.json?url=${encodeURIComponent(pageUrl)}`,
    );
    const payload = (await response.json()) as ConfluenceAdfResponse | ApiError;
    if (!response.ok) {
      throw new Error(
        'error' in payload ? payload.error : 'Failed to fetch page content.',
      );
    }
    return payload as ConfluenceAdfResponse;
  };

  const handleSubmit = async (pageUrl: string) => {
    setError('');
    setBusy(true);
    setStatus('Fetching page from Confluence…');

    try {
      const { title, adfJson } = await fetchAdf(pageUrl);
      setStatus('Loading WASM converter…');
      const adf4j = await loadConverter();
      setStatus('Converting ADF to Markdown…');
      const result = adf4j.convertJson(adfJson);

      if (!result.ok) {
        setError(result.error ?? 'Conversion failed.');
        setStatus('');
        return;
      }

      openDialog(title, result.body ?? '', result);
      setStatus('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = urlInput.value.trim();
    if (!value) {
      setError('Enter a Confluence Cloud page URL.');
      return;
    }
    void handleSubmit(value);
  });

  root.querySelector('[data-adf4j-close]')?.addEventListener('click', () => {
    dialog.close();
  });

  root.querySelector('[data-adf4j-toolbar]')?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-adf4j-view]',
    );
    if (!button) {
      return;
    }
    setView(button.dataset.adf4jView === 'markdown' ? 'markdown' : 'preview');
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      void loadConverter();
    });
  } else {
    setTimeout(() => {
      void loadConverter();
    }, 1500);
  }
}

document.addEventListener('astro:page-load', initAdf4jDemo);
initAdf4jDemo();
