/** @type {import('next').NextConfig} */
const nextConfig = {
  // A home "/" serve o site institucional estático (public/index.html).
  // As demais páginas do site (sobre.html, exames.html...) já são servidas
  // diretamente pelo Next a partir de public/, sem precisar de rewrite.
  async rewrites() {
    return [{ source: "/", destination: "/index.html" }];
  },
};

module.exports = nextConfig;
