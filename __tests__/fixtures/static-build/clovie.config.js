import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default {
  type: 'static',
  mode: 'production',
  watch: false,
  open: false,
  views: path.join(__dirname, 'views'),
  partials: path.join(__dirname, 'partials'),
  outputDir: path.join(__dirname, 'dist'),
  data: {
    items: [{ slug: 'one' }, { slug: 'two' }]
  },
  routes: [
    {
      path: '/items/:slug/',
      template: path.join(__dirname, 'templates', 'item.html'),
      repeat: (data) => data.items,
      data: (globalData, item) => ({ ...globalData, slug: item.slug })
    }
  ]
};
