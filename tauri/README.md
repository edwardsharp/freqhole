# freqhole

### app

`npm run tauri dev`

### web-component

`npm run web-component:build`

outputs a dist-wc/my-component.js file that can be used like:

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="my-component.js"></script>
  </head>
  <body>
    <my-component name="HELLO WORLD!"></my-component>
  </body>
</html>
```
