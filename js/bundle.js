(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const Circuit = require('./circuit');
const Draw = require('./draw');
const Editor = require('./editor');
const Gate = require('./gate');
const Workspace = require('./workspace');

module.exports = class Application {

    constructor(canvas, nqubits) {
        const app = this;
        this.workspace = new Workspace(app);
        const circuit = this.circuit = new Circuit(app, nqubits);
        const editor = this.editor = new Editor(app, canvas);
        const toolbar = document.querySelector('#toolbar');
        toolbar.onclick = evt => {
            let target = findParent(evt.target, el => {
                return el.className && el.className.indexOf('gate') > -1;
            });
            if (target) {
                const current = document.querySelector('#toolbar div.gate.active');
                if (current) {
                    current.className = 'gate';
                }
                target.className = 'active gate';
                editor.activeGate = app.workspace.gates[target.dataset.type];
            }
        };
        const userTools = document.querySelector('#toolbar .user');
        userTools.ondblclick = evt => {
            // Open gate from toolbar
            evt.preventDefault();
            let target = findParent(evt.target, el => {
                return el.className && el.className.indexOf('gate') > -1;
            });
            if (target) {
                let ok = true;
                if (app.circuit.gates.length > 0) {
                    // Only confirm if circuit isn't empty
                    ok = confirm('Load gate: ' + target.dataset.type + '?');
                }
                if (ok) {
                    app.editCircuit(app.workspace.gates[target.dataset.type]);
                }
            }
        };

        document.querySelectorAll('#toolbar div.gate')[0].click();
    }

    /*
    Set current "circuit" to that of some "gate" and update the interface
    for the new circuit.
    */
    editCircuit(gate) {
        this.circuit = gate.circuit;
        this.editor.resize(gate.circuit.nqubits, this.editor.length);
        document.querySelector('#nqubits > span').innerHTML = 'Qubits: ' + this.circuit.nqubits;
        if (gate.input) {
            this.editor.input = gate.input;
        }
        this.editor.render();
    }

    /*
    Add a button for a gate to the toolbar.
    "type" should be either "std" or "user" (where "std" is a standard gate and
    "user" is a user-created gate)
    "name" is the name of the gate used by the workspace
    "title" is a human-readable name for the gate
    */
    addToolbarButton(type, name, title) {
        const canvas = document.createElement('canvas');
        const draw = new Draw(canvas, 1, 1);
        const tool = document.createElement('div');
        tool.dataset.type = name;
        tool.className = "gate";
        if (title) {
            tool.title = title;
        }
        draw.clear();
        if (name == 'swap') {
            draw.swap(20, 20);
        } else if (name == 'control') {
            draw.control(20, 20);
        } else if (name == 'cnot') {
            draw.not(20, 20);
        } else {
            draw.gate(20, 20, 1, name.toUpperCase());
        }
        const img = document.createElement('img');
        img.src = canvas.toDataURL();
        tool.appendChild(img);
        tool.appendChild(document.createElement('div'));
        document.querySelector('#toolbar .' + type).appendChild(tool);
    }

    /*
    Load a new workspace in from a json object, overwriting the current one.
    JSON struct looks like:
    {
        "circuit": [
            {"type": "h", "time": 0, "targets": [0], "controls": []},
            {"type": "x", "time": 1, "targets": [1], "controls": [0]}
        ],
        "qubits": 2,
        "input": [0, 0]
    }
    And can also contain a "gates" property which is a list of the user defined
    gates in the circuit.
    */
    loadWorkspace(json) {
        document.querySelector('#toolbar .std').innerHTML = '';
        document.querySelector('#toolbar .user').innerHTML = '';
        this.workspace = new Workspace(this);
        if (json.gates) {
            for (let i = 0 ; i < json.gates.length; i++) {
                const gate = json.gates[i];
                const circuit = new Circuit(this, gate.qubits);
                for (let j = 0; j < gate.circuit.length; j++) {
                    circuit.addGate(new Gate(
                        this.workspace.gates[gate.circuit[j].type],
                        gate.circuit[j].time + 1,
                        gate.circuit[j].targets,
                        gate.circuit[j].controls
                    ));
                }
                this.workspace.addGate({
                    name: gate.name,
                    qubits: gate.qubits,
                    matrix: gate.matrix,
                    fn: gate.fn,
                    title: gate.title,
                    circuit: circuit
                });
            }
        }
        this.circuit = new Circuit(this, json.qubits);
        for (let j = 0; j < json.circuit.length; j++) {
            this.circuit.addGate(new Gate(
                this.workspace.gates[json.circuit[j].type],
                json.circuit[j].time + 1,
                json.circuit[j].targets,
                json.circuit[j].controls
            ));
        }
        this.editor.resize(this.circuit.nqubits, this.editor.length);
        this.editor.input = json.input;
        document.querySelector('#nqubits > span').innerHTML = 'Qubits: ' + this.circuit.nqubits;
        this.compileAll();
        this.editor.render();
    }

    exportWorkspace() {
        const workspace = this.workspace;
        this.circuit.gates.sort((a, b) => a.time - b.time);
        const gates = [];
        for (let key in workspace.gates) {
            const gate = workspace.gates[key];
            if (gate.std) {
                continue;
            }
            gates.push({
                name: key,
                qubits: gate.circuit.nqubits,
                circuit: gate.circuit.toJSON(),
                title: ''
            });
        }
        return {
            gates: gates,
            circuit: this.circuit.toJSON(),
            qubits: this.circuit.nqubits,
            input: this.editor.input
        };
    }

    /*
    Asynchronously compile every user defined gate in the workspace.
    XXX: This should probably be a method of Workspace
    */
    compileAll() {
        const app = this;
        const todo = [];
        const workspace = this.workspace;
        document.querySelectorAll('#toolbar .user div.gate').forEach(el => {
            const name = el.dataset.type;
            const type = workspace.gates[name];
            if (!type.matrix) {
                todo.push(type);
            }
        });
        (function loop(i) {
            if (i < todo.length) {
                const n = Math.pow(2, todo[i].circuit.nqubits);
                const I = new numeric.T(
                    numeric.identity(n),
                    numeric.rep([n, n], 0)
                );
                app.applyCircuit(todo[i].circuit, I, U => {
                    todo[i].matrix = U;
                    setTimeout(function() {
                        loop(i + 1);
                    }, 5);
                });
            }
        })(0);
    }

    /*
    Applies circuit to matrix and passes result to callback
    */
    applyCircuit(circuit, x, callback) {
        const wrapper = document.querySelector('#progress');
        wrapper.style.display = 'inline-block';
        const progress = document.querySelector('#progress > div');
        progress.width = 0;
        circuit.evaluate(x, percent => {
            progress.style.width = wrapper.clientWidth * percent;
        }, x => {
            wrapper.style.display = 'none';
            callback(x);
        });
    }

}


/*
Search ancestors in DOM.
*/
const findParent = (el, test) => {
    while (el.parentNode && !test(el)) {
        el = el.parentNode;
    }
    if (el !== document) {
        return el;
    }
};

},{"./circuit":2,"./draw":3,"./editor":4,"./gate":6,"./workspace":9}],2:[function(require,module,exports){
const Gate = require('./gate');
const quantum = require('./quantum');

module.exports = class Circuit {

    constructor(app, nqubits) {
        this.app = app;
        this.nqubits = nqubits;
        this.gates = [];
        this.matrix = null;
        this.inputs = [];
    }

    /*
    Return JSON-capable object representation of this circuit
    */
    toJSON() {
        const circuit = [];
        for (let i = 0; i < this.gates.length; i++) {
            circuit.push({
                type: this.gates[i].type.name,
                time: this.gates[i].time - 1,
                targets: this.gates[i].targets,
                controls: this.gates[i].controls
            });
        }
        return circuit;
    }

    /*
    Return a copy of this circuit
    */
    copy() {
        const circuit = new Circuit(this.app, this.nqubits);
        for (let i = 0; i < this.gates.length; i++) {
            const gate = this.gates[i];
            circuit.addGate(new Gate(
                gate.type,
                gate.time,
                gate.targets,
                gate.controls
            ));
        }
        return circuit;
    }

    /*
    Add a gate to this circuit
    (note that this destroys the current compiled matrix)
    */
    addGate(gate) {
        this.gates.push(gate);
        this.matrix = null;
    }

    /*
    Remove a gate from this circuit
    (note that this destroys the current compiled matrix)
    */
    removeGate(gate) {
        this.gates.splice(this.gates.indexOf(gate), 1);
        this.matrix = null;
    }

    /*
    Evaluate this circuit on "x" (a matrix or state vector) calling "progress"
    along the way with the percentage of completion and finally calling
    "callback" with the result.
    */
    evaluate(x, progress, callback) {
        const circuit = this;
        (function applyLoop(i) {
            progress(i / circuit.gates.length);
            if (i < circuit.gates.length) {
                let U;
                const gate = circuit.gates[i];
                if (gate.type.qubits < Infinity) {
                    U = gate.type.matrix;
                } else {
                    U = gate.type.fn(gate.targets.length);
                }
                for (var j = 0; j < gate.controls.length; j++) {
                    U = quantum.controlled(U);
                }
                var qubits = gate.controls.concat(gate.targets);
                //x = x.dot(quantum.expandMatrix(circuit.nqubits, U, qubits));
                x = quantum.expandMatrix(circuit.nqubits, U, qubits).dot(x);
                setTimeout(() => applyLoop(i + 1), 1);
            } else {
                callback(x);
            }
        })(0);
    }

}


},{"./gate":6,"./quantum":8}],3:[function(require,module,exports){
/*
Rendering primatives for circuit grid
*/
module.exports = class Draw {

    constructor(canvas, nqubits, length) {
        this.canvas = canvas;
        this.gfx = new Processing(canvas);
        this.nqubits = nqubits;
        this.length = length;
        this.gfx.textFont(this.gfx.loadFont('monospace'));
        this.gfx.textAlign(this.gfx.CENTER);
        this.gfx.size(length * 40, nqubits * 40);
    }

    resize(nqubits, length) {
        this.nqubits = nqubits;
        this.length = length;
        this.gfx.size(length * 40, nqubits * 40);
    }

    clear() {
        this.gfx.background(255);
        for (let i = 0; i < this.nqubits; i++) {
            this.gfx.line(0, i * 40 + 20, this.length * 40, i * 40 + 20);
        }
    }

    selection(x, qubits, r, g, b, a) {
        this.gfx.noStroke();
        this.gfx.fill(r, g, b, a);
        for (let i = 0; i < qubits.length; i++) {
            this.gfx.rect(x, qubits[i] * 40, 40, 40);
        }
        this.gfx.fill(255);
        this.gfx.stroke(0);
    }

    qubit(x, y, h, state) {
        this.gfx.textSize(17);
        this.gfx.noStroke();
        this.gfx.fill(255);
        this.gfx.rect(x - 20, y - 17, 40, h * 40 - 6);
        this.gfx.fill(0);
        this.gfx.text(state ? '|1>' : '|0>', x, (y + (h / 2) * 40) - 15);
        this.gfx.fill(255);
        this.gfx.stroke(0);
        this.gfx.textSize(11);
    }

    gate(x, y, h, text) {
        this.gfx.fill(255);
        this.gfx.rect(x - 17, y - 17, 40 - 6, h * 40 - 6);
        this.gfx.fill(0);
        this.gfx.text(text, x, (y + (h / 2) * 40) - 17);
        this.gfx.fill(255);
    }

    swap(x, y) {
        this.gfx.line(x - 5, y - 5, x + 5, y + 5);
        this.gfx.line(x - 5, y + 5, x + 5, y - 5);
    }

    not(x, y) {
        this.gfx.noFill();
        this.gfx.ellipse(x, y, 20, 20);
        this.gfx.fill(255);
        this.gfx.line(x - 9, y, x + 9, y);
        this.gfx.line(x, y - 9, x, y + 9);
    }

    wire(x, y1, y2) {
        this.gfx.line(x, y1, x, y2);
    }

    control(x, y) {
        this.gfx.fill(0);
        this.gfx.ellipse(x, y, 10, 10);
    }

}

},{}],4:[function(require,module,exports){
const Draw = require('./draw');
const Gate = require('./gate');

module.exports = class Editor {

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

},{"./draw":3,"./gate":6}],5:[function(require,module,exports){
module.exports = {

    GROVERS_ALGORITHM: {"gates":[
        {"name":"GROV","qubits":4,"circuit":[
            {"type":"h","time":0,"targets":[0],"controls":[]},
            {"type":"h","time":0,"targets":[2],"controls":[]},
            {"type":"h","time":0,"targets":[3],"controls":[]},
            {"type":"h","time":0,"targets":[1],"controls":[]},
            {"type":"x","time":1,"targets":[0],"controls":[]},
            {"type":"x","time":1,"targets":[1],"controls":[]},
            {"type":"x","time":1,"targets":[2],"controls":[]},
            {"type":"x","time":1,"targets":[3],"controls":[]},
            {"type":"z","time":2,"targets":[3],"controls":[0,1,2]},
            {"type":"x","time":3,"targets":[0],"controls":[]},
            {"type":"x","time":3,"targets":[1],"controls":[]},
            {"type":"x","time":3,"targets":[2],"controls":[]},
            {"type":"x","time":3,"targets":[3],"controls":[]},
            {"type":"h","time":4,"targets":[0],"controls":[]},
            {"type":"h","time":4,"targets":[1],"controls":[]},
            {"type":"h","time":4,"targets":[2],"controls":[]},
            {"type":"h","time":4,"targets":[3],"controls":[]}
        ],"title":"Grover's Operator"},
        {"name":"F7","qubits":5,"circuit":[
            {"type":"x","time":0,"targets":[0],"controls":[]},
            {"type":"x","time":1,"targets":[4],"controls":[0,1,2,3]},
            {"type":"x","time":2,"targets":[0],"controls":[]}
        ],"title":"Oracle where F(7) is flagged"},
        {"name":"F5","qubits":5,"circuit":[
            {"type":"x","time":0,"targets":[0],"controls":[]},
            {"type":"x","time":0,"targets":[2],"controls":[]},
            {"type":"x","time":1,"targets":[4],"controls":[0,1,2,3]},
            {"type":"x","time":2,"targets":[0],"controls":[]},
            {"type":"x","time":2,"targets":[2],"controls":[]},
        ],"title":"Oracle where F(5) is flagged"},
        ], "circuit": [
            {"type":"h","time":0,"targets":[2],"controls":[]},
            {"type":"h","time":0,"targets":[1],"controls":[]},
            {"type":"h","time":0,"targets":[0],"controls":[]},
            {"type":"h","time":0,"targets":[4],"controls":[]},
            {"type":"h","time":0,"targets":[3],"controls":[]},
            {"type":"F7","time":6,"targets":[0,1,2,3,4],"controls":[]},
            {"type":"GROV","time":7,"targets":[0,1,2,3],"controls":[]},
            {"type":"F7","time":8,"targets":[0,1,2,3,4],"controls":[]},
            {"type":"GROV","time":9,"targets":[0,1,2,3],"controls":[]},
            {"type":"F7","time":10,"targets":[0,1,2,3,4],"controls":[]},
            {"type":"GROV","time":11,"targets":[0,1,2,3],"controls":[]},
            {"type":"h","time":17,"targets":[4],"controls":[]},
            {"type":"x","time":18,"targets":[4],"controls":[]}
        ],"qubits":5,"input":[0,0,0,0,1]
    },

    BELL_STATE: {"circuit":[
        {"type":"h","time":0,"targets":[0],"controls":[]},
        {"type":"x","time":1,"targets":[1],"controls":[0]}
    ],"qubits":2,"input":[0,0]},

    QFT2: {"circuit":[
        {"type":"h","time":0,"targets":[0],"controls":[]},
        {"type":"r2","time":1,"targets":[0],"controls":[1]},
        {"type":"h","time":2,"targets":[1],"controls":[]},
        {"type":"swap","time":3,"targets":[0,1],"controls":[]}
    ],"qubits":2,"input":[0,0]},

    QFT4: {"circuit":[
        {"type":"h","time":0,"targets":[0],"controls":[]},
        {"type":"r2","time":1,"targets":[0],"controls":[1]},
        {"type":"r4","time":2,"targets":[0],"controls":[2]},
        {"type":"r8","time":3,"targets":[0],"controls":[3]},
        {"type":"h","time":4,"targets":[1],"controls":[]},
        {"type":"r2","time":5,"targets":[1],"controls":[2]},
        {"type":"r4","time":6,"targets":[1],"controls":[3]},
        {"type":"h","time":7,"targets":[2],"controls":[]},
        {"type":"r2","time":8,"targets":[2],"controls":[3]},
        {"type":"h","time":9,"targets":[3],"controls":[]},
        {"type":"swap","time":10,"targets":[2,1],"controls":[]},
        {"type":"swap","time":11,"targets":[0,3],"controls":[]}
    ],"qubits":4,"input":[0,0,0,0]},

    TOFFOLI: {"circuit":[
        {"type":"h","time":0,"targets":[2],"controls":[]},
        {"type":"s","time":1,"targets":[2],"controls":[1]},
        {"type":"x","time":2,"targets":[1],"controls":[0]},
        {"type":"s","time":3,"targets":[2],"controls":[1]},
        {"type":"s","time":4,"targets":[2],"controls":[1]},
        {"type":"s","time":5,"targets":[2],"controls":[1]},
        {"type":"x","time":6,"targets":[1],"controls":[0]},
        {"type":"s","time":7,"targets":[2],"controls":[0]},
        {"type":"h","time":8,"targets":[2],"controls":[]}
    ],"qubits":3,"input":[0,0,0]},

    TELEPORTATION: {"gates":[
        {"name":"TEL","qubits":3,"circuit":[
            {"type":"h","time":0,"targets":[0],"controls":[]},
            {"type":"h","time":0,"targets":[2],"controls":[]},
            {"type":"x","time":1,"targets":[1],"controls":[2]},
            {"type":"x","time":2,"targets":[1],"controls":[0]},
            {"type":"h","time":3,"targets":[0],"controls":[]},
            {"type":"x","time":3,"targets":[2],"controls":[1]},
            {"type":"h","time":4,"targets":[2],"controls":[]},
            {"type":"x","time":5,"targets":[2],"controls":[0]}
        ],"title":"Quantum teleportation circuit"},
        {"name":"F","qubits":1,"circuit":[
            {"type":"h","time":0,"targets":[0],"controls":[]},
            {"type":"r4","time":1,"targets":[0],"controls":[]},
            {"type":"h","time":2,"targets":[0],"controls":[]},
            {"type":"r4","time":3,"targets":[0],"controls":[]},
            {"type":"h","time":4,"targets":[0],"controls":[]}
        ],"title":"Function creating 75% |0> and 25% |1> superposition"},
        {"name":"MEAS","qubits":2,"circuit":[
            {"type":"h","time":0,"targets":[0],"controls":[]},
            {"type":"h","time":0,"targets":[1],"controls":[]}
        ],"title":"Pseudo measurement (collapse by interference)"}
        ],"circuit":[
            {"type":"F","time":0,"targets":[0],"controls":[]},
            {"type":"TEL","time":9,"targets":[0,1,2],"controls":[]},
            {"type":"MEAS","time":18,"targets":[0,1],"controls":[]}
        ],"qubits":3,"input":[0,0,0]
    }

};
},{}],6:[function(require,module,exports){
module.exports = class Gate {

    constructor(type, time, targets, controls) {
        this.type = type;
        this.time = time;
        this.targets = targets;
        this.controls = controls || [];
        const qubits = this.targets.concat(this.controls);
        this.range = [
            Math.min.apply(Math, qubits),
            Math.max.apply(Math, qubits),
        ];
    }

    addControl(control) {
        if (this.controls.indexOf(control) < 0 && this.targets.indexOf(control) < 0) {
            this.controls.push(control);
            this.range[0] = Math.min(this.range[0], control);
            this.range[1] = Math.max(this.range[1], control);
        }
    }

    removeControl(control) {
        this.controls.splice(this.controls.indexOf(control), 1);
        const qubits = this.targets.concat(this.controls);
        this.range = [
            Math.min.apply(Math, qubits),
            Math.max.apply(Math, qubits),
        ];
    };

    touching(time, qubit) {
        if (time != this.time) {
            return false;
        }
        return this.range[0] <= qubit && qubit <= this.range[1];
    }

    render(draw) {
        const x = this.time * 40 + 20;
        const y1 = this.targets[0] * 40 + 20;
        for (let i = 0; i < this.controls.length; i++) {
            const y2 = this.controls[i] * 40 + 20;
            draw.control(x, y2);
            draw.wire(x, y1, y2);
        }
        if (this.type.name == 'x' && this.controls.length > 0) {
            draw.not(x, y1);
        } else if (this.type.name == 'swap') {
            const y2 = this.targets[1] * 40 + 20;
            draw.swap(x, y1);
            draw.wire(x, y1, y2);
            draw.swap(x, y2);
        } else {
            draw.gate(x, y1, this.targets.length, this.type.name.toUpperCase());
        }
    }

}

},{}],7:[function(require,module,exports){
const FILE_VERSION = 1;

const Application = require('./application');
const examples = require('./examples');

const displayAmplitudes = (nqubits, amplitudes) => {
    const table = document.querySelector('#amplitudes');
    table.innerHTML = '';
    const hideBtn = document.querySelector('#hide-impossible');
    const hide = hideBtn.innerHTML !== '(hide impossible)';
    document.querySelector('#amplitudes-container').style.display = 'block';
    for (let i = 0; i < amplitudes.x.length; i++) {
        let amplitude = '';
        let state = '';
        for (let j = 0; j < nqubits; j++) {
            state = ((i & (1 << j)) >> j) + state;
        }
        amplitude += amplitudes.x[i].toFixed(8);
        amplitude += amplitudes.y[i] < 0 ? '-' : '+';
        amplitude += Math.abs(amplitudes.y[i]).toFixed(8) + 'i';
        const row = document.createElement('tr');
        let prob = Math.pow(amplitudes.x[i], 2);
        prob += Math.pow(amplitudes.y[i], 2);
        if (prob < numeric.epsilon) {
            if (hide) {
                continue;
            } else {
                row.style.color = '#ccc';
            }
        }
        const probability = (prob * 100).toFixed(4) + '%';
        row.innerHTML = `
            <td style="text-align: right">${amplitude}</td>
            <td>|${state}></td>
            <td style="text-indent: 20px">${probability}</td>
        `;
        table.appendChild(row);
    }
}

window.onload = () => {
    document.querySelector('#toolbar').onselectstart = evt => false;
    const canvas = document.getElementById('canvas');
    const app = new Application(canvas, 2);
    const editor = app.editor;

    const hideBtn = document.querySelector('#hide-impossible');
    hideBtn.onclick = evt => {
        evt.preventDefault();
        const hide = '(hide impossible)';
        const show = '(show all)';
        hideBtn.innerHTML = hideBtn.innerHTML == hide ? show : hide;
        document.querySelector('#evaluate').click();
    };

    document.querySelector('#reset').onclick = evt => {
        evt.preventDefault();
        const ok = confirm('Clear entire circuit?');
        if (ok) {
            app.circuit.gates = [];
            editor.render();
        }
    };

    document.querySelector('#evaluate').onclick = evt => {
        evt.preventDefault();
        app.circuit.gates.sort((a, b) => a.time - b.time);
        const size = Math.pow(2, app.circuit.nqubits);
        const amplitudes = new numeric.T(numeric.rep([size], 0), numeric.rep([size], 0));
        const state = editor.input.join('');
        amplitudes.x[parseInt(state, 2)] = 1;
        app.applyCircuit(app.circuit, amplitudes, amplitudes => {
            displayAmplitudes(app.circuit.nqubits, amplitudes.div(amplitudes.norm2()))
        });
    };

    document.body.onkeydown = evt => {
        // Catch hotkeys
        if (evt.which == 'S'.charCodeAt(0) && evt.ctrlKey) {
            evt.preventDefault();
            document.querySelector('#compile').click();
        } else if (evt.which == 13) {
            evt.preventDefault();
            document.querySelector('#evaluate').click();
        }
    };

    document.querySelector('#compile').onclick = evt => {
        evt.preventDefault();
        app.circuit.gates.sort((a, b) => a.time - b.time);
        const size = Math.pow(2, app.circuit.nqubits);
        const U = new numeric.T(numeric.identity(size), numeric.rep([size, size], 0));
        app.applyCircuit(app.circuit, U, U => {
            const name = prompt('Name of gate:', 'F');
            if (name) {
                if (app.workspace.gates[name]) {
                    app.workspace.gates[name].matrix = U;
                    app.workspace.gates[name].circuit = app.circuit.copy();
                    app.workspace.gates[name].nqubits = app.circuit.nqubits;
                    app.workspace.gates[name].input = app.editor.input;
                } else {
                    app.workspace.addGate({
                        name: name,
                        qubits: app.circuit.nqubits,
                        matrix: U,
                        circuit: app.circuit.copy(),
                        input: app.editor.input
                    });
                }
            }
        });
    };

    document.querySelector('#exportImage').onclick = evt => {
        evt.preventDefault();
        const oldlength = editor.length;
        const times = app.circuit.gates.map(gate => gate.time);
        editor.resize(app.circuit.nqubits, Math.max.apply(Math, times) + 1);
        window.open(editor.draw.canvas.toDataURL("image/png"));
        editor.resize(app.circuit.nqubits, oldlength);
    };

    document.querySelector('#exportMatrix').onclick = evt => {
        evt.preventDefault();
        app.circuit.gates.sort((a, b) => a.time - b.time);
        const size = Math.pow(2, app.circuit.nqubits);
        const U = new numeric.T(numeric.identity(size), numeric.rep([size, size], 0));
        app.applyCircuit(app.circuit, U, U => {
            const child = window.open('', 'matrix.csv', ',resizable=yes,scrollbars=yes,menubar=yes,toolbar=yes,titlebar=yes,hotkeys=yes,status=1,dependent=no');
            for (let i = 0; i < U.x.length; i++) {
                const row = [];
                for (let j = 0; j < U.x[i].length; j++) {
                    row.push(U.x[i][j].toFixed(16) + '+' + U.y[i][j].toFixed(16) + 'i');
                }
                child.document.write(row.join(',') + '<br>');
            }
        });
    };

    document.querySelector('#importJSON').onclick = evt => {
        evt.preventDefault();
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = evt => {
            const reader = new FileReader();
            reader.onloadend = evt => {
                if (evt.target.readyState !== FileReader.DONE) {
                    return;
                }
                app.loadWorkspace(JSON.parse(evt.target.result));
            };
            reader.readAsText(evt.target.files[0]);
        };
        input.click();
    };

    document.querySelector('#exportJSON').onclick = evt => {
        evt.preventDefault();
        const out = app.exportWorkspace();
        out.version = FILE_VERSION;
        const blob = new Blob([JSON.stringify(out)]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workspace.json';
        a.click();
    };

    const resize = size => {
        document.querySelector('#nqubits > span').innerHTML = 'Qubits: ' + size;
        const newGates = app.circuit.gates.filter(gate => {
            return gate.range[1] < size;
        });
        if (newGates.length < app.circuit.gates.length) {
            const count = app.circuit.gates.length - newGates.length;
            const ok = confirm('Resizing will remove ' + count + ' gates. Resize anyway?')
            if (ok) {
                app.circuit.gates = newGates;
                editor.resize(size, editor.length);
            }
        } else {
            editor.resize(size, editor.length);
        }
    };

    const nqubitsUl = document.querySelector('#nqubits > ul');
    for (let i = 1; i < 11; i++) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.innerHTML = i;
        a.onclick = evt => {
            evt.preventDefault();
            resize(i);
        };
        li.appendChild(a);
        nqubitsUl.appendChild(li);
        if (i == 2) {
            a.click();
        }
    }

    const getUrlVars = () => {
        const vars = [];
        const location = window.location.href;
        const hashes = location.slice(location.indexOf('?') + 1).split('&');
        for(let i = 0; i < hashes.length; i++) {
            const hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = decodeURI(hash[1]);
        }
        return vars;
    }

    const EXAMPLES = [
        ["Toffoli", examples.TOFFOLI],
        ["Bell State", examples.BELL_STATE],
        ["2 Qubit QFT", examples.QFT2],
        ["4 Qubit QFT", examples.QFT4],
        ["Grover's Algorithm", examples.GROVERS_ALGORITHM],
        ["Quantum Teleportation", examples.TELEPORTATION],
    ];
    const examplesEl = document.querySelector('#examples');
    EXAMPLES.forEach((example, i) => {
        const name = example[0];
        const json = example[1];
        const a = document.createElement('a');
        a.href = '#';
        a.appendChild(document.createTextNode(name));
        a.onclick = evt => {
            evt.preventDefault();
            open('?example=' + example[0]);
        };
        if (getUrlVars().example == name) {
            app.loadWorkspace(json);
        }
        const li = document.createElement('li');
        li.appendChild(a);
        examplesEl.appendChild(li);
    });

    document.querySelector('#about').onclick = evt => {
        document.querySelector('#modal').style.display = 'block';
    };

    document.querySelector('#modal').onclick = evt => {
        document.querySelector('#modal').style.display = 'none';
    };

    document.querySelector('#modal > div').onclick = evt => {
        evt.preventDefault();
        evt.stopPropagation();
    };

};

},{"./application":1,"./examples":5}],8:[function(require,module,exports){
const quantum = module.exports;

/*
Return version of U controlled by first qubit.
*/
quantum.controlled = U => {
    const m = U.x.length;
    const Mx = numeric.identity(m * 2);
    const My = numeric.rep([m * 2, m * 2], 0);
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) {
            Mx[i + m][j + m] = U.x[i][j];
            My[i + m][j + m] = U.y[i][j];
        }
    }
    return new numeric.T(Mx, My);
};

/*
Return transformation over entire nqubit register that applies U to
specified qubits (in order given).
Algorithm from Lee Spector's "Automatic Quantum Computer Programming"
*/
quantum.expandMatrix = (nqubits, U, qubits) => {
    const _qubits = [];
    const n = Math.pow(2, nqubits);
    qubits = qubits.slice(0);
    for (let i = 0; i < qubits.length; i++) {
        qubits[i] = (nqubits - 1) - qubits[i];
    }
    qubits.reverse();
    for (let i = 0; i < nqubits; i++) {
        if (qubits.indexOf(i) == -1) {
            _qubits.push(i);
        }
    }
    const X = numeric.rep([n, n], 0);
    const Y = numeric.rep([n, n], 0);
    let i = n;
    while (i--) {
        let j = n;
        while (j--) {
            let bitsEqual = true;
            let k = _qubits.length;
            while (k--) {
                if ((i & (1 << _qubits[k])) != (j & (1 << _qubits[k]))) {
                    bitsEqual = false;
                    break;
                }
            }
            if (bitsEqual) {
                let istar = 0;
                let jstar = 0;
                let k = qubits.length;
                while (k--) {
                    const q = qubits[k];
                    istar |= ((i & (1 << q)) >> q) << k;
                    jstar |= ((j & (1 << q)) >> q) << k;
                }
                X[i][j] = U.x[istar][jstar];
                Y[i][j] = U.y[istar][jstar];
            }
        }
    }
    return new numeric.T(X, Y);
};

quantum.h = new numeric.T(
    numeric.div([[1, 1], [1, -1]], Math.sqrt(2)),
    numeric.rep([2, 2], 0)
);

quantum.x = new numeric.T(
    [[0, 1], [1, 0]],
    numeric.rep([2, 2], 0)
);

quantum.y = new numeric.T(
    numeric.rep([2, 2], 0),
    [[0, -1], [1, 0]]
);

quantum.z = new numeric.T(
    [[1, 0], [0, -1]],
    numeric.rep([2, 2], 0)
);

quantum.s = new numeric.T(
    [[1, 0], [0, 0]],
    [[0, 0], [0, 1]]
);

const makeR = theta => {
    const x = Math.cos(theta);
    const y = Math.sin(theta);
    return new numeric.T([[1, 0], [0, x]], [[0, 0], [0, y]]);
}

quantum.r2 = makeR(Math.PI / 2);
quantum.r4 = makeR(Math.PI / 4);
quantum.r8 = makeR(Math.PI / 8);

quantum.swap = new numeric.T(
    [
        [1, 0, 0, 0],
        [0, 0, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
    ],
    numeric.rep([4, 4], 0)
);

/*
Return Quantum Fourier Transform matrix of an nqubit register operating
on specified qubits.
*/
quantum.qft = (nqubits) => {
    const n = Math.pow(2, nqubits);
    const wtheta = (2 * Math.PI) / n;
    const x = numeric.rep([n, n], 0);
    const y = numeric.rep([n, n], 0);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            x[i][j] = Math.cos(i * j * wtheta);
            y[i][j] = Math.sin(i * j * wtheta);
        }
    }
    return new numeric.T(x, y).div(Math.sqrt(n));
};

