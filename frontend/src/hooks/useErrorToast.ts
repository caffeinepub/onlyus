import { useState, useCallback } from 'react';

interface ErrorToastState {
  message: string;
  visible: boolean;
}

let globalSetState: ((state: ErrorToastState) => void) | null = null;

export function useErrorToastProvider() {
  const [state, setState] = useState<ErrorToastState>({ message: '', visible: false });

  // Register the setter globally so showError can be called from anywhere
  globalSetState = setState;

  const hideError = useCallback(() => {
    setState({ message: '', visible: false });
  }, []);

  return { state, hideError };
}

export function showError(message: string) {
  if (globalSetState) {
    globalSetState({ message, visible: true });
  }
}

export function useErrorToast() {
  const showErrorLocal = useCallback((message: string) => {
    showError(message);
  }, []);

  return { showError: showErrorLocal };
}
