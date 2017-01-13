const GROVERS_ALGORITHM = {"gates":[
    {"name":"GROV","qubits":4,"circuit":[
        {"type":"h","time":0,"targets":[0],"controls":[]},
        {"type":"h","time":0,"targets":[2],"controls":[]},
        {"type":"h","time":0,"targets":[3],"controls":[]},
        {"type":"h","time":0,"targets":[1],"controls":[]},
        {"type":"x","time":1,"targets":[0],"controls":[]},
        {"type":"x","time":1,"targets":[1],"controls":[]},
        {"type":"x","time":1,"targets":[2],"controls":[]},
        {"type":"x","time":1,"targets":[3],"controls":[]},
        {"type":"z","time":2,"targets":[3],"controls":[0,1,2]},
        {"type":"x","time":3,"targets":[0],"controls":[]},
        {"type":"x","time":3,"targets":[1],"controls":[]},
        {"type":"x","time":3,"targets":[2],"controls":[]},
        {"type":"x","time":3,"targets":[3],"controls":[]},
        {"type":"h","time":4,"targets":[0],"controls":[]},
        {"type":"h","time":4,"targets":[1],"controls":[]},
        {"type":"h","time":4,"targets":[2],"controls":[]},
        {"type":"h","time":4,"targets":[3],"controls":[]}
    ],"title":"Grover's Operator"},
    {"name":"F7","qubits":5,"circuit":[
        {"type":"x","time":0,"targets":[0],"controls":[]},
        {"type":"x","time":1,"targets":[4],"controls":[0,1,2,3]},
        {"type":"x","time":2,"targets":[0],"controls":[]}
    ],"title":"Oracle where F(7) is flagged"},
    {"name":"F5","qubits":5,"circuit":[
        {"type":"x","time":0,"targets":[0],"controls":[]},
        {"type":"x","time":0,"targets":[2],"controls":[]},
        {"type":"x","time":1,"targets":[4],"controls":[0,1,2,3]},
        {"type":"x","time":2,"targets":[0],"controls":[]},
        {"type":"x","time":2,"targets":[2],"controls":[]},
    ],"title":"Oracle where F(5) is flagged"},
    ], "circuit": [
        {"type":"h","time":0,"targets":[2],"controls":[]},
        {"type":"h","time":0,"targets":[1],"controls":[]},
        {"type":"h","time":0,"targets":[0],"controls":[]},
        {"type":"h","time":0,"targets":[4],"controls":[]},
        {"type":"h","time":0,"targets":[3],"controls":[]},
        {"type":"F7","time":6,"targets":[0,1,2,3,4],"controls":[]},
        {"type":"GROV","time":7,"targets":[0,1,2,3],"controls":[]},
        {"type":"F7","time":8,"targets":[0,1,2,3,4],"controls":[]},
        {"type":"GROV","time":9,"targets":[0,1,2,3],"controls":[]},
        {"type":"F7","time":10,"targets":[0,1,2,3,4],"controls":[]},
        {"type":"GROV","time":11,"targets":[0,1,2,3],"controls":[]},
        {"type":"h","time":17,"targets":[4],"controls":[]},
        {"type":"x","time":18,"targets":[4],"controls":[]}
    ],"qubits":5,"input":[0,0,0,0,1]
};

const BELL_STATE = {"circuit":[
    {"type":"h","time":0,"targets":[0],"controls":[]},
    {"type":"x","time":1,"targets":[1],"controls":[0]}
],"qubits":2,"input":[0,0]};

const QFT2 = {"circuit":[
    {"type":"h","time":0,"targets":[0],"controls":[]},
    {"type":"r2","time":1,"targets":[0],"controls":[1]},
    {"type":"h","time":2,"targets":[1],"controls":[]},
    {"type":"swap","time":3,"targets":[0,1],"controls":[]}
],"qubits":2,"input":[0,0]};

const QFT4 = {"circuit":[
    {"type":"h","time":0,"targets":[0],"controls":[]},
    {"type":"r2","time":1,"targets":[0],"controls":[1]},
    {"type":"r4","time":2,"targets":[0],"controls":[2]},
    {"type":"r8","time":3,"targets":[0],"controls":[3]},
    {"type":"h","time":4,"targets":[1],"controls":[]},
    {"type":"r2","time":5,"targets":[1],"controls":[2]},
    {"type":"r4","time":6,"targets":[1],"controls":[3]},
    {"type":"h","time":7,"targets":[2],"controls":[]},
    {"type":"r2","time":8,"targets":[2],"controls":[3]},
    {"type":"h","time":9,"targets":[3],"controls":[]},
    {"type":"swap","time":10,"targets":[2,1],"controls":[]},
    {"type":"swap","time":11,"targets":[0,3],"controls":[]}
],"qubits":4,"input":[0,0,0,0]};

const TOFFOLI = {"circuit":[
    {"type":"h","time":0,"targets":[2],"controls":[]},
    {"type":"s","time":1,"targets":[2],"controls":[1]},
    {"type":"x","time":2,"targets":[1],"controls":[0]},
    {"type":"s","time":3,"targets":[2],"controls":[1]},
    {"type":"s","time":4,"targets":[2],"controls":[1]},
    {"type":"s","time":5,"targets":[2],"controls":[1]},
    {"type":"x","time":6,"targets":[1],"controls":[0]},
    {"type":"s","time":7,"targets":[2],"controls":[0]},
    {"type":"h","time":8,"targets":[2],"controls":[]}
],"qubits":3,"input":[0,0,0]};

const TELEPORTATION = {"gates":[
    {"name":"TEL","qubits":3,"circuit":[
        {"type":"h","time":0,"targets":[0],"controls":[]},
        {"type":"h","time":0,"targets":[2],"controls":[]},
        {"type":"x","time":1,"targets":[1],"controls":[2]},
        {"type":"x","time":2,"targets":[1],"controls":[0]},
        {"type":"h","time":3,"targets":[0],"controls":[]},
        {"type":"x","time":3,"targets":[2],"controls":[1]},
        {"type":"h","time":4,"targets":[2],"controls":[]},
        {"type":"x","time":5,"targets":[2],"controls":[0]}
    ],"title":"Quantum teleportation circuit"},
    {"name":"F","qubits":1,"circuit":[
        {"type":"h","time":0,"targets":[0],"controls":[]},
        {"type":"r4","time":1,"targets":[0],"controls":[]},
        {"type":"h","time":2,"targets":[0],"controls":[]},
        {"type":"r4","time":3,"targets":[0],"controls":[]},
        {"type":"h","time":4,"targets":[0],"controls":[]}
    ],"title":"Function creating 75% |0> and 25% |1> superposition"},
    {"name":"MEAS","qubits":2,"circuit":[
        {"type":"h","time":0,"targets":[0],"controls":[]},
        {"type":"h","time":0,"targets":[1],"controls":[]}
    ],"title":"Pseudo measurement (collapse by interference)"}
    ],"circuit":[
        {"type":"F","time":0,"targets":[0],"controls":[]},
        {"type":"TEL","time":9,"targets":[0,1,2],"controls":[]},
        {"type":"MEAS","time":18,"targets":[0,1],"controls":[]}
    ],"qubits":3,"input":[0,0,0]
};
