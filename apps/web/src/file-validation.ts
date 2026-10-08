import { MAX_IMAGE_BYTES, imageTypes } from '@waste2watt/shared';

export function validateImage(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(imageTypes as readonly string[]).includes(file.type))
    return 'Choose a JPEG, PNG, or WebP image.';
  if (file.size <= 0) return 'This image is empty. Choose another image.';
  if (file.size > MAX_IMAGE_BYTES)
    return 'Your image is too large. Maximum size is 10 MB (10 MiB).';
  return null;
}
