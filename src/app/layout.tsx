import type { ReactNode } from 'react';

export const metadata = {
  title: 'jobstash-mcp — community MCP server for JobStash.xyz',
  description:
    'Community Model Context Protocol server exposing JobStash.xyz crypto/web3 jobs to V0, Claude, Cursor, and other MCP clients.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          margin: 0,
          padding: 0,
          background: '#0b0b10',
          color: '#e6e6e6',
        }}
      >
        {children}
      </body>
    </html>
  );
}
