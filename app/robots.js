export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/book", "/book/result"],
      disallow: ["/dashboard", "/login", "/api/"],
    },
  };
}
