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

__Use with webpack and less-loader:__
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
| Rule          |RTL Rule       |
| ------------- |-------------|
| border-color: yellow green blue red | border-color: yellow red blue green |
| border-left: 5px solid red | border-right: 5px solid red |
| border-left-color: green | border-right-color: green |
| border-left-style: solid | border-right-style: solid |
| border-left-width: 5px | border-right-width: 5px |
| border-right: 5px solid red | border-left: 5px solid red |
| border-right-color: green | border-left-color: green |
| border-right-style: solid | border-left-style: solid |
| border-right-width: 5px | border-left-width: 5px |
| border-style: solid dotted dashed hidden | border-style: solid hidden dashed dotted |
| border-width: 10px 20px 30px 40px | border-width: 10px 40px 30px 20px |
| border-top-left-radius: 5px | border-top-right-radius: 5px |
| border-top-right-radius: 5px | border-top-left-radius: 5px |
| border-bottom-left-radius: 5px | border-bottom-right-radius: 5px |
| border-bottom-right-radius: 5px | border-bottom-left-radius: 5px |
| box-shadow: 10px 20px | box-shadow: -10px 20px |
| float: left | float: right |
| float: right | float: left |
| left: 5px | right: 5px |
| margin: 10px 20px 30px 40px | margin: 10px 40px 30px 20px |
| margin-left: 5px | margin-right: 5px |
| margin-right: 5px | margin-left: 5px |
| padding: 10px 20px 30px 40px | padding: 10px 40px 30px 20px |
| padding-left: 5px | padding-right: 5px |
| padding-right: 5px | padding-left: 5px |
| right: 5px | left: 5px |
| text-align: left | text-align: right |
| text-align: right | text-align: left |
| transform: translate(30px, 0) | transform: translate(-30px, 0) |
| transform: translateX (30px) | transform: translateX (-30px) |
| transform: translate3d (30px, 25px, 20px) | transform: translate3d (-30px, 25px, 20px) |

Specify direction
-----------
For single rules you can set a specific direction. Per default, rules for LTR will stay the same and there will an additional rule for RTL added, which is reversed. To create a rule that applies only on LTR or RTL or is in RTL and LTR the same, you have to specify this by a prefix.
```css
-ltr-margin-left: 5px; // will only applied in dir="ltr"
-rtl-margin-left: 5px; // will only applied in dir="rtl"
-ltr-rtl-margin-left: 5px //rule will be the same in dir="ltr" and dir="rtl"; will not be reversed for dir="rtl"
```

Conversion Example
------------
__Less file:__
```css
.test {
  margin-left: 5px;
  padding: 10px 20px 30px 40px;
  text-align: left;
  transform: translate(30px, 10px);
  -rtl-left: 10px;
  -rtl-ltr-border-color: yellow green blue red;
}
```

__Output css:__
```css
.test {
  margin-left: 5px;
  padding: 10px 20px 30px 40px;
  text-align: left;
  transform: translate(30px, 10px);
  border-color: yellow green blue red;
}
[dir="rtl"] .test,
:host-context([dir="rtl"]) .test {
  margin-left: initial;
  margin-right: 5px;
  padding: 10px 40px 30px 20px;
  text-align: right;
  transform: translate(-30px, 10px);
  left: 10px;
}
[dir="ltr"] .test,
:host-context([dir="ltr"]) .test {
  margin-right: initial;
  margin-left: 5px;
  padding: 10px 20px 30px 40px;
  text-align: left;
  transform: translate(30px, 10px);
}
```
