/**
 * Animates an element (like a product image) to fly toward a target icon (cart or wishlist)
 * Creates a smooth, polished animation with ease-out easing
 * @param sourceElement - The element to animate from (usually an image)
 * @param targetIconId - The ID of the target icon ('cart-icon' or 'wishlist-icon')
 */
export function animateToIcon(sourceElement: HTMLElement, targetIconId: 'cart-icon' | 'wishlist-icon') {
  const targetIcon = document.getElementById(targetIconId);
  if (!targetIcon) return;

  const sourceRect = sourceElement.getBoundingClientRect();
  const targetRect = targetIcon.getBoundingClientRect();

  // Create a clone of the source element
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.left = `${sourceRect.left}px`;
  clone.style.top = `${sourceRect.top}px`;
  clone.style.width = `${sourceRect.width}px`;
  clone.style.height = `${sourceRect.height}px`;
  clone.style.zIndex = '9999';
  clone.style.pointerEvents = 'none';
  clone.style.borderRadius = '8px';
  clone.style.objectFit = 'cover';
  clone.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
  
  // Calculate the center position of the target icon
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  // Initial state - no transition yet
  clone.style.transform = 'scale(1) translateZ(0)';

  // If it's an image, preserve aspect ratio
  if (sourceElement instanceof HTMLImageElement) {
    (clone as HTMLImageElement).style.objectFit = 'cover';
  }

  document.body.appendChild(clone);

  // Trigger animation with smooth easing
  requestAnimationFrame(() => {
    // Enable transition only after element is in DOM
    clone.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    
    clone.style.left = `${targetCenterX}px`;
    clone.style.top = `${targetCenterY}px`;
    clone.style.width = '30px';
    clone.style.height = '30px';
    clone.style.opacity = '0';
    clone.style.transform = 'scale(0.3) translateZ(0)';
  });

  // Remove clone after animation completes
  setTimeout(() => {
    clone.remove();
  }, 500);
}

