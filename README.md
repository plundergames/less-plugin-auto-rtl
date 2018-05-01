less-plugin-auto-rtl
===============

With this plugin you can write your less files normally to cover ltr-languages. For all direction specifig rules like 'margin-left', there will be added a rtl rule ('margin-right') with a [dir="rtl"] selector. In you application you can now apply the rtl rules by adding the dir="rtl" tag to an element.

Setup
------
__Install the plugin:__
```bash
$ npm install less-plugin-auto-rtl
```

__Use with less:__
```bash
$ lessc --auto-rtl file.less out.css
```

__To use with webpack and less-loader:__
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
Hint: when you have problems with compiling and *dumpLineNumbers: "comments"* in the options, try to remove it.

How to use
---------
__Use the normal styling (LTR):__
```html
<body>
  <p> This is LTR!</p>
</body>
```

__Use the RTL styling:__
```html
<body dir="rtl">
  <p> This is RTL!</p>
</body>
```

__Use the RTL styling and exclude some parts:__
```html
<body dir="rtl">
  <p> This is RTL!</p>
  <div dir="ltr">
    <p> This is LTR!</p>
  </div>
</body>
```

What will be converted?
-------
