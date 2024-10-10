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
                            code: { type: ArgumentType.NUMBER, defaultValue: "" },
                            params: { type: ArgumentType.NUMBER, defaultValue: "{}" }
                        }
                    },
                    {
                        opcode: "splitFoasm",
                        blockType: BlockType.REPORTER,
                        text: "Split Foasm [code]",
                        arguments: {
                            code: { type: ArgumentType.NUMBER, defaultValue: "set out hello :3;out @out" }
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
                    console.log(mem[param.slice(1)])
                    return mem[param.slice(1)]
                }
                return param;
            }

            let mem = []

            let index = 0;
            while (index < code.length) {
                let line = code[index]

                switch (line[0]) {
                    case "set":
                        let v = mem
                        v.splice(0, 2);
                        console.log(line[1],v)
                        mem[line[1]] = v
                        break
                    case "out":
                        return Eval(line[1]);
                    default:
                        console.error("unknown cmd '" + line[0] + "'")
                        break
                }

                index ++;
            }
        }
    }
    Scratch.extensions.register(new Foasm());
})(Scratch);