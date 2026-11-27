export default function Landing() {
  const features = [
    ['Your own store in minutes', 'Every server gets its own storefront at yourserver.business.com and an admin panel at yourserver-admin.business.com.'],
    ['UPI payments, zero gateway fees', 'Players pay straight to your UPI ID or bank account using a QR with the exact amount pre-filled. You verify and approve.'],
    ['Automatic in-game delivery', 'Our lightweight plugin runs your rank, crate and coin commands the moment a payment is approved, and removes timed ranks when they expire.'],
    ['Ranks, crates, coins and more', 'Permanent or monthly packages, store-wide discounts and per-package commands.'],
    ['Orders and players in one place', 'Filter orders, export to CSV, search players by username or UUID and see their purchase history.'],
    ['Discord login for players', 'Players sign in with Discord and link their Minecraft account in-game with /link.'],
  ];
  return (
    <main>
      <section className="bg-gradient-to-b from-green-900 to-green-700 px-6 py-24 text-center text-white">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold sm:text-5xl">Sell ranks, crates and coins on your Minecraft server</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-green-100">A ready-made webstore with UPI payments and automatic in-game delivery. No setup fee.</p>
        <a href="mailto:hello@business.com?subject=Create%20my%20store" className="btn mt-8 bg-white px-6 py-3 text-green-800 hover:bg-green-50">Get your store</a>
      </section>
      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(([t, d]) => (
          <div key={t} className="card">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-zinc-600">{d}</p>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold">Simple pricing</h2>
        <p className="mt-2 text-zinc-600">Free for server owners. A small platform fee is added to each purchase at checkout and shown clearly to players.</p>
      </section>
      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500">© {new Date().getFullYear()} business.com</footer>
    </main>
  );
}
