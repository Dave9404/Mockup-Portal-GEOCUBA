/**
 * Text Utility Functions for GEOCUBA Portal
 * 
 * This file contains utility functions for text formatting and styling
 * that can be used across all pages of the GEOCUBA Portal.
 */

/**
 * Formats text content with smart text justification
 * - Splits text into paragraphs by double line breaks
 * - Applies text-align: justify only to paragraphs longer than 100 characters
 * - Returns HTML with properly formatted paragraphs
 * 
 * @param {string} text - The text content to format
 * @return {string} HTML formatted text with smart justification
 */
function formatTextContent(text) {
  if (!text) return '';
  
  // Split by double line breaks to create paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  
  if (paragraphs.length > 1) {
    // Multiple paragraphs - wrap each in <p> tags with smart justification
    return paragraphs
      .filter(p => p.trim() !== '')
      .map(p => {
        const trimmedText = p.trim();
        // Only justify if text is long enough (more than 100 characters)
        const justifyStyle = trimmedText.length > 100 ? 'style="text-align: justify;"' : '';
        return `<p ${justifyStyle}>${trimmedText}</p>`;
      })
      .join('');
  } else {
    // Single paragraph or no clear paragraph breaks
    const trimmedText = text.trim();
    // Only justify if text is long enough (more than 100 characters)
    const justifyStyle = trimmedText.length > 100 ? 'style="text-align: justify;"' : '';
    return `<p ${justifyStyle}>${trimmedText}</p>`;
  }
}

/**
 * Applies smart text justification to an HTML element's content
 * - If the element is found by ID, applies justification based on content length
 * - Uses innerHTML to preserve any HTML formatting
 * 
 * @param {string} elementId - The ID of the element to apply justification to
 * @param {string} content - The text content to set
 * @param {boolean} useInnerHTML - Whether to use innerHTML (true) or create a wrapper (false)
 * @return {boolean} True if element was found and updated, false otherwise
 */
function applySmartTextJustification(elementId, content, useInnerHTML = false) {
  const element = document.getElementById(elementId);
  if (!element) return false;

  const trimmedContent = content ? content.trim() : '';
  
  if (useInnerHTML) {
    // Direct innerHTML approach
    const justifyStyle = trimmedContent.length > 100 ? 'style="text-align: justify; display: block;"' : '';
    element.innerHTML = `<span ${justifyStyle}>${trimmedContent}</span>`;
  } else {
    // Use formatTextContent with a wrapper div
    element.innerHTML = `<div class="formatted-content">${formatTextContent(trimmedContent)}</div>`;
  }
  
  return true;
}

// Make functions globally available
window.formatTextContent = formatTextContent;
window.applySmartTextJustification = applySmartTextJustification;
