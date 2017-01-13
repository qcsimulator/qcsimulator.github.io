class Editor {

    constructor(app, canvas) {
        const length = 20;
        this.app = app;
        this.draw = new Draw(canvas, app.circuit.nqubits, length);
        this.bindEvents();
        this.length = length;
        this.input = numeric.rep([app.circuit.nqubits], 0);
        this.render();
    }

    /*
    Resize editor and redraw
    */
    resize(nqubits, length) {
        this.draw.resize(nqubits, length);
        this.app.circuit.nqubits = nqubits;
        this.length = length;
        this.input = numeric.rep([nqubits], 0);
        this.render();
    }

    leftClick(time, qubit) {
        const editor = this;
        const node = this.draw.canvas;
        const circuit = this.app.circuit;
        // Clear mouse events
        node.onmouseup = null;
        node.onmouseout = null;
        node.onmousedown = null;
        node.onmousemove = null;
        node.onmousemove = evt2 => {
            // Handles highlighting while dragging
            if (typeof evt2.offsetY == 'undefined') {
                evt2.offsetY = evt2.layerY - node.offsetTop;
            }
            const qubits = editor.getSelection(qubit, Math.floor(evt2.offsetY / 40));
            editor.render();
            editor.draw.selection(time * 40, qubits, 255, 153, 0, 128);
        };
        node.onmouseup = evt2 => {
            if (typeof evt2.offsetY == 'undefined') {
                evt2.offsetY = evt2.pageY - node.offsetTop;
            }
            // Get array of selected qubits
            const qubits = editor.getSelection(qubit, Math.floor(evt2.offsetY / 40));
            const type = editor.activeGate;
            if (time == 0) {
                // Toggle inputs
                for (let i = 0; i < qubits.length; i++) {
                    editor.input[qubits[i]] = 1 - editor.input[qubits[i]];
                }
            } else if (type.name == 'control') {
                // Add control to a gate (if possible)
                let collisionA = false;
                let collisionB = false;
                for (let j = 0; j < circuit.gates.length; j++) {
                    if (circuit.gates[j].touching(time, qubits[0])) {
                        collisionA = circuit.gates[j];
                    }
                    if (circuit.gates[j].touching(time, qubits[qubits.length - 1])) {
                        collisionB = circuit.gates[j];
                    }
                }
                if ((collisionA === collisionB || !collisionA) && collisionB) {
                    collisionB.addControl(qubits[0]);
                    circuit.matrix = null;
                }
            } else {
                // Otherwise we're creating a new gate
                if (type.qubits == 1 && qubits.length > 1) {
                    for (let i = 0; i < qubits.length; i++) {
                        editor.createGate(type, time, [qubits[i]]);
                    }
                } else if (type.qubits == qubits.length || type.qubits == Infinity || type.name == 'cnot' || type.name == 'swap') {
                    editor.createGate(type, time, qubits);
                }
            }
            // Clear mouse events
            node.onmouseup = null;
            node.onmouseout = null;
            node.onmousedown = null;
            node.onmousemove = null;
            this.bindEvents();
            editor.render();
        };
    };

    rightClick(time, qubit) {
        const circuit = this.app.circuit;
        const editor = this;
        const old = circuit.gates.length;
        let collision = false;
        if (time == 0) {
            // Set input to 0
            this.input[qubit] = 0;
        } else {
            // Find gate or control and remove it
            for (let j = 0; j < circuit.gates.length; j++) {
                if (circuit.gates[j].touching(time, qubit)) {
                    collision = circuit.gates[j];
                }
            }
            if (collision) {
                let control = collision.controls.indexOf(qubit);
                if (control < 0) {
                    circuit.removeGate(collision);
                } else {
                    collision.removeControl(qubit);
                    circuit.matrix = null;
                }
                editor.render();
            }
        }
    }

    bindEvents() {
        const editor = this;
        const node = this.draw.canvas;
        node.onmouseout = evt => {
            // This stops the mouseover highlight from lingering after mouseout
            editor.render();
        };
        node.onmousemove = evt => {
            // Highlight tile under mouse
            if (typeof evt.offsetX == 'undefined') {
                evt.offsetX = evt.pageX - node.offsetLeft;
            }
            if (typeof evt.offsetY == 'undefined') {
                evt.offsetY = evt.pageY - node.offsetTop;
            }
            editor.render();
            const x = Math.floor(evt.offsetX / 40);
            const y = Math.floor(evt.offsetY / 40);
            editor.draw.selection(x * 40, [y], 119, 153, 255, 64);
        };

        node.onmousedown = evt => {
            // Dispatch left/right click events
            if (typeof evt.offsetX == 'undefined') {
                evt.offsetX = evt.pageX - node.offsetLeft;
            }
            if (typeof evt.offsetY == 'undefined') {
                evt.offsetY = evt.pageY - node.offsetTop;
            }
            const x = Math.floor(evt.offsetX / 40);
            const y = Math.floor(evt.offsetY / 40);
            if (evt.which == 1) {
                editor.leftClick(x, y);
            } else if (evt.which == 2 || evt.which == 3) {
                editor.rightClick(x, y);
            }
        };
    }

    createGate(type, time, qubits) {
        const circuit = this.app.circuit;
        let collision = false;
        // Find collision (can't add a gate where one already exists)
        for (let i = 0; i < qubits.length; i++) {
            for (let j = 0; j < circuit.gates.length; j++) {
                if (circuit.gates[j].touching(time, qubits[i])) {
                    collision = circuit.gates[j];
                }
            }
        }
        if (!collision) {
            if (type.name == 'cnot' || type.name == 'swap') {
                // Create cnot or swap (gates that can span multiple qubits but only
                // actually use two.
                if (qubits.length < 2) {
                    return console.warn(type + ' gate requires two qubits');
                } else {
                    qubits = [qubits[0], qubits[qubits.length - 1]];
                }
            } else {
                qubits.sort();
            }
            if (type.name == 'cnot') {
                // cnot is really a controlled x
                circuit.addGate(new Gate(this.app.workspace.gates.x, time, [qubits[1]], [qubits[0]]));
            } else {
                circuit.addGate(new Gate(type, time, qubits));
            }
        }
    }

    /*
    Return array of all qubit indices between y1 and y2
    */
    getSelection(y1, y2) {
        const dy = y2 - y1;
        const h = Math.abs(dy) + 1;
        const qubits = [];
        if (dy < 0) {
            for (let i = y1; i > y1 - h; i--) {
                qubits.push(i)
            }
        } else {
            for (let i = y1; i < y1 + h; i++) {
                qubits.push(i)
            }
        }
        return qubits;
    }

    /*
    Render entire editor
    */
    render() {
        this.draw.clear();
        for (let i = 0; i < this.app.circuit.gates.length; i++) {
            this.app.circuit.gates[i].render(this.draw);
        }
        for (let i = 0; i < this.app.circuit.nqubits; i++) {
            this.draw.qubit(20, 20 + i * 40, 1, this.input[i]);
        }
    }

}
