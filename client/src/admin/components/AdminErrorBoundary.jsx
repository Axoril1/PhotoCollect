import React from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

export class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[AdminErrorBoundary] Isolated Admin UI exception:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-slate-900/80 border border-rose-500/20 rounded-2xl shadow-2xl">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
            <AlertOctagon className="w-10 h-10" />
          </div>
          <h2 className="font-display text-xl font-bold text-white mb-2">
            An Unexpected UI Error Occurred
          </h2>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            The Admin Application encountered an isolated component error.
          </p>
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Application</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
