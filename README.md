# advancedSelect
A select replacement which launches a dialog list. The list is searchable and can be extended with expanded views.

Full Documentation and examples are available at [moridiweb.com](http://moridiweb.com/advancedSelect.html).

By default ajaxExtend is required for JSON calls, this can be overridden. 

By default templateEngine is required for loading the design, this can be overridden.

```javascript
<script src="jQuery.advancedSelect.js"></script>
<link type="text/css" rel="stylesheet" href="advancedSelect.css" />
```

```html
<select class="advancedSelect">
	<option value="">None</option>
	<option value="1">Left</option>
	<option value="2">Right</option>
</select>
```

```javascript
$('.advancedSelect').advancedSelect({
	templateDir: "/templates/advancedSelect/"
});
```