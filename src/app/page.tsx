export default function Home() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '4rem 1.5rem',
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ marginBottom: 0 }}>jobstash-mcp</h1>
      <p style={{ color: '#9aa0a6', marginTop: 4 }}>
        Community MCP server for{' '}
        <a href="https://jobstash.xyz" style={{ color: '#7dd3fc' }}>
          JobStash.xyz
        </a>
        . Not affiliated with JobStash.
      </p>

      <h2>Connect</h2>
      <p>
        Streamable HTTP endpoint:{' '}
        <code style={{ background: '#1c1c24', padding: '2px 6px', borderRadius: 4 }}>
          /api/mcp
        </code>
      </p>
      <pre
        style={{
          background: '#0f0f15',
          padding: '1rem',
          borderRadius: 6,
          overflowX: 'auto',
        }}
      >
        {`{
  "mcpServers": {
    "jobstash": {
      "url": "https://<your-deployment>.vercel.app/api/mcp"
    }
  }
}`}
      </pre>

      <h2>Tools</h2>
      <ul>
        <li>
          <code>search_jobs</code> — paginated, filterable crypto/web3 job search
        </li>
        <li>
          <code>get_filter_catalog</code> — discover canonical tags, chains, locations
        </li>
        <li>
          <code>get_recent_jobs</code> — time-windowed shortcut (today, this-week, …)
        </li>
        <li>
          <code>get_organization</code> — org payload + active job count
        </li>
        <li>
          <code>compare_organizations</code> — side-by-side comparison of 2-5 orgs
        </li>
        <li>
          <code>find_jobs_by_stack</code> — quick stack-keyword search
        </li>
      </ul>

      <p style={{ marginTop: 32, color: '#9aa0a6', fontSize: 14 }}>
        See the{' '}
        <a
          href="https://github.com/pato-gonzalez/jobstash-community-mcp"
          style={{ color: '#7dd3fc' }}
        >
          README
        </a>{' '}
        for full client setup snippets (V0, Claude Desktop, Claude Code, Cursor, Continue,
        Zed, Windsurf).
      </p>
    </main>
  );
}
