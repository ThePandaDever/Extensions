/*
Faster Vector Extension made by flufi (flufi_boi on discord)
Please dont delete this comment :P
*/

(function(Scratch) {
    "use strict";

    const { BlockType, ArgumentType } = Scratch;

    class FlufiVectors {
        getInfo() {
            return {
                id: "flufivector",
                name: "Flufi Vectors",
                color1: "#643eed",

                blocks: [
                    { blockType: Scratch.BlockType.LABEL, text: "Constructors" },
                    {
                        opcode: "createvector",
                        blockType: BlockType.REPORTER,
                        text: "Vector [x] [y]",
                        arguments: {
                            x: { type: ArgumentType.NUMBER, defaultValue: 0 },
                            y: { type: ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: "createvectorone",
                        blockType: BlockType.REPORTER,
                        text: "Vector [x]",
                        arguments: {
                            x: { type: ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: "fromarr",
                        blockType: BlockType.REPORTER,
                        text: "Vector from [arr]",
                        arguments: {
                            arr: { type: ArgumentType.NUMBER, defaultValue: "[0,0]" }
                        }
                    },
                    {
                        opcode: "vectorzero",
                        blockType: BlockType.REPORTER,
                        text: "Vector zero",
                        disableMonitor: true
                    },
                    {
                        opcode: "vectorone",
                        blockType: BlockType.REPORTER,
                        text: "Vector one",
                        disableMonitor: true
                    },
                    { blockType: Scratch.BlockType.LABEL, text: "Getters" },
                    {
                        opcode: "getvector",
                        blockType: BlockType.REPORTER,
                        text: "Vector [vec]'s [axis]",
                        arguments: {
                            vec: { type: ArgumentType.STRING, defaultValue: '[1,0]' },
                            axis: { type: ArgumentType.NUMBER, defaultValue: 'x', menu: 'VECTORAXIS' }
                        }
                    }
                ],
                menus: {
                    VECTORAXIS: {
                        acceptReporters: true,
                        items: [
                            'x', 
                            'y'
                        ]
                    }
                }
            };
        }

        createvector({ x, y }) {
            return [x,y];
        }

        createvectorone({ x }) {
            return [x,x];
        }

        vectorzero({}) {
            return [0,0];
        }
        vectorone({}) {
            return [1,1];
        }
        fromarr({ arr }) {
            return JSON.parse(arr)
        }

        getvector({ vec, axis }) {
            try {
                let v = vec;
                switch (axis) {
                    case "x":
                        return v[0];
                    case "y":
                        return v[1];
                }
                return 0;
            } catch {
                return "";
            }
        }
    }
    Scratch.extensions.register(new FlufiVectors());
})(Scratch);