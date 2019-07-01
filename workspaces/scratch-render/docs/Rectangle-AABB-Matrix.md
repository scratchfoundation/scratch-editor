# Rectangle AABB Matrix

Initialize a Rectangle to a 1 unit square centered at 0 x 0 transformed by a model matrix.

-----

Every drawable is a 1 x 1 unit square that is rotated by its direction, scaled by its skin size and scale, and offset by its rotation center and position. The square representation is made up of 4 points that are transformed by the drawable properties. Often we want a shape that simplifies those 4 points into a non-rotated shape, a axis aligned bounding box.

One approach is to compare the x and y components of each transformed vector and find the minimum and maximum x component and the minimum and maximum y component.

We can start from this approach and determine an alternative one that prodcues the same output with less work.

Starting with transforming one point, here is a 3D point, `v`, transformation by a matrix, `m`.

```js
const v0 = v[0];
const v1 = v[1];
const v2 = v[2];

const d = v0 * m[(0 * 4) + 3] + v1 * m[(1 * 4) + 3] + v2 * m[(2 * 4) + 3] + m[(3 * 4) + 3];
dst[0] = (v0 * m[(0 * 4) + 0] + v1 * m[(1 * 4) + 0] + v2 * m[(2 * 4) + 0] + m[(3 * 4) + 0]) / d;
dst[1] = (v0 * m[(0 * 4) + 1] + v1 * m[(1 * 4) + 1] + v2 * m[(2 * 4) + 1] + m[(3 * 4) + 1]) / d;
dst[2] = (v0 * m[(0 * 4) + 2] + v1 * m[(1 * 4) + 2] + v2 * m[(2 * 4) + 2] + m[(3 * 4) + 2]) / d;
```

As this is a 2D rectangle we can cancel out the third dimension, and the determinant, 'd'.

```js
const v0 = v[0];
const v1 = v[1];

dst = [
    v0 * m[(0 * 4) + 0] + v1 * m[(1 * 4) + 0] + m[(3 * 4) + 0,
    v0 * m[(0 * 4) + 1] + v1 * m[(1 * 4) + 1] + m[(3 * 4) + 1
];
```

Let's set the matrix points to shorter names for convenience.

```js
const m00 = m[(0 * 4) + 0];
const m01 = m[(0 * 4) + 1];
const m10 = m[(1 * 4) + 0];
const m11 = m[(1 * 4) + 1];
const m30 = m[(3 * 4) + 0];
const m31 = m[(3 * 4) + 1];
```

We need 4 points with positive and negative 0.5 values so the square has sides of length 1.

```js
let p = [0.5, 0.5];
let q = [-0.5, 0.5];
let r = [-0.5, -0.5];
let s = [0.5, -0.5];
```

Transform the points by the matrix.

```js
p = [
    0.5 * m00 + 0.5 * m10 + m30,
    0.5 * m01 + 0.5 * m11 + m31
];
q = [
    -0.5 * m00 + -0.5 * m10 + m30,
    0.5 * m01 + 0.5 * m11 + m31
];
r = [
    -0.5 * m00 + -0.5 * m10 + m30,
    -0.5 * m01 + -0.5 * m11 + m31
];
s = [
    0.5 * m00 + 0.5 * m10 + m30,
    -0.5 * m01 + -0.5 * m11 + m31
];
```

With 4 transformed points we can build the left, right, top, and bottom values for the Rectangle. Each will use the minimum or the maximum of one of the components of all points.

```js
const left = Math.min(p[0], q[0], r[0], s[0]);
const right = Math.max(p[0], q[0], r[0], s[0]);
const top = Math.max(p[1], q[1], r[1], s[1]);
const bottom = Math.min(p[1], q[1], r[1], s[1]);
```

Fill those calls with the vector expressions.

