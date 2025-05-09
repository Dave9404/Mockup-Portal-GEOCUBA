// Configuration script for GEOCUBA Portal
// This script uses configuration values injected by the server

// Make sure we expose these functions globally
(function(window) {
    // Determine the current protocol (http: or https:)
    const currentProtocol = window.location.protocol;
    const currentHostname = window.location.hostname || 'localhost';
    const currentPort = window.location.port || '8030';

    // Use server-injected configuration or fallback to defaults
    window.API_CONFIG = window.SERVER_CONFIG || {
        server: currentHostname,
        port: currentPort,
        apiUrl: `http://${currentHostname}:${currentPort}/api`
    };

    // Function to get the API URL for a specific endpoint - GLOBAL SCOPE
    window.getApiUrl = function(endpoint) {
        return `${window.API_CONFIG.apiUrl}/${endpoint}`;
    };

    // For relative URLs that work regardless of server configuration - GLOBAL SCOPE
    window.getRelativeApiUrl = function(endpoint) {
        return `/api/${endpoint}`;
    };
})(window);