quantum.srn = new numeric.T(
    numeric.div([[1, -1], [1, 1]], Math.sqrt(2)),
    numeric.rep([2, 2], 0)
);

},{}],9:[function(require,module,exports){
const quantum = require('./quantum');

module.exports = class Workspace {

    constructor(app) {
        this.app = app;
        this.gates = {};
        this.installStandardGates();
    }

    installStandardGates() {
        this.addGate({name: 'h', qubits: 1, matrix: quantum.h, title: 'Hadamard'}, true);
        this.addGate({name: 'x', qubits: 1, matrix: quantum.x, title: 'Pauli-X'}, true);
        this.addGate({name: 'y', qubits: 1, matrix: quantum.y, title: 'Pauli-Y'}, true);
        this.addGate({name: 'z', qubits: 1, matrix: quantum.z, title: 'Pauli-Z'}, true);
        this.addGate({name: 's', qubits: 1, matrix: quantum.s, title: 'Phase Gate'}, true);
        this.addGate({name: 't', qubits: 1, matrix: quantum.r4, title: 'Same as R4'}, true);
        this.addGate({name: 'cnot', qubits: 2, matrix: quantum.cnot, title: 'Controlled Not'}, true);
        this.addGate({name: 'control', title: 'Control'}, true);
        this.addGate({name: 'swap', qubits: 2, matrix: quantum.swap, title: 'Swap'}, true);
        this.addGate({name: 'r2', qubits: 1, matrix: quantum.r2, title: 'Pi/2 Phase Rotatation'}, true);
        this.addGate({name: 'r4', qubits: 1, matrix: quantum.r4, title: 'Pi/4 Phase Rotatation'}, true);
        this.addGate({name: 'r8', qubits: 1, matrix: quantum.r8, title: 'Pi/8 Phase Rotatation'}, true);
        this.addGate({name: 'qft', qubits: Infinity, fn: quantum.qft, title: 'Quantum Fourier Transform'}, true);
        this.addGate({name: 'srn', qubits: 1, matrix: quantum.srn, title: 'Sqrt(Not)'}, true);
    }

    addGate(ops, std) {
        this.gates[ops.name] = {
            name: ops.name,
            qubits: ops.qubits,
            matrix: ops.matrix,
            circuit: ops.circuit,
            fn: ops.fn,
            title: ops.title,
            input: ops.input,
            std: std || false
        };
        this.app.addToolbarButton(std ? 'std' : 'user', ops.name, ops.title);
    }

}


},{"./quantum":8}]},{},[7]);
