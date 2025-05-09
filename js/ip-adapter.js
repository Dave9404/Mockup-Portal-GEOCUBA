/**
 * IP Adapter Script
 * This script helps the website work correctly when accessed via IP address
 * by providing essential API functions and fixing URL protocols
 */

(function() {
    console.log("IP-Adapter: Initializing...");
    
    // Force these functions to be globally available
    window.getApiUrl = function(endpoint) {
        // Get current page host (hostname:port)
        const host = window.location.host;
        // Always use HTTP protocol for API URLs
        return `http://${host}/api/${endpoint}`;
    };
    
    window.getRelativeApiUrl = function(endpoint) {
        return `/api/${endpoint}`;
    };
    
    // Fix URLs in-place when accessing via IP address
    function fixUrlProtocols() {
        const hostname = window.location.hostname;
        // Only apply fixes if we're accessing via IP address
        if (hostname !== 'localhost' && /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
            console.log("IP-Adapter: Fixing URL protocols for IP address access");
            
            // Intercept and fix all XMLHttpRequest calls
            const originalXhrOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                // If it's an absolute URL to our own domain but using HTTPS, fix it
                if (typeof url === 'string' && url.startsWith('https://' + hostname)) {
                    url = url.replace('https://', 'http://');
                    console.log("IP-Adapter: Fixed XMLHttpRequest URL to:", url);
                }
                return originalXhrOpen.call(this, method, url, async, user, password);
            };
            
            // Intercept and fix all fetch calls
            const originalFetch = window.fetch;
            window.fetch = function(resource, init) {
                if (typeof resource === 'string' && resource.startsWith('https://' + hostname)) {
                    resource = resource.replace('https://', 'http://');
                    console.log("IP-Adapter: Fixed fetch URL to:", resource);
                }
                return originalFetch.call(this, resource, init);
            };
            
            // Fix all relative links using MutationObserver to catch dynamic changes
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        // Fix all link elements in new nodes
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === 1) { // Element node
                                // Fix links in the added node
                                fixNodeLinks(node);
                            }
                        });
                    }
                });
            });
            
            // Start observing the document for dynamic changes
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
            
            // Fix links in the current document
            fixNodeLinks(document.documentElement);
        }
    }
    
    // Helper function to fix links within a node
    function fixNodeLinks(node) {
        // Fix links
        const links = node.querySelectorAll('link[href^="https://"]');
        links.forEach(function(link) {
            link.href = link.href.replace('https://', 'http://');
        });
        
        // Fix scripts
        const scripts = node.querySelectorAll('script[src^="https://"]');
        scripts.forEach(function(script) {
            script.src = script.src.replace('https://', 'http://');
        });
        
        // Fix images
        const images = node.querySelectorAll('img[src^="https://"]');
        images.forEach(function(img) {
            img.src = img.src.replace('https://', 'http://');
        });
    }
    
    // Run immediately and again after DOM is loaded
    fixUrlProtocols();
    document.addEventListener('DOMContentLoaded', fixUrlProtocols);
    
    console.log("IP-Adapter: Initialization complete");
})();
