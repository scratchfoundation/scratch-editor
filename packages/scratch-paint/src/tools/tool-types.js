class ToolTypes {
    constructor (name) {
        this.name = name;
    }
    toString () {
        return `ToolTypes.${this.name}`;
    }
}
ToolTypes.BRUSH = new ToolTypes('BRUSH');
ToolTypes.ERASER = new ToolTypes('ERASER');

export default ToolTypes;
