// Top-level App component — wraps the React Router provider in a defensive error
// boundary. Typed PersistenceError values are rendered by ErrorBanner inside
// FlowgridHome (they arrive via the Zustand store, not as thrown errors); the
// boundary here is defense-in-depth for unexpected runtime errors only.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RouterProvider } from 'react-router';

import { router } from './routes.js';

interface BoundaryState {
  readonly hasError: boolean;
  readonly message: string;
}

class RootErrorBoundary extends Component<{ readonly children: ReactNode }, BoundaryState> {
  override state: BoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Flowgrid root error boundary:', error, info);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div role="alert">
          Flowgrid encountered an unexpected error: {this.state.message}. Reload to retry.
        </div>
      );
    }
    return this.props.children;
  }
}

export function App(): ReactNode {
  return (
    <RootErrorBoundary>
      <RouterProvider router={router} />
    </RootErrorBoundary>
  );
}
