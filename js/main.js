/*
TODO: More of the DOM specific stuff needs to be moved to the editor. Such as
the toolbar construction.
*/


/*
Applies circuit to matrix of vector U and passes result to callback
*/
const applyCircuit = (circuit, x, callback) => {
    const wrapper = $('#progress').css('display', 'inline-block');
    const progress = $('#progress > div').width(0);
    circuit.evaluate(x, percent => {
        progress.width(wrapper.width() * percent);
    }, x => {
        wrapper.hide();
        callback(x);
    });
}

const displayAmplitudes = (nqubits, amplitudes) => {
    const table = $('#amplitudes').empty();
    const hide = ($('#hide-impossible').text() != '(hide impossible)');
    $('#amplitudes-container').css('display', 'block');
    for (let i = 0; i < amplitudes.x.length; i++) {
        let amplitude = '';
        let state = '';
        for (let j = 0; j < nqubits; j++) {
            state = ((i & (1 << j)) >> j) + state;
        }
        amplitude += amplitudes.x[i].toFixed(8);
        amplitude += amplitudes.y[i] < 0 ? '-' : '+';
        amplitude += Math.abs(amplitudes.y[i]).toFixed(8) + 'i';
        const row = $('<tr></tr>');
        let prob = Math.pow(amplitudes.x[i], 2);
        prob += Math.pow(amplitudes.y[i], 2);
        if (prob < numeric.epsilon) {
            if (hide) {
                continue;
            } else {
                row.css('color', '#ccc');
            }
        }
        row.append($('<td style="text-align: right"></td>').text(amplitude));
        row.append($('<td></td>').text('|' + state + '>'));
        row.append($('<td style="text-indent: 20px"></td>').text((prob * 100).toFixed(4) + '%'));
        table.append(row);
    }
}

$(() => {
    $('#toolbar')[0].onselectstart = evt => false;
    const canvas = document.getElementById('canvas');
    const app = new Application(canvas, 2);
    const editor = app.editor;

    const hideBtn = $('#hide-impossible');
    hideBtn.click(evt => {
        const hide = '(hide impossible)';
        const show = '(show all)';
        hideBtn.text(hideBtn.text() == hide ? show : hide);
        $('#evaluate').click();
    });

    $('#reset').click(evt => {
        const ok = confirm('Clear entire circuit?');
        if (ok) {
            app.circuit.gates = [];
            editor.render();
        }
    });

    $('#evaluate').click(evt => {
        app.circuit.gates.sort((a, b) => a.time - b.time);
        const size = Math.pow(2, app.circuit.nqubits);
        const amplitudes = new numeric.T(numeric.rep([size], 0), numeric.rep([size], 0));
        const state = editor.input.join('');
        amplitudes.x[parseInt(state, 2)] = 1;
        applyCircuit(app.circuit, amplitudes, amplitudes => {
            displayAmplitudes(app.circuit.nqubits, amplitudes.div(amplitudes.norm2()))
        });
    });

    $('body').keydown(evt => {
        // Catch hotkeys
        if (evt.which == 'S'.charCodeAt(0) && evt.ctrlKey) {
            evt.preventDefault();
            $('#compile').click();
        } else if (evt.which == 13) {
            evt.preventDefault();
            $('#evaluate').click();
        }
    });

    $('#compile').click(evt => {
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
    });

    $('#exportImage').click(evt => {
        const oldlength = editor.length;
        const times = app.circuit.gates.map(gate => gate.time);
        editor.resize(app.circuit.nqubits, Math.max.apply(Math, times) + 1);
        window.open(editor.draw.canvas.toDataURL("image/png"));
        editor.resize(app.circuit.nqubits, oldlength);
    });

    $('#exportMatrix').click(evt => {
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
    });

    $('#importJSON').click(evt => {
        const json = prompt('Paste JSON:');
        app.loadWorkspace(JSON.parse(json));
    });

    $('#exportJSON').click(evt => {
        app.circuit.gates.sort((a, b) => a.time - b.time);
        const gates = [];
        $('#toolbar .user div.gate').each(function() {
            const name = $(this).data('type');
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
        const a = $('<a download="circuit.js">circuit.js</a>');
        a.attr('href', 'data:text/javascript,' + encodeURI(json));
        $(document.body).append(a);
        a[0].click();
        a.remove();
    });

    $('#nqubits > ul > li > a').click(function() {
        const nqubits = parseInt($(this).text());
        $('#nqubits > span').text('Qubits: ' + nqubits);
        const newGates = app.circuit.gates.filter(gate => {
            return gate.range[1] < nqubits;
        });
        if (newGates.length < app.circuit.gates.length) {
            const count = app.circuit.gates.length - newGates.length;
            const ok = confirm('Resizing will remove ' + count + ' gates. Resize anyway?')
            if (ok) {
                app.circuit.gates = newGates;
                editor.resize(nqubits, editor.length);
            }
        } else {
            editor.resize(nqubits, editor.length);
        }
    });
    $('#nqubits .default').click();

    const getUrlVars = () => {
        const vars = [];
        const hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
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
    const examples = $('#examples');
    $.each(EXAMPLES, (i, example) => {
        const name = example[0];
        const json = example[1];
        const a = $('<a href="#"></a>').text(name);
        a.click(evt => {
            open('?example=' + example[0]);
        });
        if (getUrlVars().example == name) {
            app.loadWorkspace(json);
        }
        examples.append($('<li></li>').append(a));
    });

    $('#about').click(evt => {
        $('#modal').css('display', 'block');
    });

    $('#modal').click(evt => {
        $('#modal').css('display', 'none');
    });

    $('#modal > div').click(evt => {
        evt.preventDefault();
        evt.stopPropagation();
    });

});

