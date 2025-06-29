/**
 * Preloader functionality for GEOCUBA Portal
 * Shows a loading animation immediately and hides when content is loaded
 */

(function() {
    // Create and show preloader as early as possible
    let preloaderContainer;
    
    // Function to make the document visible once preloader is in place
    const showDocument = () => {
        document.documentElement.style.visibility = 'visible';
    };
    
    // Create and insert the preloader
    const createPreloader = () => {
        const container = document.createElement('div');
        container.className = 'preloader-container';
        container.innerHTML = `
            <div class="sk-folding-cube">
                <div class="sk-cube1 sk-cube"></div>
                <div class="sk-cube2 sk-cube"></div>
                <div class="sk-cube4 sk-cube"></div>
                <div class="sk-cube3 sk-cube"></div>
            </div>
        `;
        
        document.body.appendChild(container);
        showDocument();
        return container;
    };
    
    // Create preloader as soon as body is available
    if (document.body) {
        preloaderContainer = createPreloader();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            preloaderContainer = createPreloader();
        }, {once: true});
    }
    
    // Function to hide preloader with fade effect
    const hidePreloader = () => {
        if (!preloaderContainer) return;
        
        preloaderContainer.style.opacity = '0';
        setTimeout(() => {
            if (preloaderContainer && preloaderContainer.parentNode) {
                preloaderContainer.parentNode.removeChild(preloaderContainer);
                preloaderContainer = null;
            }
        }, 500);
    };
    
    // Set maximum timeout (10 seconds)
    const maxTimeout = setTimeout(hidePreloader, 10000);
    
    // Hide preloader when page is fully loaded
    window.addEventListener('load', () => {
        clearTimeout(maxTimeout);
        // Small delay to ensure page renders properly
        setTimeout(hidePreloader, 200);
    });

})();
