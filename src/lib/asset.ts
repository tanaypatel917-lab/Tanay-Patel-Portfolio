/** Prefixes a `/public` path with the deploy base path (e.g. GitHub Pages project subpath). */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
