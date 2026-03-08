Bun.serve({
  port: 3333,
  async fetch(req) {
    const url = new URL(req.url)
    const file = Bun.file(`./public${url.pathname}`)
    if (await file.exists()) {
      return new Response(file, {
        headers: { "Content-Type": "application/json" },
      })
    }
    return new Response("not found", { status: 404 })
  },
})

console.log("Registry server running on http://localhost:3333")
