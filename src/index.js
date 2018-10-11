import React, { Fragment } from 'react';
import { Button } from 'antd';
import { getOffset } from '../utils';
import './index.less';

const { Group } = Button;

const pxNumber = (px) => +px.replace('px', '');

export default class Cropper extends React.Component {
    static defaultProps = {
        running: false,
        zIndex: 1001,
        onCancel: () => { },
        onJumpOver: () => { },
        onOk: () => { },
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        if (prevState.running !== nextProps.running) {
            return {
                running: nextProps.running,
            };
        }
        return null;
    }

    constructor(props) {
        super(props);
        this.state = {
            running: props.running,
            startX: -999,
            startY: -999,
            endX: undefined,
            endY: undefined,
            resizer: [],
        };
        this.mouseDownOverlay = false;
        this.mouseDownResizer = false;
        this.mouseDownBox = false;
        this.boxRef = React.createRef();
    }
    
    componentDidUpdate() {
        const { running } = this.props;
        if (running) {
            document.body.classList.add("bridge-cropper-fullpage");
            document.removeEventListener("keydown", this.onkeydown);
            document.addEventListener("keydown", this.onkeydown);
        } else {
            document.body.classList.remove("bridge-cropper-fullpage");
            document.removeEventListener("keydown", this.onkeydown);
        }
    }

    onkeydown = (e) => {
        if (e.keyCode === 13) {
            this.onOk(e);
        }
        if (e.keyCode === 27) {
            this.onCancel(e);
        }
    };

    // 将startX, startY, endX, endY按照box当前位置重置
    adjustBoxPos = () => {
        const boxEl = this.boxRef.current;
        const boxStyles = window.getComputedStyle(boxEl);
        const { top, left, width, height } = boxStyles;
        this.setState({
            startX: pxNumber(left),
            startY: pxNumber(top),
            endX: pxNumber(left) + pxNumber(width),
            endY: pxNumber(top) + pxNumber(height),
        });
    }

    // 将startX, startY, endX, endY按照左上->右下顺序重置
    adjustPosOrder = () => {
        const { startX, startY, endX, endY } = this.state;
        this.setState({
            startX: Math.min(startX, endX),
            startY: Math.min(startY, endY),
            endX: Math.max(startX, endX),
            endY: Math.max(startY, endY),
        });
    }

    boxListeners = {
        mouseDown: e => {
            this.mouseDownBox = true;
            const { offsetX, offsetY } = getOffset(e);
            this.boxMouseDownX = offsetX;
            this.boxMouseDownY = offsetY;
            this.boxWidth = e.target.clientWidth;
            this.boxHeight = e.target.clientHeight;
        }
    }

    overlayListeners = {
        mouseUp: () => {
            if (this.mouseDownBox) {
                this.adjustBoxPos();
            }
            if (this.mouseDownOverlay) {
                this.adjustPosOrder();
            }
            if (this.mouseDownResizer) {
                this.adjustBoxPos();
                this.adjustPosOrder();
            }
            this.mouseDownBox = false;
            this.mouseDownOverlay = false;
            this.mouseDownResizer = false;
        },
        mouseLeave: () => {
            this.mouseDownOverlay = false;
            this.mouseDownResizer = false;
        },
        mouseDown: e => {
            const { state } = this;
            const { endX, endY } = state;
            if (!this.mouseDownOverlay && typeof endX === 'undefined' && typeof endY === 'undefined') {
                const { clientX, clientY } = e;
                this.mouseDownOverlay = true;
                this.setState({
                    startX: clientX,
                    startY: clientY,
                });
            }
        },
        mouseMove: e => {
            const { clientX, clientY } = e;
            const { state } = this;
            window.getSelection().removeAllRanges();
            if (this.mouseDownOverlay) {
                this.setState({
                    endX: clientX,
                    endY: clientY,
                });
            }
            if (this.mouseDownBox) {
                const boxEl = this.boxRef.current;
                const { clientX, clientY } = e;
                const { innerWidth, innerHeight } = window;
                const { clientWidth, clientHeight } = boxEl;
                const left = clientX - this.boxMouseDownX;
                const top = clientY - this.boxMouseDownY;
                let _top = top, _left = left;
                if (_top < 0) {
                    _top = 0;
                }
                if (_top + clientHeight > innerHeight) {
                    _top = innerHeight - clientHeight;
                }
                if (_left < 0) {
                    _left = 0;
                }
                if (_left + clientWidth > innerWidth) {
                    _left = innerWidth - clientWidth;
                }
                boxEl.style.width = this.boxWidth + 'px';
                boxEl.style.height = this.boxHeight + 'px';
                boxEl.style.top = _top + 'px';
                boxEl.style.left = _left + 'px';
            }
            if (this.mouseDownResizer) {
                const [resizerX, resizerY] = state.resizer;
                const { clientX, clientY } = e;
                const posState = {};
                resizerX === 0 && (posState.startX = clientX);
                resizerX === 2 && (posState.endX = clientX);
                resizerY === 0 && (posState.startY = clientY);
                resizerY === 2 && (posState.endY = clientY);
                this.setState(posState);
            }
        }
    }
    
