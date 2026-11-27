import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mcstore/shared'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  env: {
    ROOT_DOMAIN: process.env.ROOT_DOMAIN,
    WEB_PROTOCOL: process.env.WEB_PROTOCOL,
  },
};
export default nextConfig;
