class Gate {

    constructor(type, time, targets, controls) {
        this.type = type;
        this.time = time;
        this.targets = targets;
        this.controls = controls || [];
        const qubits = this.targets.concat(this.controls);
        this.range = [
            Math.min.apply(Math, qubits),
            Math.max.apply(Math, qubits),
        ];
    }

    addControl(control) {
        if (this.controls.indexOf(control) < 0 && this.targets.indexOf(control) < 0) {
            this.controls.push(control);
            this.range[0] = Math.min(this.range[0], control);
            this.range[1] = Math.max(this.range[1], control);
        }
    }

    removeControl(control) {
        this.controls.splice(this.controls.indexOf(control), 1);
        const qubits = this.targets.concat(this.controls);
        this.range = [
            Math.min.apply(Math, qubits),
            Math.max.apply(Math, qubits),
        ];
    };

    touching(time, qubit) {
        if (time != this.time) {
            return false;
        }
        return this.range[0] <= qubit && qubit <= this.range[1];
    }

    render(draw) {
        const x = this.time * 40 + 20;
        const y1 = this.targets[0] * 40 + 20;
        for (let i = 0; i < this.controls.length; i++) {
            const y2 = this.controls[i] * 40 + 20;
            draw.control(x, y2);
            draw.wire(x, y1, y2);
        }
        if (this.type.name == 'x' && this.controls.length > 0) {
            draw.not(x, y1);
        } else if (this.type.name == 'swap') {
            const y2 = this.targets[1] * 40 + 20;
            draw.swap(x, y1);
            draw.wire(x, y1, y2);
            draw.swap(x, y2);
        } else {
            draw.gate(x, y1, this.targets.length, this.type.name.toUpperCase());
        }
    }

}
