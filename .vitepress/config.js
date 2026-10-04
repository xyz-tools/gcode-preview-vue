// .vitepress/config.js
export default {
  // site-level options
  title: 'GCode Preview examples',
  description: 'Just playing around.',
  // README.md documents the package, it isn't a demo page.
  srcExclude: ['README.md'],

  themeConfig: {
    // theme-level options
  },

  vite: {
    // The root vite.config.ts builds the library; VitePress brings its own setup.
    configFile: false
  }
}
