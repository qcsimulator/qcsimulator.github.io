/*
    TODO: More of the DOM specific stuff needs to be moved to the editor. Such
    as the toolbar construction.
*/


/**
 * Applies circuit to matrix of vector U and passes result to callback
 */
function applyCircuit(circuit, x, callback) {
    var progressWrapper = $('#progress').css('display', 'inline-block');
    var progress = $('#progress > div').width(0);
    circuit.evaluate(x, function(percent) {
        progress.width(progressWrapper.width() * percent);
    }, function(x) {
        progressWrapper.hide();
        callback(x);
    });
}

function displayAmplitudes(nqubits, amplitudes) {
    var prob, row, table = $('#amplitudes').empty();
    var hideImpossible = ($('#hide-impossible').text() != '(hide impossible)');
    $('#amplitudes-container').css('display', 'block');
    for (var i = 0; i < amplitudes.x.length; i++) {
        var amplitude = '', state = '';
        for (var j = 0; j < nqubits; j++) {
            state = ((i & (1 << j)) >> j) + state;
        }
        amplitude += amplitudes.x[i].toFixed(8);
        amplitude += amplitudes.y[i] < 0 ? '-' : '+';
        amplitude += Math.abs(amplitudes.y[i]).toFixed(8) + 'i';
        row = $('<tr></tr>');
        prob = Math.pow(amplitudes.x[i], 2);
        prob += Math.pow(amplitudes.y[i], 2);
        if (prob < numeric.epsilon) {
            if (hideImpossible) {
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

$(function() {
    $('#toolbar')[0].onselectstart = function(){return false};
    var canvas = document.getElementById('canvas');
    var app = new Application(canvas, 2);
    var editor = app.editor;
    $('#hide-impossible').click(function() {
        var hide = '(hide impossible)';
        var show = '(show all)';
        $(this).text($(this).text() == hide ? show : hide);
        $('#evaluate').click();
    });
    $('#reset').click(function() {
        var ok = confirm('Clear entire circuit?');
        if (ok) {
            app.circuit.gates = [];
            editor.render();
        }
        return false;
    });
    $('#evaluate').click(function() {
        app.circuit.gates.sort(function(a, b) {return a.time - b.time;});
        var size = Math.pow(2, app.circuit.nqubits);
        var amplitudes = new numeric.T(numeric.rep([size], 0), numeric.rep([size], 0));
        var state = editor.input.join('');
        amplitudes.x[parseInt(state, 2)] = 1;
        applyCircuit(app.circuit, amplitudes, function(amplitudes) {
            displayAmplitudes(app.circuit.nqubits, amplitudes.div(amplitudes.norm2()))
        });
        return false;
    });
    $('body').keydown(function(event) {
        // Catch hotkeys
        if (event.which == 'S'.charCodeAt(0) && event.ctrlKey) {
            $('#compile').click();
            event.preventDefault();
        } else if (event.which == 13) {
            $('#evaluate').click();
            event.preventDefault();
        }
    });

    $('#compile').click(function() {
        app.circuit.gates.sort(function(a, b) {return a.time - b.time;});
        var size = Math.pow(2, app.circuit.nqubits);
        var U = new numeric.T(numeric.identity(size), numeric.rep([size, size], 0));
        applyCircuit(app.circuit, U, function(U) {
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
        return false;
    });
    $('#exportImage').click(function() {
        var oldlength = editor.length;
        var times = app.circuit.gates.map(function(gate) {return gate.time});
        editor.resize(app.circuit.nqubits, Math.max.apply(Math, times) + 1);
        window.open(editor.draw.canvas.toDataURL("image/png"));
        editor.resize(app.circuit.nqubits, oldlength);
        return false;
    });

    $('#exportMatrix').click(function() {
        app.circuit.gates.sort(function(a, b) {return a.time - b.time;});
        var size = Math.pow(2, app.circuit.nqubits);
        var U = new numeric.T(numeric.identity(size), numeric.rep([size, size], 0));
        applyCircuit(app.circuit, U, function(U) {
            var child = window.open('', 'matrix.csv', ',resizable=yes,scrollbars=yes,menubar=yes,toolbar=yes,titlebar=yes,hotkeys=yes,status=1,dependent=no');
            for (var i = 0; i < U.x.length; i++) {
                var row = [];
                for (var j = 0; j < U.x[i].length; j++) {
                    row.push(U.x[i][j].toFixed(16) + '+' + U.y[i][j].toFixed(16) + 'i');
                }
                child.document.write(row.join(',') + '<br>');
            }
        });
        return false;
    });

    $('#importJSON').click(function() {
        var json = prompt('Paste JSON:');
        app.loadWorkspace(JSON.parse(json));
        return false;
    });

    $('#exportJSON').click(function() {
        app.circuit.gates.sort(function(a, b) {return a.time - b.time;});
        var gates = [];
        $('#toolbar .user div.gate').each(function() {
            var name = $(this).data('type');
            var type = app.workspace.gates[name];
            gates.push({
                name: name,
                qubits: type.circuit.nqubits,
                circuit: type.circuit.toJSON(),
                title: ''
            });
        });
        var json = JSON.stringify({
            gates: gates,
            circuit: app.circuit.toJSON(),
            qubits: app.circuit.nqubits,
            input: editor.input
        });
        var a = $('<a download="circuit.js">circuit.js</a>');
        a.attr('href', 'data:text/javascript,' + encodeURI(json));
        $(document.body).append(a);
        a[0].click();
        a.remove();
        return false;
    });

    $('#nqubits > ul > li > a').click(function() {
        var nqubits = parseInt($(this).text());
        $('#nqubits > span').text('Qubits: ' + nqubits);
        var newGates = app.circuit.gates.filter(function(gate) {
            return gate.range[1] < nqubits;
        });
        if (newGates.length < app.circuit.gates.length) {
            var count = app.circuit.gates.length - newGates.length;
            var ok = confirm('Resizing will remove ' + count + ' gates. Resize anyway?')
            if (ok) {
                app.circuit.gates = newGates;
                editor.resize(nqubits, editor.length);
            }
        } else {
            editor.resize(nqubits, editor.length);
        }
        return false;
    });
    $('#nqubits .default').click();


    function getUrlVars() {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for(var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] =decodeURI(hash[1]);
        }
        return vars;
    }

    var EXAMPLES = [
        ["Toffoli", TOFFOLI],
        ["Bell State", BELL_STATE],
        ["2 Qubit QFT", QFT2],
        ["4 Qubit QFT", QFT4],
        ["Grover's Algorithm", GROVERS_ALGORITHM],
        ["Quantum Teleportation", TELEPORTATION],
    ];
    var examples = $('#examples');
    $.each(EXAMPLES, function(i, example) {
        var name = example[0];
        var json = example[1];
        var a = $('<a href="#"></a>').text(name);
        a.click(function() {
            var win = open('?example=' + example[0]);
            return false;
        });
        if (getUrlVars().example == name) {
            app.loadWorkspace(json);
        }
        examples.append($('<li></li>').append(a));
    });

    $('#about').click(function() {
        $('#modal').css('display', 'block');
        return false;
    });

    $('#modal').click(function() {
        $('#modal').css('display', 'none');
    });

    $('#modal > div').click(function(evt) {
        evt.preventDefault();
        evt.stopPropagation();
    });

});

