(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Circuit = require('./circuit');
var Draw = require('./draw');
var Editor = require('./editor');
var Gate = require('./gate');
var Workspace = require('./workspace');

module.exports = function () {
    function Application(canvas, nqubits) {
        _classCallCheck(this, Application);

        var app = this;
        this.workspace = new Workspace(app);
        var circuit = this.circuit = new Circuit(app, nqubits);
        var editor = this.editor = new Editor(app, canvas);
        var toolbar = document.querySelector('#toolbar');
        toolbar.onclick = function (evt) {
            var target = findParent(evt.target, function (el) {
                return el.className && el.className.indexOf('gate') > -1;
            });
            if (target) {
                var current = document.querySelector('#toolbar div.gate.active');
                if (current) {
                    current.className = 'gate';
                }
                target.className = 'active gate';
                editor.activeGate = app.workspace.gates[target.dataset.type];
            }
        };
        var userTools = document.querySelector('#toolbar .user');
        userTools.ondblclick = function (evt) {
            // Open gate from toolbar
            evt.preventDefault();
            var target = findParent(evt.target, function (el) {
                return el.className && el.className.indexOf('gate') > -1;
            });
            if (target) {
                var ok = true;
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


    _createClass(Application, [{
        key: 'editCircuit',
        value: function editCircuit(gate) {
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

    }, {
        key: 'addToolbarButton',
        value: function addToolbarButton(type, name, title) {
            var canvas = document.createElement('canvas');
            var draw = new Draw(canvas, 1, 1);
            var tool = document.createElement('div');
            tool.dataset.type = name;
            tool.className = "gate";
            tool.title = title || '';
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
            var img = document.createElement('img');
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

    }, {
        key: 'loadWorkspace',
        value: function loadWorkspace(json) {
            document.querySelector('#toolbar .std').innerHTML = '';
            document.querySelector('#toolbar .user').innerHTML = '';
            this.workspace = new Workspace(this);
            if (json.gates) {
                for (var i = 0; i < json.gates.length; i++) {
                    var gate = json.gates[i];
                    this.workspace.addGate({
                        name: gate.name,
                        qubits: gate.qubits,
                        matrix: gate.matrix,
                        fn: gate.fn,
                        title: gate.title,
                        circuit: Circuit.load(this, gate.qubits, gate.circuit)
                    });
                }
            }
            this.circuit = Circuit.load(this, json.qubits, json.circuit);
            this.editor.resize(this.circuit.nqubits, this.editor.length);
            this.editor.input = json.input;
            document.querySelector('#nqubits > span').innerHTML = 'Qubits: ' + this.circuit.nqubits;
            this.compileAll();
            this.editor.render();
        }

        /*
        Return object representation of workspace capable of being exported to JSON.
        */

    }, {
        key: 'exportWorkspace',
        value: function exportWorkspace() {
            var workspace = this.workspace;
            this.circuit.gates.sort(function (a, b) {
                return a.time - b.time;
            });
            var gates = [];
            for (var key in workspace.gates) {
                var gate = workspace.gates[key];
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
        */

    }, {
        key: 'compileAll',
        value: function compileAll() {
            var app = this;
            var todo = [];
            var workspace = this.workspace;
            document.querySelectorAll('#toolbar .user div.gate').forEach(function (el) {
                var type = workspace.gates[el.dataset.type];
                if (!type.matrix) {
                    todo.push(type);
                }
            });
            var loop = function loop(i) {
                if (i < todo.length) {
                    var n = Math.pow(2, todo[i].circuit.nqubits);
                    var I = new numeric.T(numeric.identity(n), numeric.rep([n, n], 0));
                    app.applyCircuit(todo[i].circuit, I, function (U) {
                        todo[i].matrix = U;
                        setTimeout(function () {
                            return loop(i + 1);
                        }, 1);
                    });
                }
            };
            loop(0);
        }

        /*
        Applies circuit to matrix and passes result to callback
        */

    }, {
        key: 'applyCircuit',
        value: function applyCircuit(circuit, x, callback) {
            var wrapper = document.querySelector('#progress');
            wrapper.style.display = 'inline-block';
            var progress = document.querySelector('#progress > div');
            progress.width = 0;
            circuit.evaluate(x, function (percent) {
                progress.style.width = wrapper.clientWidth * percent;
            }, function (x) {
                wrapper.style.display = 'none';
                callback(x);
            });
        }
    }]);

    return Application;
}();

/*
Search for ancestor in DOM.
*/
var findParent = function findParent(el, test) {
    while (el.parentNode && !test(el)) {
        el = el.parentNode;
    }
    if (el !== document) {
        return el;
    }
};

},{"./circuit":2,"./draw":3,"./editor":4,"./gate":6,"./workspace":9}],2:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Gate = require('./gate');
var quantum = require('./quantum');

var Circuit = function () {
    function Circuit(app, nqubits) {
        _classCallCheck(this, Circuit);

        this.app = app;
        this.nqubits = nqubits;
        this.gates = [];
        this.matrix = null;
        this.inputs = [];
    }

    /*
    Return JSON-capable object representation of this circuit
    */


    _createClass(Circuit, [{
        key: 'toJSON',
        value: function toJSON() {
            var circuit = [];
            for (var i = 0; i < this.gates.length; i++) {
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

    }, {
        key: 'copy',
        value: function copy() {
            var circuit = new Circuit(this.app, this.nqubits);
            for (var i = 0; i < this.gates.length; i++) {
                var gate = this.gates[i];
                circuit.addGate(new Gate(gate.type, gate.time, gate.targets, gate.controls));
            }
            return circuit;
        }

        /*
        Add a gate to this circuit
        (note that this destroys the current compiled matrix)
        */

    }, {
        key: 'addGate',
        value: function addGate(gate) {
            this.gates.push(gate);
            this.matrix = null;
        }

        /*
        Remove a gate from this circuit
        (note that this destroys the current compiled matrix)
        */

    }, {
        key: 'removeGate',
        value: function removeGate(gate) {
            this.gates.splice(this.gates.indexOf(gate), 1);
            this.matrix = null;
        }

        /*
        Evaluate this circuit on "x" (a matrix or state vector) calling "progress"
        along the way with the percentage of completion and finally calling
        "callback" with the result.
        */

    }, {
        key: 'evaluate',
        value: function evaluate(x, progress, callback) {
            var circuit = this;
            (function applyLoop(i) {
                progress(i / circuit.gates.length);
                if (i < circuit.gates.length) {
                    var U = void 0;
                    var gate = circuit.gates[i];
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
                    setTimeout(function () {
                        return applyLoop(i + 1);
                    }, 1);
                } else {
                    callback(x);
                }
            })(0);
        }
    }]);

    return Circuit;
}();

module.exports = Circuit;

Circuit.load = function (app, nqubits, gates) {
    var circuit = new Circuit(app, nqubits);
    for (var i = 0; i < gates.length; i++) {
        var gate = gates[i];
        circuit.addGate(new Gate(app.workspace.gates[gate.type], gate.time + 1, gate.targets, gate.controls));
    }
    return circuit;
};

},{"./gate":6,"./quantum":8}],3:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
Rendering primatives for circuit grid
*/
module.exports = function () {
    function Draw(canvas, nqubits, length) {
        _classCallCheck(this, Draw);

        this.canvas = canvas;
        this.gfx = new Processing(canvas);
        this.nqubits = nqubits;
        this.length = length;
        this.gfx.textFont(this.gfx.loadFont('monospace'));
        this.gfx.textAlign(this.gfx.CENTER);
        this.gfx.size(length * 40, nqubits * 40);
    }

    _createClass(Draw, [{
        key: 'resize',
        value: function resize(nqubits, length) {
            this.nqubits = nqubits;
            this.length = length;
            this.gfx.size(length * 40, nqubits * 40);
        }
    }, {
        key: 'clear',
        value: function clear() {
            this.gfx.background(255);
            for (var i = 0; i < this.nqubits; i++) {
                this.gfx.line(0, i * 40 + 20, this.length * 40, i * 40 + 20);
            }
        }
    }, {
        key: 'selection',
        value: function selection(x, qubits, r, g, b, a) {
            this.gfx.noStroke();
            this.gfx.fill(r, g, b, a);
            for (var i = 0; i < qubits.length; i++) {
                this.gfx.rect(x, qubits[i] * 40, 40, 40);
            }
            this.gfx.fill(255);
            this.gfx.stroke(0);
        }
    }, {
        key: 'qubit',
        value: function qubit(x, y, h, state) {
            this.gfx.textSize(17);
            this.gfx.noStroke();
            this.gfx.fill(255);
            this.gfx.rect(x - 20, y - 17, 40, h * 40 - 6);
            this.gfx.fill(0);
            this.gfx.text(state ? '|1>' : '|0>', x, y + h / 2 * 40 - 15);
            this.gfx.fill(255);
            this.gfx.stroke(0);
            this.gfx.textSize(11);
        }
    }, {
        key: 'gate',
        value: function gate(x, y, h, text) {
            this.gfx.fill(255);
            this.gfx.rect(x - 17, y - 17, 40 - 6, h * 40 - 6);
            this.gfx.fill(0);
            this.gfx.text(text, x, y + h / 2 * 40 - 17);
            this.gfx.fill(255);
        }
    }, {
        key: 'swap',
        value: function swap(x, y) {
            this.gfx.line(x - 5, y - 5, x + 5, y + 5);
            this.gfx.line(x - 5, y + 5, x + 5, y - 5);
        }
    }, {
        key: 'not',
        value: function not(x, y) {
            this.gfx.noFill();
            this.gfx.ellipse(x, y, 20, 20);
            this.gfx.fill(255);
            this.gfx.line(x - 9, y, x + 9, y);
            this.gfx.line(x, y - 9, x, y + 9);
        }
    }, {
        key: 'wire',
        value: function wire(x, y1, y2) {
            this.gfx.line(x, y1, x, y2);
        }
    }, {
        key: 'control',
        value: function control(x, y) {
            this.gfx.fill(0);
            this.gfx.ellipse(x, y, 10, 10);
        }
    }]);

    return Draw;
}();

},{}],4:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Draw = require('./draw');
var Gate = require('./gate');

module.exports = function () {
    function Editor(app, canvas) {
        _classCallCheck(this, Editor);

        var length = 20;
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


    _createClass(Editor, [{
        key: 'resize',
        value: function resize(nqubits, length) {
            this.draw.resize(nqubits, length);
            this.app.circuit.nqubits = nqubits;
            this.length = length;
            this.input = numeric.rep([nqubits], 0);
            this.render();
        }
    }, {
        key: 'leftClick',
        value: function leftClick(time, qubit) {
            var _this = this;

            var editor = this;
            var node = this.draw.canvas;
            var circuit = this.app.circuit;
            // Clear mouse events
            node.onmouseup = null;
            node.onmouseout = null;
            node.onmousedown = null;
            node.onmousemove = null;
            node.onmousemove = function (evt2) {
                // Handles highlighting while dragging
                if (typeof evt2.offsetY == 'undefined') {
                    evt2.offsetY = evt2.layerY - node.offsetTop;
                }
                var qubits = editor.getSelection(qubit, Math.floor(evt2.offsetY / 40));
                editor.render();
                editor.draw.selection(time * 40, qubits, 255, 153, 0, 128);
            };
            node.onmouseup = function (evt2) {
                if (typeof evt2.offsetY == 'undefined') {
                    evt2.offsetY = evt2.pageY - node.offsetTop;
                }
                // Get array of selected qubits
                var qubits = editor.getSelection(qubit, Math.floor(evt2.offsetY / 40));
                var type = editor.activeGate;
                if (time == 0) {
                    // Toggle inputs
                    for (var i = 0; i < qubits.length; i++) {
                        editor.input[qubits[i]] = 1 - editor.input[qubits[i]];
                    }
                } else if (type.name == 'control') {
                    // Add control to a gate (if possible)
                    var collisionA = false;
                    var collisionB = false;
                    for (var j = 0; j < circuit.gates.length; j++) {
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
                        for (var _i = 0; _i < qubits.length; _i++) {
                            editor.createGate(type, time, [qubits[_i]]);
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
                _this.bindEvents();
                editor.render();
            };
        }
    }, {
        key: 'rightClick',
        value: function rightClick(time, qubit) {
            var circuit = this.app.circuit;
            var editor = this;
            var old = circuit.gates.length;
            var collision = false;
            if (time == 0) {
                // Set input to 0
                this.input[qubit] = 0;
            } else {
                // Find gate or control and remove it
                for (var j = 0; j < circuit.gates.length; j++) {
                    if (circuit.gates[j].touching(time, qubit)) {
                        collision = circuit.gates[j];
                    }
                }
                if (collision) {
                    var control = collision.controls.indexOf(qubit);
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
    }, {
        key: 'bindEvents',
        value: function bindEvents() {
            var editor = this;
            var node = this.draw.canvas;
            node.onmouseout = function (evt) {
                // This stops the mouseover highlight from lingering after mouseout
                editor.render();
            };
            node.onmousemove = function (evt) {
                // Highlight tile under mouse
                if (typeof evt.offsetX == 'undefined') {
                    evt.offsetX = evt.pageX - node.offsetLeft;
                }
                if (typeof evt.offsetY == 'undefined') {
                    evt.offsetY = evt.pageY - node.offsetTop;
                }
                editor.render();
                var x = Math.floor(evt.offsetX / 40);
                var y = Math.floor(evt.offsetY / 40);
                editor.draw.selection(x * 40, [y], 119, 153, 255, 64);
            };

            node.onmousedown = function (evt) {
                // Dispatch left/right click events
                if (typeof evt.offsetX == 'undefined') {
                    evt.offsetX = evt.pageX - node.offsetLeft;
                }
                if (typeof evt.offsetY == 'undefined') {
                    evt.offsetY = evt.pageY - node.offsetTop;
                }
                var x = Math.floor(evt.offsetX / 40);
                var y = Math.floor(evt.offsetY / 40);
                if (evt.which == 1) {
                    editor.leftClick(x, y);
                } else if (evt.which == 2 || evt.which == 3) {
                    editor.rightClick(x, y);
                }
            };
        }
    }, {
        key: 'createGate',
        value: function createGate(type, time, qubits) {
            var circuit = this.app.circuit;
            var collision = false;
            // Find collision (can't add a gate where one already exists)
            for (var i = 0; i < qubits.length; i++) {
                for (var j = 0; j < circuit.gates.length; j++) {
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

    }, {
        key: 'getSelection',
        value: function getSelection(y1, y2) {
            var dy = y2 - y1;
            var h = Math.abs(dy) + 1;
            var qubits = [];
            if (dy < 0) {
                for (var i = y1; i > y1 - h; i--) {
                    qubits.push(i);
                }
            } else {
                for (var _i2 = y1; _i2 < y1 + h; _i2++) {
                    qubits.push(_i2);
                }
            }
            return qubits;
        }

        /*
        Render entire editor
        */

    }, {
        key: 'render',
        value: function render() {
            this.draw.clear();
            for (var i = 0; i < this.app.circuit.gates.length; i++) {
                this.app.circuit.gates[i].render(this.draw);
            }
            for (var _i3 = 0; _i3 < this.app.circuit.nqubits; _i3++) {
                this.draw.qubit(20, 20 + _i3 * 40, 1, this.input[_i3]);
            }
        }
    }]);

    return Editor;
}();

},{"./draw":3,"./gate":6}],5:[function(require,module,exports){
"use strict";

module.exports = {

    GROVERS_ALGORITHM: { "gates": [{ "name": "GROV", "qubits": 4, "circuit": [{ "type": "h", "time": 0, "targets": [0], "controls": [] }, { "type": "h", "time": 0, "targets": [2], "controls": [] }, { "type": "h", "time": 0, "targets": [3], "controls": [] }, { "type": "h", "time": 0, "targets": [1], "controls": [] }, { "type": "x", "time": 1, "targets": [0], "controls": [] }, { "type": "x", "time": 1, "targets": [1], "controls": [] }, { "type": "x", "time": 1, "targets": [2], "controls": [] }, { "type": "x", "time": 1, "targets": [3], "controls": [] }, { "type": "z", "time": 2, "targets": [3], "controls": [0, 1, 2] }, { "type": "x", "time": 3, "targets": [0], "controls": [] }, { "type": "x", "time": 3, "targets": [1], "controls": [] }, { "type": "x", "time": 3, "targets": [2], "controls": [] }, { "type": "x", "time": 3, "targets": [3], "controls": [] }, { "type": "h", "time": 4, "targets": [0], "controls": [] }, { "type": "h", "time": 4, "targets": [1], "controls": [] }, { "type": "h", "time": 4, "targets": [2], "controls": [] }, { "type": "h", "time": 4, "targets": [3], "controls": [] }], "title": "Grover's Operator" }, { "name": "F7", "qubits": 5, "circuit": [{ "type": "x", "time": 0, "targets": [0], "controls": [] }, { "type": "x", "time": 1, "targets": [4], "controls": [0, 1, 2, 3] }, { "type": "x", "time": 2, "targets": [0], "controls": [] }], "title": "Oracle where F(7) is flagged" }, { "name": "F5", "qubits": 5, "circuit": [{ "type": "x", "time": 0, "targets": [0], "controls": [] }, { "type": "x", "time": 0, "targets": [2], "controls": [] }, { "type": "x", "time": 1, "targets": [4], "controls": [0, 1, 2, 3] }, { "type": "x", "time": 2, "targets": [0], "controls": [] }, { "type": "x", "time": 2, "targets": [2], "controls": [] }], "title": "Oracle where F(5) is flagged" }], "circuit": [{ "type": "h", "time": 0, "targets": [2], "controls": [] }, { "type": "h", "time": 0, "targets": [1], "controls": [] }, { "type": "h", "time": 0, "targets": [0], "controls": [] }, { "type": "h", "time": 0, "targets": [4], "controls": [] }, { "type": "h", "time": 0, "targets": [3], "controls": [] }, { "type": "F7", "time": 6, "targets": [0, 1, 2, 3, 4], "controls": [] }, { "type": "GROV", "time": 7, "targets": [0, 1, 2, 3], "controls": [] }, { "type": "F7", "time": 8, "targets": [0, 1, 2, 3, 4], "controls": [] }, { "type": "GROV", "time": 9, "targets": [0, 1, 2, 3], "controls": [] }, { "type": "F7", "time": 10, "targets": [0, 1, 2, 3, 4], "controls": [] }, { "type": "GROV", "time": 11, "targets": [0, 1, 2, 3], "controls": [] }, { "type": "h", "time": 17, "targets": [4], "controls": [] }, { "type": "x", "time": 18, "targets": [4], "controls": [] }], "qubits": 5, "input": [0, 0, 0, 0, 1]
    },

    BELL_STATE: { "circuit": [{ "type": "h", "time": 0, "targets": [0], "controls": [] }, { "type": "x", "time": 1, "targets": [1], "controls": [0] }], "qubits": 2, "input": [0, 0] },

    QFT2: { "circuit": [{ "type": "h", "time": 0, "targets": [0], "controls": [] }, { "type": "r2", "time": 1, "targets": [0], "controls": [1] }, { "type": "h", "time": 2, "targets": [1], "controls": [] }, { "type": "swap", "time": 3, "targets": [0, 1], "controls": [] }], "qubits": 2, "input": [0, 0] },

    QFT4: { "circuit": [{ "type": "h", "time": 0, "targets": [0], "controls": [] }, { "type": "r2", "time": 1, "targets": [0], "controls": [1] }, { "type": "r4", "time": 2, "targets": [0], "controls": [2] }, { "type": "r8", "time": 3, "targets": [0], "controls": [3] }, { "type": "h", "time": 4, "targets": [1], "controls": [] }, { "type": "r2", "time": 5, "targets": [1], "controls": [2] }, { "type": "r4", "time": 6, "targets": [1], "controls": [3] }, { "type": "h", "time": 7, "targets": [2], "controls": [] }, { "type": "r2", "time": 8, "targets": [2], "controls": [3] }, { "type": "h", "time": 9, "targets": [3], "controls": [] }, { "type": "swap", "time": 10, "targets": [2, 1], "controls": [] }, { "type": "swap", "time": 11, "targets": [0, 3], "controls": [] }], "qubits": 4, "input": [0, 0, 0, 0] },

    TOFFOLI: { "circuit": [{ "type": "h", "time": 0, "targets": [2], "controls": [] }, { "type": "s", "time": 1, "targets": [2], "controls": [1] }, { "type": "x", "time": 2, "targets": [1], "controls": [0] }, { "type": "s", "time": 3, "targets": [2], "controls": [1] }, { "type": "s", "time": 4, "targets": [2], "controls": [1] }, { "type": "s", "time": 5, "targets": [2], "controls": [1] }, { "type": "x", "time": 6, "targets": [1], "controls": [0] }, { "type": "s", "time": 7, "targets": [2], "controls": [0] }, { "type": "h", "time": 8, "targets": [2], "controls": [] }], "qubits": 3, "input": [0, 0, 0] },

    TELEPORTATION: { "gates": [{ "name": "TEL", "qubits": 3, "circuit": [{ "type": "h", "time": 0, "targets": [0], "controls": [] }, { "type": "h", "time": 0, "targets": [2], "controls": [] }, { "type": "x", "time": 1, "targets": [1], "controls": [2] }, { "type": "x", "time": 2, "targets": [1], "controls": [0] }, { "type": "h", "time": 3, "targets": [0], "controls": [] }, { "type": "x", "time": 3, "targets": [2], "controls": [1] }, { "type": "h", "time": 4, "targets": [2], "controls": [] }, { "type": "x", "time": 5, "targets": [2], "controls": [0] }], "title": "Quantum teleportation circuit" }, { "name": "F", "qubits": 1, "circuit": [{ "type": "h", "time": 0, "targets": [0], "controls": [] }, { "type": "r4", "time": 1, "targets": [0], "controls": [] }, { "type": "h", "time": 2, "targets": [0], "controls": [] }, { "type": "r4", "time": 3, "targets": [0], "controls": [] }, { "type": "h", "time": 4, "targets": [0], "controls": [] }], "title": "Function creating 75% |0> and 25% |1> superposition" }, { "name": "MEAS", "qubits": 2, "circuit": [{ "type": "h", "time": 0, "targets": [0], "controls": [] }, { "type": "h", "time": 0, "targets": [1], "controls": [] }], "title": "Pseudo measurement (collapse by interference)" }], "circuit": [{ "type": "F", "time": 0, "targets": [0], "controls": [] }, { "type": "TEL", "time": 9, "targets": [0, 1, 2], "controls": [] }, { "type": "MEAS", "time": 18, "targets": [0, 1], "controls": [] }], "qubits": 3, "input": [0, 0, 0]
    }

};

},{}],6:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

module.exports = function () {
    function Gate(type, time, targets, controls) {
        _classCallCheck(this, Gate);

        this.type = type;
        this.time = time;
        this.targets = targets;
        this.controls = controls || [];
        var qubits = this.targets.concat(this.controls);
        this.range = [Math.min.apply(Math, qubits), Math.max.apply(Math, qubits)];
    }

    _createClass(Gate, [{
        key: 'addControl',
        value: function addControl(control) {
            if (this.controls.indexOf(control) < 0 && this.targets.indexOf(control) < 0) {
                this.controls.push(control);
                this.range[0] = Math.min(this.range[0], control);
                this.range[1] = Math.max(this.range[1], control);
            }
        }
    }, {
        key: 'removeControl',
        value: function removeControl(control) {
            this.controls.splice(this.controls.indexOf(control), 1);
            var qubits = this.targets.concat(this.controls);
            this.range = [Math.min.apply(Math, qubits), Math.max.apply(Math, qubits)];
        }
    }, {
        key: 'touching',
        value: function touching(time, qubit) {
            if (time != this.time) {
                return false;
            }
            return this.range[0] <= qubit && qubit <= this.range[1];
        }
    }, {
        key: 'render',
        value: function render(draw) {
            var x = this.time * 40 + 20;
            var y1 = this.targets[0] * 40 + 20;
            for (var i = 0; i < this.controls.length; i++) {
                var y2 = this.controls[i] * 40 + 20;
                draw.control(x, y2);
                draw.wire(x, y1, y2);
            }
            if (this.type.name == 'x' && this.controls.length > 0) {
                draw.not(x, y1);
            } else if (this.type.name == 'swap') {
                var _y = this.targets[1] * 40 + 20;
                draw.swap(x, y1);
                draw.wire(x, y1, _y);
                draw.swap(x, _y);
            } else {
                draw.gate(x, y1, this.targets.length, this.type.name.toUpperCase());
            }
        }
    }]);

    return Gate;
}();

},{}],7:[function(require,module,exports){
'use strict';

var FILE_VERSION = 1;

var Application = require('./application');
var examples = require('./examples');

var displayAmplitudes = function displayAmplitudes(nqubits, amplitudes) {
    var table = document.querySelector('#amplitudes');
    table.innerHTML = '';
    var hideBtn = document.querySelector('#hide-impossible');
    var hide = hideBtn.innerHTML !== '(hide impossible)';
    document.querySelector('#amplitudes-container').style.display = 'block';
    for (var i = 0; i < amplitudes.x.length; i++) {
        var amplitude = '';
        var state = '';
        for (var j = 0; j < nqubits; j++) {
            state = ((i & 1 << j) >> j) + state;
        }
        amplitude += amplitudes.x[i].toFixed(8);
        amplitude += amplitudes.y[i] < 0 ? '-' : '+';
        amplitude += Math.abs(amplitudes.y[i]).toFixed(8) + 'i';
        var row = document.createElement('tr');
        var prob = Math.pow(amplitudes.x[i], 2);
        prob += Math.pow(amplitudes.y[i], 2);
        if (prob < numeric.epsilon) {
            if (hide) {
                continue;
            } else {
                row.style.color = '#ccc';
            }
        }
        var probability = (prob * 100).toFixed(4) + '%';
        row.innerHTML = '\n            <td style="text-align: right">' + amplitude + '</td>\n            <td>|' + state + '></td>\n            <td style="text-indent: 20px">' + probability + '</td>\n        ';
        table.appendChild(row);
    }
};

window.onload = function () {
    document.querySelector('#toolbar').onselectstart = function (evt) {
        return false;
    };
    var canvas = document.getElementById('canvas');
    var app = new Application(canvas, 2);
    var editor = app.editor;

    var hideBtn = document.querySelector('#hide-impossible');
    hideBtn.onclick = function (evt) {
        evt.preventDefault();
        var hide = '(hide impossible)';
        var show = '(show all)';
        hideBtn.innerHTML = hideBtn.innerHTML == hide ? show : hide;
        document.querySelector('#evaluate').click();
    };

    document.querySelector('#reset').onclick = function (evt) {
        evt.preventDefault();
        var ok = confirm('Clear entire circuit?');
        if (ok) {
            app.circuit.gates = [];
            editor.render();
        }
    };

    document.querySelector('#evaluate').onclick = function (evt) {
        evt.preventDefault();
        app.circuit.gates.sort(function (a, b) {
            return a.time - b.time;
        });
        var size = Math.pow(2, app.circuit.nqubits);
        var amplitudes = new numeric.T(numeric.rep([size], 0), numeric.rep([size], 0));
        var state = editor.input.join('');
        amplitudes.x[parseInt(state, 2)] = 1;
        app.applyCircuit(app.circuit, amplitudes, function (amplitudes) {
            displayAmplitudes(app.circuit.nqubits, amplitudes.div(amplitudes.norm2()));
        });
    };

    document.body.onkeydown = function (evt) {
        // Catch hotkeys
        if (evt.which == 'S'.charCodeAt(0) && evt.ctrlKey) {
            evt.preventDefault();
            document.querySelector('#compile').click();
        } else if (evt.which == 13) {
            evt.preventDefault();
            document.querySelector('#evaluate').click();
        }
    };

    document.querySelector('#compile').onclick = function (evt) {
        evt.preventDefault();
        app.circuit.gates.sort(function (a, b) {
            return a.time - b.time;
        });
        var size = Math.pow(2, app.circuit.nqubits);
        var U = new numeric.T(numeric.identity(size), numeric.rep([size, size], 0));
        app.applyCircuit(app.circuit, U, function (U) {
            var name = prompt('Name of gate:', 'F');
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

    document.querySelector('#exportImage').onclick = function (evt) {
        evt.preventDefault();
        var oldlength = editor.length;
        var times = app.circuit.gates.map(function (gate) {
            return gate.time;
        });
        editor.resize(app.circuit.nqubits, Math.max.apply(Math, times) + 1);
        window.open(editor.draw.canvas.toDataURL("image/png"));
        editor.resize(app.circuit.nqubits, oldlength);
    };

    document.querySelector('#exportMatrix').onclick = function (evt) {
        evt.preventDefault();
        app.circuit.gates.sort(function (a, b) {
            return a.time - b.time;
        });
        var size = Math.pow(2, app.circuit.nqubits);
        var U = new numeric.T(numeric.identity(size), numeric.rep([size, size], 0));
        app.applyCircuit(app.circuit, U, function (U) {
            var child = window.open('', 'matrix.csv', ',resizable=yes,scrollbars=yes,menubar=yes,toolbar=yes,titlebar=yes,hotkeys=yes,status=1,dependent=no');
            for (var i = 0; i < U.x.length; i++) {
                var row = [];
                for (var j = 0; j < U.x[i].length; j++) {
                    row.push(U.x[i][j].toFixed(16) + '+' + U.y[i][j].toFixed(16) + 'i');
                }
                child.document.write(row.join(',') + '<br>');
            }
        });
    };

    document.querySelector('#importJSON').onclick = function (evt) {
        evt.preventDefault();
        var input = document.createElement('input');
        input.type = 'file';
        input.onchange = function (evt) {
            var reader = new FileReader();
            reader.onloadend = function (evt) {
                if (evt.target.readyState !== FileReader.DONE) {
                    return;
                }
                app.loadWorkspace(JSON.parse(evt.target.result));
            };
            reader.readAsText(evt.target.files[0]);
        };
        input.click();
    };

    document.querySelector('#exportJSON').onclick = function (evt) {
        evt.preventDefault();
        var out = app.exportWorkspace();
        out.version = FILE_VERSION;
        var blob = new Blob([JSON.stringify(out)]);
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'workspace.json';
        a.click();
    };

    var resize = function resize(size) {
        document.querySelector('#nqubits > span').innerHTML = 'Qubits: ' + size;
        var newGates = app.circuit.gates.filter(function (gate) {
            return gate.range[1] < size;
        });
        if (newGates.length < app.circuit.gates.length) {
            var count = app.circuit.gates.length - newGates.length;
            var ok = confirm('Resizing will remove ' + count + ' gates. Resize anyway?');
            if (ok) {
                app.circuit.gates = newGates;
                editor.resize(size, editor.length);
            }
        } else {
            editor.resize(size, editor.length);
        }
    };

    var nqubitsUl = document.querySelector('#nqubits > ul');

    var _loop = function _loop(i) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#';
        a.innerHTML = i;
        a.onclick = function (evt) {
            evt.preventDefault();
            resize(i);
        };
        li.appendChild(a);
        nqubitsUl.appendChild(li);
        if (i == 2) {
            a.click();
        }
    };

    for (var i = 1; i < 11; i++) {
        _loop(i);
    }

    var getUrlVars = function getUrlVars() {
        var vars = [];
        var location = window.location.href;
        var hashes = location.slice(location.indexOf('?') + 1).split('&');
        for (var i = 0; i < hashes.length; i++) {
            var hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = decodeURI(hash[1]);
        }
        return vars;
    };

    var EXAMPLES = [["Toffoli", examples.TOFFOLI], ["Bell State", examples.BELL_STATE], ["2 Qubit QFT", examples.QFT2], ["4 Qubit QFT", examples.QFT4], ["Grover's Algorithm", examples.GROVERS_ALGORITHM], ["Quantum Teleportation", examples.TELEPORTATION]];
    var examplesEl = document.querySelector('#examples');
    EXAMPLES.forEach(function (example, i) {
        var name = example[0];
        var json = example[1];
        var a = document.createElement('a');
        a.href = '#';
        a.appendChild(document.createTextNode(name));
        a.onclick = function (evt) {
            evt.preventDefault();
            open('?example=' + example[0]);
        };
        if (getUrlVars().example == name) {
            app.loadWorkspace(json);
        }
        var li = document.createElement('li');
        li.appendChild(a);
        examplesEl.appendChild(li);
    });

    document.querySelector('#about').onclick = function (evt) {
        document.querySelector('#modal').style.display = 'block';
    };

    document.querySelector('#modal').onclick = function (evt) {
        document.querySelector('#modal').style.display = 'none';
    };

    document.querySelector('#modal > div').onclick = function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    };
};

},{"./application":1,"./examples":5}],8:[function(require,module,exports){
"use strict";

var quantum = module.exports;

/*
Return version of U controlled by first qubit.
*/
quantum.controlled = function (U) {
    var m = U.x.length;
    var Mx = numeric.identity(m * 2);
    var My = numeric.rep([m * 2, m * 2], 0);
    for (var i = 0; i < m; i++) {
        for (var j = 0; j < m; j++) {
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
quantum.expandMatrix = function (nqubits, U, qubits) {
    var _qubits = [];
    var n = Math.pow(2, nqubits);
    qubits = qubits.slice(0);
    for (var _i = 0; _i < qubits.length; _i++) {
        qubits[_i] = nqubits - 1 - qubits[_i];
    }
    qubits.reverse();
    for (var _i2 = 0; _i2 < nqubits; _i2++) {
        if (qubits.indexOf(_i2) == -1) {
            _qubits.push(_i2);
        }
    }
    var X = numeric.rep([n, n], 0);
    var Y = numeric.rep([n, n], 0);
    var i = n;
    while (i--) {
        var j = n;
        while (j--) {
            var bitsEqual = true;
            var k = _qubits.length;
            while (k--) {
                if ((i & 1 << _qubits[k]) != (j & 1 << _qubits[k])) {
                    bitsEqual = false;
                    break;
                }
            }
            if (bitsEqual) {
                var istar = 0;
                var jstar = 0;
                var _k = qubits.length;
                while (_k--) {
                    var q = qubits[_k];
                    istar |= (i & 1 << q) >> q << _k;
                    jstar |= (j & 1 << q) >> q << _k;
                }
                X[i][j] = U.x[istar][jstar];
                Y[i][j] = U.y[istar][jstar];
            }
        }
    }
    return new numeric.T(X, Y);
};

quantum.h = new numeric.T(numeric.div([[1, 1], [1, -1]], Math.sqrt(2)), numeric.rep([2, 2], 0));

quantum.x = new numeric.T([[0, 1], [1, 0]], numeric.rep([2, 2], 0));

quantum.y = new numeric.T(numeric.rep([2, 2], 0), [[0, -1], [1, 0]]);

quantum.z = new numeric.T([[1, 0], [0, -1]], numeric.rep([2, 2], 0));

quantum.s = new numeric.T([[1, 0], [0, 0]], [[0, 0], [0, 1]]);

var makeR = function makeR(theta) {
    var x = Math.cos(theta);
    var y = Math.sin(theta);
    return new numeric.T([[1, 0], [0, x]], [[0, 0], [0, y]]);
};

quantum.r2 = makeR(Math.PI / 2);
quantum.r4 = makeR(Math.PI / 4);
quantum.r8 = makeR(Math.PI / 8);

quantum.swap = new numeric.T([[1, 0, 0, 0], [0, 0, 1, 0], [0, 1, 0, 0], [0, 0, 0, 1]], numeric.rep([4, 4], 0));

/*
Return Quantum Fourier Transform matrix of an nqubit register operating
on specified qubits.
*/
quantum.qft = function (nqubits) {
    var n = Math.pow(2, nqubits);
    var wtheta = 2 * Math.PI / n;
    var x = numeric.rep([n, n], 0);
    var y = numeric.rep([n, n], 0);
    for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
            x[i][j] = Math.cos(i * j * wtheta);
            y[i][j] = Math.sin(i * j * wtheta);
        }
    }
    return new numeric.T(x, y).div(Math.sqrt(n));
};

quantum.srn = new numeric.T(numeric.div([[1, -1], [1, 1]], Math.sqrt(2)), numeric.rep([2, 2], 0));

},{}],9:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var quantum = require('./quantum');

module.exports = function () {
    function Workspace(app) {
        _classCallCheck(this, Workspace);

        this.app = app;
        this.gates = {};
        this.installStandardGates();
    }

    _createClass(Workspace, [{
        key: 'installStandardGates',
        value: function installStandardGates() {
            this.addGate({ name: 'h', qubits: 1, matrix: quantum.h, title: 'Hadamard' }, true);
            this.addGate({ name: 'x', qubits: 1, matrix: quantum.x, title: 'Pauli-X' }, true);
            this.addGate({ name: 'y', qubits: 1, matrix: quantum.y, title: 'Pauli-Y' }, true);
            this.addGate({ name: 'z', qubits: 1, matrix: quantum.z, title: 'Pauli-Z' }, true);
            this.addGate({ name: 's', qubits: 1, matrix: quantum.s, title: 'Phase Gate' }, true);
            this.addGate({ name: 't', qubits: 1, matrix: quantum.r4, title: 'Same as R4' }, true);
            this.addGate({ name: 'cnot', qubits: 2, matrix: quantum.cnot, title: 'Controlled Not' }, true);
            this.addGate({ name: 'control', title: 'Control' }, true);
            this.addGate({ name: 'swap', qubits: 2, matrix: quantum.swap, title: 'Swap' }, true);
            this.addGate({ name: 'r2', qubits: 1, matrix: quantum.r2, title: 'Pi/2 Phase Rotatation' }, true);
            this.addGate({ name: 'r4', qubits: 1, matrix: quantum.r4, title: 'Pi/4 Phase Rotatation' }, true);
            this.addGate({ name: 'r8', qubits: 1, matrix: quantum.r8, title: 'Pi/8 Phase Rotatation' }, true);
            this.addGate({ name: 'qft', qubits: Infinity, fn: quantum.qft, title: 'Quantum Fourier Transform' }, true);
            this.addGate({ name: 'srn', qubits: 1, matrix: quantum.srn, title: 'Sqrt(Not)' }, true);
        }
    }, {
        key: 'addGate',
        value: function addGate(ops, std) {
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
    }]);

    return Workspace;
}();

},{"./quantum":8}]},{},[7]);
