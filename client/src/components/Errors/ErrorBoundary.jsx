import React from "react";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error caught by boundary:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-4">Something went wrong.</h1>
                        <h2 className="text-2xl font-bold mb-4"><strong>Sorry about that.</strong> Please try refreshing the page, or contact me if the problem persists.</h2>
                        <a className="text-amber-100" href="https://aidenpaleczny.com">Contact</a>
                        <p className="text-sm text-gray-300 m-5">
                            {"Error message: "}
                            {this.state.error?.message || "Unknown error"}
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}