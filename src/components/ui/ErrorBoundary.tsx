import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — captura erros de renderização em qualquer subárvore
 * e exibe uma UI de fallback com botão "Tentar de novo".
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex h-full items-center justify-center bg-paper p-6 dark:bg-paper-dark">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-soft dark:border-red-500/30 dark:bg-ink-900/40">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="mb-1 text-[15px] font-semibold text-ink-900 dark:text-white">
            Algo deu errado
          </h2>
          <p className="mb-3 text-[12.5px] text-ink-500 dark:text-ink-400">
            A página encontrou um erro inesperado. Tente recarregar.
          </p>
          {this.state.error && (
            <pre className="mb-3 max-h-32 overflow-auto rounded-lg bg-ink-50 p-2 text-left text-[10.5px] font-mono text-ink-600 dark:bg-ink-800/60 dark:text-ink-300">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2 text-[12.5px] font-medium text-white hover:bg-ink-800 active:scale-95 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Tentar de novo
          </button>
        </div>
      </div>
    );
  }
}