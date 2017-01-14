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
