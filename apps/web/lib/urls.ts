const ROOT = process.env.ROOT_DOMAIN ?? 'localhost:3000';
const PROTO = process.env.WEB_PROTOCOL ?? 'http';

export const storefrontUrl = (slug: string) => `${PROTO}://${slug}.${ROOT}`;
export const storeAdminUrl = (slug: string) => `${PROTO}://${slug}-admin.${ROOT}`;
export const superAdminUrl = () => `${PROTO}://admin.${ROOT}`;
export const landingUrl = () => `${PROTO}://${ROOT}`;
