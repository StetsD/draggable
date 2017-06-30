#Drag

Dragndrop module and implementation of keys navigation


## API


####init()

Initialize Drag

```js
drag.init();
```


####set(options)

Set options to specimen of Drag. This method reload controller automatically. It means Drag-module will refreshed all properties.

```js
drag.set({
    $elem: '.box',
    $borderElem: '.wrap',
    dragEndTimeout: 100
});
```


####bind(selectors)

Method binds DOM nodes with Drag mechanics

**selectors**

Type `string`

```js
drag.bind('.box, .boxa');
```


####unbind(selectors)

Method unbind DOM nodes

**selectors**

Type `string`

```js
drag.unbind('.box, .boxa');
```



## OPTIONS

####$elem

Initial selector which will be bound with Drag mechanics

Type `string`

```js
let drag = new Draggable({
        $elem: '.box, .boxa'
    }).init();
```

####$borderElem

Set borders where will be draggable actions

Type `string`
Default `false`

```js
drag.set({$borderElem: '.border'});
```

####dragEndTimeout

Set timer for dragEnd condition

Type `number`

```js
drag.set({dragEndTimeout: 2000});
```

####clsDragElem

Set main class for Draggable DOM nodes

Type `string`
Default `adw-drag`

```js
drag.set({clsDragElem: 'myClass'});
```

####clsDragStart

Set class for drag-start event

Type `string`
Default `adw-drag_start`

```js
drag.set({clsDragStart: 'myClass'});
```

####clsDragMove

Set class for drag-move event

Type `string`
Default `adw-drag_move`

```js
drag.set({clsDragMove: 'myClass'});
```

####clsDragEnd

Set class for drag-end event

Type `string`
Default `adw-drag_end`

```js
drag.set({clsDragEnd: 'myClass'});
```

####clsDragDest

Set class for drag-on-destination event

Type `string`
Default `adw-drag_on-dest`

```js
drag.set({clsDragDest: 'myClass'});
```

####destination.target

Set destination target

Type `string`
Default `false`

```js
drag.set({
    destination: {
        target: '.destination'
    }
});
```

####destination.strict

Set strict mode for destination

Type `boolean`
Default `false`

```js
drag.set({
    destination: {
        strict: true
    }
});
```

####backAgain

When dragEnd event occurs current draggable node will reset on initial position

Type `boolean`
Default `false`

```js
drag.set({backAgain: true});
```

####clone

Set clone node option

Type `boolean`
Default `false`

```js
drag.set({clone: true});
```

####cloneKey

Set key or key combination for cloning DOM nodes. NOTE: enable "clone" option is not required.

Type `array`
Default `false`

```js
drag.set({cloneKey: [17, 18]});
```

####cloneKey

Set key or key combination for cloning DOM nodes. NOTE: enable "clone" option is not required.

Type `array`
Default `false`

```js
drag.set({cloneKey: [17, 18]});
```

####clearGarbage

Clear garbage node after drag-end event

Type `boolean`
Default `false`

```js
drag.set({clearGarbage: true});
```

####clearGarbage

Clear garbage node after drag-end event

Type `boolean`
Default `false`

```js
drag.set({clearGarbage: true});
```

####imposition

Set barriers for your draggable elements

Type `string`
Default `false`

```js
drag.set({imposition: '.wall, .another-brick-in-the-wall'});
```

####navigation

Set this option and drags your element by keyboard

Type `object`
Default `false`

```js
drag.set({navigation: {
      up: [38],
      right: [39],
      down: [40],
      left: [37],
      step: 10
}});
```

####callOnTarget(target, elem, callOnTarget, lastPoint)

Callback which occurs when dragEnd event was on destination target

Type `function`
Default `false`

```js
drag.set({callOnTarget: function(target, elem, callOnTarget, lastPoint){
    console.log(target);
    console.log(elem);
    console.log(callOnTarget);
    console.log(lastPoint);
}});
```

####callDragEnd(elem, callOnTarget, lastPoint)

Callback which occurs when dragEnd event was occur

Type `function`
Default `false`

```js
drag.set({callDragEnd: function(elem, callOnTarget, lastPoint){
    console.log(elem);
    console.log(callOnTarget);
    console.log(lastPoint);
}});
```



 ## License

 MIT ©