```js
const left = Math.min(
    0.5 * m00 + 0.5 * m10 + m30,
    -0.5 * m00 + 0.5 * m10 + m30,
    -0.5 * m00 + -0.5 * m10 + m30,
    0.5 * m00 + -0.5 * m10 + m30
);
const right = Math.max(
    0.5 * m00 + 0.5 * m10 + m30,
    -0.5 * m00 + 0.5 * m10 + m30,
    -0.5 * m00 + -0.5 * m10 + m30,
    0.5 * m00 + -0.5 * m10 + m30
);
const top = Math.max(
    0.5 * m01 + 0.5 * m11 + m31,
    -0.5 * m01 + 0.5 * m11 + m31,
    -0.5 * m01 + -0.5 * m11 + m31,
    0.5 * m01 + -0.5 * m11 + m31
);
const bottom = Math.min(
    0.5 * m01 + 0.5 * m11 + m31,
    -0.5 * m01 + 0.5 * m11 + m31,
    -0.5 * m01 + -0.5 * m11 + m31,
    0.5 * m01 + -0.5 * m11 + m31
);
```

Pull out the `0.5 * m??` patterns.

```js
const x0 = 0.5 * m00;
const x1 = 0.5 * m10;
const y0 = 0.5 * m01;
const y1 = 0.5 * m11;

const left = Math.min(x0 + x1 + m30, -x0 + x1 + m30, -x0 + -x1 + m30, x0 + -x1 + m30);
const right = Math.max(x0 + x1 + m30, -x0 + x1 + m30, -x0 + -x1 + m30, x0 + -x1 + m30);
const top = Math.max(y0 + y1 + m31, -y0 + y1 + m31, -y0 + -y1 + m31, y0 + -y1 + m31);
const bottom = Math.min(y0 + y1 + m31, -y0 + y1 + m31, -y0 + -y1 + m31, y0 + -y1 + m31);
```

Now each argument for the min and max calls take an expression like `(a * x0 + b * x1 + m3?)`. As each expression has the x0, x1, and m3? variables we can split the min and max calls on the addition operators. Each new call has all the coefficients of that variable.

```js
const left = Math.min(x0, -x0) + Math.min(x1, -x1) + Math.min(m30, m30);
const right = Math.max(x0, -x0) + Math.max(x1, -x1) + Math.max(m30, m30);
const top = Math.max(y0, -y0) + Math.max(y1, -y1) + Math.max(m31, m31);
const bottom = Math.min(y0, -y0) + Math.min(y1, -y1) + Math.min(m31, m31);
```

The min or max of two copies of the same value will just be that value.

```js
const left = Math.min(x0, -x0) + Math.min(x1, -x1) + m30;
const right = Math.max(x0, -x0) + Math.max(x1, -x1) + m30;
const top = Math.max(y0, -y0) + Math.max(y1, -y1) + m31;
const bottom = Math.min(y0, -y0) + Math.min(y1, -y1) + m31;
```

The max of a negative and positive variable will be the absolute value of that variable. The min of a negative and positive variable will the negated absolute value of that variable.

```js
const left = -Math.abs(x0) + -Math.abs(x1) + m30;
const right = Math.abs(x0) + Math.abs(x1) + m30;
const top = Math.abs(y0) + Math.abs(y1) + m31;
const bottom = -Math.abs(y0) + -Math.abs(y1) + m31;
```

Pulling out the negations of the absolute values, left and right as well as top and bottom are the positive or negative sum of the absolute value of the saled and rotated unit value.

```js
const left = -(Math.abs(x0) + Math.abs(x1)) + m30;
const right = Math.abs(x0) + Math.abs(x1) + m30;
const top = Math.abs(y0) + Math.abs(y1) + m31;
const bottom = -(Math.abs(y0) + Math.abs(y1)) + m31;
```

We call pull out those sums and use them twice.

```js
const x = Math.abs(x0) + Math.abs(x1);
const y = Math.abs(y0) + Math.abs(y1);

const left = -x + m30;
const right = x + m30;
const top = y + m31;
const bottom = -y + m31;
```

This lets us arrive at our goal. Inlining some of our variables we get this block that will initialize a Rectangle to a unit square transformed by a matrix.

```js
const m30 = m[(3 * 4) + 0];
const m31 = m[(3 * 4) + 1];

const x = Math.abs(0.5 * m[(0 * 4) + 0]) + Math.abs(0.5 * m[(1 * 4) + 0]);
const y = Math.abs(0.5 * m[(0 * 4) + 1]) + Math.abs(0.5 * m[(1 * 4) + 1]);

const left = -x + m30;
const right = x + m30;
const top = y + m31;
const bottom = -y + m31;
```
