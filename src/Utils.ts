export function sleep(milliseconds: number) {
    return new Promise(r => setTimeout(r, milliseconds));
};

// A util function to escape a string that might contain HTML, such that the
// escaped string can be safely displayed in vscode webview without interfering the HTML web UI.
export function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}