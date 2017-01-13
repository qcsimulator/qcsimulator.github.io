/*
TODO: More of the DOM specific stuff needs to be moved to the editor. Such as
the toolbar construction.
*/


/*
Applies circuit to matrix of vector U and passes result to callback
*/
const applyCircuit = (circuit, x, callback) => {
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
        applyCircuit(app.circuit, amplitudes, amplitudes => {
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
        applyCircuit(app.circuit, U, U => {
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
        applyCircuit(app.circuit, U, U => {
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
        const json = prompt('Paste JSON:');
        app.loadWorkspace(JSON.parse(json));
    };

    document.querySelector('#exportJSON').onclick = evt => {
        evt.preventDefault();
        app.circuit.gates.sort((a, b) => a.time - b.time);
        const gates = [];
        document.querySelectorAll('#toolbar .user div.gate').forEach(gate => {
            const name = gate.dataset.type;
            const type = app.workspace.gates[name];
            gates.push({
                name: name,
                qubits: type.circuit.nqubits,
                circuit: type.circuit.toJSON(),
                title: ''
            });
        });
        const json = JSON.stringify({
            gates: gates,
            circuit: app.circuit.toJSON(),
            qubits: app.circuit.nqubits,
            input: editor.input
        });
        const a = document.createElement('a');
        a.download = 'circuit.json';
        a.innerHTML = 'circuit.json';
        a.href = 'data:text/javascript,' + encodeURI(json);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
        ["Toffoli", TOFFOLI],
        ["Bell State", BELL_STATE],
        ["2 Qubit QFT", QFT2],
        ["4 Qubit QFT", QFT4],
        ["Grover's Algorithm", GROVERS_ALGORITHM],
        ["Quantum Teleportation", TELEPORTATION],
    ];
    const examples = document.querySelector('#examples');
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
        examples.appendChild(li);
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
