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

