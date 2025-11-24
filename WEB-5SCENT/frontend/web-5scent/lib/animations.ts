/**
 * Animates an element (like a product image) to fly toward a target icon (cart or wishlist)
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
  clone.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  clone.style.borderRadius = '8px';
  clone.style.objectFit = 'cover';

  // If it's an image, preserve aspect ratio
  if (sourceElement instanceof HTMLImageElement) {
    (clone as HTMLImageElement).style.objectFit = 'cover';
  }

  document.body.appendChild(clone);

  // Trigger animation
  requestAnimationFrame(() => {
    clone.style.left = `${targetRect.left + targetRect.width / 2}px`;
    clone.style.top = `${targetRect.top + targetRect.height / 2}px`;
    clone.style.width = '40px';
    clone.style.height = '40px';
    clone.style.opacity = '0.5';
  });

  // Remove clone after animation
  setTimeout(() => {
    clone.remove();
  }, 600);
}

