export const getOffset = (event) => {
    var evt = event || window.event;
    var srcObj = evt.currentTarget || evt.target;
    const rect = srcObj.getBoundingClientRect();
    const clientx = evt.clientX;
    const clienty = evt.clientY;
    return {
        offsetX: clientx - rect.left,
        offsetY: clienty - rect.top,
    };
}