/**
 * File utilities for validating and handling drag-and-drop or file uploads.
 */

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|bmp|svg|avif|heic|heif|ico)$/i;
const THEME_EXTENSIONS = /\.(attheme|tgx-theme|txt|zip)$/i;

/**
 * Checks whether a given file is an image by MIME type or file extension.
 */
export function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) {
    return true;
  }
  return IMAGE_EXTENSIONS.test(file.name);
}

/**
 * Checks whether a given file is a Telegram Android theme file (.attheme, .txt, .zip).
 */
export function isThemeFile(file: File): boolean {
  return THEME_EXTENSIONS.test(file.name);
}

/**
 * Checks whether a file can be imported (either an image or a Telegram theme file).
 */
export function isValidDropFile(file: File): boolean {
  return isImageFile(file) || isThemeFile(file);
}
