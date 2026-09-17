# Blueprint Code

Blueprint Code is a browser-only typed programming environment inspired by Scratch-style logic, but represented as readable blueprint code instead of graphical blocks or characters.

## Core syntax

```text
input username: string = "Player"
input amount: number = 10

var total: number = amount * 2
var enabled: boolean = toBoolean("true")

if enabled && total >= 10 then
  output "Total: " + total
  delay 500
else
  output "Disabled"
end

repeat 3 times
  output total
  set total = total + 1
  delay 100
end
```

## Types

- number
- string
- boolean
- any
- array

## Conversions

`toNumber(value)`, `toString(value)`, `toBoolean(value)`, and `toArray(value)`.

## Math and logic

JavaScript-style arithmetic and comparisons are available inside expressions, together with helpers such as `abs`, `min`, `max`, `round`, `floor`, `ceil`, `sqrt`, `pow`, `random`, `clamp`, `length`, `contains`, `startsWith`, `endsWith`, `upper`, `lower`, and `concat`.

## Project files

Projects are saved as `.bpc` JSON files containing the source code and input values. Loading restores the complete editable source and saved inputs.

The engine runs locally in the browser and does not require a server.