export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  }>;
}) {
  const sp = await searchParams;

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>TrueLayer Callback</h1>

      {sp.error ? (
        <>
          <p><b>Error:</b> {sp.error}</p>
          <p><b>Description:</b> {sp.error_description}</p>
        </>
      ) : (
        <>
          <p>Copy this <b>code</b> value:</p>
          <pre style={{ padding: 12, background: "#f4f4f5", borderRadius: 8 }}>
            {sp.code ?? "No code found"}
          </pre>
        </>
      )}
    </main>
  );
}
