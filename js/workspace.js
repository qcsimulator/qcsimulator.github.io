class Workspace {

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
        this.addGate({name: 'control'}, true);
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
            input: ops.input
        };
        this.app.addToolbarButton(std ? 'std' : 'user', ops.name, ops.title);
    }

}

