less-plugin-auto-rtl
===============

With this plugin you can write your less files normally to cover ltr-languages. For all direction specifig rules like 'margin-left', there will be added a rtl rule ('margin-right') with a [dir="rtl"] selector. In you application you can now apply the rtl rules by adding the dir="rtl" tag to an element.

Setup
------
Install the plugin:
```bash
$ npm install less-plugin-auto-rtl
```

Use with less:
```bash
$ lessc --auto-rtl file.less out.css
```

To use with webpack and less-loader:
```javascript
// webpack.config.js
const AutoRtlPlugin = require('less-plugin-auto-rtl');

module.exports = {
  ...
    {
      loader: 'less-loader', 
      options: {
        plugins: [
          new AutoRtlPlugin()
        ]
      }
    }]
  ...
};
```
