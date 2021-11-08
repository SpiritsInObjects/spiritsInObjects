## Classes

<dl>
<dt><a href="#Creates Sonify class using a canvas element">Creates Sonify class using a canvas element</a></dt>
<dd></dd>
<dt><a href="#Sonify">Sonify</a></dt>
<dd><p>class representing image sonification of a canvas element</p>
</dd>
</dl>

<a name="Creates Sonify class using a canvas element"></a>

## Creates Sonify class using a canvas element
**Kind**: global class  
<a name="new_Creates Sonify class using a canvas element_new"></a>

### new Creates Sonify class using a canvas element(state, canvas, audioContext)

| Param | Type | Description |
| --- | --- | --- |
| state | <code>Object</code> | State object containing video information |
| canvas | <code>Object</code> | Canvas to sonify |
| audioContext | <code>Object</code> | HTML Audio Context class shared with render process |

<a name="Sonify"></a>

## Sonify
class representing image sonification of a canvas element

**Kind**: global class  

* [Sonify](#Sonify)
    * [.sonifyCanvas()](#Sonify+sonifyCanvas) ⇒ <code>array</code>
    * [.sonify(imageData)](#Sonify+sonify) ⇒ <code>array</code>
    * [.brightness(r, g, b)](#Sonify+brightness) ⇒ <code>number</code>
    * [.map_range(value, low1, high1, low2, high2)](#Sonify+map_range) ⇒ <code>number</code>
    * [.getSample(row)](#Sonify+getSample) ⇒ <code>number</code>
    * [.envelope(original, envLen)](#Sonify+envelope) ⇒ <code>array</code>

<a name="Sonify+sonifyCanvas"></a>

### sonify.sonifyCanvas() ⇒ <code>array</code>
Sonify's all image data in the canvas element

**Kind**: instance method of [<code>Sonify</code>](#Sonify)  
**Returns**: <code>array</code> - Sound data as typed float32 array  
<a name="Sonify+sonify"></a>

### sonify.sonify(imageData) ⇒ <code>array</code>
Sonify pixel data stored in an rgba array [r, g, b, a] = 1px

**Kind**: instance method of [<code>Sonify</code>](#Sonify)  
**Returns**: <code>array</code> - Sound data as typed float32 array  

| Param | Type | Description |
| --- | --- | --- |
| imageData | <code>array</code> | Pixel data stored in typed uint8 clamped array |

<a name="Sonify+brightness"></a>

### sonify.brightness(r, g, b) ⇒ <code>number</code>
Calculate the brightness of a pixel using channel multipliers

**Kind**: instance method of [<code>Sonify</code>](#Sonify)  
**Returns**: <code>number</code> - Brightness value  

| Param | Type | Description |
| --- | --- | --- |
| r | <code>number</code> | Red channel value |
| g | <code>number</code> | Green channel value |
| b | <code>number</code> | Blue channel value |

<a name="Sonify+map_range"></a>

### sonify.map\_range(value, low1, high1, low2, high2) ⇒ <code>number</code>
Map a value from one range to a target range, implemented to mimic
Processing map() function

**Kind**: instance method of [<code>Sonify</code>](#Sonify)  
**Returns**: <code>number</code> - Mapped value  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>number</code> | Value to scale |
| low1 | <code>number</code> | Low of initial scale |
| high1 | <code>number</code> | High of initial scale |
| low2 | <code>number</code> | Low of target scale |
| high2 | <code>number</code> | High of target scale |

<a name="Sonify+getSample"></a>

### sonify.getSample(row) ⇒ <code>number</code>
Turn a row of image data into a single audio sample

**Kind**: instance method of [<code>Sonify</code>](#Sonify)  
**Returns**: <code>number</code> - Mapped total value of row  

| Param | Type | Description |
| --- | --- | --- |
| row | <code>array</code> | Single row of image (1px section across width) |

<a name="Sonify+envelope"></a>

### sonify.envelope(original, envLen) ⇒ <code>array</code>
Envelope an array of sample data in and out by n samples

**Kind**: instance method of [<code>Sonify</code>](#Sonify)  
**Returns**: <code>array</code> - Altered array with envelope applied  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| original | <code>array</code> |  | Audio sample data to fade |
| envLen | <code>number</code> | <code>30</code> | Length of envelope on either end |

