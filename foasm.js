(function(Scratch) {
    "use strict";

    const { BlockType, ArgumentType } = Scratch;

    function splitFoasm(rawcode){
        let splitcode = rawcode.split(";");
        let code = [];
        for (const line of splitcode) {
            code.push(line.split(" "));
        }
        return code;
    }

    class Foasm {
        getInfo() {
            return {
                id: "foasm",
                name: "Flufi OS assembly",
                color1: "#ad1090",

                blocks: [
                    {
                        opcode: "runFoasm",
                        blockType: BlockType.REPORTER,
                        text: "Run Foasm [code] with params [params]",
                        arguments: {
                            code: { type: ArgumentType.STRING, defaultValue: "" },
                            params: { type: ArgumentType.NUMBER, defaultValue: "{}" }
                        }
                    },
                    {
                        opcode: "splitFoasm",
                        blockType: BlockType.REPORTER,
                        text: "Split Foasm [code]",
                        arguments: {
                            code: { type: ArgumentType.STRING, defaultValue: "set out hello :3;out @out" }
                        }
                    }
                ],
                menus: {}
            };
        }

        splitFoasm({ code }) {
            return splitFoasm(code);
        }

        runFoasm({ code, params }) {
            if (typeof code !== 'object') {return ""}

            function Eval(param) {
                if (param[0] == "@") {
                    return mem[param.slice(1)];
                }
                return param;
            }

            let labels = {};
            
            let sindex = 0;
            while (sindex < code.length) {
                let line = code[sindex];
                if (line[0] == "lbl") {
                    let v = line.concat();
                    v.splice(0, 2);
                    labels[v.join(" ")] = sindex
                }
                sindex ++;
            }
            
            let mem = {};

            let index = 0;
            while (index < code.length) {
                let line = code[index];

                switch (line[0]) {
                    case "set":
                        let v = line.concat();
                        v.splice(0, 2);
                        mem[line[1]] = v.join(" ");
                        break
                    case "del":
                        mem[line[1]] = null;
                        break
                    case "out":
                        return Eval(line[1]);
                    case "lbl": break
                    case "jmp":
                        
                        let jmp_l = line.concat();
                        jmp_l.splice(0, 1).join(" ");
                        console.log(labels,jmp_l);
                        if (Object.keys(jmp_l)) {
                            
                        }
                        break
                    default:
                        console.error("unknown cmd '" + line[0] + "'");
                        break
                }

                index ++;
            }
        }
    }
    Scratch.extensions.register(new Foasm());
})(Scratch);
