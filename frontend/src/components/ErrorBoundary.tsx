import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', background: '#ffebee', minHeight: '100vh', wordWrap: 'break-word' }}>
          <h2>🚨 เกิดข้อผิดพลาดในแอปพลิเคชัน!</h2>
          <details style={{ whiteSpace: 'pre-wrap' }} open>
            <summary>คลิกเพื่อดูรายละเอียด Error (แคปหน้าจอนี้ให้ผมดูหน่อยครับ)</summary>
            <br />
            <strong>Message:</strong> {this.state.error?.toString()}
            <br /><br />
            <strong>Component Stack:</strong> {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
