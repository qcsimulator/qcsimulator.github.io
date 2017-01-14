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
