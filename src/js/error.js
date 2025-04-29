// Configure the Back button href
const sanitizeUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch (e) {
    return '/';
  }
};

$(".card a.btn").attr("href", sanitizeUrl(document.referrer));
