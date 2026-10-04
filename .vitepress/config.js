// .vitepress/config.js
export default {
  title: 'GCode Preview examples',
  description: 'Live examples of the gcode-preview library.',
  // README.md documents the package, it isn't a demo page.
  srcExclude: ['README.md'],

  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/xyz-tools/gcode-preview' }]
  },

  vite: {
    // The root vite.config.ts builds the library; VitePress brings its own setup.
    configFile: false
  }
}
