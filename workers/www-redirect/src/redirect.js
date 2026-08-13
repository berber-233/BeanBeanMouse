// 301: www.beanbeanmouse.com -> https://beanbeanmouse.com (canonical host)
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const dest = 'https://beanbeanmouse.com' + url.pathname + url.search;
    return Response.redirect(dest, 301);
  }
};
