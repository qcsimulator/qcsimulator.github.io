var quantum = (function(quantum) {

    /*
        Return version of U controlled by first qubit.
    */
    quantum.controlled = function(U) {
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
    quantum.expandMatrix = function(nqubits, U, qubits) {
        var i, j, k, X, Y, _qubits = [], n = Math.pow(2, nqubits);
        qubits = qubits.slice(0);
        for (var i = 0; i < qubits.length; i++) {
            qubits[i] = (nqubits - 1) - qubits[i];
        }
        qubits.reverse();
        for (var i = 0; i < nqubits; i++) {
            if (qubits.indexOf(i) == -1) {
                _qubits.push(i);
            }
        }
        X = numeric.rep([n, n], 0);
        Y = numeric.rep([n, n], 0);
        i = n;
        while (i--) {
            j = n;
            while (j--) {
                var bitsEqual = true;
                k = _qubits.length;
                while (k--) {
                    if ((i & (1 << _qubits[k])) != (j & (1 << _qubits[k]))) {
                        bitsEqual = false;
                        break;
                    }
                }
                if (bitsEqual) {
                    var istar = 0, jstar = 0;
                    k = qubits.length;
                    while (k--) {
                        var q = qubits[k];
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

    function makeR(theta) {
        var x = Math.cos(theta);
        var y = Math.sin(theta);
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
    quantum.qft = function(nqubits) {
        var n = Math.pow(2, nqubits);
        var wtheta = (2 * Math.PI) / n;
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

    quantum.srn = new numeric.T(
        numeric.div([[1, -1], [1, 1]], Math.sqrt(2)),
        numeric.rep([2, 2], 0)
    );

    return quantum;
})(quantum || {});