    resizerListeners = {
        mouseDown: (e, x, y) => {
            e.stopPropagation();
            this.adjustBoxPos();
            this.adjustPosOrder();
            this.mouseDownResizer = true;
            this.setState({ resizer: [x, y] });
        },
    }

    renderResizer = () => {
        const mask = 0b1111101111;
        const resizer = [];
        const dirMap = {
            '00': 'nw', '10': 'n', '20': 'ne',
            '01': 'w' ,            '21': 'e' ,
            '02': 'sw', '12': 's', '22': 'se',
        };
        for (let x = 0; x < 3; ++x) {
            for (let y = 0; y < 3; ++y) {
                if ((mask >> (y * 3) >> x) & 0b1) {
                    const dir = dirMap["" + x + y];
                    resizer.push(
                        <span
                            key={"" + x + y}
                            className={`cropper-point point-${dir}`}
                            onMouseDown={(e) => this.resizerListeners.mouseDown(e, x, y)}
                        />
                    );
                }
            }
        }
        return resizer;
    }

    reset = () => {
        this.setState({
            startX: -999,
            startY: -999,
            endX: undefined,
            endY: undefined,
            resizer: [],
        });
        this.mouseDownOverlay = false;
        this.mouseDownResizer = false;
        this.mouseDownBox = false;
    }

    onCancel = (e) => {
        this.props.onCancel();
        e.stopPropagation();
        e.preventDefault()
        this.reset();
    }

    onJumpOver = (e) => {
        e.stopPropagation();
        this.props.onJumpOver();
    }
    
    onOk = (e) => {
        e.stopPropagation();
        const { startX, startY, endX, endY } = this.state;
        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.abs(startX - endX);
        const height = Math.abs(startY - endY);
        this.props.onOk(top, left, width, height);
        this.reset();
    }

    render() {
        const { state, props } = this;
        if (!state.running) return null;
        const { startX, startY, endX, endY } = state;
        const boxStyle = {
            zIndex: props.zIndex + 1,
            top: startY,
            left: startX,
        };
        const selected = typeof endX !== 'undefined' && typeof endY !== 'undefined';
        if (selected && !this.mouseDownBox) { // mouseDownBox时认为在移动box，此时直接修改box位置样式，不对其进行位置计算
            const w = startX - endX;
            const h = startY - endY;
            boxStyle.width = Math.abs(w);
            boxStyle.height = Math.abs(h);
            const shiftingX = startX > endX;
            const shiftingY = startY > endY;
            if (shiftingX || shiftingY) {
                let translate = '';
                if (shiftingX && shiftingY) {
                    translate = `translate(-${w}px, -${h}px)`;
                } else {
                    translate = shiftingX ? `translateX(-${w}px)` : `translateY(-${h}px)`;
                }
                boxStyle.transform = translate;
            }
        }
        return (
            <Fragment>
                <div
                    style={{
                        zIndex: props.zIndex,
                        cursor: selected ? 'default' : undefined,
                    }}
                    className="bridge-cropper-overlay"
                    onMouseUp={this.overlayListeners.mouseUp}
                    onMouseDown={this.overlayListeners.mouseDown}
                    onMouseMove={this.overlayListeners.mouseMove}
                    onMouseLeave={this.overlayListeners.mouseLeave}
                    onContextMenu={this.onCancel}
                >
                    <div
                        ref={this.boxRef}
                        style={boxStyle}
                        className="bridge-cropper-box"
                        onMouseDown={this.boxListeners.mouseDown}
                    >
                        {selected && this.renderResizer()}
                        {selected && (
                            <Group size="small" className="cropper-actions">
                                <Button
                                    onClick={this.onCancel}
                                    onMouseDown={e => e.stopPropagation()}
                                >
                                    {props.language.cancel}
                                </Button>
                                <Button
                                    type="primary"
                                    onClick={this.onOk}
                                    onMouseDown={e => e.stopPropagation()}
                                >
                                    {props.language.next_step}
                                </Button>
                            </Group>
                        )}
                    </div>
                </div>
                {!selected && <div
                    className="bridge-cropper-guide"
                    style={{ zIndex: props.zIndex + 2 }}
                >
                    {props.language.select_attention_area}
                    <a className="jumpover" onClick={this.onJumpOver}>{props.language.jump_over}</a>
                </div>}
            </Fragment>
        );
    }
}