// Used to test error boundary. Import this and add to the html returned as <Bug /> to use

export default function Bug() {
    throw new Error("Test error from BuggyComponent!");
    return <div>This will never render</div>;
}