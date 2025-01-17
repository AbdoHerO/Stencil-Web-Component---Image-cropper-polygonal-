# image-cropper



<!-- Auto Generated Below -->


## Properties

| Property             | Attribute     | Description | Type               | Default     |
| -------------------- | ------------- | ----------- | ------------------ | ----------- |
| `handlersize`        | `handlersize` |             | `string`           | `undefined` |
| `hidefooter`         | `hidefooter`  |             | `string`           | `undefined` |
| `img`                | --            |             | `HTMLImageElement` | `undefined` |
| `inactiveSelections` | --            |             | `(Quad \| Rect)[]` | `undefined` |
| `license`            | `license`     |             | `string`           | `undefined` |
| `quad`               | --            |             | `Quad`             | `undefined` |
| `rect`               | --            |             | `Rect`             | `undefined` |
| `rotation`           | `rotation`    |             | `number`           | `0`         |


## Events

| Event              | Description | Type                  |
| ------------------ | ----------- | --------------------- |
| `canceled`         |             | `CustomEvent<void>`   |
| `confirmed`        |             | `CustomEvent<void>`   |
| `selectionClicked` |             | `CustomEvent<number>` |


## Methods

### `detect() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `getAllSelections(convertTo?: "rect" | "quad") => Promise<(Quad | Rect)[]>`



#### Parameters

| Name        | Type               | Description |
| ----------- | ------------------ | ----------- |
| `convertTo` | `"rect" \| "quad"` |             |

#### Returns

Type: `Promise<(Quad | Rect)[]>`



### `getPoints() => Promise<[Point, Point, Point, Point]>`



#### Returns

Type: `Promise<[Point, Point, Point, Point]>`



### `getQuad() => Promise<Quad>`



#### Returns

Type: `Promise<Quad>`



### `getRect() => Promise<Rect>`



#### Returns

Type: `Promise<Rect>`



### `resetStates() => Promise<void>`



#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
