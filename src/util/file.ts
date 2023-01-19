export function getExtensionFromFilename(filename = ''): string | undefined {
  return filename.split('.').pop()?.toLowerCase();
}
