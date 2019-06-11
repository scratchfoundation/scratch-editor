class Rectangle {
    /**
     * A utility for creating and comparing axis-aligned rectangles.
     * Rectangles are always initialized to the "largest possible rectangle";
     * use one of the init* methods below to set up a particular rectangle.
     * @constructor
     */
    constructor () {
        this.left = -Infinity;
        this.right = Infinity;
        this.bottom = -Infinity;
        this.top = Infinity;
    }

    /**
     * Initialize a Rectangle from given Scratch-coordinate bounds.
     * @param {number} left Left bound of the rectangle.
     * @param {number} right Right bound of the rectangle.
     * @param {number} bottom Bottom bound of the rectangle.
     * @param {number} top Top bound of the rectangle.
     */
    initFromBounds (left, right, bottom, top) {
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
    }

    /**
     * Initialize a Rectangle to the minimum AABB around a set of points.
     * @param {Array<Array<number>>} points Array of [x, y] points.
     */
    initFromPointsAABB (points) {
        this.left = Infinity;
        this.right = -Infinity;
        this.top = -Infinity;
        this.bottom = Infinity;

        for (let i = 0; i < points.length; i++) {
            const x = points[i][0];
            const y = points[i][1];
            if (x < this.left) {
                this.left = x;
            }
            if (x > this.right) {
                this.right = x;
            }
            if (y > this.top) {
                this.top = y;
            }
            if (y < this.bottom) {
                this.bottom = y;
            }
        }
    }

    /**
     * Initialize a Rectangle to a 1 unit square transformed by a model matrix.
     * @param {Array.<number>} m A 4x4 matrix to transform the rectangle by.
     */
    initFromModelMatrix (m) {
        // Treat this function like we are transforming a vector with each
        // component set to 0.5 by a matrix m.
        // const v0 = 0.5;
        // const v1 = 0.5;
        // const v2 = 0.5;

        // Of the matrix to do this in 2D space, instead of the 3D provided by
        // the matrix, we need the 2x2 "top left" that represents the scale and
        // rotation ...
        const m00 = m[(0 * 4) + 0];
        const m01 = m[(0 * 4) + 1];
        const m10 = m[(1 * 4) + 0];
        const m11 = m[(1 * 4) + 1];
        // ... and the 1x2 "top right" that represents position.
        const m30 = m[(3 * 4) + 0];
        const m31 = m[(3 * 4) + 1];

        // This is how we would normally transform the vector by the matrix.
        // var determinant = v0 * m03 + v1 * m13 + v2 * m23 + m33;
        // dst[0] = (v0 * m00 + v1 * m10 + v2 * m20 + m30) / determinant;
        // dst[1] = (v0 * m01 + v1 * m11 + v2 * m21 + m31) / determinant;
        // dst[2] = (v0 * m02 + v1 * m12 + v2 * m22 + m32) / determinant;

        // We can skip the v2 multiplications and the determinant.

        // Alternatively done with 4 vectors, those vectors would be reflected
        // on the x and y axis. We can build those 4 vectors by transforming the
        // parts of one vector and reflecting them on the axises after
        // multiplication.

        // const x0 = 0.5 * m00;
        // const x1 = 0.5 * m10;
        // const y0 = 0.5 * m01;
        // const y1 = 0.5 * m11;

        // const p0x = x0 + x1;
        // const p0y = y0 + y1;
        // const p1x = -x0 + x1;
        // const p1y = -y0 + y1;
        // const p2x = -x0 + -x1;
        // const p2y = -y0 + -y1;
        // const p3x = x0 + -x1;
        // const p3y = y0 + -y1;

        // Since we want to reduce those 4 points to a min and max for each
        // axis, we can use those multiplied components to build the min and max
        // values without comparing the points.

        // We can start by getting the min and max for each of all the points.
        // const left = Math.min(x0 + x1, -x0 + x1, -x0 + -x1, x0 + -x1);
        // const right = Math.max(x0 + x1, -x0 + x1, -x0 + -x1, x0 + -x1);
        // const top = Math.max(y0 + y1, -y0 + y1, -y0 + -y1, y0 + -y1);
        // const bottom = Math.min(y0 + y1, -y0 + y1, -y0 + -y1, y0 + -y1);

        // Each of those can be replaced with min and max operations on the 0
        // and 1 matrix output components.
        // const left = Math.min(x0, -x0) + Math.min(x1, -x1);
        // const right = Math.max(x0, -x0) + Math.max(x1, -x1);
        // const top = Math.max(y0, -y0) + Math.max(y1, -y1);
        // const bottom = Math.min(y0, -y0) + Math.min(y1, -y1);

        // And they can be replaced with absolute values.
        // const left = -Math.abs(x0) + -Math.abs(x1);
        // const right = Math.abs(x0) + Math.abs(x1);
        // const top = Math.abs(y0) + Math.abs(y1);
        // const bottom = -Math.abs(y0) + -Math.abs(y1);

        // And those with positive and negative sums of the absolute values.
        // const left = -(Math.abs(x0) + Math.abs(x1));
        // const right = +(Math.abs(x0) + Math.abs(x1));
        // const top = +(Math.abs(y0) + Math.abs(y1));
        // const bottom = -(Math.abs(y0) + -Math.abs(y1));

        // We can perform those sums once and reuse them for the bounds.
        // const x = Math.abs(x0) + Math.abs(x1);
        // const y = Math.abs(y0) + Math.abs(y1);
        // const left = -x;
        // const right = x;
        // const top = y;
        // const bottom = -y;

        // Building those absolute sums for the 0.5 vector components by the
        // matrix components ...
        const x = Math.abs(0.5 * m00) + Math.abs(0.5 * m10);
        const y = Math.abs(0.5 * m01) + Math.abs(0.5 * m11);

        // And adding them to the position components in the matrices
        // initializes our Rectangle.
        this.left = -x + m30;
        this.right = x + m30;
        this.top = y + m31;
        this.bottom = -y + m31;
    }

    /**
     * Determine if this Rectangle intersects some other.
     * Note that this is a comparison assuming the Rectangle was
     * initialized with Scratch-space bounds or points.
     * @param {!Rectangle} other Rectangle to check if intersecting.
     * @return {boolean} True if this Rectangle intersects other.
     */
    intersects (other) {
        return (
            this.left <= other.right &&
            other.left <= this.right &&
            this.top >= other.bottom &&
            other.top >= this.bottom
        );
    }

    /**
     * Determine if this Rectangle fully contains some other.
     * Note that this is a comparison assuming the Rectangle was
     * initialized with Scratch-space bounds or points.
     * @param {!Rectangle} other Rectangle to check if fully contained.
     * @return {boolean} True if this Rectangle fully contains other.
     */
    contains (other) {
        return (
            other.left > this.left &&
            other.right < this.right &&
            other.top < this.top &&
            other.bottom > this.bottom
        );
    }

    /**
     * Clamp a Rectangle to bounds.
     * @param {number} left Left clamp.
     * @param {number} right Right clamp.
     * @param {number} bottom Bottom clamp.
     * @param {number} top Top clamp.
     */
    clamp (left, right, bottom, top) {
        this.left = Math.max(this.left, left);
        this.right = Math.min(this.right, right);
        this.bottom = Math.max(this.bottom, bottom);
        this.top = Math.min(this.top, top);
        // Ensure rectangle coordinates in order.
        this.left = Math.min(this.left, this.right);
        this.right = Math.max(this.right, this.left);
        this.bottom = Math.min(this.bottom, this.top);
        this.top = Math.max(this.top, this.bottom);
    }

    /**
     * Push out the Rectangle to integer bounds.
     */
    snapToInt () {
        this.left = Math.floor(this.left);
        this.right = Math.ceil(this.right);
        this.bottom = Math.floor(this.bottom);
        this.top = Math.ceil(this.top);
    }

    /**
     * Compute the intersection of two bounding Rectangles.
     * Could be an impossible box if they don't intersect.
     * @param {Rectangle} a One rectangle
     * @param {Rectangle} b Other rectangle
     * @param {?Rectangle} result A resulting storage rectangle  (safe to pass
     *                            a or b if you want to overwrite one)
     * @returns {Rectangle} resulting rectangle
     */
    static intersect (a, b, result = new Rectangle()) {
        result.left = Math.max(a.left, b.left);
        result.right = Math.min(a.right, b.right);
        result.top = Math.min(a.top, b.top);
        result.bottom = Math.max(a.bottom, b.bottom);

        return result;
    }

    /**
     * Compute the union of two bounding Rectangles.
     * @param {Rectangle} a One rectangle
     * @param {Rectangle} b Other rectangle
     * @param {?Rectangle} result A resulting storage rectangle  (safe to pass
     *                            a or b if you want to overwrite one)
     * @returns {Rectangle} resulting rectangle
     */
    static union (a, b, result = new Rectangle()) {
        result.left = Math.min(a.left, b.left);
        result.right = Math.max(a.right, b.right);
        // Scratch Space - +y is up
        result.top = Math.max(a.top, b.top);
        result.bottom = Math.min(a.bottom, b.bottom);
        return result;
    }

    /**
     * Width of the Rectangle.
     * @return {number} Width of rectangle.
     */
    get width () {
        return Math.abs(this.left - this.right);
    }

    /**
     * Height of the Rectangle.
     * @return {number} Height of rectangle.
     */
    get height () {
        return Math.abs(this.top - this.bottom);
    }

}

module.exports = Rectangle;
