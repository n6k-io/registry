/// <reference types="vite/client" />

declare module "astro:middleware" {
  export function defineMiddleware(
    handler: (
      context: unknown,
      next: () => Promise<Response>,
    ) => Promise<Response>,
  ): (context: unknown, next: () => Promise<Response>) => Promise<Response>;
}

declare module "*?url" {
  const url: string;
  export default url;
}
