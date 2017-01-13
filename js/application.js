class Application {

    constructor(canvas, nqubits) {
        const app = this;
        this.workspace = new Workspace(app);
        const circuit = this.circuit = new Circuit(app, nqubits);
        const editor = this.editor = new Editor(app, canvas);
        $('#toolbar').on('click', 'div.gate', function() {
            // Select gate from toolbar
            $('#toolbar div.gate.active').removeClass('active');
            $(this).addClass('active');
            editor.activeGate = app.workspace.gates[$(this).data('type')];
        });
        $('#toolbar .user').on('dblclick', 'div.gate', function(evt) {
            evt.preventDefault();
            // Open gate from toolbar
            let ok = true;
            if (app.circuit.gates.length > 0) {
                ok = confirm('Load gate: ' + $(this).data('type') + '?');
            }
            if (ok) {
                app.editCircuit(app.workspace.gates[$(this).data('type')]);
            }
            return false;
        });
        $('#toolbar div.gate').first().click();
    }

    /*
    Set current "circuit" to that of some "gate" and update the interface
    for the new circuit.
    */
    editCircuit(gate) {
        this.circuit = gate.circuit;
        this.editor.resize(gate.circuit.nqubits, this.editor.length);
        $('#nqubits > span').text('Qubits: ' + this.circuit.nqubits);
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
        const tool = $('<div data-type="' + name + '" class="gate"></div>');
        if (title) {
            tool.attr('title', title);
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
        tool.append('<img src="' + canvas.toDataURL() + '">');
        tool.append('<div></div>');
        $('#toolbar .' + type).append(tool);
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
        $('#toolbar .std').empty();
        $('#toolbar .user').empty();
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
        $('#nqubits > span').text('Qubits: ' + this.circuit.nqubits);
        this.compileAll();
        this.editor.render();
    }

    /*
    Asynchronously compile every user defined gate in the workspace.
    XXX: This should probably be a method of Workspace
    */
    compileAll() {
        const todo = [];
        const workspace = this.workspace;
        $('#toolbar .user div.gate').each(function() {
            const name = $(this).data('type');
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
                applyCircuit(todo[i].circuit, I, U => {
                    todo[i].matrix = U;
                    setTimeout(function() {
                        loop(i + 1);
                    }, 5);
                });
            }
        })(0);
    }

}
